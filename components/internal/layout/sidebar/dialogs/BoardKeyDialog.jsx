"use client";

import React, { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Lock } from "lucide-react";

// Prompts for a board's access key before entering a keyed board.
export default function BoardKeyDialog({
  open,
  onOpenChange,
  boardName,
  onSubmit,
}) {
  // Remounted per prompt (via `key` in the parent), so state starts empty.
  const [value, setValue] = useState("");

  const submit = () => onSubmit(value);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-surface-dialog border-border text-foreground sm:max-w-[400px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Lock className="w-4 h-4" />
            Enter access key
          </DialogTitle>
          <DialogDescription>
            <span className="text-foreground font-medium">
              {boardName || "This board"}
            </span>{" "}
            is locked. Enter its access key to open it.
          </DialogDescription>
        </DialogHeader>

        <Input
          autoFocus
          type="password"
          value={value}
          placeholder="Access key"
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") submit();
          }}
          className="bg-surface-card border-border"
        />

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            className="border-border text-muted-foreground hover:bg-surface-hover hover:text-foreground"
          >
            Cancel
          </Button>
          <Button
            onClick={submit}
            className="bg-primary text-primary-foreground hover:bg-primary/80"
          >
            Unlock
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
