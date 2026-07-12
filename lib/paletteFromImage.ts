/**
 * Extract a small brand palette from an uploaded logo/icon — client-side, zero
 * dependency. Downscales the image onto a canvas, buckets pixels into a coarse
 * RGB grid, and ranks buckets by frequency × saturation so a vivid brand colour
 * wins over the large flat background. Near-white / near-black / low-saturation
 * greys are dropped because they make poor brand seeds. The top result feeds the
 * existing generateRamp() just like a hand-typed hex would.
 */
import { RGB, rgbToHex, rgbToHsl } from "@/lib/color";

/** Load a File (from an <input type=file> / drop) into a decoded image. */
export function fileToImage(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("Could not read that image"));
    };
    img.src = url;
  });
}

/**
 * Rank the image's dominant vivid colours, most prominent first. Returns up to
 * `count` hex strings; empty if the image is all grey/transparent or the canvas
 * is tainted (cross-origin). Callers should treat an empty result as "let the
 * user type a hex instead".
 */
export function extractPalette(img: HTMLImageElement, count = 5): string[] {
  const size = 64; // small sample — plenty for a stable dominant colour
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  if (!ctx) return [];
  ctx.drawImage(img, 0, 0, size, size);

  let data: Uint8ClampedArray;
  try {
    data = ctx.getImageData(0, 0, size, size).data;
  } catch {
    return []; // cross-origin taint — cannot read pixels
  }

  interface Bucket { r: number; g: number; b: number; n: number; score: number }
  const buckets = new Map<string, Bucket>();

  for (let i = 0; i < data.length; i += 4) {
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];
    const alpha = data[i + 3];
    if (alpha < 125) continue; // transparent logo areas
    const { s, l } = rgbToHsl({ r, g, b });
    if (l > 92 || l < 8) continue; // near-white / near-black
    if (s < 12) continue; // flat greys make weak brand seeds
    const key = `${r >> 4}-${g >> 4}-${b >> 4}`; // 16-level-per-channel grid
    const bucket = buckets.get(key) ?? { r: 0, g: 0, b: 0, n: 0, score: 0 };
    bucket.r += r;
    bucket.g += g;
    bucket.b += b;
    bucket.n += 1;
    bucket.score += 1 + s / 100; // frequency, biased toward vivid colours
    buckets.set(key, bucket);
  }

  return Array.from(buckets.values())
    .sort((a, b) => b.score - a.score)
    .slice(0, count)
    .map((bk): RGB => ({ r: bk.r / bk.n, g: bk.g / bk.n, b: bk.b / bk.n }))
    .map(rgbToHex);
}
