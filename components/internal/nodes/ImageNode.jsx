"use client";

import React, { memo } from "react";
import {
  NodeResizeControl,
  useReactFlow,
  Handle,
  Position,
  useConnection,
} from "@xyflow/react";
import { ArrowRight } from "lucide-react";
import {
  ResizeHandle,
  ImageFullscreenModal,
  useDrawing,
  useImageModal,
  DEFAULT_CAPTION,
  DEFAULT_TRANSFORM,
  PLACEHOLDER_SRC,
} from "./image-node";

const ImageNode = ({ id, data, selected, dragging }) => {
  const { setNodes } = useReactFlow();
  const connection = useConnection();
  const isConnecting = connection.inProgress;
  const src = data.src || PLACEHOLDER_SRC;
  const alt = data.alt || "Image Node";
  const caption = data.caption || DEFAULT_CAPTION;
  const transform = data.transform || DEFAULT_TRANSFORM;
  const isDrawing = data.isDrawing || false;
  const drawingData = data.drawing || null;
  const drawing = useDrawing({ id, isDrawing, drawingData, setNodes });

  const {
    isFullResOpen,
    mounted,
    imgDims,
    isSizeOpen,
    isColorOpen,
    setIsSizeOpen,
    setIsColorOpen,
    handleDoubleClick,
    closeFullRes,
    handleImageLoad,
  } = useImageModal({ isDrawing });

  return (
    <>
      <div
        className={`
          relative flex flex-col w-full h-full min-h-[200px] min-w-[100px] group
          transition-all duration-300 ease-out bg-[#1e1e1e]
          ${selected ? "border-2 border-white" : "border-2 border-transparent hover:border-zinc-600"}
          ${dragging ? "shadow-2xl shadow-black/50 z-50" : ""}
        `}
        onDoubleClick={handleDoubleClick}
      >
        <NodeResizeControl
          minWidth={100}
          minHeight={200}
          className="!bg-transparent !border-none"
          position="bottom-right"
          style={{ opacity: 1, pointerEvents: "all", zIndex: 20 }}
        >
          <div
            className={`transition-opacity duration-200 ${selected ? "opacity-100" : "opacity-0 group-hover:opacity-100"}`}
          >
            <ResizeHandle />
          </div>
        </NodeResizeControl>

        <div
          className="w-full h-full flex items-center justify-center overflow-hidden pointer-events-none relative"
          style={{
            transform: `rotate(${transform.rotation}deg) scaleX(${transform.scaleX}) scaleY(${transform.scaleY})`,
            transition: "transform 0.3s ease",
          }}
        >
          <img
            src={src}
            alt={alt}
            className="w-full h-full object-fill pointer-events-none select-none"
          />

          {drawingData && (
            <img
              src={drawingData}
              alt="drawing"
              className="absolute inset-0 w-full h-full object-fill pointer-events-none select-none"
            />
          )}
        </div>

        {caption.text && (
          <div
            className="absolute bottom-0 left-0 right-0 p-3 z-10"
            style={{
              backgroundColor: caption.bgColor,
              color: caption.textColor,
              opacity: caption.bgOpacity,
            }}
          >
            <div className="text-sm font-medium truncate">{caption.text}</div>
          </div>
        )}

        <Handle
          type="target"
          position={Position.Center}
          className={`
            !w-full !h-full !border-0 !rounded-none !bg-transparent absolute !inset-0 !transform-none
            ${isConnecting ? "pointer-events-auto z-50" : "pointer-events-none -z-10"}
          `}
          style={{
            top: 0,
            left: 0,
            opacity: 0,
          }}
        />
        <Handle
          type="source"
          position={Position.Right}
          className={`
            !w-2 !h-2 !bg-zinc-100 !border-0
            absolute !top-0 !right-[0px]
            flex items-center justify-center
            origin-top-right
            transition-transform duration-200 hover:scale-[2.5]
            !translate-x-0 !translate-y-0
            group/handle
            ${selected ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"}
            z-50
          `}
        >
          <ArrowRight className="w-[10px] h-[10px] opacity-0 group-hover/handle:opacity-100 transition-opacity duration-200 text-black -rotate-45" />
        </Handle>
      </div>

      <ImageFullscreenModal
        src={src}
        alt={alt}
        caption={caption}
        transform={transform}
        isFullResOpen={isFullResOpen}
        mounted={mounted}
        imgDims={imgDims}
        closeFullRes={closeFullRes}
        handleImageLoad={handleImageLoad}
        drawing={{ ...drawing, isDrawing, drawingData }}
        isSizeOpen={isSizeOpen}
        isColorOpen={isColorOpen}
        setIsSizeOpen={setIsSizeOpen}
        setIsColorOpen={setIsColorOpen}
      />
    </>
  );
};

export default memo(ImageNode);
