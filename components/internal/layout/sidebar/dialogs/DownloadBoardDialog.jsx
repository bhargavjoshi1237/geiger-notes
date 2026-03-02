"use client";

import React, { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Braces, FileText, Image, AlignLeft, Loader2 } from "lucide-react";
import { toast } from "sonner";

const FORMAT_OPTIONS = [
  {
    id: "json",
    label: "JSON",
    description: "Raw board data",
    icon: Braces,
    color: "text-yellow-400",
    accent: "bg-yellow-400/10 border-yellow-400/30",
  },
  {
    id: "pdf",
    label: "PDF",
    description: "Printable document",
    icon: FileText,
    color: "text-red-400",
    accent: "bg-red-400/10 border-red-400/30",
  },
  {
    id: "png",
    label: "PNG",
    description: "Board layout image",
    icon: Image,
    color: "text-blue-400",
    accent: "bg-blue-400/10 border-blue-400/30",
  },
  {
    id: "txt",
    label: "TXT",
    description: "Plain text summary",
    icon: AlignLeft,
    color: "text-green-400",
    accent: "bg-green-400/10 border-green-400/30",
  },
];

function triggerBlobDownload(blob, filename) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

function downloadAsJSON(data, name) {
  const blob = new Blob([JSON.stringify(data, null, 2)], {
    type: "application/json",
  });
  triggerBlobDownload(blob, `${name || "board"}.json`);
}

function downloadAsTXT(data, name) {
  const boardName = data.name || name || "Untitled Board";
  const nodes = data.nodes || [];
  const edges = data.edges || [];

  let text = `Board: ${boardName}\n`;
  text += `${"=".repeat(boardName.length + 7)}\n\n`;
  text += `Nodes: ${nodes.length}  |  Edges: ${edges.length}\n\n`;

  if (nodes.length > 0) {
    text += `NODES\n-----\n`;
    nodes.forEach((node, i) => {
      text += `\n[${i + 1}] ${node.type?.toUpperCase() || "NODE"}\n`;
      if (node.data?.label) text += `  Label:    ${node.data.label}\n`;
      if (node.data?.caption) text += `  Caption:  ${node.data.caption}\n`;
      if (node.data?.src) text += `  Source:   ${node.data.src}\n`;
      if (node.data?.fileName) text += `  File:     ${node.data.fileName}\n`;
      text += `  Position: (${Math.round(node.position?.x ?? 0)}, ${Math.round(node.position?.y ?? 0)})\n`;
    });
  }

  if (edges.length > 0) {
    text += `\nEDGES\n-----\n`;
    edges.forEach((edge, i) => {
      text += `\n[${i + 1}] ${edge.source} → ${edge.target}\n`;
    });
  }

  const blob = new Blob([text], { type: "text/plain" });
  triggerBlobDownload(blob, `${name || "board"}.txt`);
}

