"use client";

import React, { useState, useRef, useEffect, useCallback } from "react";
import { createPortal } from "react-dom";
import { X, Check, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function ImageCropDialog({ open, onOpenChange, src, onSave }) {
  const canvasRef = useRef(null);
  const overlayCanvasRef = useRef(null);
  const [imgLoaded, setImgLoaded] = useState(false);
  const [displayDims, setDisplayDims] = useState({ w: 0, h: 0 });
  const [naturalDims, setNaturalDims] = useState({ w: 0, h: 0 });
  const imgObjRef = useRef(null);
  const [crop, setCrop] = useState({ x: 0, y: 0, w: 0, h: 0 });
  const [dragMode, setDragMode] = useState(null);
  const dragStart = useRef({ mx: 0, my: 0, crop: { x: 0, y: 0, w: 0, h: 0 } });
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!open || !src) return;
    setImgLoaded(false);

    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      imgObjRef.current = img;
      const natW = img.naturalWidth;
      const natH = img.naturalHeight;
      const maxW = window.innerWidth * 0.7;
      const maxH = window.innerHeight * 0.7;
      const ratio = Math.min(maxW / natW, maxH / natH, 1);
      const dw = natW * ratio;
      const dh = natH * ratio;
      setNaturalDims({ w: natW, h: natH });
      setDisplayDims({ w: dw, h: dh });
      setCrop({ x: 0, y: 0, w: dw, h: dh });
      setImgLoaded(true);
    };
    img.src = src;
  }, [open, src]);

  const drawOverlay = useCallback(() => {
    const canvas = overlayCanvasRef.current;
    const img = imgObjRef.current;
    if (!canvas || !img || !imgLoaded) return;
    canvas.width = displayDims.w;
    canvas.height = displayDims.h;
    const ctx = canvas.getContext("2d");
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(img, 0, 0, displayDims.w, displayDims.h);
    ctx.fillStyle = "rgba(0, 0, 0, 0.65)";
    ctx.fillRect(0, 0, displayDims.w, crop.y);
    ctx.fillRect(
      0,
      crop.y + crop.h,
      displayDims.w,
      displayDims.h - crop.y - crop.h,
    );
    ctx.fillRect(0, crop.y, crop.x, crop.h);
    ctx.fillRect(
      crop.x + crop.w,
      crop.y,
      displayDims.w - crop.x - crop.w,
      crop.h,
    );

    ctx.strokeStyle = "rgba(255, 255, 255, 0.9)";
    ctx.lineWidth = 2;
    ctx.strokeRect(crop.x, crop.y, crop.w, crop.h);
    ctx.strokeStyle = "rgba(255, 255, 255, 0.2)";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(crop.x + crop.w / 3, crop.y);
    ctx.lineTo(crop.x + crop.w / 3, crop.y + crop.h);
    ctx.moveTo(crop.x + (crop.w * 2) / 3, crop.y);
    ctx.lineTo(crop.x + (crop.w * 2) / 3, crop.y + crop.h);
    ctx.moveTo(crop.x, crop.y + crop.h / 3);
    ctx.lineTo(crop.x + crop.w, crop.y + crop.h / 3);
    ctx.moveTo(crop.x, crop.y + (crop.h * 2) / 3);
    ctx.lineTo(crop.x + crop.w, crop.y + (crop.h * 2) / 3);
    ctx.stroke();
    const hl = 16;
    const hw = 3;
    ctx.strokeStyle = "rgba(255, 255, 255, 0.95)";
    ctx.lineWidth = hw;
    ctx.lineCap = "square";
    ctx.beginPath();
    ctx.moveTo(crop.x, crop.y + hl);
    ctx.lineTo(crop.x, crop.y);
    ctx.lineTo(crop.x + hl, crop.y);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(crop.x + crop.w - hl, crop.y);
    ctx.lineTo(crop.x + crop.w, crop.y);
    ctx.lineTo(crop.x + crop.w, crop.y + hl);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(crop.x, crop.y + crop.h - hl);
    ctx.lineTo(crop.x, crop.y + crop.h);
    ctx.lineTo(crop.x + hl, crop.y + crop.h);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(crop.x + crop.w - hl, crop.y + crop.h);
    ctx.lineTo(crop.x + crop.w, crop.y + crop.h);
    ctx.lineTo(crop.x + crop.w, crop.y + crop.h - hl);
    ctx.stroke();
    const mhl = 12;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(crop.x + crop.w / 2 - mhl, crop.y);
    ctx.lineTo(crop.x + crop.w / 2 + mhl, crop.y);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(crop.x + crop.w / 2 - mhl, crop.y + crop.h);
    ctx.lineTo(crop.x + crop.w / 2 + mhl, crop.y + crop.h);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(crop.x, crop.y + crop.h / 2 - mhl);
    ctx.lineTo(crop.x, crop.y + crop.h / 2 + mhl);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(crop.x + crop.w, crop.y + crop.h / 2 - mhl);
    ctx.lineTo(crop.x + crop.w, crop.y + crop.h / 2 + mhl);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(crop.x, crop.y + crop.h / 2 - mhl);
    ctx.lineTo(crop.x, crop.y + crop.h / 2 + mhl);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(crop.x + crop.w, crop.y + crop.h / 2 - mhl);
    ctx.lineTo(crop.x + crop.w, crop.y + crop.h / 2 + mhl);
    ctx.stroke();
  }, [crop, displayDims, imgLoaded]);

  useEffect(() => {
    drawOverlay();
  }, [drawOverlay]);

  const getHitZone = (mx, my) => {
    const threshold = 12;
    const cx = crop.x;
    const cy = crop.y;
    const cw = crop.w;
    const ch = crop.h;

    if (Math.abs(mx - cx) < threshold && Math.abs(my - cy) < threshold)
      return "nw";
    if (Math.abs(mx - (cx + cw)) < threshold && Math.abs(my - cy) < threshold)
      return "ne";
    if (Math.abs(mx - cx) < threshold && Math.abs(my - (cy + ch)) < threshold)
      return "sw";
    if (
      Math.abs(mx - (cx + cw)) < threshold &&
      Math.abs(my - (cy + ch)) < threshold
    )
      return "se";

    if (Math.abs(my - cy) < threshold && mx > cx && mx < cx + cw) return "n";
    if (Math.abs(my - (cy + ch)) < threshold && mx > cx && mx < cx + cw)
      return "s";
    if (Math.abs(mx - cx) < threshold && my > cy && my < cy + ch) return "w";
    if (Math.abs(mx - (cx + cw)) < threshold && my > cy && my < cy + ch)
      return "e";
    if (mx > cx && mx < cx + cw && my > cy && my < cy + ch) return "move";
    return null;
  };

  const getCursorForZone = (zone) => {
    const map = {
      nw: "nwse-resize",
      se: "nwse-resize",
      ne: "nesw-resize",
      sw: "nesw-resize",
      n: "ns-resize",
      s: "ns-resize",
      e: "ew-resize",
      w: "ew-resize",
      move: "grab",
    };
    return map[zone] || "default";
  };

  const handleCanvasMouseDown = (e) => {
    const rect = overlayCanvasRef.current.getBoundingClientRect();
    const mx = e.clientX - rect.left;
    const my = e.clientY - rect.top;
    const zone = getHitZone(mx, my);

    if (!zone) return;

    e.preventDefault();
    setDragMode(zone);
    dragStart.current = { mx: e.clientX, my: e.clientY, crop: { ...crop } };
  };

  const handleCanvasMouseMove = useCallback(
    (e) => {
      if (!dragMode && overlayCanvasRef.current) {
        const rect = overlayCanvasRef.current.getBoundingClientRect();
        const mx = e.clientX - rect.left;
        const my = e.clientY - rect.top;
        const zone = getHitZone(mx, my);
        overlayCanvasRef.current.style.cursor = getCursorForZone(zone);
      }
    },
    [dragMode, crop],
  );

  const clamp = (v, min, max) => Math.max(min, Math.min(max, v));

  const handleGlobalMouseMove = useCallback(
    (e) => {
      if (!dragMode) return;
      e.preventDefault();

      const dx = e.clientX - dragStart.current.mx;
      const dy = e.clientY - dragStart.current.my;
      const prev = dragStart.current.crop;
      const minSize = 20;
      const maxW = displayDims.w;
      const maxH = displayDims.h;
      let nc = { ...prev };

      switch (dragMode) {
        case "move":
          nc.x = clamp(prev.x + dx, 0, maxW - prev.w);
          nc.y = clamp(prev.y + dy, 0, maxH - prev.h);
          break;
        case "nw": {
          const nx = clamp(prev.x + dx, 0, prev.x + prev.w - minSize);
          const ny = clamp(prev.y + dy, 0, prev.y + prev.h - minSize);
          nc = {
            x: nx,
            y: ny,
            w: prev.x + prev.w - nx,
            h: prev.y + prev.h - ny,
          };
          break;
        }
        case "ne": {
          const ny = clamp(prev.y + dy, 0, prev.y + prev.h - minSize);
          const nw = clamp(prev.w + dx, minSize, maxW - prev.x);
          nc = { x: prev.x, y: ny, w: nw, h: prev.y + prev.h - ny };
          break;
        }
        case "sw": {
          const nx = clamp(prev.x + dx, 0, prev.x + prev.w - minSize);
          const nh = clamp(prev.h + dy, minSize, maxH - prev.y);
          nc = { x: nx, y: prev.y, w: prev.x + prev.w - nx, h: nh };
          break;
        }
        case "se": {
          nc.w = clamp(prev.w + dx, minSize, maxW - prev.x);
          nc.h = clamp(prev.h + dy, minSize, maxH - prev.y);
          break;
        }
        case "n": {
          const ny = clamp(prev.y + dy, 0, prev.y + prev.h - minSize);
          nc = { ...prev, y: ny, h: prev.y + prev.h - ny };
          break;
        }
        case "s":
          nc.h = clamp(prev.h + dy, minSize, maxH - prev.y);
          break;
        case "w": {
          const nx = clamp(prev.x + dx, 0, prev.x + prev.w - minSize);
          nc = { ...prev, x: nx, w: prev.x + prev.w - nx };
          break;
        }
        case "e":
          nc.w = clamp(prev.w + dx, minSize, maxW - prev.x);
          break;
      }

      setCrop(nc);
    },
    [dragMode, displayDims],
  );

  const handleGlobalMouseUp = useCallback(() => {
    setDragMode(null);
  }, []);

  useEffect(() => {
    if (dragMode) {
      window.addEventListener("mousemove", handleGlobalMouseMove);
      window.addEventListener("mouseup", handleGlobalMouseUp);
      return () => {
        window.removeEventListener("mousemove", handleGlobalMouseMove);
        window.removeEventListener("mouseup", handleGlobalMouseUp);
      };
    }
  }, [dragMode, handleGlobalMouseMove, handleGlobalMouseUp]);

  const resetCrop = () => {
    setCrop({ x: 0, y: 0, w: displayDims.w, h: displayDims.h });
  };

  const handleSave = () => {
    const img = imgObjRef.current;
    if (!img || !displayDims.w) return;
    const sx = naturalDims.w / displayDims.w;
    const sy = naturalDims.h / displayDims.h;

    const natCrop = {
      x: Math.round(crop.x * sx),
      y: Math.round(crop.y * sy),
      w: Math.round(crop.w * sx),
      h: Math.round(crop.h * sy),
    };

    natCrop.x = Math.max(0, natCrop.x);
    natCrop.y = Math.max(0, natCrop.y);
    natCrop.w = Math.min(natCrop.w, naturalDims.w - natCrop.x);
    natCrop.h = Math.min(natCrop.h, naturalDims.h - natCrop.y);

    const outputCanvas = document.createElement("canvas");
    outputCanvas.width = natCrop.w;
    outputCanvas.height = natCrop.h;
    const ctx = outputCanvas.getContext("2d");

    ctx.drawImage(
      img,
      natCrop.x,
      natCrop.y,
      natCrop.w,
      natCrop.h,
      0,
      0,
      natCrop.w,
      natCrop.h,
    );

    const croppedDataUrl = outputCanvas.toDataURL("image/png");
    onSave(croppedDataUrl);
    onOpenChange(false);
  };

  if (!open || !mounted) return null;

  const cropNatW = displayDims.w
    ? Math.round(crop.w * (naturalDims.w / displayDims.w))
    : 0;
  const cropNatH = displayDims.h
    ? Math.round(crop.h * (naturalDims.h / displayDims.h))
    : 0;

  return createPortal(
    <div className="fixed inset-0 z-[99999] bg-black/95 flex flex-col items-center justify-center cursor-default animate-in fade-in duration-200 select-none">
      <div className="absolute top-5 right-5 flex items-center gap-2 z-50 pointer-events-auto">
        <Button
          variant="secondary"
          size="icon"
          onClick={resetCrop}
          className="rounded-full w-10 h-10 hover:bg-zinc-900 hover:text-white transition-colors"
          title="Reset Crop"
        >
          <RotateCcw size={18} />
        </Button>

        <Button
          variant="secondary"
          size="icon"
          onClick={handleSave}
          className="rounded-full w-10 h-10 bg-zinc-700 hover:bg-zinc-600 text-white transition-colors"
          title="Apply Crop"
        >
          <Check size={18} />
        </Button>

        <Button
          variant="secondary"
          size="icon"
          onClick={() => onOpenChange(false)}
          className="rounded-full w-10 h-10 hover:bg-zinc-900 hover:text-white transition-colors"
          title="Cancel"
        >
          <X size={18} />
        </Button>
      </div>
      <div className="absolute top-5 left-5 z-50 text-zinc-400 text-sm pointer-events-none">
        <span className="bg-zinc-900/80 px-3 py-1.5 rounded-lg backdrop-blur border border-zinc-800">
          Crop Image
        </span>
      </div>

      <div
        className="relative"
        style={{ width: displayDims.w, height: displayDims.h }}
      >
        {imgLoaded && (
          <canvas
            ref={overlayCanvasRef}
            width={displayDims.w}
            height={displayDims.h}
            className="rounded-sm"
            style={{ width: displayDims.w, height: displayDims.h }}
            onMouseDown={handleCanvasMouseDown}
            onMouseMove={handleCanvasMouseMove}
          />
        )}
      </div>

      {imgLoaded && (
        <div className="mt-4 text-zinc-500 text-xs bg-zinc-900/80 px-3 py-1.5 rounded-lg border border-zinc-800">
          {cropNatW} × {cropNatH} px
        </div>
      )}
    </div>,
    document.body,
  );
}
