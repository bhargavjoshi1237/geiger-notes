"use client";

import React, { memo } from "react";
import { Shapes } from "lucide-react";
import NodeShell, { useNodeDataUpdater } from "@/components/internal/nodes/shared/NodeShell";
import TextEditingTrait from "@/components/internal/nodes/traits/TextEditingTrait";

export const SHAPES = [
  { value: "rectangle", label: "Rectangle" },
  { value: "rounded", label: "Rounded" },
  { value: "pill", label: "Pill" },
  { value: "ellipse", label: "Ellipse" },
  { value: "diamond", label: "Diamond" },
  { value: "triangle", label: "Triangle" },
  { value: "hexagon", label: "Hexagon" },
  { value: "parallelogram", label: "Parallelogram" },
  { value: "cylinder", label: "Cylinder" },
  { value: "star", label: "Star" },
];

export const nodeMeta = {
  type: "shape",
  label: "Shape",
  icon: Shapes,
  cardColor: false,
  create: () => ({
    data: { shape: "rounded", fill: "", stroke: "", strokeWidth: 2, text: "", textColor: "" },
    style: { width: 210, height: 120 },
  }),
};

// Text inset per shape (fractions of the box) so labels stay inside slanted/curved outlines.
const TEXT_INSET = {
  ellipse: { x: 0.15, top: 0.15, bottom: 0.15 },
  diamond: { x: 0.25, top: 0.25, bottom: 0.25 },
  triangle: { x: 0.24, top: 0.42, bottom: 0.08 },
  hexagon: { x: 0.18, top: 0.1, bottom: 0.1 },
  parallelogram: { x: 0.2, top: 0.1, bottom: 0.1 },
  cylinder: { x: 0.08, top: 0.24, bottom: 0.1 },
  star: { x: 0.3, top: 0.36, bottom: 0.24 },
};

const pts = (list) => list.map(([x, y]) => `${x},${y}`).join(" ");

// Unit 5-point star normalised to fill the box.
const STAR_UNIT = (() => {
  const raw = Array.from({ length: 10 }, (_, i) => {
    const r = i % 2 === 0 ? 1 : 0.46;
    const a = -Math.PI / 2 + (i * Math.PI) / 5;
    return [Math.cos(a) * r, Math.sin(a) * r];
  });
  const xs = raw.map((p) => p[0]);
  const ys = raw.map((p) => p[1]);
  const [minX, maxX, minY, maxY] = [Math.min(...xs), Math.max(...xs), Math.min(...ys), Math.max(...ys)];
  return raw.map(([x, y]) => [(x - minX) / (maxX - minX), (y - minY) / (maxY - minY)]);
})();

// SVG elements for a shape filling a w×h box, inset so the stroke isn't clipped.
export function ShapeGeometry({ shape, w, h, strokeWidth = 2, ...paint }) {
  const s = strokeWidth / 2 + 1;
  const iw = Math.max(0, w - 2 * s);
  const ih = Math.max(0, h - 2 * s);
  const common = { strokeWidth, strokeLinejoin: "round", ...paint };

  switch (shape) {
    case "rectangle":
      return <rect x={s} y={s} width={iw} height={ih} rx={2} {...common} />;
    case "pill":
      return <rect x={s} y={s} width={iw} height={ih} rx={Math.min(iw, ih) / 2} {...common} />;
    case "ellipse":
      return <ellipse cx={w / 2} cy={h / 2} rx={iw / 2} ry={ih / 2} {...common} />;
    case "diamond":
      return <polygon points={pts([[w / 2, s], [w - s, h / 2], [w / 2, h - s], [s, h / 2]])} {...common} />;
    case "triangle":
      return <polygon points={pts([[w / 2, s], [w - s, h - s], [s, h - s]])} {...common} />;
    case "hexagon": {
      const d = Math.min(iw * 0.25, ih * 0.5);
      return (
        <polygon
          points={pts([[s + d, s], [w - s - d, s], [w - s, h / 2], [w - s - d, h - s], [s + d, h - s], [s, h / 2]])}
          {...common}
        />
      );
    }
    case "parallelogram": {
      const k = Math.min(iw * 0.22, ih * 0.6);
      return <polygon points={pts([[s + k, s], [w - s, s], [w - s - k, h - s], [s, h - s]])} {...common} />;
    }
    case "cylinder": {
      const rx = iw / 2;
      const ry = Math.min(ih * 0.12, iw * 0.25);
      const top = s + ry;
      const bottom = h - s - ry;
      return (
        <>
          <path
            d={`M ${s} ${top} A ${rx} ${ry} 0 0 1 ${w - s} ${top} L ${w - s} ${bottom} A ${rx} ${ry} 0 0 1 ${s} ${bottom} Z`}
            {...common}
          />
          <path d={`M ${s} ${top} A ${rx} ${ry} 0 0 0 ${w - s} ${top}`} {...common} fill="none" />
        </>
      );
    }
    case "star":
      return <polygon points={pts(STAR_UNIT.map(([x, y]) => [s + x * iw, s + y * ih]))} {...common} />;
    case "rounded":
    default:
      return <rect x={s} y={s} width={iw} height={ih} rx={Math.min(iw, ih) * 0.16} {...common} />;
  }
}

