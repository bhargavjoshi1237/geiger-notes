// Builders for React Flow nodes/edges exactly as BoardCanvas saves them into a
// board's nodes/edges jsonb (type, position, data, style), so the seeded boards
// load through the real canvas unchanged.

import { personId, person } from "../cast.js";

const ARROW = "arrowclosed";
const EDGE_STROKE = "var(--edge-stroke)";

function node(id, type, x, y, data, size) {
  return {
    id,
    type,
    position: { x, y },
    data,
    ...(size ? { style: { width: size[0], height: size[1] } } : {}),
  };
}

export function note(id, x, y, label, { w = 338, h = 68, ...data } = {}) {
  return node(id, "custom", x, y, { label, ...data }, [w, h]);
}

export function comment(id, x, y, label, n, { w = 360, h = 68, ...data } = {}) {
  return node(
    id,
    "comment",
    x,
    y,
    { label, avatarUserId: personId(n), authorName: person(n).name, ...data },
    [w, h],
  );
}

export function link(id, x, y, url, { w = 338, h = 68, ...data } = {}) {
  return node(id, "link", x, y, { url, ...data }, [w, h]);
}

export function board(id, x, y, boardId, name, { icon = "LayoutDashboard", caption, light, dark, w = 260, h = 68 } = {}) {
  return node(
    id,
    "board",
    x,
    y,
    {
      label: name,
      name,
      boardId,
      iconName: icon,
      ...(caption ? { caption } : {}),
      ...(light ? { iconLightAccent: light } : {}),
      ...(dark ? { iconDarkAccent: dark } : {}),
    },
    [w, h],
  );
}

export function documentNode(id, x, y, documentId, label, { w = 260, h = 68, ...data } = {}) {
  return node(id, "document", x, y, { label, documentId, ...data }, [w, h]);
}

export function sketchNode(id, x, y, sketchId, label, { w = 320, h = 240, caption } = {}) {
  return node(id, "sketch", x, y, { label, sketchId, ...(caption ? { caption } : {}) }, [w, h]);
}

export function image(id, x, y, src, caption, { w = 220, h = 270, alt } = {}) {
  return node(
    id,
    "image",
    x,
    y,
    {
      label: caption,
      src: `https://images.unsplash.com/${src}?q=80&w=900&auto=format&fit=crop`,
      alt: alt || caption,
      caption: { text: caption, bgColor: "#1e1e1e", bgOpacity: 1, textColor: "#ffffff" },
    },
    [w, h],
  );
}

export function file(id, x, y, fileName, fileSize, fileType, { w = 240, h = 80, caption } = {}) {
  return node(
    id,
    "file",
    x,
    y,
    { label: "File", fileName, fileSize, fileType, src: null, ...(caption ? { caption } : {}) },
    [w, h],
  );
}

export function clock(id, x, y, { digital = false, ...data } = {}) {
  return node(
    id,
    "clock",
    x,
    y,
    { label: "Clock", clockType: digital ? "digital" : "analog", ...data },
    digital ? [260, 140] : [156, 156],
  );
}

export function calendar(id, x, y, { style = "default", theme = "dark", size = 200 } = {}) {
  return node(id, "calendar", x, y, { calendarTheme: theme, calendarStyle: style }, [size, size]);
}

// items: [text, checked] pairs.
export function todo(id, x, y, items, data = {}) {
  return node(id, "todo", x, y, {
    items: items.map(([text, checked], i) => ({ id: `${id}-${i + 1}`, text, checked: !!checked })),
    ...data,
  });
}

export function table(id, x, y, columns, rows, data = {}) {
  return node(id, "table", x, y, { columns, rows, ...data });
}

// items: { kind: "text" | "link" | "todo" | "comment", text, url, checked, n }.
export function column(id, x, y, title, items, data = {}) {
  return {
    ...node(id, "column", x, y, {
      title,
      items: items.map((item, i) => ({
        id: `${id}-${i + 1}`,
        kind: item.kind || "text",
        backgroundColor: item.backgroundColor ?? null,
        text: item.text ?? "",
        ...(item.kind === "link" ? { url: item.url ?? "" } : {}),
        ...(item.kind === "todo" ? { checked: !!item.checked } : {}),
        ...(item.kind === "comment"
          ? { avatarUserId: personId(item.n), authorName: person(item.n).name }
          : {}),
      })),
      ...data,
    }),
    style: { width: 374 },
  };
}

export function edge(id, source, target, { color = EDGE_STROKE, label, animated = false, dashed = false } = {}) {
  return {
    id,
    source,
    target,
    type: "center",
    animated,
    ...(label ? { label } : {}),
    style: { stroke: color, strokeWidth: 2, ...(dashed ? { strokeDasharray: "6 6" } : {}) },
    markerEnd: { type: ARROW, width: 20, height: 20, color },
  };
}
