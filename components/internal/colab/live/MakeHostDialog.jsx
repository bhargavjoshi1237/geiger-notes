"use client";

import React from "react";
import {
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@geiger/ui";

// Confirms handing the host role to another member.
export default function MakeHostDialog({ candidate, onCancel, onConfirm }) {
  return (
    <Dialog open={Boolean(candidate)} onOpenChange={(open) => !open && onCancel()}>
      <DialogContent className="max-w-sm border-border bg-surface-dialog text-foreground">
        <DialogHeader>
          <DialogTitle>Make {candidate?.name} the host?</DialogTitle>
          <DialogDescription>
            They get every host control and you become an editor. As the session&apos;s owner you can take the host role
            back at any time from Session Members.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="ghost" onClick={onCancel}>
            Cancel
          </Button>
          <Button className="bg-primary text-primary-foreground hover:bg-primary/90" onClick={() => onConfirm(candidate)}>
            Make host
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
