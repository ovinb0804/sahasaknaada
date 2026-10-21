/*
 * TearTicket — thin view layer.
 * Geometry + physics live in tear-ticket-geometry.ts and tear-ticket-sim.ts;
 * this module owns the DOM refs, pointer wiring, and tilt spring.
 */
import {
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type ReactNode,
} from "react";
import { motion, useMotionTemplate, useReducedMotion, useSpring, useTransform } from "motion/react";

import "./tear-ticket.css";
import { buildGeometry, type Geometry } from "./tear-ticket-geometry";
import { createSim } from "./tear-ticket-sim";

const TILT_SPRING = { stiffness: 220, damping: 24, mass: 0.6 };
const ART_INSET = 8;
const ART_SPAN = 0.78;

type TearTicketProps = {
  children?: ReactNode;
  stub?: ReactNode;
  image?: string;
  imageAlt?: string;
  scrim?: boolean;
  imageRadius?: number;
  orientation?: "horizontal" | "vertical";
  torn?: boolean;
  defaultTorn?: boolean;
  onTear?: () => void;
  width?: number;
  height?: number;
  stubSize?: number;
  radius?: number;
  holes?: number;
  holeSize?: number;
  notch?: number;
  roughness?: number;
  tearAngle?: number;
  stretch?: number;
  resistance?: number;
  rotate?: number;
  tilt?: boolean;
  tiltMax?: number;
  tiltReach?: number;
  parallax?: number;
  perspective?: number;
  background?: string;
  color?: string;
  border?: boolean;
  borderColor?: string;
  borderWidth?: number;
  stubBackground?: string;
  recenter?: boolean;
  disabled?: boolean;
  ariaLabel?: string;
  className?: string;
};

