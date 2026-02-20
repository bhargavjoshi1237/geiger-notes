"use client";

import React, { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import * as LucideIcons from "lucide-react";
import ColorPicker from "../../../edges/ColorePicker";

const COMMON_ICONS = [
  "LayoutDashboard",
  "Folder",
  "FileText",
  "Image",
  "Globe",
  "Box",
  "Database",
  "Monitor",
  "Cloud",
  "Book",
  "Users",
  "Settings",
  "Star",
  "Heart",
  "Briefcase",
  "Calendar",
  "Camera",
  "Coffee",
  "Compass",
  "Feather",
  "Flag",
  "Key",
  "Map",
  "Music",
  "Shield",
  "Target",
  "Zap",
  "Pen",
  "MessageCircle",
  "LayoutGrid",
  "Layers",
  "Code",
  "Sparkles",
  "Fingerprint",
];

export default function EditBoardIconDialog({
  open,
  onOpenChange,
  initialIcon,
  initialLightAccent,
  initialDarkAccent,
  onSave,
}) {
  const [iconName, setIconName] = useState(initialIcon || "LayoutDashboard");
  const [lightAccent, setLightAccent] = useState(
    initialLightAccent || "rgba(168, 85, 247, 0.1)",
  );
  const [darkAccent, setDarkAccent] = useState(initialDarkAccent || "#c084fc");

  React.useEffect(() => {
    setIconName(initialIcon || "LayoutDashboard");
    setLightAccent(initialLightAccent || "rgba(168, 85, 247, 0.1)");
    setDarkAccent(initialDarkAccent || "#c084fc");
  }, [initialIcon, initialLightAccent, initialDarkAccent, open]);

  const handleSave = () => {
    onSave({
      iconName,
      iconLightAccent: lightAccent,
      iconDarkAccent: darkAccent,
    });
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-[#1e1e1e] border-zinc-800 text-white sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Edit Board Icon & Accent</DialogTitle>
        </DialogHeader>
        <div className="py-4 space-y-5">
          <div className="space-y-2">
            <label className="text-sm font-medium text-zinc-300">
              Select Icon
            </label>
            <div className="flex flex-wrap gap-1.5 max-h-[180px] overflow-y-auto p-2 border border-zinc-800/60 rounded-lg bg-zinc-900/20">
              {COMMON_ICONS.map((name) => {
                const Icon = LucideIcons[name];
                if (!Icon) return null;
                const isSelected = iconName === name;
                return (
                  <button
                    key={name}
                    onClick={() => setIconName(name)}
                    className={`p-2 rounded-md transition-all ${
                      isSelected
                        ? "bg-purple-500/20 text-purple-400 border border-purple-500/50"
                        : "text-zinc-400 hover:bg-zinc-800 hover:text-white border border-transparent"
                    }`}
                    title={name}
                  >
                    <Icon className="w-4 h-4" />
                  </button>
                );
              })}
            </div>
          </div>

          <div className="grid grid-cols-[auto_1fr] gap-4 p-4 rounded-lg border border-zinc-800/60 bg-zinc-900/30 items-center">
            {/* Preview Section */}
            <div className="flex flex-col justify-center items-center gap-3 pr-4 border-r border-zinc-800/60">
              <span className="text-[10px] font-semibold text-zinc-500 uppercase tracking-wider">
                Preview
              </span>
              {(() => {
                const SelectedIconComp =
                  LucideIcons[iconName] || LucideIcons.LayoutDashboard;
                return (
                  <div
                    className="p-3 rounded-xl transition-all shadow-sm flex items-center justify-center"
                    style={{ backgroundColor: lightAccent, color: darkAccent }}
                  >
                    <SelectedIconComp className="w-6 h-6" />
                  </div>
                );
              })()}
            </div>

            {/* Accent Colors Section */}
            <div className="flex flex-col gap-3 pl-2">
              <span className="text-[10px] font-semibold text-zinc-500 uppercase tracking-wider">
                Theme Colors
              </span>
              <div className="flex items-center gap-6">
                <ColorPicker
                  value={lightAccent}
                  onChange={setLightAccent}
                  align="center"
                >
                  <button className="flex flex-col items-center gap-2 group cursor-pointer">
                    <div
                      className="w-12 h-6 rounded-md border border-zinc-700 hover:border-zinc-500 transition-all shadow-sm"
                      style={{ backgroundColor: lightAccent }}
                    />
                    <span className="text-[11px] font-medium text-zinc-400 group-hover:text-zinc-200 transition-colors">
                      Background
                    </span>
                  </button>
                </ColorPicker>

                <ColorPicker
                  value={darkAccent}
                  onChange={setDarkAccent}
                  align="center"
                >
                  <button className="flex flex-col items-center gap-2 group cursor-pointer">
                    <div
                      className="w-12 h-6 rounded-md border border-zinc-700 hover:border-zinc-500 transition-all shadow-sm"
                      style={{ backgroundColor: darkAccent }}
                    />
                    <span className="text-[11px] font-medium text-zinc-400 group-hover:text-zinc-200 transition-colors">
                      Icon Color
                    </span>
                  </button>
                </ColorPicker>
              </div>
            </div>
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
