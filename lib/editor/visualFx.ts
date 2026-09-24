import type { VisualEffectType } from "@/types/editor";

export const visualEffects = ["none", "fxImpact", "fxSpark", "fxMagic", "fxComicImpact", "fxShockwave", "fxSparkles", "fxConfetti", "fxHearts", "fxElectric", "fxPixelBurst", "fxSmoke", "fxEnergyRing", "fxGlitch", "fxFireBurst", "fxIceShatter"] as const;
// Keep PR #25 values round-trippable, including its original burst aliases.
export const legacyFxAliases: Record<string, VisualEffectType> = {burstImpact:"fxComicImpact",burstRing:"fxShockwave",burstStar:"fxSparkles",burstComet:"fxSpark",burstShockwave:"fxShockwave",burstLoop:"fxSparkles",burstOnce:"fxComicImpact"};
export const fxOptions = [
  ["fxImpact", "Impact / Explosion"], ["fxSmoke", "Smoke Poof"],
  ["fxSpark", "Spark Burst"], ["fxElectric", "Electric"],
  ["fxFireBurst", "Fire Burst"], ["fxIceShatter", "Ice Shatter"],
  ["fxMagic", "Magic / Sparkle"], ["fxConfetti", "Confetti"],
] as const;
export type ParticleEffect = typeof fxOptions[number][0];
export function particleEffect(effect: VisualEffectType): ParticleEffect {
  switch (effect) {
    case "fxComicImpact": case "fxShockwave": case "fxPixelBurst": return "fxImpact";
    case "fxSparkles": case "fxHearts": case "fxEnergyRing": return "fxMagic";
    case "fxGlitch": return "fxElectric";
    case "none": return "fxImpact";
    default: return effect;
  }
}
export const fxPalettes: Record<ParticleEffect, [string, string]> = {
  fxImpact:["#ffffff","#ff862e"], fxSmoke:["#e5e7eb","#647080"],
  fxSpark:["#fff8db","#ffb52e"], fxElectric:["#ffffff","#32bdff"],
  fxFireBurst:["#fff0a6","#ff4b12"], fxIceShatter:["#efffff","#4bcfff"],
  fxMagic:["#ffffff","#b77bff"], fxConfetti:["#ff538b","#ffd166"],
};
