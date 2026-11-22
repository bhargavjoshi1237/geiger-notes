// Small 24px glyphs for cycle controls, drawn in currentColor so they follow the control's text colour.
// Each one previews its state (a marching dash, a travelling dot, a border weight) rather than naming it.

const Svg = ({ className, children, fill = "none" }) => (
  <svg
    viewBox="0 0 24 24"
    className={className}
    fill={fill}
    stroke="currentColor"
    strokeWidth="1.75"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden
  >
    {children}
  </svg>
);

const ArrowTip = () => <path d="M16 8l4 4-4 4" />;

// Edge flow animation: none / flowing dash / travelling dot.
export const FLOW_GLYPHS = {
  none: ({ className }) => (
    <Svg className={className}>
      <path d="M3 12h16" />
      <ArrowTip />
    </Svg>
  ),
  dash: ({ className }) => (
    <Svg className={className}>
      <path d="M3 12h15" strokeDasharray="3 3" className="cycle-march" />
      <ArrowTip />
    </Svg>
  ),
  dot: ({ className }) => (
    <Svg className={className}>
      <path d="M3 12h16" opacity="0.45" />
      <ArrowTip />
      <circle r="2.4" fill="currentColor" stroke="none">
        <animateMotion dur="1.3s" repeatCount="indefinite" path="M3 12H16" />
      </circle>
    </Svg>
  ),
};

// Line patterns, matching DASH_PATTERNS.
const dashLine = (dasharray) =>
  function DashGlyph({ className }) {
    return (
      <Svg className={className}>
        <path d="M3 12h18" strokeWidth="2" strokeDasharray={dasharray} />
      </Svg>
    );
  };
export const DASH_GLYPHS = {
  solid: dashLine(undefined),
  dashed: dashLine("4 3"),
  dotted: dashLine("0.1 4"),
  long: dashLine("8 4"),
};

// Stroke weight, from hairline to heavy.
const weightLine = (width) =>
  function WeightGlyph({ className }) {
    return (
      <Svg className={className}>
        <path d="M4 12h16" strokeWidth={width} />
      </Svg>
    );
  };
export const WEIGHT_GLYPHS = { 1: weightLine(1), 2: weightLine(2.5), 4: weightLine(4.5) };

// Arrowhead size, S / M / L.
const arrowSize = (s) =>
  function ArrowSizeGlyph({ className }) {
    return (
      <Svg className={className}>
        <path d={`M3 12h${17 - s}`} />
        <path d={`M${20 - s * 1.6} ${12 - s}L20 12L${20 - s * 1.6} ${12 + s}z`} fill="currentColor" />
      </Svg>
    );
  };
export const ARROW_SIZE_GLYPHS = { sm: arrowSize(2.5), md: arrowSize(4), lg: arrowSize(6) };

// Edge path shapes, matching EDGE_PATHS.
const pathLine = (d) =>
  function PathGlyph({ className }) {
    return (
      <Svg className={className}>
        <path d={d} />
      </Svg>
    );
  };
export const PATH_GLYPHS = {
  curve: pathLine("M2 19 Q12 -1 22 19"),
  straight: pathLine("M2 19 L22 5"),
  step: pathLine("M2 19 H12 V5 H22"),
  smoothstep: pathLine("M2 19 H9 Q12 19 12 16 V8 Q12 5 15 5 H22"),
  bezier: pathLine("M2 19 C12 19 12 5 22 5"),
};

// Arrowhead shapes, matching ARROW_SHAPES; the start set is mirrored so the head points back along the line.
const HEADS = {
  none: null,
  arrow: <path d="M14 7 L21 12 L14 17 z" fill="currentColor" />,
  open: <path d="M15 7 L21 12 L15 17" />,
  circle: <circle cx="18" cy="12" r="3.5" fill="currentColor" />,
  diamond: <path d="M14 12 L17.5 8.5 L21 12 L17.5 15.5 z" fill="currentColor" />,
  bar: <path d="M20 6 V18" strokeWidth="2.25" />,
};
const arrowhead = (shape, mirrored) =>
  function ArrowheadGlyph({ className }) {
    return (
      <Svg className={className}>
        <g transform={mirrored ? "translate(24 0) scale(-1 1)" : undefined}>
          <path d={`M3 12 H${shape === "none" ? 21 : 15}`} />
          {HEADS[shape]}
        </g>
      </Svg>
    );
  };
