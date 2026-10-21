import { MAX_SIDE, WORKING_SIZE } from "./metallic-paint-shaders";

export const clamp = (value: number, min: number, max: number) =>
  Math.min(max, Math.max(min, value));

export type RGBA = [number, number, number, number];

export const parseColor = (() => {
  let context: CanvasRenderingContext2D | null = null;
  return (value: string, fallback: RGBA): RGBA => {
    if (typeof document === "undefined") return fallback;
    context ??= document.createElement("canvas").getContext("2d", { willReadFrequently: true });
    if (!context) return fallback;
    context.clearRect(0, 0, 1, 1);
    context.fillStyle = "rgba(0, 0, 0, 0)";
    context.fillStyle = String(value);
    context.fillRect(0, 0, 1, 1);
    const data = context.getImageData(0, 0, 1, 1).data;
    return [data[0]! / 255, data[1]! / 255, data[2]! / 255, data[3]! / 255];
  };
})();

const loadImage = (src: string) =>
  new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image();
    image.crossOrigin = "anonymous";
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error("MetallicPaint: failed to load the image"));
    image.src = src;
  });

const isVector = async (src: string) => {
  if (/\.svg($|[?#])/i.test(src) || src.startsWith("data:image/svg+xml")) return true;
  if (!src.startsWith("blob:")) return false;
  try {
    const blob = await (await fetch(src)).blob();
    return blob.type === "image/svg+xml";
  } catch {
    return false;
  }
};

export const drawImageSource = async (src: string) => {
  const [image, vector] = await Promise.all([loadImage(src), isVector(src)]);
  let width = image.naturalWidth || image.width || MAX_SIDE;
  let height = image.naturalHeight || image.height || MAX_SIDE;
  const longest = Math.max(width, height);
  const fit = vector ? MAX_SIDE / longest : clamp(1024 / longest, 1, MAX_SIDE / longest);
  width = Math.max(1, Math.round(width * fit));
  height = Math.max(1, Math.round(height * fit));
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d", { willReadFrequently: true })!;
  ctx.drawImage(image, 0, 0, width, height);
  const data = ctx.getImageData(0, 0, width, height);
  let opaque = true;
  for (let i = 3; i < data.data.length; i += 4) {
    if (data.data[i]! < 250) {
      opaque = false;
      break;
    }
  }
  if (opaque) {
    for (let i = 0; i < data.data.length; i += 4) {
      const light = Math.min(data.data[i]!, data.data[i + 1]!, data.data[i + 2]!);
      data.data[i + 3] = Math.round(clamp((250 - light) / 30, 0, 1) * 255);
    }
    ctx.putImageData(data, 0, 0);
  }
  return canvas;
};

export const drawTextSource = async (text: string, fontFamily: string, fontWeight: number) => {
  const size = 320;
  const font = `${fontWeight} ${size}px ${fontFamily}`;
  try {
    await document.fonts?.load(font, text);
  } catch {
    return null;
  }
  const probe = document.createElement("canvas").getContext("2d")!;
  probe.font = font;
  const metrics = probe.measureText(text);
  const ascent = metrics.actualBoundingBoxAscent || size * 0.8;
  const descent = metrics.actualBoundingBoxDescent || size * 0.2;
  const left = metrics.actualBoundingBoxLeft || 0;
  const right = metrics.actualBoundingBoxRight || metrics.width;
  const pad = size * 0.12;
  const canvas = document.createElement("canvas");
  canvas.width = Math.ceil(left + right + pad * 2);
  canvas.height = Math.ceil(ascent + descent + pad * 2);
  const ctx = canvas.getContext("2d")!;
  ctx.font = font;
  ctx.fillStyle = "#000";
  ctx.textBaseline = "alphabetic";
  ctx.fillText(text, pad + left, pad + ascent);
  return canvas;
};

const solvePoisson = (mask: Uint8Array, width: number, height: number) => {
  const interior: number[] = [];
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const i = y * width + x;
      if (!mask[i]) continue;
      const boundary =
        x === 0 ||
        y === 0 ||
        x === width - 1 ||
        y === height - 1 ||
        !mask[i - 1] ||
        !mask[i + 1] ||
        !mask[i - width] ||
        !mask[i + width] ||
        !mask[i - width - 1] ||
        !mask[i - width + 1] ||
        !mask[i + width - 1] ||
        !mask[i + width + 1];
      if (!boundary) interior.push(i);
    }
  }
  const field = new Float32Array(width * height);
  const red: number[] = [];
  const black: number[] = [];
  interior.forEach((i) =>
    ((i % width) + Math.floor(i / width)) % 2 === 0 ? red.push(i) : black.push(i),
  );
  const relax = (list: number[]) => {
    for (let k = 0; k < list.length; k++) {
      const i = list[k]!;
      const sum = field[i + 1]! + field[i - 1]! + field[i - width]! + field[i + width]!;
      field[i] = 1.9 * ((0.01 + sum) / 4) - 0.9 * field[i]!;
    }
  };
  for (let iteration = 0; iteration < 40; iteration++) {
    relax(red);
    relax(black);
  }
  let peak = 0;
  interior.forEach((i) => {
    if (field[i]! > peak) peak = field[i]!;
  });
  return { field, peak: peak || 1 };
};

export const processShape = (source: HTMLCanvasElement) => {
  const width = source.width;
  const height = source.height;
  const fit = WORKING_SIZE / Math.min(width, height);
  const workW = Math.max(2, Math.round(width * fit));
  const workH = Math.max(2, Math.round(height * fit));

  const small = document.createElement("canvas");
  small.width = workW;
  small.height = workH;
  const smallCtx = small.getContext("2d", { willReadFrequently: true })!;
  smallCtx.drawImage(source, 0, 0, workW, workH);
  const smallData = smallCtx.getImageData(0, 0, workW, workH).data;
  const mask = new Uint8Array(workW * workH);
  for (let i = 0; i < mask.length; i++) mask[i] = smallData[i * 4 + 3]! > 0 ? 1 : 0;

  const { field, peak } = solvePoisson(mask, workW, workH);
  const gradient = smallCtx.createImageData(workW, workH);
  for (let i = 0; i < mask.length; i++) {
    const p = i * 4;
    const value = mask[i] ? 255 * (1 - field[i]! / peak) : 255;
    gradient.data[p] = value;
    gradient.data[p + 1] = value;
    gradient.data[p + 2] = value;
    gradient.data[p + 3] = mask[i] ? 255 : 0;
  }
  smallCtx.putImageData(gradient, 0, 0);

  const out = document.createElement("canvas");
  out.width = width;
  out.height = height;
  const outCtx = out.getContext("2d", { willReadFrequently: true })!;
  outCtx.imageSmoothingEnabled = true;
  outCtx.imageSmoothingQuality = "high";
  outCtx.drawImage(small, 0, 0, workW, workH, 0, 0, width, height);
  const result = outCtx.getImageData(0, 0, width, height);
  const original = source
    .getContext("2d", { willReadFrequently: true })!
    .getImageData(0, 0, width, height).data;
  for (let i = 0; i < result.data.length; i += 4) {
    const alpha = original[i + 3]!;
    if (alpha === 0) {
      result.data[i] = 255;
      result.data[i + 1] = 0;
    } else {
      result.data[i] = result.data[i + 3] === 0 ? 0 : result.data[i]!;
      result.data[i + 1] = alpha;
    }
    result.data[i + 2] = 255;
    result.data[i + 3] = 255;
  }
  return result;
};

export const compile = (gl: WebGL2RenderingContext, type: number, source: string) => {
  const shader = gl.createShader(type);
  if (!shader) return null;
  gl.shaderSource(shader, source);
  gl.compileShader(shader);
  if (gl.getShaderParameter(shader, gl.COMPILE_STATUS)) return shader;
  gl.deleteShader(shader);
  return null;
};
