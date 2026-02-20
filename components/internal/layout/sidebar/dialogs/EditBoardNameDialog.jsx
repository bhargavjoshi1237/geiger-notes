"use client";

import React, { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

export default function EditBoardNameDialog({
  open,
  onOpenChange,
  initialName,
  initialCaption,
  onSave,
}) {
  const [name, setName] = useState(initialName || "");
  const [caption, setCaption] = useState(initialCaption || "");

  React.useEffect(() => {
    setName(initialName || "");
    setCaption(initialCaption || "");
  }, [initialName, initialCaption]);

  const handleSave = () => {
    onSave(name, caption);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-[#1e1e1e] border-zinc-800 text-white sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Edit Board Name</DialogTitle>
        </DialogHeader>
        <div className="py-4 space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium text-zinc-300">Name</label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleSave();
              }}
              autoFocus
              className="bg-zinc-900 border-zinc-700 text-white focus-visible:ring-zinc-600 focus-visible:ring-offset-0"
              placeholder="Enter board name"
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium text-zinc-300">Caption</label>
            <Input
              value={caption}
              onChange={(e) => setCaption(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleSave();
              }}
              className="bg-zinc-900 border-zinc-700 text-white focus-visible:ring-zinc-600 focus-visible:ring-offset-0"
              placeholder="Double click to open"
            />
          </div>
        </div>
        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            className="border-zinc-700 text-zinc-400 hover:bg-zinc-800 hover:text-white"
          >
            Cancel
          </Button>
          <Button
            onClick={handleSave}
            className="bg-white text-black hover:bg-zinc-200"
          >
            Save
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
