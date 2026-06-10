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
      <DialogContent className="bg-surface-dialog border-border text-foreground sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Edit Board Name</DialogTitle>
        </DialogHeader>
        <div className="py-4 space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground">Name</label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleSave();
              }}
              autoFocus
              className="bg-muted border-border text-foreground focus-visible:ring-ring focus-visible:ring-offset-0"
              placeholder="Enter board name"
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground">Caption</label>
            <Input
              value={caption}
              onChange={(e) => setCaption(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleSave();
              }}
              className="bg-muted border-border text-foreground focus-visible:ring-ring focus-visible:ring-offset-0"
              placeholder="Double click to open"
            />
          </div>
        </div>
        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            className="border-border text-muted-foreground hover:bg-surface-hover hover:text-foreground"
          >
            Cancel
          </Button>
          <Button
            onClick={handleSave}
            className="bg-primary text-primary-foreground hover:bg-primary/80"
          >
            Save
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
