"use client";

import React, { useState, useRef, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Label } from "@/components/ui/label";
import { Upload, X, Download, AlertTriangle } from "lucide-react";
import { toast } from "sonner";

export default function ImageChangeDialog({
  open,
  onOpenChange,
  onSave,
  currentSrc,
}) {
  const [selectedFile, setSelectedFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [quality, setQuality] = useState(0.8);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isWarningVisible, setIsWarningVisible] = useState(true);
  const fileInputRef = useRef(null);

  const hasExistingImage =
    currentSrc &&
    currentSrc !== "https://placehold.co/600x400" &&
    !currentSrc.startsWith("data:");

  useEffect(() => {
    if (open) {
      setSelectedFile(null);
      setPreviewUrl(null);
      setQuality(0.8);
      setIsProcessing(false);
      setIsWarningVisible(true);
    }
  }, [open]);

  useEffect(() => {
    return () => {
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
      }
    };
  }, [previewUrl]);

  const handleDownloadOld = async () => {
    if (!currentSrc) return;

    try {
      const link = document.createElement("a");
      link.href = currentSrc;
      link.download = "old-image.png";
      link.target = "_blank";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      toast.success("Download started");
    } catch (err) {
      console.error("Download error:", err);
      toast.error("Failed to download image");
    }
  };

  const handleFileSelect = (e) => {
    let file;
    if (e.type === "drop") {
      file = e.dataTransfer.files[0];
    } else {
      file = e.target.files[0];
    }

    if (file && file.type.startsWith("image/")) {
      setSelectedFile(file);
      const url = URL.createObjectURL(file);
      setPreviewUrl(url);
      setQuality(0.8);
    } else if (file) {
      toast.error("Please select a valid image file.");
    }
  };

  const handleDragOver = (e) => {
    e.preventDefault();
  };

  const handleDragDrop = (e) => {
    e.preventDefault();
    handleFileSelect(e);
  };

  const processAndSave = async () => {
    if (!selectedFile || !previewUrl) return;
    setIsProcessing(true);

    try {
      const img = new Image();
      img.src = previewUrl;
      await new Promise((resolve, reject) => {
        img.onload = resolve;
        img.onerror = reject;
      });

      const canvas = document.createElement("canvas");
      const maxDim = 2048;
      let w = img.naturalWidth;
      let h = img.naturalHeight;

      if (w > maxDim || h > maxDim) {
        const ratio = Math.min(maxDim / w, maxDim / h);
        w = Math.round(w * ratio);
        h = Math.round(h * ratio);
      }

      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext("2d");
      ctx.drawImage(img, 0, 0, w, h);

      const dataUrl = canvas.toDataURL("image/jpeg", quality);

      onSave(dataUrl);
      setSelectedFile(null);
      setPreviewUrl(null);
    } catch (error) {
      console.error("Error processing image:", error);
      toast.error("Failed to process image.");
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px] bg-[#1e1e1e] border-zinc-800 text-zinc-100">
        <DialogHeader>
          <DialogTitle>Change Image</DialogTitle>
          <DialogDescription className="text-zinc-400">
            Upload a new image to replace the current one.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-5 py-4">
          {hasExistingImage && isWarningVisible && (
            <div className="relative flex items-start gap-3 p-3 rounded-lg bg-amber-500/10 border border-amber-500/20 pr-8">
              <AlertTriangle className="w-5 h-5 text-amber-400 mt-0.5 shrink-0" />
              <div className="flex-1 space-y-2">
                <p className="text-sm text-amber-200/90">
                  Replacing this image will delete the old version. Download it
                  first to keep a copy.
                </p>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={handleDownloadOld}
                  className="h-8 text-xs gap-1.5 border-amber-500/30 transition-colors text-amber-300 hover:bg-amber-500/20 hover:text-amber-200"
                >
                  <Download size={14} />
                  Download
                </Button>
              </div>
              <button
                onClick={() => setIsWarningVisible(false)}
                className="absolute top-2 right-2 text-amber-500/50 hover:text-amber-500 transition-colors"
              >
                <X size={14} />
              </button>
            </div>
          )}

          <div
            className="border-2 border-dashed border-zinc-700 rounded-lg p-6 flex flex-col items-center justify-center min-h-[200px] cursor-pointer hover:border-zinc-500 transition-colors bg-zinc-900/50"
            onDragOver={handleDragOver}
            onDrop={handleDragDrop}
            onClick={() => fileInputRef.current?.click()}
          >
            {previewUrl ? (
              <div className="relative w-full h-full flex items-center justify-center">
                <img
                  src={previewUrl}
                  alt="Preview"
                  className="max-h-[300px] max-w-full w-auto h-auto object-contain rounded-md shadow-sm mx-auto"
                />
                <Button
                  size="icon"
                  variant="destructive"
                  className="absolute top-2 right-2 h-6 w-6 rounded-full"
                  onClick={(e) => {
                    e.stopPropagation();
                    setSelectedFile(null);
                    setPreviewUrl(null);
                  }}
                >
                  <X size={14} />
                </Button>
              </div>
            ) : (
              <div className="text-center space-y-2">
                <div className="bg-zinc-800 p-3 rounded-full inline-flex">
                  <Upload className="w-6 h-6 text-zinc-400" />
                </div>
                <div className="text-zinc-300 font-medium">
                  Click or drag image here
                </div>
                <div className="text-zinc-500 text-sm">
                  Supports JPG, PNG, WEBP
                </div>
              </div>
            )}
            <input
              type="file"
              ref={fileInputRef}
              className="hidden"
              accept="image/*"
              onChange={handleFileSelect}
            />
          </div>

          {previewUrl && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <Label className="text-zinc-300">Compression Quality</Label>
                <span className="text-zinc-400 text-sm">
                  {Math.round(quality * 100)}%
                </span>
              </div>
              <Slider
                value={[quality]}
                min={0.1}
                max={1}
                step={0.05}
                onValueChange={(vals) => setQuality(vals[0])}
                className="py-2"
              />
              <p className="text-xs text-zinc-500">
                The Lower the Percent the Highter the Compression
              </p>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            className="border-zinc-700 text-zinc-300 hover:bg-zinc-800 hover:text-white"
          >
            Cancel
          </Button>
          <Button
            onClick={processAndSave}
            disabled={!selectedFile || isProcessing}
            className="bg-white text-black hover:bg-zinc-200 min-w-[100px]"
          >
            {isProcessing ? "Processing..." : "Replace Image"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
