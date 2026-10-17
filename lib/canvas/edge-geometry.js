import { getBezierPath, getSmoothStepPath, Position } from "@xyflow/react";
import { getNodeIntersection } from "@/lib/wrapers/edge/EdgeArrow";

// Zero-size stand-in node at a point (a bend handle or the pointer during a reconnect drag).
export const pointNode = (p) => ({
  measured: { width: 0, height: 0 },
  internals: { positionAbsolute: p },
});

const centerOf = (n) => ({
  x: n.internals.positionAbsolute.x + n.measured.width / 2,
  y: n.internals.positionAbsolute.y + n.measured.height / 2,
});

// Which side of a node a border point sits on, for step/bezier routing.
function sideOf(node, p) {
  const c = centerOf(node);
  const dx = (p.x - c.x) / (node.measured.width / 2 || 1);
  const dy = (p.y - c.y) / (node.measured.height / 2 || 1);
  if (Math.abs(dx) >= Math.abs(dy)) return dx > 0 ? Position.Right : Position.Left;
  return dy > 0 ? Position.Bottom : Position.Top;
}

const lerp = (a, b, t) => ({ x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t });
const quad = (a, c, b, t) => ({
  x: (1 - t) ** 2 * a.x + 2 * (1 - t) * t * c.x + t ** 2 * b.x,
  y: (1 - t) ** 2 * a.y + 2 * (1 - t) * t * c.y + t ** 2 * b.y,
});

let measurer = null;
// Hidden SVG path used to sample arbitrary path strings (labels off-centre, sketchy strokes).
function measurePath(d) {
  if (typeof document === "undefined") return null;
  if (!measurer) {
    const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    svg.setAttribute("width", "0");
    svg.setAttribute("height", "0");
    svg.style.cssText = "position:absolute;width:0;height:0;overflow:hidden;pointer-events:none";
    measurer = document.createElementNS("http://www.w3.org/2000/svg", "path");
    svg.appendChild(measurer);
    document.body.appendChild(svg);
  }
  measurer.setAttribute("d", d);
  return measurer;
}

export function pointAlongPath(d, t) {
  const el = measurePath(d);
  if (!el) return null;
  const len = el.getTotalLength();
  const p = el.getPointAtLength(len * Math.min(1, Math.max(0, t)));
  return { x: p.x, y: p.y };
}

// Path, endpoints, bend-handle and label anchor for an edge between two (possibly pseudo) nodes.
export function edgeGeometry({ sourceNode, targetNode, path = "curve", offset, labelPos = 0.5 }) {
  const S = centerOf(sourceNode);
  const T = centerOf(targetNode);
  const mid = { x: (S.x + T.x) / 2, y: (S.y + T.y) / 2 };
  const off = { x: offset?.x || 0, y: offset?.y || 0 };
  const hasOffset = off.x !== 0 || off.y !== 0;

  if (path === "curve") {
    const H = { x: mid.x + off.x, y: mid.y + off.y };
    const sp = getNodeIntersection(pointNode(H), sourceNode);
    const tp = getNodeIntersection(pointNode(H), targetNode);
    const cp = { x: 2 * H.x - (sp.x + tp.x) / 2, y: 2 * H.y - (sp.y + tp.y) / 2 };
    return {
      d: `M ${sp.x} ${sp.y} Q ${cp.x} ${cp.y} ${tp.x} ${tp.y}`,
      sp,
      tp,
      mid,
      handle: H,
      label: quad(sp, cp, tp, labelPos),
    };
  }

  const sp = getNodeIntersection(targetNode, sourceNode);
  const tp = getNodeIntersection(sourceNode, targetNode);
  const ends = {
    sourceX: sp.x,
    sourceY: sp.y,
    targetX: tp.x,
    targetY: tp.y,
    sourcePosition: sideOf(sourceNode, sp),
    targetPosition: sideOf(targetNode, tp),
  };

  if (path === "straight") {
    const d = `M ${sp.x} ${sp.y} L ${tp.x} ${tp.y}`;
    return { d, sp, tp, mid, handle: null, label: lerp(sp, tp, labelPos) };
  }

  if (path === "bezier") {
    const [d, lx, ly] = getBezierPath(ends);
    const label = labelPos === 0.5 ? { x: lx, y: ly } : pointAlongPath(d, labelPos) || { x: lx, y: ly };
    return { d, sp, tp, mid, handle: null, label };
  }

  const [d, lx, ly] = getSmoothStepPath({
    ...ends,
    borderRadius: path === "step" ? 0 : 12,
    ...(hasOffset ? { centerX: mid.x + off.x, centerY: mid.y + off.y } : {}),
  });
  const label = labelPos === 0.5 ? { x: lx, y: ly } : pointAlongPath(d, labelPos) || { x: lx, y: ly };
  return { d, sp, tp, mid, handle: hasOffset ? { x: mid.x + off.x, y: mid.y + off.y } : { x: lx, y: ly }, label };
}

function seeded(seedStr) {
  let h = 2166136261;
  for (let i = 0; i < seedStr.length; i++) h = Math.imul(h ^ seedStr.charCodeAt(i), 16777619);
  return () => {
    h = Math.imul(h ^ (h >>> 15), 2246822507);
    h = Math.imul(h ^ (h >>> 13), 3266489909);
    return ((h ^= h >>> 16) >>> 0) / 4294967296;
  };
}

// Two slightly different wobbly re-tracings of a path, for the hand-drawn edge style.
export function sketchyPaths(d, seed, amplitude = 2.2) {
  const el = measurePath(d);
  if (!el) return [d];
  const len = el.getTotalLength();
  if (!len) return [d];
  const steps = Math.max(6, Math.round(len / 18));
  const build = (rand) => {
    const pts = [];
    for (let i = 0; i <= steps; i++) {
      const at = (len * i) / steps;
      const p = el.getPointAtLength(at);
      const q = el.getPointAtLength(Math.min(len, at + 0.5));
      const nx = -(q.y - p.y) || 0;
      const ny = q.x - p.x || 0;
      const nl = Math.hypot(nx, ny) || 1;
      const taper = Math.sin((Math.PI * i) / steps) * 0.7 + 0.3;
      const j = (rand() - 0.5) * 2 * amplitude * taper;
      pts.push({ x: p.x + (nx / nl) * j, y: p.y + (ny / nl) * j });
    }
    let out = `M ${pts[0].x} ${pts[0].y}`;
    for (let i = 1; i < pts.length - 1; i++) {
      const m = { x: (pts[i].x + pts[i + 1].x) / 2, y: (pts[i].y + pts[i + 1].y) / 2 };
      out += ` Q ${pts[i].x} ${pts[i].y} ${m.x} ${m.y}`;
    }
    const last = pts[pts.length - 1];
    return `${out} L ${last.x} ${last.y}`;
  };
  return [build(seeded(seed)), build(seeded(`${seed}~`))];
}
