"use client";

import React, { useState } from "react";
import {
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Field,
  Input,
  Textarea,
} from "@geiger/ui";
import { Loader2 } from "lucide-react";

// Form body is mounted per open so the draft always starts from the current values.
function DetailsForm({ initialName, initialDescription, onSave, onClose }) {
  const [name, setName] = useState(initialName || "");
  const [description, setDescription] = useState(initialDescription || "");
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    const ok = await onSave(name.trim() || "Untitled Sketch", description.trim());
    setSaving(false);
    if (ok !== false) onClose();
  };

  return (
    <>
      <div className="grid gap-4">
        <Field label="Name" htmlFor="sketch-name">
          <Input
            id="sketch-name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") handleSave();
            }}
            autoFocus
            placeholder="Untitled Sketch"
          />
        </Field>
        <Field
          label="Description"
          htmlFor="sketch-description"
          hint="Shown under the name on the canvas."
        >
          <Textarea
            id="sketch-description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={3}
            placeholder="What is this sketch about?"
          />
        </Field>
      </div>

      <DialogFooter>
        <Button
          variant="ghost"
          onClick={onClose}
          disabled={saving}
          className="text-muted-foreground hover:text-foreground hover:bg-surface-hover"
        >
          Cancel
        </Button>
        <Button
          onClick={handleSave}
          disabled={saving}
          className="bg-primary text-primary-foreground hover:bg-primary/80"
        >
          {saving ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Saving
            </>
          ) : (
            "Save"
          )}
        </Button>
      </DialogFooter>
    </>
  );
}

export default function EditSketchDetailsDialog({
  open,
  onOpenChange,
  initialName,
  initialDescription,
  onSave,
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-surface-dialog border-border text-foreground sm:max-w-[440px]">
        <DialogHeader>
          <DialogTitle>Edit Sketch</DialogTitle>
          <DialogDescription>
            Rename the sketch and add a short description.
          </DialogDescription>
        </DialogHeader>
        {open && (
          <DetailsForm
            initialName={initialName}
            initialDescription={initialDescription}
            onSave={onSave}
            onClose={() => onOpenChange(false)}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}
