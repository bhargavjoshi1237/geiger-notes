"use client";

import React, { useEffect } from "react";
import { createPortal } from "react-dom";
import { X, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import DrawingToolbar from "./DrawingToolbar";
import { downloadImage } from "./downloadImage";

const ImageFullscreenModal = ({
  src,
  alt,
  caption,
  transform,
  isFullResOpen,
  mounted,
  imgDims,
  closeFullRes,
  handleImageLoad,
  drawing,
  isSizeOpen,
  isColorOpen,
  setIsSizeOpen,
  setIsColorOpen,
}) => {
  const {
    tool,
    setTool,
    brushSize,
    setBrushSize,
    brushColor,
    setBrushColor,
    canvasRef,
    redrawCanvas,
    toggleDrawing,
    clearDrawing,
    startDrawing,
    draw,
    stopDrawing,
  } = drawing;

  const isDrawing = drawing.isDrawing;
  const drawingData = drawing.drawingData;

  useEffect(() => {
    if (isFullResOpen && canvasRef.current && drawingData) {
      redrawCanvas(canvasRef.current, drawingData);
    }
  }, [isFullResOpen, drawingData, imgDims, canvasRef, redrawCanvas]);

  useEffect(() => {
    if (canvasRef.current && imgDims.w > 0 && imgDims.h > 0) {
      canvasRef.current.width = imgDims.w;
      canvasRef.current.height = imgDims.h;
      if (drawingData) redrawCanvas(canvasRef.current, drawingData);
    }
  }, [imgDims, drawingData, canvasRef, redrawCanvas]);

  if (!isFullResOpen || !mounted) return null;

  const handleDownload = (e) => {
    e.stopPropagation();
    downloadImage({ src, drawingData, transform });
  };

  return createPortal(
    <div
      className="fixed inset-0 z-[99999] bg-black/95 flex flex-col items-center justify-center p-4 cursor-default animate-in fade-in duration-200 select-none"
      onClick={closeFullRes}
    >
      <div className="absolute top-5 right-5 flex items-center gap-2 z-50 pointer-events-auto">
        <Button
          variant="secondary"
          size="icon"
          onClick={handleDownload}
          className="rounded-full w-10 h-10 hover:bg-zinc-900 hover:text-white transition-colors"
          title="Download Image"
        >
          <Download size={18} />
        </Button>

        <Button
          variant="secondary"
          size="icon"
          onClick={closeFullRes}
          className="rounded-full w-10 h-10 hover:bg-zinc-900 hover:text-white transition-colors"
          title="Close"
        >
          <X size={18} />
        </Button>
      </div>

      <DrawingToolbar
        isDrawing={isDrawing}
        tool={tool}
        brushSize={brushSize}
        brushColor={brushColor}
        isSizeOpen={isSizeOpen}
        isColorOpen={isColorOpen}
        setTool={setTool}
        setBrushSize={setBrushSize}
        setBrushColor={setBrushColor}
        setIsSizeOpen={setIsSizeOpen}
        setIsColorOpen={setIsColorOpen}
        toggleDrawing={toggleDrawing}
        clearDrawing={clearDrawing}
      />

      <div
        className="relative shadow-2xl"
        onClick={(e) => e.stopPropagation()}
        style={{
          width: imgDims.w || "auto",
          height: imgDims.h || "auto",
          transform: `rotate(${transform.rotation}deg) scaleX(${transform.scaleX}) scaleY(${transform.scaleY})`,
          transition: "transform 0.3s ease",
        }}
      >
        <img src={src} className="hidden" onLoad={handleImageLoad} />

        {imgDims.w > 0 && (
          <>
            <img
              src={src}
              alt={alt}
              className="absolute inset-0 w-full h-full object-fill pointer-events-none select-none rounded-sm"
            />
            <canvas
              ref={canvasRef}
              className={`absolute inset-0 w-full h-full z-10 rounded-sm ${isDrawing ? "cursor-crosshair pointer-events-auto" : "pointer-events-none"}`}
              onMouseDown={startDrawing}
              onMouseMove={draw}
              onMouseUp={stopDrawing}
              onMouseLeave={stopDrawing}
            />
          </>
        )}
      </div>

      {caption.text && (
        <div
          className="absolute bottom-10 px-4 py-2 rounded-full max-w-lg text-center"
          style={{
            backgroundColor: "rgba(30,30,30,0.8)",
            color: "white",
            backdropFilter: "blur(4px)",
          }}
        >
          {caption.text}
        </div>
      )}
    </div>,
    document.body,
  );
};

export default ImageFullscreenModal;
