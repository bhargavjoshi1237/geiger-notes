"use client";

import { useState, useEffect, useCallback } from "react";

export function useImageModal({ isDrawing }) {
  const [isFullResOpen, setIsFullResOpen] = useState(false);
  const [imgDims, setImgDims] = useState({ w: 0, h: 0 });
  const [isSizeOpen, setIsSizeOpen] = useState(false);
  const [isColorOpen, setIsColorOpen] = useState(false);

  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (isDrawing) {
      setIsFullResOpen(true);
    }
  }, [isDrawing]);

  const handleDoubleClick = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsFullResOpen(true);
  }, []);

  const closeFullRes = useCallback((e) => {
    if (e) e.stopPropagation();
    setIsFullResOpen(false);
    setIsSizeOpen(false);
    setIsColorOpen(false);
  }, []);

  const handleImageLoad = useCallback((e) => {
    const natW = e.target.naturalWidth;
    const natH = e.target.naturalHeight;
    const maxW = window.innerWidth * 0.9;
    const maxH = window.innerHeight * 0.9;

    const ratio = Math.min(maxW / natW, maxH / natH);

    setImgDims({
      w: natW * ratio,
      h: natH * ratio,
    });
  }, []);

  return {
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
  };
}