function downloadAsPDF(data, name, onError) {
  const boardName = data.name || name || "Untitled Board";
  const nodes = data.nodes || [];
  const edges = data.edges || [];

  const rows = nodes
    .map(
      (node, i) => `
      <tr>
        <td>${i + 1}</td>
        <td>${node.type || ""}</td>
        <td>${node.data?.label || node.data?.fileName || ""}</td>
        <td>${Math.round(node.position?.x ?? 0)}, ${Math.round(node.position?.y ?? 0)}</td>
      </tr>`,
    )
    .join("");

  const edgeRows = edges
    .map(
      (edge, i) => `
      <tr>
        <td>${i + 1}</td>
        <td>${edge.source}</td>
        <td>${edge.target}</td>
      </tr>`,
    )
    .join("");

  const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <title>${boardName}</title>
  <style>
    body { font-family: Arial, sans-serif; margin: 40px; color: #111; }
    h1 { font-size: 24px; border-bottom: 2px solid #333; padding-bottom: 8px; }
    h2 { font-size: 16px; margin-top: 28px; color: #444; }
    table { border-collapse: collapse; width: 100%; margin-top: 8px; }
    th { background: #eee; text-align: left; padding: 6px 10px; font-size: 13px; }
    td { border-top: 1px solid #ddd; padding: 6px 10px; font-size: 13px; }
    .meta { color: #666; font-size: 13px; margin-top: 4px; }
  </style>
</head>
<body>
  <h1>${boardName}</h1>
  <p class="meta">Nodes: ${nodes.length} &nbsp;|&nbsp; Edges: ${edges.length}</p>
  <h2>Nodes</h2>
  <table>
    <thead><tr><th>#</th><th>Type</th><th>Label</th><th>Position</th></tr></thead>
    <tbody>${rows}</tbody>
  </table>
  ${
    edges.length > 0
      ? `<h2>Edges</h2>
  <table>
    <thead><tr><th>#</th><th>Source</th><th>Target</th></tr></thead>
    <tbody>${edgeRows}</tbody>
  </table>`
      : ""
  }
</body>
</html>`;

  const printWin = window.open("", "_blank");
  if (!printWin) {
    onError("Popup blocked. Allow popups for this site to export as PDF.");
    return;
  }
  printWin.document.write(html);
  printWin.document.close();
  printWin.focus();
  printWin.print();
}

function downloadAsPNG(data, name) {
  const nodes = data.nodes || [];
  const CANVAS_W = 1200;
  const CANVAS_H = 800;
  const PADDING = 60;

  const canvas = document.createElement("canvas");
  canvas.width = CANVAS_W;
  canvas.height = CANVAS_H;
  const ctx = canvas.getContext("2d");

  // Background
  ctx.fillStyle = "#232323";
  ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);

  // Dot grid
  ctx.fillStyle = "#373737";
  for (let x = 12; x < CANVAS_W; x += 12) {
    for (let y = 12; y < CANVAS_H; y += 12) {
      ctx.beginPath();
      ctx.arc(x, y, 0.8, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  if (nodes.length === 0) {
    ctx.fillStyle = "#555";
    ctx.font = "16px Arial";
    ctx.textAlign = "center";
    ctx.fillText("Empty board", CANVAS_W / 2, CANVAS_H / 2);
  } else {
    const xs = nodes.map((n) => n.position?.x ?? 0);
    const ys = nodes.map((n) => n.position?.y ?? 0);
    const minX = Math.min(...xs);
    const minY = Math.min(...ys);
    const maxX = Math.max(...xs) + 240;
    const maxY = Math.max(...ys) + 80;
    const scaleX = (CANVAS_W - PADDING * 2) / Math.max(maxX - minX, 1);
    const scaleY = (CANVAS_H - PADDING * 2) / Math.max(maxY - minY, 1);
    const scale = Math.min(scaleX, scaleY, 1.5);

    const NODE_COLORS = {
      custom: "#3f3f46",
      board: "#1e1e2e",
      image: "#1c2333",
      document: "#1c2933",
      link: "#2a1c33",
      comment: "#33291c",
      file: "#1c3329",
      clock: "#331c2a",
    };

    nodes.forEach((node) => {
      const nx =
        PADDING + (((node.position?.x ?? 0) - minX) * scale);
      const ny =
        PADDING + (((node.position?.y ?? 0) - minY) * scale);
      const nw = (node.style?.width ?? 200) * scale;
      const nh = (node.style?.height ?? 60) * scale;

      ctx.fillStyle = NODE_COLORS[node.type] || "#3f3f46";
      ctx.strokeStyle = "#52525b";
      ctx.lineWidth = 1;
      ctx.fillRect(nx, ny, Math.max(nw, 40), Math.max(nh, 20));
      ctx.strokeRect(nx, ny, Math.max(nw, 40), Math.max(nh, 20));

      ctx.fillStyle = "#e4e4e7";
      ctx.font = `${Math.max(8, Math.min(12, 11 * scale))}px Arial`;
      ctx.textAlign = "left";
      const label =
        node.data?.label ||
        node.data?.fileName ||
        node.type ||
        "";
      ctx.fillText(
        label.slice(0, 24),
        nx + 6,
        ny + Math.max(nh, 20) / 2 + 4,
      );
    });
  }

  // Title
  ctx.fillStyle = "#a1a1aa";
  ctx.font = "bold 13px Arial";
  ctx.textAlign = "left";
  ctx.fillText(data.name || name || "Board", 16, 20);

  canvas.toBlob((blob) => {
    triggerBlobDownload(blob, `${name || "board"}.png`);
  });
}

export default function DownloadBoardDialog({
  open,
  onOpenChange,
  boardId,
  boardName,
}) {
  const [selected, setSelected] = useState("json");
  const [isLoading, setIsLoading] = useState(false);

  const handleDownload = async () => {
    setIsLoading(true);
    try {
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_BASE_PATH || ""}/api/load-state?boardId=${boardId}`,
      );
      if (!res.ok) throw new Error("Failed to load board data");
      const data = await res.json();

      const name = data.name || boardName || "board";

      switch (selected) {
        case "json":
          downloadAsJSON(data, name);
          break;
        case "txt":
          downloadAsTXT(data, name);
          break;
        case "pdf":
          downloadAsPDF(data, name, (msg) => {
            toast.error(msg || "PDF export failed");
          });
          break;
        case "png":
          downloadAsPNG(data, name);
          break;
      }

      toast.success(`Board exported as ${selected.toUpperCase()}`);
      onOpenChange(false);
    } catch (err) {
      console.error(err);
      toast.error("Failed to export board");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-[#1e1e1e] border-zinc-800 text-white sm:max-w-[440px]">
        <DialogHeader>
          <DialogTitle>Download Board</DialogTitle>
        </DialogHeader>

        <div className="py-4 space-y-3">
          <p className="text-sm text-zinc-400">
            Choose a format to export{" "}
            <span className="text-zinc-200 font-medium">
              {boardName || "this board"}
            </span>
            .
          </p>

          <div className="grid grid-cols-2 gap-2">
            {FORMAT_OPTIONS.map((fmt) => {
              const Icon = fmt.icon;
              const isSelected = selected === fmt.id;
              return (
                <button
                  key={fmt.id}
                  onClick={() => setSelected(fmt.id)}
                  className={`flex items-center gap-3 p-3 rounded-lg border text-left transition-all
                    ${
                      isSelected
                        ? `${fmt.accent} border-opacity-100`
                        : "bg-zinc-900/40 border-zinc-800 hover:bg-zinc-800/60 hover:border-zinc-700"
                    }`}
                >
                  <div
                    className={`p-2 rounded-md shrink-0 ${isSelected ? fmt.accent : "bg-zinc-800"}`}
                  >
                    <Icon className={`w-4 h-4 ${isSelected ? fmt.color : "text-zinc-400"}`} />
                  </div>
                  <div className="min-w-0">
                    <p
                      className={`text-sm font-semibold leading-tight ${isSelected ? "text-white" : "text-zinc-300"}`}
                    >
                      {fmt.label}
                    </p>
                    <p className="text-[11px] text-zinc-500 truncate">
                      {fmt.description}
                    </p>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isLoading}
            className="border-zinc-700 text-zinc-400 hover:bg-zinc-800 hover:text-white"
          >
            Cancel
          </Button>
          <Button
            onClick={handleDownload}
            disabled={isLoading}
            className="bg-white text-black hover:bg-zinc-200"
          >
            {isLoading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Exporting...
              </>
            ) : (
              "Download"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