const arrowheads = (mirrored) => Object.fromEntries(Object.keys(HEADS).map((shape) => [shape, arrowhead(shape, mirrored)]));
export const ARROW_END_GLYPHS = arrowheads(false);
export const ARROW_START_GLYPHS = arrowheads(true);

// Node border weight: none (ghost outline) through 4px.
const borderBox = (width) =>
  function BorderGlyph({ className }) {
    return (
      <Svg className={className}>
        {width ? (
          <rect x="5" y="5" width="14" height="14" rx="2.5" strokeWidth={width} />
        ) : (
          <rect x="5" y="5" width="14" height="14" rx="2.5" strokeWidth="1" strokeDasharray="1.5 2.5" opacity="0.6" />
        )}
      </Svg>
    );
  };
export const BORDER_WIDTH_GLYPHS = { 0: borderBox(0), 1: borderBox(1.25), 2: borderBox(2.25), 4: borderBox(3.5) };

// Node border style.
const styledBox = (dasharray) =>
  function BorderStyleGlyph({ className }) {
    return (
      <Svg className={className}>
        <rect x="5" y="5" width="14" height="14" rx="2.5" strokeWidth="1.75" strokeDasharray={dasharray} />
      </Svg>
    );
  };
export const BORDER_STYLE_GLYPHS = { solid: styledBox(undefined), dashed: styledBox("3.5 2.5"), dotted: styledBox("0.1 3") };

// Canvas background pattern.
const GRID_POINTS = [6, 12, 18];
export const CANVAS_PATTERN_GLYPHS = {
  dots: ({ className }) => (
    <Svg className={className} fill="currentColor">
      {GRID_POINTS.flatMap((x) => GRID_POINTS.map((y) => <circle key={`${x}-${y}`} cx={x} cy={y} r="1.3" stroke="none" />))}
    </Svg>
  ),
  lines: ({ className }) => (
    <Svg className={className}>
      <path d="M4 8h16M4 16h16M8 4v16M16 4v16" strokeWidth="1.25" />
    </Svg>
  ),
  cross: ({ className }) => (
    <Svg className={className}>
      {[7, 17].flatMap((x) => [7, 17].map((y) => <path key={`${x}-${y}`} d={`M${x - 2.5} ${y}h5M${x} ${y - 2.5}v5`} strokeWidth="1.5" />))}
    </Svg>
  ),
  none: ({ className }) => (
    <Svg className={className}>
      <rect x="4" y="4" width="16" height="16" rx="3" opacity="0.5" />
      <path d="M7 17L17 7" opacity="0.5" />
    </Svg>
  ),
};

// Grid size: tighter to looser spacing.
const gridGlyph = (lines) =>
  function GridGlyph({ className }) {
    const step = 16 / (lines + 1);
    const at = Array.from({ length: lines }, (_, i) => 4 + step * (i + 1));
    return (
      <Svg className={className}>
        <rect x="4" y="4" width="16" height="16" rx="2" strokeWidth="1.25" />
        {at.map((p) => (
          <path key={p} d={`M${p} 4v16M4 ${p}h16`} strokeWidth="1" opacity="0.7" />
        ))}
      </Svg>
    );
  };
export const GRID_SIZE_GLYPHS = { 15: gridGlyph(3), 30: gridGlyph(2), 45: gridGlyph(1) };

// Maximum zoom: a lens that grows with the cap.
const lens = (r) =>
  function LensGlyph({ className }) {
    return (
      <Svg className={className}>
        <circle cx="10.5" cy="10.5" r={r} />
        <path d={`M${10.5 + r * 0.72} ${10.5 + r * 0.72}L20 20`} />
      </Svg>
    );
  };
export const MAX_ZOOM_GLYPHS = { 2: lens(4), 4: lens(5.5), 8: lens(7) };

// Minimap corner.
const corner = (x, y) =>
  function CornerGlyph({ className }) {
    return (
      <Svg className={className}>
        <rect x="3.5" y="4.5" width="17" height="15" rx="2.5" />
        <rect x={x} y={y} width="6" height="4.5" rx="1" fill="currentColor" stroke="none" />
      </Svg>
    );
  };
