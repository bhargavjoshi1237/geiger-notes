// Per-node appearance overrides: stored in data.appearance, projected onto the React Flow node's className + CSS vars (styled in globals.css under "Per-node appearance").

export const BORDER_STYLES = ["solid", "dashed", "dotted"];

export const SHADOWS = {
  none: "none",
  sm: "0 1px 2px rgb(0 0 0 / 0.12), 0 1px 3px rgb(0 0 0 / 0.1)",
  md: "0 4px 12px rgb(0 0 0 / 0.18)",
  lg: "0 12px 32px rgb(0 0 0 / 0.28)",
  glow: "0 0 0 1px color-mix(in oklab, var(--primary) 40%, transparent), 0 0 24px color-mix(in oklab, var(--primary) 35%, transparent)",
};

export const FONTS = {
  sans: "var(--font-sans, ui-sans-serif, system-ui, sans-serif)",
  serif: "ui-serif, Georgia, 'Times New Roman', serif",
  mono: "var(--font-mono, ui-monospace, SFMono-Regular, Menlo, monospace)",
  hand: "'Comic Sans MS', 'Chalkboard SE', 'Comic Neue', cursive",
};

export const FONT_SIZES = { sm: "12px", md: "14px", lg: "17px", xl: "22px" };

const NX_CLASS = /\bnx-[a-z-]+\b/g;

// Rebuild className + style vars from an appearance object, leaving unrelated classes/styles intact.
export function withAppearance(node, appearance) {
  const a = appearance || {};
  const classes = [];
  const style = { ...(node.style || {}) };
  for (const key of Object.keys(style)) if (key.startsWith("--nx-")) delete style[key];
  delete style.opacity;

  if (a.borderWidth > 0) {
    classes.push("nx-border");
    style["--nx-border"] = `${a.borderWidth}px ${a.borderStyle || "solid"} ${a.borderColor || "var(--foreground)"}`;
  }
  if (a.radius != null && a.radius !== "") {
    classes.push("nx-radius");
    style["--nx-radius"] = `${a.radius}px`;
  }
  if (a.shadow && a.shadow !== "default") {
    classes.push("nx-shadow");
    style["--nx-shadow"] = SHADOWS[a.shadow] || "none";
  }
  if (a.fontFamily && FONTS[a.fontFamily]) {
    classes.push("nx-font");
    style["--nx-font"] = FONTS[a.fontFamily];
  }
  if (a.fontSize && FONT_SIZES[a.fontSize]) {
    classes.push("nx-size");
    style["--nx-font-size"] = FONT_SIZES[a.fontSize];
  }
  if (a.textColor) {
    classes.push("nx-text");
    style["--nx-text"] = a.textColor;
  }
  if (a.opacity != null && a.opacity < 1) style.opacity = a.opacity;
  if (node.data?.locked) classes.push("nx-locked");

  const base = (node.className || "").replace(NX_CLASS, "").replace(/\s+/g, " ").trim();
  return {
    ...node,
    className: [base, ...classes].filter(Boolean).join(" ") || undefined,
    style,
    data: { ...node.data, appearance: a },
  };
}

export function setLocked(node, locked) {
  return withAppearance(
    { ...node, draggable: locked ? false : undefined, deletable: locked ? false : undefined, data: { ...node.data, locked } },
    node.data?.appearance,
  );
}

// zIndex just above / below every other node.
export function stackIndex(nodes, nodeId, direction) {
  const others = nodes.filter((n) => n.id !== nodeId).map((n) => n.zIndex ?? 0);
  if (!others.length) return 0;
  return direction === "front" ? Math.max(...others) + 1 : Math.min(...others) - 1;
}
