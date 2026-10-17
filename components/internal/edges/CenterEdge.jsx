import React, { useMemo, useRef, useState } from "react";
import {
  BaseEdge,
  useInternalNode,
  EdgeLabelRenderer,
  useReactFlow,
  useStore,
} from "@xyflow/react";
import { ARROW_SIZES } from "@/lib/canvas/edge-style";
import { edgeGeometry, pointNode, sketchyPaths } from "@/lib/canvas/edge-geometry";

const LABEL_SIZES = { sm: 11, md: 12, lg: 15 };

// Per-edge SVG marker so arrowheads always follow the edge colour and width.
function EdgeMarker({ id, shape, color, strokeWidth, size }) {
  if (!shape || shape === "none") return null;
  const scale = ARROW_SIZES.find((s) => s.value === size)?.scale ?? 1;
  const dim = (10 + strokeWidth * 2) * scale;
  const fill = { fill: color };
  const shapes = {
    arrow: { refX: 9.5, el: <path d="M0,1 L10,5 L0,9 z" style={fill} /> },
    open: {
      refX: 9,
      el: (
        <path
          d="M1,1 L9,5 L1,9"
          style={{ fill: "none", stroke: color, strokeWidth: 1.4, strokeLinecap: "round", strokeLinejoin: "round" }}
        />
      ),
    },
    circle: { refX: 8.5, el: <circle cx="5" cy="5" r="3.5" style={fill} /> },
    diamond: { refX: 10, el: <path d="M0,5 L5,1 L10,5 L5,9 z" style={fill} /> },
    bar: { refX: 9, el: <rect x="7" y="0" width="2" height="10" style={fill} /> },
  };
  const def = shapes[shape] || shapes.arrow;
  return (
    <marker
      id={id}
      viewBox="0 0 10 10"
      refX={def.refX}
      refY="5"
      markerWidth={dim}
      markerHeight={dim}
      markerUnits="userSpaceOnUse"
      orient="auto-start-reverse"
    >
      {def.el}
    </marker>
  );
}

const DOT_STYLE = {
  position: "absolute",
  pointerEvents: "all",
  width: 12,
  height: 12,
  borderRadius: "50%",
  backgroundColor: "#ffffff",
  border: "1px solid #777",
  boxShadow: "0 2px 4px rgba(0,0,0,0.5)",
  zIndex: 1002,
};

