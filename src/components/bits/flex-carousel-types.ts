/*
 * FlexCarousel — shared types, presets, and constants.
 * Split out so the engine stays focused on the animation + WebGL lifecycle.
 */

export type FlexCarouselItem = {
  src: string;
  alt: string;
  title?: string;
  subtitle?: string;
};

export type FlexCarouselPreset = "liquid" | "ribbon" | "vortex" | "arch";
export type FlexCarouselIntro = "rise" | "bloom" | "spin" | "deal" | "fade" | "none";
export type FlexCarouselFit = "natural" | "portrait" | "square" | "landscape";
export type FlexCarouselCurl = "twist" | "rise" | "fall" | number;

export type Item = FlexCarouselItem;

export type Settings = {
  intro: FlexCarouselIntro;
  cardHeight: number;
  gap: number;
  radius: number;
  fit: FlexCarouselFit;
  lensWidth: number;
  lensHeight: number;
  tilt: number;
  roundness: number;
  bend: number;
  reach: number;
  curl: FlexCarouselCurl;
  dispersion: number;
  liquid: number;
  followCursor: boolean;
  squeeze: number;
  focusOnClick: boolean;
  autoplay: boolean;
  interval: number;
  captureWheel: boolean;
};

export type Callbacks = {
  onChange?: ((index: number, item: Item) => void) | undefined;
  onSelect?: ((index: number, item: Item) => void) | undefined;
};

export type Slot = {
  item: Item;
  index: number;
  texture: import("ogl").Texture;
  aspect: number;
  loaded: boolean;
  failed: boolean;
  ready: number;
  color: [number, number, number];
  image: [number, number];
  dispose: () => void;
};

export type Draw = {
  i: number;
  rel: number;
  x: number;
  y: number;
  cw: number;
  ch: number;
  alpha: number;
};

export type Instance = {
  index: number;
  x0: number;
  x1: number;
  y0: number;
  y1: number;
};

export type EngineRefs = {
  settingsRef: { current: Settings | null };
  itemsRef: { current: Item[] };
  callbacksRef: { current: Callbacks };
  setRevealed: (v: boolean) => void;
  setActive: (v: number) => void;
  setFocusOpen: (v: boolean) => void;
};

export type FlexCarouselHandle = {
  destroy: () => void;
};

type Preset = {
  lensWidth: number;
  lensHeight: number;
  tilt: number;
  roundness: number;
  bend: number;
  reach: number;
  curl: FlexCarouselCurl;
  dispersion: number;
  liquid: number;
  followCursor: boolean;
};

export const BEND_PRESETS: Record<FlexCarouselPreset, Preset> = {
  liquid: {
    lensWidth: 0.74,
    lensHeight: 1.18,
    tilt: 62,
    roundness: 1,
    bend: 0.34,
    reach: 0.38,
    curl: "twist",
    dispersion: 0.45,
    liquid: 0,
    followCursor: false,
  },
  ribbon: {
    lensWidth: 0.8,
    lensHeight: 0.8,
    tilt: 0,
    roundness: 1,
    bend: 0.34,
    reach: 0.34,
    curl: "twist",
    dispersion: 0.4,
    liquid: 0,
    followCursor: false,
  },
  vortex: {
    lensWidth: 0.7,
    lensHeight: 0.95,
    tilt: 30,
    roundness: 1,
    bend: 0.46,
    reach: 0.3,
    curl: "twist",
    dispersion: 0.5,
    liquid: 0,
    followCursor: false,
  },
  arch: {
    lensWidth: 0.8,
    lensHeight: 0.8,
    tilt: 0,
    roundness: 1,
    bend: 0.3,
    reach: 0.36,
    curl: "rise",
    dispersion: 0.4,
    liquid: 0,
    followCursor: false,
  },
};

export const FIT_ASPECT: Record<string, number> = {
  portrait: 0.75,
  square: 1,
  landscape: 4 / 3,
};

export const TAPS = 12;
export const PIXEL_BUDGET = 4.5e6;
export const INTRO_DURATION: Record<string, number> = {
  rise: 2.1,
  bloom: 1.6,
  spin: 2.2,
  deal: 1.5,
  fade: 0.35,
  none: 1,
};

export type Metrics = {
  cardH: number;
  widths: number[];
  centers: number[];
  gap: number;
  loop: number;
};