// Tracks the rendered box so the SVG can draw in real pixels (keeps stroke width uniform).
function useBoxSize() {
  const ref = React.useRef(null);
  const [size, setSize] = React.useState({ w: 0, h: 0 });
  React.useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return undefined;
    const ro = new ResizeObserver(([entry]) => {
      const { width, height } = entry.contentRect;
      setSize((prev) => (prev.w === width && prev.h === height ? prev : { w: width, h: height }));
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  return [ref, size];
}

function ShapeNode({ id, data, selected, dragging }) {
  const update = useNodeDataUpdater(id);
  const [boxRef, { w, h }] = useBoxSize();
  const shape = data.shape || "rounded";
  const strokeWidth = Number.isFinite(data.strokeWidth) ? data.strokeWidth : 2;
  const inset = TEXT_INSET[shape] || { x: 0.06, top: 0.06, bottom: 0.06 };
  const text = data.text ?? "";
  const typography = {
    fontSize: 15,
    lineHeight: 1.4,
    fontWeight: 500,
    textAlign: "center",
    whiteSpace: "pre-wrap",
    overflowWrap: "break-word",
  };

  return (
    <NodeShell
      id={id}
      data={data}
      selected={selected}
      dragging={dragging}
      chrome={false}
      minWidth={60}
      minHeight={45}
      className="rounded-md"
    >
      <div ref={boxRef} className="absolute inset-0">
        {w > 0 && h > 0 && (
          <svg width={w} height={h} className="pointer-events-none absolute inset-0 overflow-visible" aria-hidden>
            <ShapeGeometry
              shape={shape}
              w={w}
              h={h}
              strokeWidth={strokeWidth}
              fill={data.fill || "var(--node-default)"}
              stroke={strokeWidth > 0 ? data.stroke || "var(--edge-stroke)" : "none"}
            />
          </svg>
        )}
      </div>

      <div
        className={`relative flex flex-1 items-center justify-center overflow-hidden ${data.textColor ? "" : "text-foreground"}`}
        style={{
          padding: `${inset.top * h}px ${inset.x * w}px ${inset.bottom * h}px`,
          ...(data.textColor ? { color: data.textColor } : {}),
        }}
      >
        <div className="grid w-full">
          <div className="col-start-1 row-start-1" style={typography} aria-hidden={selected || undefined}>
            <span className={selected ? "invisible" : undefined}>{text}</span>
            {"​"}
          </div>
          {selected && (
            <TextEditingTrait className="col-start-1 row-start-1 flex flex-col">
              <textarea
                value={text}
                onChange={(e) => update({ text: e.target.value })}
                placeholder="Add text"
                rows={1}
                spellCheck={false}
                data-gramm="false"
                aria-label="Shape text"
                className="w-full flex-1 resize-none overflow-hidden border-0 bg-transparent p-0 outline-none placeholder:text-muted-foreground/60"
                style={{ ...typography, color: "inherit", fontFamily: "inherit" }}
              />
            </TextEditingTrait>
          )}
        </div>
      </div>
    </NodeShell>
  );
}

export default memo(ShapeNode);
