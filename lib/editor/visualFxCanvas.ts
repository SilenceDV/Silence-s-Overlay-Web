import type { ImageLayer } from "@/types/editor";
import { particleEffect, type ParticleEffect } from "./visualFx";

const TAU = Math.PI * 2;
export const MAX_FX_PIXELS = 1_000_000; // Per plane; two RGBA planes <= 8 MB.
export function canvasResolution(width: number, height: number, dpr: number) {
  const scale = Math.min(1.5, Math.max(.1, dpr), 1536 / Math.max(width, height), Math.sqrt(MAX_FX_PIXELS / (width * height)));
  return { width: Math.max(1, Math.floor(width * scale)), height: Math.max(1, Math.floor(height * scale)) };
}
export function seededRandom(seed: string) {
  let state = 2166136261;
  for (let i = 0; i < seed.length; i++) state = Math.imul(state ^ seed.charCodeAt(i), 16777619);
  return () => { state += 0x6D2B79F5; let t = state; t = Math.imul(t ^ t >>> 15, t | 1); t ^= t + Math.imul(t ^ t >>> 7, t | 61); return ((t ^ t >>> 14) >>> 0) / 4294967296; };
}

type Kind = "glow" | "smoke" | "spark" | "flame" | "shard" | "glint" | "confetti";
interface Particle {
  kind: Kind; front: boolean; x: number; y: number; vx: number; vy: number;
  size: number; depth: number; delay: number; life: number; rotation: number;
  spin: number; phase: number; gravity: number; color: string; secondary: boolean;
  shape: number[];
}
interface Arc { points: Float32Array; branches: Float32Array; delay: number; life: number; front: boolean }
interface Textures { primary: HTMLCanvasElement; secondary: HTMLCanvasElement; smokePrimary: HTMLCanvasElement; smokeSecondary: HTMLCanvasElement; flamePrimary?: HTMLCanvasElement; flameSecondary?: HTMLCanvasElement }
export interface FXScene {
  textures?: Textures;
  effect: ParticleEffect; particles: Particle[]; arcs: Arc[];
  width: number; height: number; padding: number; primary: string; secondary: string;
  size: number; opacity: number; intensity: number;
}
export function createFXScene(layer: ImageLayer, seed = layer.id): FXScene {
  const random = seededRandom(seed + layer.burstEffect);
  const effect = particleEffect(layer.burstEffect);
  const size = Math.max(.5, Math.min(2, layer.fxSize / 100));
  const spread = Math.max(.25, Math.min(2, (layer.fxSpread ?? 100) / 100));
  const intensity = Math.max(0, Math.min(1.5, layer.fxIntensity / 100));
  const width = Math.max(1, layer.w * 19.2), height = Math.max(1, layer.h * 10.8);
  const padding = 180 + 230 * spread + (effect === "fxSmoke" || effect === "fxImpact" ? 420 : 110) * size;
  const scene: FXScene = {effect, particles:[], arcs:[], width, height, padding, size, intensity, primary:layer.fxPrimaryColor, secondary:layer.fxSecondaryColor, opacity:layer.fxOpacity / 100};
  const count = Math.round((effect === "fxSmoke" ? 30 : effect === "fxElectric" ? 20 : 68) * intensity);
  for (let i = 0; i < count; i++) {
    const angle = (i / Math.max(1, count) + (random() - .5) * .075) * TAU;
    const depth = .4 + random() * .6, secondary = i % 3 === 0;
    let kind: Kind = "spark";
    if (effect === "fxSmoke") kind = "smoke";
    if (effect === "fxImpact") kind = i % 5 === 0 ? "smoke" : i % 9 === 0 ? "shard" : i % 7 === 0 ? "glow" : "spark";
    if (effect === "fxFireBurst") kind = i % 3 === 0 ? "spark" : "flame";
    if (effect === "fxIceShatter") kind = i % 3 === 0 ? "glint" : "shard";
    if (effect === "fxMagic") kind = i % 5 === 0 ? "glint" : "glow";
    if (effect === "fxConfetti") kind = "confetti";
    const speed = (90 + random() * 260) * spread * depth;
    const radius = .7 + random() * .35;
    const p: Particle = {kind, front:random() > (kind === "smoke" ? .7 : .25),
      x:Math.cos(angle) * width * .49 * radius, y:Math.sin(angle) * height * .49 * radius,
      vx:Math.cos(angle) * speed, vy:Math.sin(angle) * speed,
      size:(kind === "smoke" ? 105 + random() * 75 : kind === "flame" ? 36 + random() * 34 : kind === "shard" ? 10 + random() * 20 : kind === "confetti" ? 6 + random() * 9 : 1.5 + random() * 4) * size * depth,
      depth, delay:random() * .1, life:.45 + random() * .43, rotation:random() * TAU,
      spin:(random() - .5) * 16, phase:random() * TAU, gravity:140,
      color:secondary ? scene.secondary : scene.primary, secondary, shape:[],
    };
    if (kind === "smoke") { p.vx *= .45; p.vy = -80 - random() * 100; p.gravity = -40; p.life = .85; }
    if (kind === "flame") { p.vx *= .3; p.vy = -140 - random() * 170; p.gravity = -60; p.delay = random() * .25; p.life = .65; }
    if (effect === "fxMagic") { p.vx *= .22; p.vy = -30 - random() * 65; p.gravity = -15; p.delay = random() * .45; p.life = .3 + random() * .25; p.size *= kind === "glint" ? 3 : 1; }
    if (kind === "confetti") { p.vy = -150 - random() * 190; p.gravity = 520; p.life = .85; }
    if (kind === "shard") for (let j = 0; j < 5; j++) { const a = j / 5 * TAU; const r = .5 + random() * .5; p.shape.push(Math.cos(a) * r, Math.sin(a) * r * 1.7); }
    scene.particles.push(p);
  }
  if (effect === "fxElectric") {
    for (let i = 0; i < Math.round(14 * intensity); i++) {
      const angle = random() * TAU, length = .25 + random() * .8;
      const points = new Float32Array(26), branches = new Float32Array(10);
      for (let j = 0; j <= 12; j++) {
        const a = angle + length * j / 12, jitter = j === 0 || j === 12 ? 0 : (random() - .5) * 42 * spread;
        points[j * 2] = Math.cos(a) * (width * .53 + 12 + jitter);
        points[j * 2 + 1] = Math.sin(a) * (height * .53 + 12 + jitter);
      }
      for (let j = 0; j < 5; j++) { branches[j * 2] = points[12] + Math.cos(angle - .7) * j * 15 + (random() - .5) * 16; branches[j * 2 + 1] = points[13] + Math.sin(angle - .7) * j * 15 + (random() - .5) * 16; }
      scene.arcs.push({points, branches, delay:random() * .68, life:.1 + random() * .18, front:i % 3 !== 0});
    }
  }
  return scene;
}

