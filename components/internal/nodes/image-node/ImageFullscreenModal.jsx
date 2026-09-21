"use client";

import React from "react";
import { createPortal } from "react-dom";
import { X, Download } from "lucide-react";
import { Button } from "@geiger/ui";
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
  annotation,
}) => {
  if (!isFullResOpen || !mounted) return null;

  const handleDownload = (e) => {
    e.stopPropagation();
    downloadImage({ src, annotation, transform });
  };

  return createPortal(
    <div
      className="fixed inset-0 z-[99999] bg-background/95 flex flex-col items-center justify-center p-4 cursor-default animate-in fade-in duration-200 select-none"
      onClick={closeFullRes}
    >
      <div className="absolute top-5 right-5 flex items-center gap-2 z-50 pointer-events-auto">
        <Button
          variant="secondary"
          size="icon"
          onClick={handleDownload}
          className="rounded-full w-10 h-10 hover:bg-muted hover:text-foreground transition-colors"
          title="Download Image"
        >
          <Download size={18} />
        </Button>

        <Button
          variant="secondary"
          size="icon"
          onClick={closeFullRes}
          className="rounded-full w-10 h-10 hover:bg-muted hover:text-foreground transition-colors"
          title="Close"
        >
          <X size={18} />
        </Button>
      </div>

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
        <img src={src} className="hidden" onLoad={handleImageLoad} alt="" />

        {imgDims.w > 0 && (
          <>
            <img
              src={src}
              alt={alt}
              className="absolute inset-0 w-full h-full object-fill pointer-events-none select-none rounded-sm"
            />
            {annotation && (
              <div
                className="absolute inset-0 w-full h-full z-10 pointer-events-none select-none [&>svg]:h-full [&>svg]:w-full"
                dangerouslySetInnerHTML={{ __html: annotation }}
              />
            )}
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
