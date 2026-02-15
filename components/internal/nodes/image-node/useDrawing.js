"use client";

import { useState, useRef, useCallback } from "react";

export function useDrawing({ id, isDrawing, drawingData, setNodes }) {
  const [tool, setTool] = useState("pencil"); // 'pencil' | 'eraser'
  const [brushSize, setBrushSize] = useState(3);
  const [brushColor, setBrushColor] = useState("#ff0000");

  const canvasRef = useRef(null);
  const [isDrawingStroke, setIsDrawingStroke] = useState(false);
  const lastPos = useRef({ x: 0, y: 0 });

  const redrawCanvas = useCallback((canvas, dataUrl) => {
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    const img = new Image();
    img.onload = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
    };
    img.src = dataUrl;
  }, []);

  const toggleDrawing = useCallback(
    (e) => {
      if (e?.stopPropagation) e.stopPropagation();
      setNodes((nodes) =>
        nodes.map((n) => {
          if (n.id === id) {
            return { ...n, data: { ...n.data, isDrawing: !isDrawing } };
          }
          return n;
        }),
      );
    },
    [id, isDrawing, setNodes],
  );

  const clearDrawing = useCallback(
    (e) => {
      if (e?.stopPropagation) e.stopPropagation();
      if (canvasRef.current) {
        const ctx = canvasRef.current.getContext("2d");
        ctx.clearRect(
          0,
          0,
          canvasRef.current.width,
          canvasRef.current.height,
        );
      }
      setNodes((nodes) =>
        nodes.map((n) => {
          if (n.id === id) {
            return { ...n, data: { ...n.data, drawing: null } };
          }
          return n;
        }),
      );
    },
    [id, setNodes],
  );

  const startDrawing = useCallback(
    (e) => {
      if (!isDrawing) return;
      e.stopPropagation();
      e.preventDefault();

      const canvas = canvasRef.current;
      if (!canvas) return;

      const x = e.nativeEvent.offsetX;
      const y = e.nativeEvent.offsetY;

      setIsDrawingStroke(true);
      lastPos.current = { x, y };

      const ctx = canvas.getContext("2d");
      ctx.beginPath();

      const isEraser = tool === "eraser";
      ctx.globalCompositeOperation = isEraser
        ? "destination-out"
        : "source-over";
      ctx.fillStyle = isEraser ? "rgba(0,0,0,1)" : brushColor;

      ctx.arc(x, y, brushSize / 2, 0, Math.PI * 2);
      ctx.fill();
    },
    [isDrawing, tool, brushColor, brushSize],
  );

  const draw = useCallback(
    (e) => {
      if (!isDrawing || !isDrawingStroke) return;
      e.stopPropagation();
      e.preventDefault();

      const canvas = canvasRef.current;
      if (!canvas) return;

      const x = e.nativeEvent.offsetX;
      const y = e.nativeEvent.offsetY;
      const ctx = canvas.getContext("2d");

      const isEraser = tool === "eraser";
      ctx.globalCompositeOperation = isEraser
        ? "destination-out"
        : "source-over";

      ctx.beginPath();
      ctx.moveTo(lastPos.current.x, lastPos.current.y);
      ctx.lineTo(x, y);
      ctx.strokeStyle = isEraser ? "rgba(0,0,0,1)" : brushColor;
      ctx.lineWidth = brushSize;
      ctx.lineCap = "round";
      ctx.stroke();

      lastPos.current = { x, y };
    },
    [isDrawing, isDrawingStroke, tool, brushColor, brushSize],
  );

  const stopDrawing = useCallback(() => {
    if (!isDrawing || !isDrawingStroke) return;
    setIsDrawingStroke(false);

    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const newDrawingData = canvas.toDataURL("image/webp", 0.6);

    setNodes((nodes) =>
      nodes.map((n) => {
        if (n.id === id) {
          return { ...n, data: { ...n.data, drawing: newDrawingData } };
        }
        return n;
      }),
    );
  }, [id, isDrawing, isDrawingStroke, setNodes]);

  return {
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
  };
}
