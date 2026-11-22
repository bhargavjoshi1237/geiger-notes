"use client";

import React, { useState, useEffect } from "react";
import { Button, Dialog, DialogContent, DialogHeader, DialogTitle, cn } from "@geiger/ui";
import { Settings2, X, Lightbulb, Moon, LucideSquareMenu, LucideSun, LucideCheckCheck } from "lucide-react";
import CalendarFace from "../../../../nodes/calendar/CalendarFace";
import { calendarLayout } from "../../../../nodes/calendar/sizing";

const STYLES = [
  { id: "default", label: "Day", icon: LucideSun },
  { id: "simple", label: "Month", icon: LucideSquareMenu },
  { id: "blank", label: "Events", icon: LucideCheckCheck },
];

const PREVIEW_HEIGHT = 140;

export default function EditCalendarThemeDialog({
  open,
  onOpenChange,
  initialData,
  onSave,
}) {
  const [data, setData] = useState({});

  useEffect(() => {
    if (open) {
      setData({
        calendarStyle: initialData?.calendarStyle || "default",
        calendarTheme: initialData?.calendarTheme || "light",
      });
    }
  }, [open, initialData]);

  const handleChange = (key, val) => {
    setData((d) => ({ ...d, [key]: val }));
  };

  const handleSave = () => {
    onSave(data);
    onOpenChange(false);
  };

  const activeStyle = data.calendarStyle || "default";
  const activeTheme = data.calendarTheme || "light";
  const now = new Date();
  const previewLayout = calendarLayout(activeStyle);
  const previewWidth = (previewLayout.width / previewLayout.height) * PREVIEW_HEIGHT;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        showCloseButton={false}
        className="max-w-[480px] bg-surface-dialog border border-border text-foreground p-0 overflow-hidden gap-0 sm:rounded-lg"
      >
        <DialogHeader className="p-4 border-b border-border space-y-0">
          <div className="flex items-center justify-between w-full">
            <div className="flex items-center gap-2">
              <Settings2 className="w-5 h-5 text-muted-foreground" />
              <DialogTitle className="text-base font-medium text-foreground">
                Calendar Style
              </DialogTitle>
            </div>
            <button
              onClick={() => onOpenChange(false)}
              className="w-7 h-7 rounded-lg flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-surface-hover transition-all"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </DialogHeader>

        <div className="flex border-b border-border bg-surface-dialog">
          {STYLES.map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => handleChange("calendarStyle", tab.id)}
                className={cn(
                  "flex-1 flex items-center justify-center gap-2 py-3 text-sm font-medium border-b-2 transition-colors",
                  activeStyle === tab.id
                    ? "border-primary text-foreground bg-surface-hover/30"
                    : "border-transparent text-muted-foreground hover:text-foreground hover:bg-surface-hover/20"
                )}
              >
                <Icon className="w-4 h-4" />
                {tab.label}
              </button>
            );
          })}
        </div>

        <div className="p-4 bg-surface-dialog h-[300px] overflow-y-auto scrollbar-thin scrollbar-thumb-border">
          <div className="mb-4">
            <div
              className="rounded-xl border border-border/60 bg-surface-hover p-5 flex items-center justify-center h-[180px]"
              style={{
                backgroundImage:
                  "radial-gradient(circle at 50% 50%, rgba(255,255,255,0.01) 0%, transparent 70%)",
              }}
            >
              <CalendarFace
                calendarStyle={activeStyle}
                theme={activeTheme}
                backgroundColor={initialData?.backgroundColor}
                width={previewWidth}
                height={PREVIEW_HEIGHT}
                now={now}
                className="relative shrink-0"
                style={{ width: previewWidth, height: PREVIEW_HEIGHT }}
              />
            </div>
          </div>

          <div className="mb-4">
            <span className="text-[10px] text-muted-foreground uppercase tracking-wider mb-2 block">
              Theme
            </span>
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => handleChange("calendarTheme", "light")}
                className={cn(
                  "flex items-center justify-center gap-2 py-3 rounded-lg border text-sm font-medium transition-all",
                  activeTheme === "light"
                    ? "border-primary text-foreground bg-surface-hover/50"
                    : "border-border text-muted-foreground hover:text-foreground hover:bg-surface-hover/30"
                )}
              >
                <Lightbulb className="h-4 w-4" /><p>Light</p>
              </button>
              <button
                onClick={() => handleChange("calendarTheme", "dark")}
                className={cn(
                  "flex items-center justify-center gap-2 py-3 rounded-lg border text-sm font-medium transition-all",
                  activeTheme === "dark"
                    ? "border-primary text-foreground bg-surface-hover/50"
                    : "border-border text-muted-foreground hover:text-foreground hover:bg-surface-hover/30"
                )}
              >
                  <Moon className="h-4 w-4" /><p>Dark</p>
              </button>
            </div>
          </div>
        </div>

        <div className="p-4 border-t border-border bg-surface-dialog flex justify-end gap-2 text-sm z-10 relative">
          <Button
            variant="ghost"
            onClick={() => onOpenChange(false)}
            className="text-muted-foreground hover:text-foreground hover:bg-surface-hover"
          >
            Cancel
          </Button>
          <Button
            onClick={handleSave}
            className="bg-primary text-primary-foreground hover:bg-primary/60"
          >
            Save Changes
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
