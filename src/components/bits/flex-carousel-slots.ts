/*
 * FlexCarousel — slot/texture loader.
 * Loads an image into an ogl Texture, samples a placeholder color, and
 * reports loaded/failed state back to the engine via the slot object.
 */
import { Texture } from "ogl";
import type { OGLRenderingContext } from "ogl";
import type { Item, Slot } from "./flex-carousel-types";

export function loadSlot(
  gl: OGLRenderingContext,
  anisotropy: number,
  item: Item,
  index: number,
  alive: () => boolean,
  inSlots: (slot: Slot) => boolean,
  onDirty: () => void,
): Slot {
  const texture = new Texture(gl, {
    generateMipmaps: true,
    minFilter: gl.LINEAR_MIPMAP_LINEAR,
    magFilter: gl.LINEAR,
    anisotropy,
  });
  const slot: Slot = {
    item,
    index,
    texture,
    aspect: 0.8,
    loaded: false,
    failed: false,
    ready: 0,
    color: [0.5, 0.5, 0.5],
    image: [1, 1],
    dispose: () => {},
  };
  const image = new Image();
  image.crossOrigin = "anonymous";
  image.decoding = "async";
  image.onload = () => {
    if (!alive() || !inSlots(slot)) return;
    texture.image = image;
    texture.update();
    slot.image = [image.naturalWidth || 1, image.naturalHeight || 1];
    slot.aspect = slot.image[0] / slot.image[1];
    try {
      const probe = document.createElement("canvas");
      probe.width = 8;
      probe.height = 8;
      const ctx = probe.getContext("2d", { willReadFrequently: true });
      if (ctx) {
        ctx.drawImage(image, 0, 0, 8, 8);
        const data = ctx.getImageData(0, 0, 8, 8).data;
        let r = 0;
        let g = 0;
        let b = 0;
        for (let i = 0; i < data.length; i += 4) {
          r += data[i] ?? 0;
          g += data[i + 1] ?? 0;
          b += data[i + 2] ?? 0;
        }
        slot.color = [r / 64 / 255, g / 64 / 255, b / 64 / 255];
      }
    } catch {
      slot.color = [0.5, 0.5, 0.5];
    }
    slot.loaded = true;
    onDirty();
  };
  image.onerror = () => {
    if (!alive()) return;
    slot.failed = true;
    onDirty();
  };
  image.src = item.src;
  slot.dispose = () => {
    image.onload = null;
    image.onerror = null;
    gl.deleteTexture(texture.texture);
  };
  return slot;
}
