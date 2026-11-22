// Each style is authored once on a design canvas and scaled uniformly, so proportions never drift.
export const CALENDAR_LAYOUTS = {
  default: { width: 200, height: 200, minScale: 0.5 },
  simple: { width: 200, height: 200, minScale: 0.75 },
  blank: { width: 400, height: 200, minScale: 0.75 },
};

// Snap points: the node settles on one of these scales of its design canvas after a resize.
const SCALE_STEPS = [0.5, 0.75, 1, 1.25, 1.5, 2, 2.5, 3];

const CORNER_RADIUS = 22;

export const CALENDAR_ACCENT = "#ef4444";

export const calendarLayout = (style) => CALENDAR_LAYOUTS[style] || CALENDAR_LAYOUTS.default;

export const calendarSnapSizes = (style) => {
  const { width, height, minScale } = calendarLayout(style);
  return SCALE_STEPS.filter((scale) => scale >= minScale).map((scale) => ({
    scale,
    width: width * scale,
    height: height * scale,
  }));
};

// Nearest snap point by height, so switching between the square and wide styles keeps the widget's height.
export const snapCalendarSize = (style, height) => {
  const layout = calendarLayout(style);
  const scale = (height || layout.height) / layout.height;
  return calendarSnapSizes(style).reduce((best, size) =>
    Math.abs(size.scale - scale) < Math.abs(best.scale - scale) ? size : best,
  );
};

// Largest uniform scale of the design canvas that fits the box (exactly a snap step once settled).
export const calendarScale = (style, width, height) => {
  const layout = calendarLayout(style);
  return Math.min((width || layout.width) / layout.width, (height || layout.height) / layout.height);
};

export const calendarRadius = (scale) => CORNER_RADIUS * scale;

export const themeColors = (theme) =>
  theme === "dark"
    ? {
        surface: "#141414",
        hairline: "rgba(255, 255, 255, 0.1)",
        text: "#e4e4e7",
        muted: "#8e8e93",
        date: "#ffffff",
        divider: "rgba(255, 255, 255, 0.1)",
      }
    : {
        surface: "#ffffff",
        hairline: "rgba(0, 0, 0, 0.06)",
        text: "#111827",
        muted: "#8e8e93",
        date: "#000000",
        divider: "#e5e7eb",
      };
