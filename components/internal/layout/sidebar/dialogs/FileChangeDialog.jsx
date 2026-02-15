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
import { Upload, X, Download, AlertTriangle, FileText } from "lucide-react";
import { toast } from "sonner";

export default function FileChangeDialog({
  open,
  onOpenChange,
  onSave,
  currentSrc,
}) {
  const [selectedFile, setSelectedFile] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isWarningVisible, setIsWarningVisible] = useState(true);
  const fileInputRef = useRef(null);
  const hasExistingFile = currentSrc && !currentSrc.startsWith("data:");

  useEffect(() => {
    if (open) {
      setSelectedFile(null);
      setIsProcessing(false);
      setIsWarningVisible(true);
    }
  }, [open]);

  const handleDownloadOld = async () => {
    if (!currentSrc) return;

    try {
      const link = document.createElement("a");
      link.href = currentSrc;
      link.download = "";
      link.target = "_blank";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      toast.success("Download started");
    } catch (err) {
      console.error("Download error:", err);
      toast.error("Failed to download file");
    }
  };

  const handleFileSelect = (e) => {
    let file;
    if (e.type === "drop") {
      file = e.dataTransfer.files[0];
    } else {
      file = e.target.files[0];
    }

    if (file) {
      setSelectedFile(file);
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
    if (!selectedFile) return;
    setIsProcessing(true);

    try {
      onSave(selectedFile);
      setSelectedFile(null);
      onOpenChange(false);
    } catch (error) {
      console.error("Error processing file:", error);
      toast.error("Failed to process file.");
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px] bg-[#1e1e1e] border-zinc-800 text-zinc-100">
        <DialogHeader>
          <DialogTitle>Upload File</DialogTitle>
          <DialogDescription className="text-zinc-400">
            Upload a new file to replace the current one.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-5 py-4">
          {hasExistingFile && isWarningVisible && (
            <div className="relative flex items-start gap-3 p-3 rounded-lg bg-amber-500/10 border border-amber-500/20 pr-8">
              <AlertTriangle className="w-5 h-5 text-amber-400 mt-0.5 shrink-0" />
              <div className="flex-1 space-y-2">
                <p className="text-sm text-amber-200/90">
                  Replacing this file will delete the old version. Download it
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
            className="border-2 border-dashed border-zinc-700 rounded-lg p-6 flex flex-col items-center justify-center min-h-[150px] cursor-pointer hover:border-zinc-500 transition-colors bg-zinc-900/50"
            onDragOver={handleDragOver}
            onDrop={handleDragDrop}
            onClick={() => fileInputRef.current?.click()}
          >
            {selectedFile ? (
              <div className="relative w-full h-full flex flex-col items-center justify-center gap-3">
                <FileText className="w-12 h-12 text-blue-400" />
                <div className="text-center">
                  <p className="text-sm font-medium text-zinc-200">
                    {selectedFile.name}
                  </p>
                  <p className="text-xs text-zinc-500">
                    {(selectedFile.size / 1024).toFixed(2)} KB
                  </p>
                </div>
                <Button
                  size="icon"
                  variant="destructive"
                  className="absolute top-[-10px] right-[-10px] h-6 w-6 rounded-full"
                  onClick={(e) => {
                    e.stopPropagation();
                    setSelectedFile(null);
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
                  Click or drag file here
                </div>
              </div>
            )}
            <input
              type="file"
              ref={fileInputRef}
              className="hidden"
              onChange={handleFileSelect}
            />
          </div>
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
            {isProcessing ? "Processing..." : "Upload File"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
