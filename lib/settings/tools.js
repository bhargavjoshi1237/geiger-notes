"use client";

// Toolbar tool catalogue shared by the Settings dialog (toggles) and the
// canvas MainSidebar (rendering). Keeping a single source of truth means the
// ids used to enable/disable a tool always line up with what is rendered.
import {
  StickyNote,
  Link as LinkIcon,
  CheckSquare,
  FileText,
  LayoutDashboard,
  Columns,
  MessageSquare,
  Table,
  Calendar,
  Image as ImageIcon,
  Upload,
  PenTool,
} from "lucide-react";

// `dragType` is the payload set on dragstart and consumed by the canvas onDrop
// handler. Tools without a `dragType` are not yet draggable (parity with the
// previous hard-coded sidebar) but can still be shown/hidden.
export const TOOLS = [
  { id: "note", label: "Note", icon: StickyNote, dragType: "custom" },
  { id: "link", label: "Link", icon: LinkIcon, dragType: "link" },
  { id: "todo", label: "To-do", icon: CheckSquare, dragType: "todo" },
  { id: "document", label: "Document", icon: FileText, dragType: "document" },
  { id: "board", label: "Board", icon: LayoutDashboard, dragType: "board" },
  { id: "column", label: "Column", icon: Columns },
  { id: "comment", label: "Comment", icon: MessageSquare, dragType: "comment" },
  { id: "table", label: "Table", icon: Table, dragType: "table" },
  { id: "calendar", label: "Calendar", icon: Calendar, dragType: "calendar" },
  { id: "image", label: "Image", icon: ImageIcon, dragType: "image" },
  { id: "upload", label: "Upload", icon: Upload, dragType: "file" },
  { id: "draw", label: "Draw", icon: PenTool },
];
