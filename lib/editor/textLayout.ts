export interface TextGlyphRange { text:string; start:number; end:number }
export interface PositionedGlyph { x:number; y:number; width:number; height:number; fieldX:number; fieldWidth:number }
const segmenter=typeof Intl.Segmenter==="function"?new Intl.Segmenter(undefined,{granularity:"grapheme"}):null;
export function splitTextGlyphs(text:string):TextGlyphRange[] {
  let offset=0;
  const parts=segmenter?Array.from(segmenter.segment(text),part=>part.segment):Array.from(text);
  return parts.map(part=>{const start=offset;offset+=part.length;return {text:part,start,end:offset};}).filter(part=>!/[\r\n]/u.test(part.text));
}

/** Read the browser-shaped string, never the widths of isolated glyph boxes.
 * The temporary ruler is outside stage/entrance transforms. All values are
 * unscaled CSS pixels, including fractional kerning and whitespace advances. */
export function measureTextGlyphs(source:HTMLElement,glyphs:TextGlyphRange[]):PositionedGlyph[] {
  if(!glyphs.length)return [];
  const document=source.ownerDocument,computed=getComputedStyle(source);
  const ruler=document.createElement("div");
  ruler.setAttribute("aria-hidden","true");
  ruler.style.cssText="position:fixed;left:-100000px;top:0;visibility:hidden;pointer-events:none;margin:0;padding:0;border:0;box-sizing:content-box;contain:layout style paint;";
  for(const property of ["font-family","font-size","font-weight","font-style","font-stretch","font-kerning","font-feature-settings","font-variation-settings","font-variant-ligatures","letter-spacing","word-spacing","line-height","text-align","text-indent","text-transform","direction","white-space","overflow-wrap","word-break","tab-size","unicode-bidi"]){
    ruler.style.setProperty(property,computed.getPropertyValue(property));
  }
  ruler.style.width=computed.width;
  ruler.lang=source.closest("[lang]")?.getAttribute("lang")??"";
  ruler.textContent=source.textContent;
  document.body.appendChild(ruler);
  try{
    const text=ruler.firstChild!;
    const range=document.createRange();
    range.setStart(text,0);range.collapse(true);
    const firstLineTop=range.getBoundingClientRect().top;
    const origin=ruler.getBoundingClientRect();
    const height=parseFloat(computed.lineHeight)||parseFloat(computed.fontSize)||1;
    const positions=glyphs.map(glyph=>{
      range.setStart(text,glyph.start);range.setEnd(text,glyph.end);
      const rect=range.getBoundingClientRect();
      return {x:rect.left-origin.left,y:rect.top-firstLineTop,width:rect.width,height,fieldX:0,fieldWidth:0};
    });
    const rows=new Map<number,{left:number;right:number}>();
    for(const p of positions){
      const row=rows.get(p.y);rows.set(p.y,{left:Math.min(row?.left??p.x,p.x),right:Math.max(row?.right??p.x,p.x+p.width)});
    }
    for(const p of positions){const row=rows.get(p.y)!;p.fieldX=p.x-row.left;p.fieldWidth=Math.max(1,row.right-row.left);}
    return positions;
  }finally{ruler.remove();}
}