export default function TearTicket({
  children = null,
  stub = null,
  image = "",
  imageAlt = "",
  scrim = true,
  imageRadius = 8,
  orientation = "horizontal",
  torn,
  defaultTorn = false,
  onTear,
  width = 460,
  height = 250,
  stubSize = 150,
  radius = 16,
  holes = 12,
  holeSize = 6,
  notch = 3,
  roughness = 0,
  tearAngle = 30,
  stretch = 30,
  resistance = 0.45,
  rotate = 4,
  tilt = true,
  tiltMax = 9,
  tiltReach = 260,
  parallax = 6,
  perspective = 1000,
  background = "#27272a",
  color = "#f5f5f5",
  border = true,
  borderColor = "",
  borderWidth = 1,
  stubBackground = "",
  recenter = true,
  disabled = false,
  ariaLabel = "Tear off the stub",
  className = "",
}: TearTicketProps) {
  const reduce = useReducedMotion();
  const controlled = torn !== undefined;
  const [inner, setInner] = useState(defaultTorn);
  const used = controlled ? Boolean(torn) : inner;
  const [grabbing, setGrabbing] = useState(false);
  const [instant, setInstant] = useState(used);
  const [fit, setFit] = useState(1);

  const rootRef = useRef<HTMLDivElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const bodyRef = useRef<HTMLDivElement>(null);
  const stubRef = useRef<HTMLDivElement>(null);
  const fibres = useRef<(SVGPathElement | null)[]>([]);

  const vertical = orientation === "vertical";
  const geo: Geometry = useMemo(
    () =>
      buildGeometry(width, height, stubSize, radius, holes, holeSize, notch, roughness, vertical),
    [width, height, stubSize, radius, holes, holeSize, notch, roughness, vertical],
  );

  const sim = useMemo(
    () =>
      createSim(
        { geo, tearAngle, stretch, resistance, reduce, onTear: onTear as (() => void) | undefined },
        {
          stubEl: () => stubRef.current,
          bodyEl: () => bodyRef.current,
          fibres: () => fibres.current,
          setUsed: () => {
            if (!controlled) setInner(true);
          },
        },
      ),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [geo, tearAngle, stretch, resistance, reduce, onTear],
  );

  const tiltX = useSpring(0, TILT_SPRING);
  const tiltY = useSpring(0, TILT_SPRING);
  const plane = useMotionTemplate`perspective(${perspective}px) rotate(${rotate}deg) rotateX(${tiltX}deg) rotateY(${tiltY}deg)`;
  const depth = tiltMax > 0 ? parallax / tiltMax : 0;
  const artX = useTransform(tiltY, (v) => -v * depth);
  const artY = useTransform(tiltX, (v) => v * depth);
  const art = useMotionTemplate`translate(${artX}px, ${artY}px)`;
  const inkX = useTransform(tiltY, (v) => v * depth * 0.22);
  const inkY = useTransform(tiltX, (v) => -v * depth * 0.22);
  const ink = useMotionTemplate`translate(${inkX}px, ${inkY}px)`;

  useLayoutEffect(() => {
    const el = rootRef.current;
    if (!el) return undefined;
    const measure = () => setFit(Math.min(1, el.clientWidth / width) || 1);
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, [width]);

  useEffect(() => {
    if (used) {
      const s = sim;
      if (!sim.isBusy() && stubRef.current) stubRef.current.style.visibility = "hidden";
      return;
    }
    setInstant(false);
    sim.reset();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [used]);

  useEffect(() => {
    sim.reset();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [geo]);

  useEffect(() => {
    if (!tilt || reduce || disabled) return undefined;
    const move = (e: PointerEvent) => {
      const el = rootRef.current;
      if (!el || e.pointerType === "touch" || sim.isBusy()) return;
      const r = el.getBoundingClientRect();
      const half = r.width / 2 + tiltReach;
      const nx = Math.max(
        -1,
        Math.min(1, (e.clientX - (r.left + r.width / 2)) / (r.width / 2 + tiltReach)),
      );
      const ny = Math.max(
        -1,
        Math.min(1, (e.clientY - (r.top + r.height / 2)) / (r.height / 2 + tiltReach)),
      );
      void half;
      tiltY.set(nx * tiltMax);
      tiltX.set(-ny * tiltMax);
    };
    window.addEventListener("pointermove", move);
    return () => window.removeEventListener("pointermove", move);
  }, [tilt, reduce, disabled, tiltMax, tiltReach, sim, tiltX, tiltY]);

  const local = (e: React.PointerEvent) => {
    const r = stageRef.current?.getBoundingClientRect();
    if (!r) return { x: 0, y: 0 };
    const k = r.width / width || 1;
    return { x: (e.clientX - r.left) / k, y: (e.clientY - r.top) / k };
  };
  const onStubDown = (e: React.PointerEvent) => {
    if (disabled || used || e.button !== 0) return;
    try {
      e.currentTarget.setPointerCapture(e.pointerId);
    } catch {
      /* ignore */
    }
    tiltX.set(0);
    tiltY.set(0);
    setGrabbing(true);
    sim.startHold(local(e), e.pointerId);
  };
  const onStubMove = (e: React.PointerEvent) => {
    sim.move(local(e));
  };
  const onStubUp = (e: React.PointerEvent) => {
    try {
      if (e.currentTarget.hasPointerCapture(e.pointerId))
        e.currentTarget.releasePointerCapture(e.pointerId);
    } catch {
      /* ignore */
    }
    setGrabbing(false);
    sim.release();
  };
  const onStubKey = (e: React.KeyboardEvent) => {
    if (disabled || used || (e.key !== "Enter" && e.key !== " ")) return;
    e.preventDefault();
    if (!e.repeat) {
      setInstant(true);
      sim.tearNow();
    }
  };

  const styleVars: CSSProperties = {
    // @ts-expect-error custom properties
    "--tt-w": `${width}px`,
    "--tt-h": `${height}px`,
    "--tt-stub": `${stubSize}px`,
    "--tt-bg": background,
    "--tt-stub-bg": stubBackground || background,
    "--tt-ink": color,
    "--tt-edge": borderColor || `color-mix(in srgb, ${color} 16%, transparent)`,
    "--tt-edge-w": borderWidth,
    "--tt-parallax": `${parallax}px`,
    "--tt-body-w": `${vertical ? width : width - stubSize}px`,
    "--tt-body-h": `${vertical ? height - stubSize : height}px`,
    "--tt-inset": `${ART_INSET}px`,
    "--tt-span": ART_SPAN,
    "--tt-art-radius": `${imageRadius}px`,
    "--tt-fit": fit,
    height: `${height * fit}px`,
  };

  return (
    <div
      ref={rootRef}
      className={`tear-ticket${className ? ` ${className}` : ""}`}
      data-used={used ? "" : undefined}
      data-orientation={orientation}
      data-shift={used && recenter ? (vertical ? "y" : "x") : undefined}
      data-instant={instant ? "" : undefined}
      data-grabbing={grabbing ? "" : undefined}
      data-disabled={disabled ? "" : undefined}
      style={styleVars}
    >
      <div ref={stageRef} className="tear-ticket__stage">
        <motion.div className="tear-ticket__plane" style={{ transform: plane }}>
          <div ref={bodyRef} className="tear-ticket__piece">
            {border ? (
              <svg
                className="tear-ticket__edge"
                viewBox={`0 0 ${width} ${height}`}
                aria-hidden="true"
              >
                <path d={geo.bodyOutline} />
              </svg>
            ) : null}
            <div className="tear-ticket__paper" style={{ clipPath: `path('${geo.body}')` }}>
              {image ? (
                <div className="tear-ticket__art">
                  <motion.img
                    className="tear-ticket__image"
                    src={image}
                    alt={imageAlt}
                    draggable={false}
                    style={{ transform: reduce ? "none" : art }}
                  />
                  {scrim ? <div className="tear-ticket__scrim" /> : null}
                </div>
              ) : null}
              <motion.div
                className="tear-ticket__content"
                style={{ transform: reduce ? "none" : ink }}
              >
                {children}
              </motion.div>
            </div>
          </div>
          <svg className="tear-ticket__fibres" aria-hidden="true">
            {geo.bridges.map((b, i) => (
              <g key={i}>
                <path
                  ref={(el) => {
                    fibres.current[i * 2] = el;
                  }}
                />
                <path
                  ref={(el) => {
                    fibres.current[i * 2 + 1] = el;
                  }}
                />
              </g>
            ))}
          </svg>
          <div
            ref={stubRef}
            className="tear-ticket__piece tear-ticket__piece--stub"
            role="button"
            tabIndex={disabled || used ? -1 : 0}
            aria-label={ariaLabel}
            aria-hidden={used || undefined}
            aria-disabled={disabled || undefined}
            onPointerDown={onStubDown}
            onPointerMove={onStubMove}
            onPointerUp={onStubUp}
            onPointerCancel={onStubUp}
            onLostPointerCapture={onStubUp}
            onKeyDown={onStubKey}
            onDragStart={(e) => e.preventDefault()}
          >
            {border ? (
              <svg
                className="tear-ticket__edge"
                viewBox={`0 0 ${width} ${height}`}
                aria-hidden="true"
              >
                <path d={geo.stubOutline} />
              </svg>
            ) : null}
            <div
              className="tear-ticket__paper tear-ticket__paper--stub"
              style={{ clipPath: `path('${geo.stub}')` }}
            >
              <div className="tear-ticket__stub">{stub}</div>
            </div>
          </div>
        </motion.div>
      </div>
      <span className="tear-ticket__sr" role="status">
        {used ? "Used" : ""}
      </span>
    </div>
  );
}
