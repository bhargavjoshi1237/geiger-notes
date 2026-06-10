import React, { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import ColorPicker from "@/components/internal/edges/ColorePicker";

const ImageCaptionDialog = ({ open, onOpenChange, initialData, onSave }) => {
  const [caption, setCaption] = useState("");
  const [opacity, setOpacity] = useState(1);
  const [bgColor, setBgColor] = useState("#1e1e1e");
  const [textColor, setTextColor] = useState("#ffffff");

  useEffect(() => {
    if (initialData) {
      setCaption(initialData.text || "");
      setOpacity(
        initialData.bgOpacity !== undefined ? initialData.bgOpacity : 1,
      );
      setBgColor(initialData.bgColor || "#1e1e1e");
      setTextColor(initialData.textColor || "#ffffff");
    }
  }, [initialData, open]);

  const handleSave = () => {
    onSave({
      text: caption,
      bgOpacity: opacity,
      bgColor,
      textColor,
    });
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px] bg-surface-dialog border-border text-foreground">
        <DialogHeader>
          <DialogTitle>Edit Caption</DialogTitle>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid gap-2">
            <Label htmlFor="caption" className="text-foreground">
              Caption Text
            </Label>
            <Input
              id="caption"
              value={caption}
              onChange={(e) => setCaption(e.target.value)}
              className="bg-surface-hover border-border text-foreground focus:ring-ring focus:border-ring"
              placeholder="Enter caption..."
            />
          </div>

          <div className="grid gap-2">
            <Label className="text-foreground">
              Background Opacity: {Math.round(opacity * 100)}%
            </Label>
            <Slider
              value={[opacity]}
              min={0}
              max={1}
              step={0.01}
              onValueChange={(vals) => setOpacity(vals[0])}
              className="py-4"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="grid gap-2">
              <Label className="text-foreground">Background Color</Label>
              <ColorPicker
                value={bgColor}
                onChange={setBgColor}
                side="top"
                align="start"
              >
                <button
                  className="w-full h-10 rounded border border-border flex items-center justify-center gap-2 hover:border-ring transition-colors"
                  style={{ backgroundColor: bgColor }}
                >
                  {/* Show check pattern if transparent, but opacity handles that mostly. */}
                </button>
              </ColorPicker>
            </div>
            <div className="grid gap-2">
              <Label className="text-foreground">Text Color</Label>
              <ColorPicker
                value={textColor}
                onChange={setTextColor}
                side="top"
                align="start"
              >
                <button
                  className="w-full h-10 rounded border border-border flex items-center justify-center gap-2 hover:border-ring transition-colors"
                  style={{ backgroundColor: textColor }}
                />
              </ColorPicker>
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            className="border-border text-foreground hover:bg-surface-hover hover:text-foreground"
          >
            Cancel
          </Button>
          <Button
            onClick={handleSave}
            className="bg-primary text-primary-foreground hover:bg-primary/80"
          >
            Save changes
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default ImageCaptionDialog;
