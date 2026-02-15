"use client";

import React from "react";
import { X, Pencil, Eraser, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PRESET_COLORS, PRESET_SIZES } from "./constants";

const DrawingToolbar = ({
  isDrawing,
  tool,
  brushSize,
  brushColor,
  isSizeOpen,
  isColorOpen,
  setTool,
  setBrushSize,
  setBrushColor,
  setIsSizeOpen,
  setIsColorOpen,
  toggleDrawing,
  clearDrawing,
}) => {
  return (
    <div
      className="absolute left-5 top-1/2 -translate-y-1/2 flex flex-col gap-3 z-50 bg-zinc-900/90 p-3 rounded-xl border border-zinc-800 backdrop-blur pointer-events-auto animate-in slide-in-from-left-5 duration-300"
      onClick={(e) => e.stopPropagation()}
    >
      <Button
        variant={isDrawing && tool === "pencil" ? "default" : "ghost"}
        size="icon"
        onClick={() => {
          if (!isDrawing) {
            toggleDrawing({ stopPropagation: () => {} });
            setTool("pencil");
          } else if (tool === "pencil") {
            toggleDrawing({ stopPropagation: () => {} });
          } else {
            setTool("pencil");
          }
        }}
        title={isDrawing && tool === "pencil" ? "Stop Drawing" : "Pencil"}
      >
        <Pencil size={20} />
      </Button>

      <Button
        variant={isDrawing && tool === "eraser" ? "default" : "ghost"}
        size="icon"
        onClick={() => {
          if (!isDrawing) {
            toggleDrawing({ stopPropagation: () => {} });
          }
          setTool("eraser");
        }}
        title="Eraser"
      >
        <Eraser size={20} />
      </Button>

      <div className="w-full h-[1px] bg-zinc-700" />

      <div className="relative group/size flex items-center transition-all duration-300">
        <Button
          variant="ghost"
          size="icon"
          title="Brush Size"
          onClick={() => {
            setIsSizeOpen(!isSizeOpen);
            setIsColorOpen(false);
          }}
        >
          {isSizeOpen ? (
            <X size={18} className="text-zinc-400" />
          ) : (
            <div
              className="w-4 h-4 rounded-full bg-current"
              style={{
                transform: `scale(${Math.min(brushSize / 10, 1.5)})`,
              }}
            />
          )}
        </Button>

        <div
          className={`absolute left-full ml-6 bg-zinc-900/90 border border-zinc-800 p-2 rounded-xl flex gap-2 items-center backdrop-blur transition-all duration-300 origin-left ${
            isSizeOpen
              ? "opacity-100 scale-100 translate-x-0"
              : "opacity-0 scale-95 -translate-x-4 pointer-events-none"
          }`}
        >
          {PRESET_SIZES.map((size) => (
            <button
              key={size}
              onClick={() => setBrushSize(size)}
              className={`rounded-full hover:bg-zinc-700 flex items-center justify-center w-8 h-8 transition-all ${brushSize === size ? "bg-zinc-700 ring-1 ring-white" : ""}`}
            >
              <div
                className="bg-white rounded-full"
                style={{
                  width: size,
                  height: size,
                  maxHeight: 16,
                  maxWidth: 16,
                }}
              />
            </button>
          ))}
        </div>
      </div>

      <div className="relative group/color flex items-center transition-all duration-300">
        <Button
          variant="ghost"
          size="icon"
          title="Brush Color"
          onClick={() => {
            setIsColorOpen(!isColorOpen);
            setIsSizeOpen(false);
          }}
        >
          {isColorOpen ? (
            <X size={18} className="text-zinc-400" />
          ) : (
            <div
              className="w-5 h-5 rounded-full border border-white/20"
              style={{ backgroundColor: brushColor }}
            />
          )}
        </Button>

        <div
          className={`absolute left-full ml-6 bg-zinc-900/90 border border-zinc-800 p-2 rounded-xl grid grid-cols-4 gap-2 backdrop-blur transition-all duration-300 origin-left ${
            isColorOpen
              ? "opacity-100 scale-100 translate-x-0"
              : "opacity-0 scale-95 -translate-x-4 pointer-events-none"
          }`}
          style={{ width: "max-content" }}
        >
          {PRESET_COLORS.map((c) => (
            <button
              key={c}
              className={`w-6 h-6 rounded-full border transition-transform hover:scale-110 ${brushColor === c ? "border-white scale-110" : "border-transparent"}`}
              style={{ backgroundColor: c }}
              title={c}
              onClick={() => setBrushColor(c)}
            />
          ))}
        </div>
      </div>

      <div className="w-full h-[1px] bg-zinc-700" />

      <Button
        variant="ghost"
        size="icon"
        className="text-zinc-400 hover:text-white hover:bg-zinc-700"
        onClick={clearDrawing}
        title="Clear All"
      >
        <Trash2 size={20} />
      </Button>
    </div>
  );
};

export default DrawingToolbar;
