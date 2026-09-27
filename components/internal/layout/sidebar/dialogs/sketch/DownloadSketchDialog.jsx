"use client";

import React, { useState } from "react";
import {
  Button,
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@geiger/ui";
import { Braces, Image, Shapes, Loader2 } from "lucide-react";
import { toast } from "sonner";

const FORMAT_OPTIONS = [
  {
    id: "png",
    label: "PNG",
    description: "Image on white",
    icon: Image,
    color: "text-blue-400",
    accent: "bg-blue-400/10 border-blue-400/30",
  },
  {
    id: "svg",
    label: "SVG",
    description: "Scalable vector",
    icon: Shapes,
    color: "text-green-400",
    accent: "bg-green-400/10 border-green-400/30",
  },
  {
    id: "excalidraw",
    label: "Excalidraw",
    description: "Editable .excalidraw file",
    icon: Braces,
    color: "text-yellow-400",
    accent: "bg-yellow-400/10 border-yellow-400/30",
  },
];

// Exports match the canvas preview: light theme on a white background.
const EXPORT_APP_STATE = {
  exportBackground: true,
  viewBackgroundColor: "#ffffff",
  theme: "light",
  exportWithDarkMode: false,
};

function parseField(value, fallback) {
  if (!value) return fallback;
  if (typeof value === "string") {
    try {
      return JSON.parse(value);
    } catch {
      return fallback;
    }
  }
  return value;
}

function safeFileName(name) {
  return (name || "sketch").replace(/[\\/:*?"<>|]+/g, "-").trim() || "sketch";
}

function triggerBlobDownload(blob, filename) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export default function DownloadSketchDialog({
  open,
  onOpenChange,
  sketchId,
  sketchName,
}) {
  const [selected, setSelected] = useState("png");
  const [isLoading, setIsLoading] = useState(false);

  const handleDownload = async () => {
    if (!sketchId) return;
    setIsLoading(true);
    try {
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_BASE_PATH || ""}/api/sketches?id=${sketchId}`,
      );
      if (!res.ok) throw new Error("Failed to load sketch");
      const row = await res.json();

      const excalidraw = await import("@excalidraw/excalidraw");
      const elements = excalidraw.getNonDeletedElements(
        parseField(row.elements, []),
      );
      const files = parseField(row.files, {});
      if (!elements.length) {
        toast.error("This sketch is empty");
        return;
      }

      const name = safeFileName(row.name || sketchName);
      if (selected === "png") {
        const blob = await excalidraw.exportToBlob({
          elements,
          files,
          appState: EXPORT_APP_STATE,
          mimeType: "image/png",
          exportPadding: 24,
        });
        triggerBlobDownload(blob, `${name}.png`);
      } else if (selected === "svg") {
        const svg = await excalidraw.exportToSvg({
          elements,
          files,
          appState: EXPORT_APP_STATE,
          exportPadding: 24,
        });
        const markup = new XMLSerializer().serializeToString(svg);
        triggerBlobDownload(
          new Blob([markup], { type: "image/svg+xml" }),
          `${name}.svg`,
        );
      } else {
        const json = excalidraw.serializeAsJSON(
          elements,
          EXPORT_APP_STATE,
          files,
          "local",
        );
        triggerBlobDownload(
          new Blob([json], { type: "application/json" }),
          `${name}.excalidraw`,
        );
      }

      toast.success(`Sketch exported as ${selected.toUpperCase()}`);
      onOpenChange(false);
    } catch (err) {
      console.error("[Sketch] Export error:", err);
      toast.error("Failed to export sketch");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-surface-dialog border-border text-foreground sm:max-w-[440px]">
        <DialogHeader>
          <DialogTitle>Download Sketch</DialogTitle>
        </DialogHeader>

        <div className="py-4 space-y-3">
          <p className="text-sm text-muted-foreground">
            Choose a format to export{" "}
            <span className="text-foreground font-medium">
              {sketchName || "this sketch"}
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
                  type="button"
                  onClick={() => setSelected(fmt.id)}
                  className={`flex items-center gap-3 p-3 rounded-lg border text-left transition-all
                    ${
                      isSelected
                        ? `${fmt.accent} border-opacity-100`
                        : "bg-muted border-border hover:bg-surface-hover/60 hover:border-border"
                    }`}
                >
                  <div
                    className={`p-2 rounded-md shrink-0 ${isSelected ? fmt.accent : "bg-surface-hover"}`}
                  >
                    <Icon
                      className={`w-4 h-4 ${isSelected ? fmt.color : "text-muted-foreground"}`}
                    />
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold leading-tight text-foreground">
                      {fmt.label}
                    </p>
                    <p className="text-[11px] text-muted-foreground truncate">
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
            className="border-border text-muted-foreground hover:bg-surface-hover hover:text-foreground"
          >
            Cancel
          </Button>
          <Button
            onClick={handleDownload}
            disabled={isLoading || !sketchId}
            className="bg-primary text-primary-foreground hover:bg-primary/80"
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
