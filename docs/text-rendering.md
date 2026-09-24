# Shared text painting and letter motion

## Root cause

The structural renderer kept every character in an inline-block flowChar/textGlyph pair even for None and Breathing. Separate boxes changed browser shaping, kerning, and spacing; switching to None only changed a class and left that layout intact.

## Rendering contract

TextContent remains shared by CanvasStage and the hosted OverlayClient. None and breatheText now render the actual continuous string in one text node. They do not split graphemes, mount glyph measurement hooks, or retain motion wrappers. Normal browser whitespace, explicit line breaks, alignment, and font shaping apply. Breathing moves the entire text element.

Only waveLetters, bounceLetters, typewriterLetters, glitchLetters, and flickerLetters mount AnimatedText. A hidden continuous string reserves exactly the static layout. DOM Range measurements of that browser-shaped string place absolute flowChar movers at the original fractional character positions, preserving kerning advances, CSS letter-spacing, word spaces, wrapping, and line alignment. A temporary hidden ruler copies computed typography and width outside stage transforms, so stage scale/rotation cannot distort the CSS-pixel coordinates. It is removed immediately after measurement.

ResizeObserver and font readiness/loading completion update animated geometry. No frame loop or React measurement-state loop is used. Switching to None or Breathing unmounts AnimatedText, disconnects its observer/listener, and mounts fresh continuous text: no flowChar, inline position, transform, opacity, or measurement variables survive.

## Paint and motion

Animated flowChar owns motion/opacity; its inner textGlyph owns fill, the sole outline, and glyph-clipped shimmer. Rainbow retains one coordinated field across the measured line, with two identical spectrum periods and a seamless three-second flow. Other fills retain their shared line coordinates. Aurora retains its four-second flow. Paint does not compete with movement animations.

Static text paints its continuous string directly. Rainbow spans the full text width and flows normally; Rainbow/Aurora combine their paint animation with Breathing when selected. Static shimmer uses a text-clipped pseudo-element containing the complete string, with no stroke on the light copy. Both shimmer paths honor the existing Shimmer Speed variable. Text box/background and outer opacity behavior are unchanged. No controls, persisted values, or unrelated editor systems changed.

## Verification

Regression coverage checks continuous None/Breathing for all eight fill values; all five letter paths; switching each back to pristine static markup; whitespace/blank lines; fractional character and word-space advances; wrapped rows; grapheme offsets; transform-independent ruler measurement/cleanup; observer cleanup; font/resize updates; fill/shimmer geometry persistence; paint CSS; and shared hosted/editor output.

A temporary review page using real TextLayerControls and TextContent verified SPAWN POO through None -> completed Typewriter -> None. All three measured 359.562px at 64px font size, with unchanged word space and no remaining wrappers on return to None. Rainbow was checked through None -> Wave -> completed Typewriter -> None. Custom Gradient, Aurora, Fire, Ice, and Gold were inspected with None and Wave. Static and moving shimmer remained text-clipped; fills and outlines remained visible. The temporary route was removed before the production build.

Visual acceptance uses Chromium. Continuous static text retains full browser shaping; contextual ligature shapes across independently animated graphemes are not implemented, although their positions use the continuous string's metrics. No canvas or heavy layout library is introduced.

Validation: npm run typecheck, npm run lint, npm test (212 tests across 20 files, including 44 text component/layout cases), and npm run build pass. Lint reports the two pre-existing font/image warnings.