const CenterEdge = ({ id, source, target, style, markerEnd, markerStart, data, selected, label, labelStyle }) => {
  const { setEdges, screenToFlowPosition } = useReactFlow();
  const sourceNode = useInternalNode(source);
  const targetNode = useInternalNode(target);
  const editable = useStore((s) => s.nodesConnectable);
  const [bending, setBending] = useState(false);
  // Endpoint being re-attached: { end: "source" | "target", point }.
  const [reconnect, setReconnect] = useState(null);
  const bendBase = useRef({ x: 0, y: 0 });

  const ready = sourceNode?.measured?.width != null && targetNode?.measured?.width != null;
  const path = data?.path || "curve";
  const stroke = style?.stroke || "var(--edge-stroke)";
  const strokeWidth = Number(style?.strokeWidth) || 2;

  const geo = useMemo(() => {
    if (!ready) return null;
    const src = reconnect?.end === "source" ? pointNode(reconnect.point) : sourceNode;
    const tgt = reconnect?.end === "target" ? pointNode(reconnect.point) : targetNode;
    return edgeGeometry({
      sourceNode: src,
      targetNode: tgt,
      path,
      offset: reconnect ? null : data?.offset,
      labelPos: data?.labelPos ?? 0.5,
    });
  }, [ready, sourceNode, targetNode, reconnect, path, data?.offset, data?.labelPos]);

  const sketchy = !!data?.sketchy;
  const roughPaths = useMemo(
    () => (geo && sketchy ? sketchyPaths(geo.d, id, 1.6 + strokeWidth * 0.4) : null),
    [geo, sketchy, id, strokeWidth],
  );

  if (!geo) return null;

  // New edges carry their arrows in data; older ones still use React Flow marker objects.
  const customArrows = data?.arrowEnd !== undefined || data?.arrowStart !== undefined;
  const endId = `gm-${id}-end`;
  const startId = `gm-${id}-start`;
  const endUrl = customArrows ? (data.arrowEnd && data.arrowEnd !== "none" ? `url(#${endId})` : undefined) : markerEnd;
  const startUrl = customArrows
    ? data.arrowStart && data.arrowStart !== "none"
      ? `url(#${startId})`
      : undefined
    : markerStart;

  const labelText = data?.label || label;
  const labelBg = data?.labelBg ?? "var(--surface-dialog)";
  const labelColor = data?.labelColor || "var(--primary)";

  const onBendDown = (event) => {
    event.stopPropagation();
    event.target.setPointerCapture(event.pointerId);
    bendBase.current = geo.mid;
    setBending(true);
  };
  const onBendMove = (event) => {
    if (!bending) return;
    event.stopPropagation();
    const p = screenToFlowPosition({ x: event.clientX, y: event.clientY });
    const offset = { x: p.x - bendBase.current.x, y: p.y - bendBase.current.y };
    setEdges((eds) => eds.map((e) => (e.id === id ? { ...e, data: { ...e.data, offset } } : e)));
  };
  const onBendUp = (event) => {
    event.stopPropagation();
    event.target.releasePointerCapture(event.pointerId);
    setBending(false);
  };
  const resetBend = (event) => {
    event.stopPropagation();
    setEdges((eds) => eds.map((e) => (e.id === id ? { ...e, data: { ...e.data, offset: undefined } } : e)));
  };

  const onEndDown = (end) => (event) => {
    event.stopPropagation();
    event.target.setPointerCapture(event.pointerId);
    setReconnect({ end, point: screenToFlowPosition({ x: event.clientX, y: event.clientY }) });
  };
  const onEndMove = (event) => {
    if (!reconnect) return;
    event.stopPropagation();
    setReconnect((r) => r && { ...r, point: screenToFlowPosition({ x: event.clientX, y: event.clientY }) });
  };
  const onEndUp = (event) => {
    if (!reconnect) return;
    event.stopPropagation();
    event.target.releasePointerCapture(event.pointerId);
    const { end } = reconnect;
    setReconnect(null);
    const hit = document
      .elementsFromPoint(event.clientX, event.clientY)
      .map((el) => el.closest?.(".react-flow__node"))
      .find(Boolean);
    const nodeId = hit?.getAttribute("data-id");
    const other = end === "source" ? target : source;
    const current = end === "source" ? source : target;
    if (!nodeId || nodeId === other || nodeId === current) return;
    setEdges((eds) =>
      eds.map((e) =>
        e.id === id
          ? {
              ...e,
              [end]: nodeId,
              [end === "source" ? "sourceHandle" : "targetHandle"]: null,
              data: { ...e.data, offset: undefined },
            }
          : e,
      ),
    );
  };

  const baseStyle = { ...style, stroke, strokeWidth, zIndex: 1000 };
  const flowDot = data?.flow === "dot";

  return (
    <>
      {customArrows && (
        <defs>
          <EdgeMarker id={endId} shape={data.arrowEnd} color={stroke} strokeWidth={strokeWidth} size={data.arrowSize} />
          <EdgeMarker id={startId} shape={data.arrowStart} color={stroke} strokeWidth={strokeWidth} size={data.arrowSize} />
        </defs>
      )}
      {roughPaths ? (
        <>
          <BaseEdge
            path={geo.d}
            style={{ ...baseStyle, stroke: "transparent" }}
            label={labelText}
            labelX={geo.label.x}
            labelY={geo.label.y}
            labelStyle={{ fill: labelColor, fontSize: LABEL_SIZES[data?.labelSize] || 12, ...labelStyle }}
            labelShowBg={labelBg !== "none"}
            labelBgStyle={{ fill: labelBg }}
            labelBgPadding={[4, 2]}
            labelBgBorderRadius={4}
          />
          {roughPaths.map((d, i) => (
            <path
              key={i}
              d={d}
              fill="none"
              className="react-flow__edge-path"
              style={{ ...baseStyle, strokeLinecap: "round", strokeLinejoin: "round", opacity: i ? 0.55 : 1, pointerEvents: "none" }}
              markerEnd={i ? undefined : endUrl}
              markerStart={i ? undefined : startUrl}
            />
          ))}
        </>
      ) : (
        <BaseEdge
          path={geo.d}
          markerEnd={endUrl}
          markerStart={startUrl}
          style={baseStyle}
          label={labelText}
          labelX={geo.label.x}
          labelY={geo.label.y}
          labelStyle={{ fill: labelColor, fontSize: LABEL_SIZES[data?.labelSize] || 12, ...labelStyle }}
          labelShowBg={labelBg !== "none"}
          labelBgStyle={{ fill: labelBg }}
          labelBgPadding={[4, 2]}
          labelBgBorderRadius={4}
        />
      )}
      {flowDot && !reconnect && (
        <circle r={Math.max(3, strokeWidth + 1.5)} style={{ fill: stroke }} className="pointer-events-none">
          <animateMotion dur="2.4s" repeatCount="indefinite" path={geo.d} />
        </circle>
      )}
      {selected && editable && (
        <EdgeLabelRenderer>
          {geo.handle && !reconnect && (
            <div
              title="Drag to bend · double-click to reset"
              style={{
                ...DOT_STYLE,
                cursor: "grab",
                transform: `translate(-50%, -50%) translate(${geo.handle.x}px, ${geo.handle.y}px)`,
              }}
              className="nodrag nopan"
              onPointerDown={onBendDown}
              onPointerMove={onBendMove}
              onPointerUp={onBendUp}
              onDoubleClick={resetBend}
            />
          )}
          {["source", "target"].map((end) => {
            const p = end === "source" ? geo.sp : geo.tp;
            return (
              <div
                key={end}
                title="Drag onto another node to reconnect"
                style={{
                  ...DOT_STYLE,
                  width: 10,
                  height: 10,
                  cursor: "crosshair",
                  backgroundColor: "var(--primary)",
                  border: "2px solid var(--background)",
                  transform: `translate(-50%, -50%) translate(${p.x}px, ${p.y}px)`,
                }}
                className="nodrag nopan"
                onPointerDown={onEndDown(end)}
                onPointerMove={onEndMove}
                onPointerUp={onEndUp}
              />
            );
          })}
        </EdgeLabelRenderer>
      )}
    </>
  );
};

export default CenterEdge;
