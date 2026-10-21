import { useEffect, useRef } from "react";

import "./metallic-paint.css";
import { FRAGMENT, MAX_PIXELS, VERTEX } from "./metallic-paint-shaders";
import {
  clamp,
  compile,
  drawImageSource,
  drawTextSource,
  parseColor,
  processShape,
  type RGBA,
} from "./metallic-paint-helpers";

export type MetallicPaintHandle = {
  setPending: (value: boolean) => void;
  setImage: (data: ImageData | null) => void;
  wake: () => void;
  redraw: () => void;
};

export type MetallicPaintProps = {
  imageSrc?: string;
  text?: string;
  fontFamily?: string;
  fontWeight?: number;
  color?: string;
  backgroundColor?: string;
  density?: number;
  softness?: number;
  dispersion?: number;
  distortion?: number;
  edgeBend?: number;
  angle?: number;
  speed?: number;
  scale?: number;
  rotation?: number;
  mouseTilt?: number;
  lightMode?: boolean;
  intro?: boolean;
  paused?: boolean;
  dpr?: number;
  className?: string;
  style?: React.CSSProperties;
};

export function MetallicPaint({
  imageSrc,
  text,
  fontFamily = "system-ui, sans-serif",
  fontWeight = 800,
  color = "#ffffff",
  backgroundColor = "transparent",
  density = 2,
  softness = 0.1,
  dispersion = 0.3,
  distortion = 0.07,
  edgeBend = 0.6,
  angle = 70,
  speed = 1,
  scale = 0.6,
  rotation = 0,
  mouseTilt = 0.5,
  lightMode = false,
  intro = true,
  paused = false,
  dpr,
  className = "",
  style,
}: MetallicPaintProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const engineRef = useRef<MetallicPaintHandle | null>(null);
  const settingsRef = useRef<{
    tint: RGBA;
    back: RGBA;
    density: number;
    softness: number;
    dispersion: number;
    distortion: number;
    edgeBend: number;
    angle: number;
    speed: number;
    scale: number;
    rotation: number;
    mouseTilt: number;
    lightMode: boolean;
    intro: boolean;
    paused: boolean;
    dpr?: number | undefined;
  }>(null);

  settingsRef.current = {
    tint: parseColor(color, [1, 1, 1, 1]),
    back: parseColor(backgroundColor, [0, 0, 0, 0]),
    density: clamp(density, 0.5, 12),
    softness: clamp(softness, 0, 1),
    dispersion: clamp(dispersion, -1, 1),
    distortion: clamp(distortion, 0, 1),
    edgeBend: clamp(edgeBend, 0, 1),
    angle,
    speed,
    scale: Math.max(0.05, scale),
    rotation,
    mouseTilt: clamp(mouseTilt, 0, 1.5),
    lightMode,
    intro,
    paused,
    dpr,
  };

  useEffect(() => {
    const container = containerRef.current;
    const canvas = canvasRef.current;
    if (!container || !canvas) return undefined;
    const gl = canvas.getContext("webgl2", {
      alpha: true,
      premultipliedAlpha: true,
      antialias: false,
    });
    if (!gl) return undefined;
    const vertex = compile(gl, gl.VERTEX_SHADER, VERTEX);
    const fragment = compile(gl, gl.FRAGMENT_SHADER, FRAGMENT);
    const program = gl.createProgram();
    if (!vertex || !fragment || !program) return undefined;
    gl.attachShader(program, vertex);
    gl.attachShader(program, fragment);
    gl.linkProgram(program);
    gl.deleteShader(vertex);
    gl.deleteShader(fragment);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) return undefined;
    gl.useProgram(program);

    const uniforms: Record<string, WebGLUniformLocation | null> = {};
    const count = gl.getProgramParameter(program, gl.ACTIVE_UNIFORMS);
    for (let i = 0; i < count; i++) {
      const info = gl.getActiveUniform(program, i);
      if (info) uniforms[info.name] = gl.getUniformLocation(program, info.name);
    }

    const vao = gl.createVertexArray();
    const buffer = gl.createBuffer();
    gl.bindVertexArray(vao);
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
    gl.enableVertexAttribArray(0);
    gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);

    const texture = gl.createTexture();
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.texImage2D(
      gl.TEXTURE_2D,
      0,
      gl.RGBA,
      1,
      1,
      0,
      gl.RGBA,
      gl.UNSIGNED_BYTE,
      new Uint8Array([255, 0, 255, 255]),
    );
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.uniform1i(uniforms["u_image"]!, 0);

    const reduce = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ?? false;
    const state = {
      raf: 0,
      last: 0,
      time: 0,
      visible: true,
      pending: false,
      hasImage: false,
      imageAspect: 1,
      width: 0,
      height: 0,
      revealStart: -1,
      reveal: settingsRef.current!.intro && !reduce ? 0 : 1,
      tiltX: 0,
      tiltY: 0,
      velocityX: 0,
      velocityY: 0,
      targetX: 0,
      targetY: 0,
      alive: true,
    };

    const resize = () => {
      const s = settingsRef.current!;
      const rect = container.getBoundingClientRect();
      const base = s.dpr ?? Math.min(window.devicePixelRatio || 1, 2);
      let ratio = Math.max(base, 2);
      const pixels = rect.width * rect.height * ratio * ratio;
      if (pixels > MAX_PIXELS) ratio *= Math.sqrt(MAX_PIXELS / pixels);
      const width = Math.max(1, Math.round(rect.width * ratio));
      const height = Math.max(1, Math.round(rect.height * ratio));
      if (width === state.width && height === state.height) return;
      state.width = width;
      state.height = height;
      canvas.width = width;
      canvas.height = height;
      gl.viewport(0, 0, width, height);
    };

    const draw = () => {
      const s = settingsRef.current!;
      if (state.pending || !state.hasImage) {
        gl.clearColor(0, 0, 0, 0);
        gl.clear(gl.COLOR_BUFFER_BIT);
        return;
      }
      gl.useProgram(program);
      gl.uniform2f(uniforms["u_resolution"]!, state.width, state.height);
      gl.uniform1f(uniforms["u_time"]!, state.time);
      gl.uniform1f(uniforms["u_imageAspect"]!, state.imageAspect);
      gl.uniform1f(uniforms["u_scale"]!, s.scale);
      gl.uniform1f(uniforms["u_rotation"]!, s.rotation);
      gl.uniform4f(uniforms["u_colorBack"]!, s.back[0], s.back[1], s.back[2], s.back[3]);
      gl.uniform4f(uniforms["u_colorTint"]!, s.tint[0], s.tint[1], s.tint[2], s.tint[3]);
      gl.uniform1f(uniforms["u_softness"]!, s.softness);
      gl.uniform1f(uniforms["u_repetition"]!, s.density);
      gl.uniform1f(uniforms["u_shiftRed"]!, s.dispersion);
      gl.uniform1f(uniforms["u_shiftBlue"]!, s.dispersion);
      gl.uniform1f(uniforms["u_distortion"]!, s.distortion);
      gl.uniform1f(uniforms["u_contour"]!, s.edgeBend);
      gl.uniform1f(uniforms["u_angle"]!, s.angle);
      gl.uniform2f(uniforms["u_tilt"]!, state.tiltX, state.tiltY);
      gl.uniform1f(uniforms["u_reveal"]!, state.reveal);
      gl.uniform1f(uniforms["u_light"]!, s.lightMode ? 1 : 0);
      gl.clearColor(0, 0, 0, 0);
      gl.clear(gl.COLOR_BUFFER_BIT);
      gl.bindVertexArray(vao);
      gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
    };

    const frame = (now: number) => {
      state.raf = 0;
      if (!state.alive) return;
      const s = settingsRef.current!;
      const dt = state.last ? Math.min(0.05, (now - state.last) / 1000) : 1 / 60;
      state.last = now;
      const moving = !s.paused && !reduce && s.speed !== 0;
      if (moving) state.time += dt * s.speed;

      let busy = moving;
      if (state.reveal < 1 && !state.pending) {
        if (state.revealStart < 0) state.revealStart = now;
        const progress = clamp((now - state.revealStart) / 1600, 0, 1);
        state.reveal = 1 - (1 - progress) ** 3;
        if (moving) state.time += dt * 2.4 * (1 - progress) ** 2;
        busy = true;
      }

      const stiffness = 60;
      const damping = 14;
      const steps = Math.max(1, Math.ceil(dt / (1 / 240)));
      const h = dt / steps;
      for (let i = 0; i < steps; i++) {
        state.velocityX +=
          (stiffness * (state.targetX * s.mouseTilt - state.tiltX) - damping * state.velocityX) * h;
        state.velocityY +=
          (stiffness * (state.targetY * s.mouseTilt - state.tiltY) - damping * state.velocityY) * h;
        state.tiltX += state.velocityX * h;
        state.tiltY += state.velocityY * h;
      }
      if (
        Math.abs(state.targetX * s.mouseTilt - state.tiltX) > 0.0005 ||
        Math.abs(state.targetY * s.mouseTilt - state.tiltY) > 0.0005 ||
        Math.abs(state.velocityX) + Math.abs(state.velocityY) > 0.0005
      ) {
        busy = true;
      }

      draw();
      if (busy && state.visible) state.raf = requestAnimationFrame(frame);
      else state.last = 0;
    };

    const wake = () => {
      if (!state.raf && state.alive && state.visible) state.raf = requestAnimationFrame(frame);
    };

    const onMove = (event: PointerEvent) => {
      const rect = container.getBoundingClientRect();
      state.targetX = clamp(((event.clientX - rect.left) / rect.width) * 2 - 1, -1.2, 1.2);
      state.targetY = clamp(((event.clientY - rect.top) / rect.height) * 2 - 1, -1.2, 1.2);
      wake();
    };

    const onLeave = () => {
      state.targetX = 0;
      state.targetY = 0;
      wake();
    };

    const resizeObserver = new ResizeObserver(() => {
      resize();
      draw();
    });
    resizeObserver.observe(container);

    const visibility = new IntersectionObserver((entries) => {
      state.visible = entries.some((entry) => entry.isIntersecting);
      if (state.visible) wake();
    });
    visibility.observe(container);

    const onLost = (event: Event) => {
      event.preventDefault();
      state.alive = false;
      cancelAnimationFrame(state.raf);
    };

    canvas.addEventListener("webglcontextlost", onLost);
    container.addEventListener("pointermove", onMove);
    container.addEventListener("pointerleave", onLeave);

    engineRef.current = {
      setPending: (value: boolean) => {
        state.pending = value;
        draw();
      },
      setImage: (data: ImageData | null) => {
        state.pending = false;
        gl.bindTexture(gl.TEXTURE_2D, texture);
        if (data) {
          gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, data);
          gl.generateMipmap(gl.TEXTURE_2D);
          gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR);
          state.imageAspect = data.width / data.height;
          state.hasImage = true;
        } else {
          gl.texImage2D(
            gl.TEXTURE_2D,
            0,
            gl.RGBA,
            1,
            1,
            0,
            gl.RGBA,
            gl.UNSIGNED_BYTE,
            new Uint8Array([255, 0, 255, 255]),
          );
          gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
          state.imageAspect = 1;
          state.hasImage = false;
        }
        draw();
        wake();
      },
      wake,
      redraw: () => {
        resize();
        draw();
        wake();
      },
    };

    resize();
    draw();
    wake();

    return () => {
      state.alive = false;
      cancelAnimationFrame(state.raf);
      resizeObserver.disconnect();
      visibility.disconnect();
      canvas.removeEventListener("webglcontextlost", onLost);
      container.removeEventListener("pointermove", onMove);
      container.removeEventListener("pointerleave", onLeave);
      engineRef.current = null;
      gl.deleteTexture(texture);
      gl.deleteBuffer(buffer);
      gl.deleteVertexArray(vao);
      gl.deleteProgram(program);
    };
  }, []);

  useEffect(() => {
    let active = true;
    const source = text
      ? drawTextSource(text, fontFamily, fontWeight)
      : imageSrc
        ? drawImageSource(imageSrc)
        : null;
    if (!source) {
      engineRef.current?.setImage(null);
      return undefined;
    }
    engineRef.current?.setPending(true);
    source
      .then((canvas) => {
        if (!active || !canvas) return;
        const data = processShape(canvas);
        if (active) engineRef.current?.setImage(data);
      })
      .catch(() => {
        if (active) engineRef.current?.setImage(null);
      });
    return () => {
      active = false;
    };
  }, [imageSrc, text, fontFamily, fontWeight]);

  useEffect(() => {
    engineRef.current?.redraw();
  });

  return (
    <div ref={containerRef} className={`metallic-paint ${className}`.trim()} style={style}>
      <canvas ref={canvasRef} className="metallic-paint-canvas" />
    </div>
  );
}
