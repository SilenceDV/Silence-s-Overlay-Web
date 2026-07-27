import { FlatCompat } from "@eslint/eslintrc";
const compat = new FlatCompat({ baseDirectory: import.meta.dirname });
const config = [
  ...compat.extends("next/core-web-vitals", "next/typescript"),
  { ignores: [".next/**", "archive/**", "next-env.d.ts"] },
  { files: ["components/editor/CanvasStage.tsx", "**/OverlayClient.tsx"], rules: { "@next/next/no-img-element": "off" } },
];
export default config;