// Small pre-rendered light and turbulent smoke textures. Bounded cache, no per-frame blur/filter work.
const sprites = new Map<string, HTMLCanvasElement>();
function sprite(color: string, smoke: boolean, flame = false) {
  const key = `${color}:${smoke}:${flame}`;
  const cached = sprites.get(key); if (cached) return cached;
  const canvas = document.createElement("canvas"); canvas.width = canvas.height = 128;
  const ctx = canvas.getContext("2d")!;
  // Canvas accepts CSS colors; malformed imported colors fall back without throwing.
  ctx.fillStyle = "#ffffff"; ctx.fillStyle = color; color = ctx.fillStyle;
  const random = seededRandom(key);
  if (flame) {
    // Curled tongues assembled once from soft light lobes, tapered toward the tip.
    for (let i = 0; i < 14; i++) {
      const t = i / 14, x = 64 + Math.sin(t * 7) * 13 * t, y = 106 - t * 91, r = 24 * (1 - t) + 3;
      const g = ctx.createRadialGradient(x,y,0,x,y,r);
      g.addColorStop(0, t < .4 ? "#fff7d6" : color); g.addColorStop(.35,color); g.addColorStop(1,"transparent");
      ctx.globalAlpha = .65 * (1 - t * .7); ctx.fillStyle = g; ctx.fillRect(0,0,128,128);
    }
  } else if (smoke) {
    for (let i = 0; i < 24; i++) {
      const a = random() * TAU, r = random() * 26, x = 64 + Math.cos(a) * r, y = 64 + Math.sin(a) * r;
      const g = ctx.createRadialGradient(x - 4, y - 5, 0, x, y, 18 + random() * 23);
      g.addColorStop(0, color); g.addColorStop(.4, color); g.addColorStop(1, "transparent");
      ctx.globalAlpha = .13 + random() * .12; ctx.fillStyle = g; ctx.fillRect(0, 0, 128, 128);
    }
  } else {
    const g = ctx.createRadialGradient(64, 64, 0, 64, 64, 64);
    g.addColorStop(0, "#ffffff"); g.addColorStop(.08, color); g.addColorStop(.25, color); g.addColorStop(1, "transparent");
    ctx.fillStyle = g; ctx.fillRect(0, 0, 128, 128);
  }
  if (sprites.size >= 24) sprites.delete(sprites.keys().next().value!);
  sprites.set(key, canvas); return canvas;
}
const envelope = (t: number) => Math.min(1, t * 12) * Math.pow(1 - t, 1.5);
function light(ctx: CanvasRenderingContext2D, texture: HTMLCanvasElement, x: number, y: number, r: number, alpha: number, stretch = 1) {
  ctx.globalAlpha = Math.max(0, alpha); ctx.drawImage(texture, x - r, y - r * stretch, r * 2, r * 2 * stretch);
}
export function prepareFX(scene: FXScene) {
  scene.textures = {
    primary:sprite(scene.primary,false), secondary:sprite(scene.secondary,false),
    smokePrimary:sprite(scene.primary,true), smokeSecondary:sprite(scene.secondary,true),
    ...(scene.effect === "fxFireBurst" ? {flamePrimary:sprite(scene.primary,false,true), flameSecondary:sprite(scene.secondary,false,true)} : {}),
  };
}
/** Analytic motion makes playback independent of frame rate; no React or array allocation here. */
export function drawFX(ctx: CanvasRenderingContext2D, scene: FXScene, time: number, front: boolean) {
  const {width, height, padding, opacity, effect} = scene;
  ctx.fillStyle = "#ffffff"; ctx.fillStyle = scene.primary; const primary = ctx.fillStyle;
  ctx.fillStyle = "#ff862e"; ctx.fillStyle = scene.secondary; const secondary = ctx.fillStyle;
  const cw = width + padding * 2, ch = height + padding * 2;
  ctx.setTransform(ctx.canvas.width / cw, 0, 0, ctx.canvas.height / ch, 0, 0);
  ctx.clearRect(0, 0, cw, ch);
  if (time >= 1 || time < 0 || opacity <= 0 || scene.intensity <= 0) return;
  ctx.save(); ctx.translate(cw / 2, ch / 2);
  if (!scene.textures) prepareFX(scene);
  const textures = scene.textures!;
  const primaryLight = textures.primary, secondaryLight = textures.secondary;
  if (!front && (effect === "fxImpact" || effect === "fxFireBurst" || effect === "fxIceShatter")) {
    ctx.globalCompositeOperation = "lighter";
    light(ctx, secondaryLight, 0, 0, Math.max(width, height) * (.6 + time * .6), Math.exp(-time * 9) * .8 * opacity);
    light(ctx, primaryLight, 0, 0, Math.max(width, height) * .65, Math.pow(Math.max(0, 1 - time / .13), 2) * opacity);
  }
  for (const p of scene.particles) {
    if (p.front !== front) continue;
    const t = (time - p.delay) / p.life; if (t <= 0 || t >= 1) continue;
    const motion = (1 - Math.exp(-3 * t)) / 3;
    const drift = Math.sin(p.phase + t * 5) - Math.sin(p.phase);
    const x = p.x + p.vx * motion + (p.kind === "smoke" || p.kind === "flame" || effect === "fxMagic" ? drift * 22 : 0);
    const y = p.y + p.vy * motion + p.gravity * t * t * .5;
    const alpha = Math.min(1, envelope(t) * p.depth * (p.kind === "spark" ? 2.2 : 1)) * opacity;
    const texture = p.secondary ? secondaryLight : primaryLight;
    ctx.globalCompositeOperation = p.kind === "smoke" || p.kind === "confetti" || p.kind === "shard" ? "source-over" : "lighter";
    ctx.save();
    if (p.kind === "smoke") {
      ctx.translate(x, y); ctx.rotate(p.rotation + t * .25);
      light(ctx, p.secondary ? textures.smokeSecondary : textures.smokePrimary, 0, 0, p.size * (.5 + t * 1.8), alpha * .85, .8 + p.depth * .35);
    } else if (p.kind === "flame") {
      const r = p.size * (1 - t * .75);
      ctx.translate(x,y); ctx.rotate(drift * .18);
      light(ctx, secondaryLight, 0, 0, r * 1.5, alpha * .22, 1.6);
      light(ctx, textures.flameSecondary!, 0, 0, r * 1.4, alpha, 1.8);
      light(ctx, textures.flamePrimary!, drift * 3, r * .45, r * .65, alpha, 1.5);
    } else if (p.kind === "spark") {
      const tx = p.vx * Math.exp(-3 * t), ty = p.vy * Math.exp(-3 * t) + p.gravity * t;
      const tail = .04 + p.depth * .1;
      light(ctx, texture, x, y, p.size * 3, alpha * .45);
      ctx.lineCap = "round"; ctx.strokeStyle = p.color; ctx.globalAlpha = alpha * .35; ctx.lineWidth = p.size * 2;
      ctx.beginPath(); ctx.moveTo(x - tx * tail, y - ty * tail); ctx.lineTo(x, y); ctx.stroke();
      ctx.strokeStyle = primary; ctx.globalAlpha = alpha; ctx.lineWidth = Math.max(1, p.size * .45);
      ctx.beginPath(); ctx.moveTo(x - tx * tail * .7, y - ty * tail * .7); ctx.lineTo(x, y); ctx.stroke();
    } else if (p.kind === "shard") {
      light(ctx, texture, x, y, p.size * 2, alpha * .14);
      ctx.translate(x, y); ctx.rotate(p.rotation + p.spin * t); ctx.scale(.3 + Math.abs(Math.cos(p.phase + t * 4)) * .7, 1);
      ctx.globalAlpha = alpha; const g = ctx.createLinearGradient(-p.size, -p.size, p.size, p.size);
      g.addColorStop(0, primary); g.addColorStop(.35, secondary); g.addColorStop(.5, primary); g.addColorStop(1, secondary);
      ctx.fillStyle = g; ctx.beginPath();
      for (let j = 0; j < p.shape.length; j += 2) { if (j === 0) ctx.moveTo(p.shape[j] * p.size, p.shape[j + 1] * p.size); else ctx.lineTo(p.shape[j] * p.size, p.shape[j + 1] * p.size); }
      ctx.closePath(); ctx.fill(); ctx.strokeStyle = primary; ctx.lineWidth = .8; ctx.stroke();
      ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(p.shape[0] * p.size, p.shape[1] * p.size); ctx.lineTo(p.shape[4] * p.size, p.shape[5] * p.size); ctx.stroke();
    } else if (p.kind === "confetti") {
      ctx.translate(x + drift * 16, y); ctx.rotate(p.rotation + p.spin * t); ctx.scale(Math.cos(p.phase + t * 12), 1);
      ctx.globalAlpha = Math.min(1, t * 20) * Math.min(1, (1 - t) * 5) * opacity;
      ctx.fillStyle = p.secondary ? secondary : p.phase < 2 ? primary : `hsl(${Math.round(p.phase * 57)},85%,65%)`;
      ctx.fillRect(-p.size / 2, -p.size, p.size, p.size * (p.phase < 1 ? 3 : 1.6));
      ctx.globalAlpha *= .45; ctx.fillStyle = "#ffffff"; ctx.fillRect(-p.size / 2, -p.size, p.size * .2, p.size * 1.6);
    } else {
      const twinkle = .6 + .4 * Math.sin(p.phase + t * 12) ** 2;
      light(ctx, texture, x, y, p.size * (p.kind === "glint" ? 3 : 4), alpha * twinkle * .45);
      if (p.kind === "glint") {
        ctx.translate(x, y); ctx.rotate(p.rotation + t * .4); ctx.globalAlpha = alpha * twinkle; ctx.fillStyle = primary;
        const r = p.size * Math.sin(t * Math.PI); ctx.beginPath(); ctx.moveTo(0, -r * 1.5);
        ctx.quadraticCurveTo(r * .12, -r * .12, r, 0); ctx.quadraticCurveTo(r * .12, r * .12, 0, r * 1.5);
        ctx.quadraticCurveTo(-r * .12, r * .12, -r, 0); ctx.quadraticCurveTo(-r * .12, -r * .12, 0, -r * 1.5); ctx.fill();
      } else { ctx.globalAlpha = alpha; ctx.fillStyle = primary; ctx.beginPath(); ctx.arc(x, y, p.size * .4, 0, TAU); ctx.fill(); }
    }
    ctx.restore();
  }
  ctx.globalCompositeOperation = "lighter";
  for (const arc of scene.arcs) {
    const t = (time - arc.delay) / arc.life; if (arc.front !== front || t < 0 || t > 1) continue;
    const tick = Math.floor(time * 45), flicker = tick % 3 === 0 ? .45 : 1;
    for (let path = 0; path < 2; path++) {
      const points = path === 0 ? arc.points : arc.branches;
      ctx.beginPath();
      for (let j = 0; j < points.length; j += 2) {
        const jitter = j === 0 || j === points.length - 2 ? 0 : Math.sin(j * 73 + tick * 91) * 9;
        if (j === 0) ctx.moveTo(points[j], points[j + 1]); else ctx.lineTo(points[j] + jitter, points[j + 1] - jitter);
      }
      ctx.lineJoin = "round"; ctx.strokeStyle = secondary;
      ctx.globalAlpha = opacity * flicker * Math.sqrt(1 - t) * .12; ctx.lineWidth = 15 * scene.size; ctx.stroke();
      ctx.globalAlpha *= 2; ctx.lineWidth = 6 * scene.size; ctx.stroke();
      ctx.globalAlpha = opacity * flicker * Math.sqrt(1 - t); ctx.strokeStyle = primary; ctx.lineWidth = 2 * scene.size; ctx.stroke();
    }
  }
  ctx.restore();
}
