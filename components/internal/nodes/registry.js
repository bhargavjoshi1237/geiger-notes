"use client";

// Single source of truth for canvas node types: React Flow components, toolbar entries, sidebar settings and new-node defaults.
import CustomNode from "./CustomNode";
import CommentNode from "./CommentNode";
import LinkNode from "./LinkNode";
import BoardNode from "./BoardNode";
import DocumentNode from "./DocumentNode";
import SketchNode from "./SketchNode";
import ImageNode from "./ImageNode";
import FileNode from "./FileNode";
import ClockNode from "./clock/ClockNode";
import CalendarNode from "./calendar/CalendarNode";
import CheckboxNode from "./CheckboxNode";
import TableNode from "./TableNode";
import ColumnNode, { COLUMN_DEFAULT_SIZE, columnNodeDefaults } from "./ColumnNode";
import LinkSettings from "./link/LinkSettings";
import TextNode, { nodeMeta as textMeta } from "./text/TextNode";
import TextSettings from "./text/TextSettings";
import ShapeNode, { nodeMeta as shapeMeta } from "./shape/ShapeNode";
import ShapeSettings from "./shape/ShapeSettings";
import StickerNode, { nodeMeta as stickerMeta } from "./sticker/StickerNode";
import StickerSettings from "./sticker/StickerSettings";
import EmbedNode, { nodeMeta as embedMeta } from "./embed/EmbedNode";
import EmbedSettings from "./embed/EmbedSettings";
import MediaNode, { nodeMeta as mediaMeta } from "./media/MediaNode";
import MediaSettings from "./media/MediaSettings";
import CodeNode, { nodeMeta as codeMeta } from "./code/CodeNode";
import CodeSettings from "./code/CodeSettings";
import TimerNode, { nodeMeta as timerMeta } from "./timer/TimerNode";
import TimerSettings from "./timer/TimerSettings";
import PollNode, { nodeMeta as pollMeta } from "./poll/PollNode";
import PollSettings from "./poll/PollSettings";
import ProgressNode, { nodeMeta as progressMeta } from "./progress/ProgressNode";
import ProgressSettings from "./progress/ProgressSettings";
import ChartNode, { nodeMeta as chartMeta } from "./chart/ChartNode";
import ChartSettings from "./chart/ChartSettings";
import PersonNode, { nodeMeta as personMeta } from "./person/PersonNode";
import PersonSettings from "./person/PersonSettings";
import PaletteNode, { nodeMeta as paletteMeta } from "./palette/PaletteNode";
import PaletteSettings from "./palette/PaletteSettings";
import MindmapNode, { nodeMeta as mindmapMeta } from "./mindmap/MindmapNode";
import MindmapSettings from "./mindmap/MindmapSettings";
import MermaidNode, { nodeMeta as mermaidMeta } from "./mermaid/MermaidNode";
import MermaidSettings from "./mermaid/MermaidSettings";
import FormulaNode, { nodeMeta as formulaMeta } from "./formula/FormulaNode";
import FormulaSettings from "./formula/FormulaSettings";
import AiNode, { nodeMeta as aiMeta } from "./ai/AiNode";
import AiSettings from "./ai/AiSettings";
import MirrorNode, { nodeMeta as mirrorMeta } from "./mirror/MirrorNode";
import MirrorSettings from "./mirror/MirrorSettings";
import HuddleNode, { nodeMeta as huddleMeta } from "./huddle/HuddleNode";

// New node types, in toolbar order: [meta, component, settings panel].
const EXTRA_NODES = [
  [textMeta, TextNode, TextSettings],
  [shapeMeta, ShapeNode, ShapeSettings],
  [stickerMeta, StickerNode, StickerSettings],
  [embedMeta, EmbedNode, EmbedSettings],
  [mediaMeta, MediaNode, MediaSettings],
  [codeMeta, CodeNode, CodeSettings],
  [timerMeta, TimerNode, TimerSettings],
  [pollMeta, PollNode, PollSettings],
  [progressMeta, ProgressNode, ProgressSettings],
  [chartMeta, ChartNode, ChartSettings],
  [personMeta, PersonNode, PersonSettings],
  [paletteMeta, PaletteNode, PaletteSettings],
  [mindmapMeta, MindmapNode, MindmapSettings],
  [mermaidMeta, MermaidNode, MermaidSettings],
  [formulaMeta, FormulaNode, FormulaSettings],
  [aiMeta, AiNode, AiSettings],
  [mirrorMeta, MirrorNode, MirrorSettings],
  [huddleMeta, HuddleNode, null],
];

export const NODE_TYPES = {
  custom: CustomNode,
  comment: CommentNode,
  link: LinkNode,
  board: BoardNode,
  document: DocumentNode,
  sketch: SketchNode,
  image: ImageNode,
  file: FileNode,
  clock: ClockNode,
  calendar: CalendarNode,
  todo: CheckboxNode,
  table: TableNode,
  column: ColumnNode,
  ...Object.fromEntries(EXTRA_NODES.map(([meta, Component]) => [meta.type, Component])),
};

export const NODE_META = Object.fromEntries(EXTRA_NODES.map(([meta]) => [meta.type, meta]));

export const NODE_SETTINGS = {
  link: LinkSettings,
  ...Object.fromEntries(EXTRA_NODES.filter(([, , S]) => S).map(([meta, , Settings]) => [meta.type, Settings])),
};

// Toolbar entries for the new node types (tool id === node type).
export const EXTRA_TOOLS = EXTRA_NODES.map(([meta]) => ({
  id: meta.type,
  label: meta.label,
  icon: meta.icon,
  dragType: meta.type,
}));

// Types whose creation needs a server row first (handled by the full canvas, not the collab session).
export const SERVER_NODE_TYPES = ["board", "document", "sketch"];

const PLACEHOLDER_IMAGE =
  "https://images.unsplash.com/photo-1605559424843-9e4c228bf1c2?q=80&w=1000&auto=format&fit=crop";

// Default data/size for every locally created node type.
const LOCAL_DEFAULTS = {
  image: () => ({ data: { label: "Image", src: PLACEHOLDER_IMAGE, alt: "Placeholder Image" }, style: { width: 200, height: 250 } }),
  file: () => ({
    data: { label: "File", fileName: "No file selected", fileSize: 0, fileType: "", src: null },
    style: { width: 200, height: 80 },
  }),
  calendar: () => ({ data: { calendarTheme: "light", calendarStyle: "default" }, style: { width: 200, height: 200 } }),
  clock: () => ({ data: { label: "Clock", clockType: "analog" }, style: { width: 156, height: 156 } }),
  todo: () => ({ data: { items: [{ id: `todo-${Date.now()}`, text: "", checked: false }] } }),
  table: () => ({ data: { columns: ["Column 1", "Column 2"], rows: [["", ""], ["", ""]] } }),
  column: () => ({ data: columnNodeDefaults(), style: { ...COLUMN_DEFAULT_SIZE } }),
};

export const newNodeId = () => `node-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;

// Build a ready-to-insert node for a dropped tool, or null for server-backed types.
export function createLocalNode(type, position) {
  if (SERVER_NODE_TYPES.includes(type)) return null;
  const factory = NODE_META[type]?.create || LOCAL_DEFAULTS[type];
  const base = factory ? factory() : { data: { label: "" }, style: { width: 338, height: 68 } };
  return { id: newNodeId(), type: NODE_TYPES[type] ? type : "custom", position, ...base };
}