export const MINIMAP_CORNER_GLYPHS = {
  "bottom-right": corner(12.5, 13),
  "top-right": corner(12.5, 6.5),
  "top-left": corner(5.5, 6.5),
};

// Box selection: a dashed marquee touching a node, or wrapping it.
export const SELECTION_GLYPHS = {
  partial: ({ className }) => (
    <Svg className={className}>
      <rect x="3" y="3" width="12" height="12" rx="1.5" strokeDasharray="2.5 2" />
      <rect x="11" y="11" width="9" height="9" rx="1.5" fill="currentColor" fillOpacity="0.35" />
    </Svg>
  ),
  full: ({ className }) => (
    <Svg className={className}>
      <rect x="3" y="3" width="18" height="18" rx="1.5" strokeDasharray="2.5 2" />
      <rect x="8" y="8" width="8" height="8" rx="1.5" fill="currentColor" fillOpacity="0.35" />
    </Svg>
  ),
};

// Gradient kind: graded bars or rings.
export const GRADIENT_KIND_GLYPHS = {
  linear: ({ className }) => (
    <Svg className={className} fill="currentColor">
      {[0.9, 0.6, 0.35, 0.15].map((o, i) => (
        <rect key={o} x={4 + i * 4} y="4" width="4" height="16" opacity={o} stroke="none" />
      ))}
    </Svg>
  ),
  radial: ({ className }) => (
    <Svg className={className}>
      <circle cx="12" cy="12" r="2.5" fill="currentColor" stroke="none" />
      <circle cx="12" cy="12" r="5.5" opacity="0.6" />
      <circle cx="12" cy="12" r="8.5" opacity="0.3" />
    </Svg>
  ),
};

// Background image fit.
export const IMAGE_FIT_GLYPHS = {
  cover: ({ className }) => (
    <Svg className={className}>
      <rect x="4" y="5" width="16" height="14" rx="2" />
      <path d="M4 15l4.5-4.5 4 4 2.5-2.5L20 17" />
    </Svg>
  ),
  contain: ({ className }) => (
    <Svg className={className}>
      <rect x="3.5" y="4.5" width="17" height="15" rx="2" opacity="0.45" />
      <rect x="7.5" y="8" width="9" height="8" rx="1.25" />
    </Svg>
  ),
  tile: ({ className }) => (
    <Svg className={className}>
      <rect x="4" y="4" width="7" height="7" rx="1.25" />
      <rect x="13" y="4" width="7" height="7" rx="1.25" />
      <rect x="4" y="13" width="7" height="7" rx="1.25" />
      <rect x="13" y="13" width="7" height="7" rx="1.25" />
    </Svg>
  ),
};

// Clock face ticks (markers) or numeral dots: none / four / all twelve.
const face = (count, kind) =>
  function FaceGlyph({ className }) {
    const marks = Array.from({ length: count }, (_, i) => (i * 360) / count);
    return (
      <Svg className={className}>
        <circle cx="12" cy="12" r="9" />
        {marks.map((deg) =>
          kind === "tick" ? (
            <path key={deg} d="M12 4.6v2.4" strokeWidth="1.4" transform={`rotate(${deg} 12 12)`} />
          ) : (
            <circle key={deg} cx="12" cy="6" r="1.05" fill="currentColor" stroke="none" transform={`rotate(${deg} 12 12)`} />
          ),
        )}
      </Svg>
    );
  };
export const CLOCK_MARKER_GLYPHS = { none: face(0, "tick"), four: face(4, "tick"), all: face(12, "tick") };
export const CLOCK_NUMBER_GLYPHS = { none: face(0, "dot"), four: face(4, "dot"), all: face(12, "dot") };

// Second-hand movement: one sweeping arc, or stepped ticks.
export const CLOCK_MOVEMENT_GLYPHS = {
  smooth: ({ className }) => (
    <Svg className={className}>
      <path d="M12 12V5" />
      <path d="M18.5 9A7 7 0 0 1 16 18.2" />
      <path d="M16.5 15.8L16 18.2l2.4.3" />
    </Svg>
  ),
  quartz: ({ className }) => (
    <Svg className={className}>
      <path d="M12 12V5" />
      {[40, 70, 100, 130].map((deg) => (
        <path key={deg} d="M12 4.2v2" transform={`rotate(${deg} 12 12)`} />
      ))}
    </Svg>
  ),
};
