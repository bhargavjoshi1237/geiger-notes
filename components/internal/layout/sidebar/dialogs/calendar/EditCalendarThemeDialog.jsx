"use client";

import React, { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Settings2, X, Lightbulb, Moon, LucideSquareMenu, LucideSun, LucideCheckCheck } from "lucide-react";
import { cn } from "@/lib/utils";
import { WEEKDAY_LABELS, WEEKDAY_LABELS_SUNDAY, getMonthCells, getMonthCellsSunday } from "../../../../nodes/calendar/constants";
import { daySizing, monthSizing, eventsSizing, themeColors } from "../../../../nodes/calendar/sizing";

const STYLES = [
  { id: "default", label: "Day", icon: LucideSun },
  { id: "simple", label: "Month", icon: LucideSquareMenu },
  { id: "blank", label: "Events", icon: LucideCheckCheck },
];

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

  const previewDimensions =
    activeStyle === "blank"
      ? { width: 250, height: 138 }
      : { width: 140, height: 140 };
  const previewRefSize = Math.min(previewDimensions.width, previewDimensions.height);
  const dayPreviewRefSize = 100;

  const daySizingVals = daySizing({ refSize: dayPreviewRefSize });
  const { dateFontSize, dayFontSize } = daySizingVals;

  const monthSizingVals = monthSizing({
    nodeWidth: previewDimensions.width,
    nodeHeight: previewDimensions.height,
    refSize: previewRefSize,
  });
  const {
    monthTitleSize: previewMonthTitleSize,
    monthWeekdaySize: previewMonthWeekdaySize,
    monthDateSize: previewMonthDateSize,
    monthPillSize: previewMonthPillSize,
    monthPaddingX: previewMonthPaddingX,
    monthPaddingTop: previewMonthPaddingTop,
    monthPaddingBottom: previewMonthPaddingBottom,
    monthGapY: previewMonthGapY,
    showMonthWeekdays: showPreviewMonthWeekdays,
  } = monthSizingVals;

  const eventsSizingVals = eventsSizing({
    nodeWidth: previewDimensions.width,
    nodeHeight: previewDimensions.height,
    refSize: previewRefSize,
  });
  const {
    eventPaddingX: previewEventPaddingX,
    eventPaddingY: previewEventPaddingY,
    eventColumnGap: previewEventColumnGap,
    eventSectionGap: previewEventSectionGap,
    eventWeekdaySize: previewEventWeekdaySize,
    eventDateSize: previewEventDateSize,
    eventMessageSize: previewEventMessageSize,
    eventMonthTitleSize: previewEventMonthTitleSize,
    eventCalendarWeekdaySize: previewEventCalendarWeekdaySize,
    eventCalendarDateSize: previewEventCalendarDateSize,
    eventPillSize: previewEventPillSize,
    showEventMessage: showPreviewEventMessage,
  } = eventsSizingVals;

  const monthCells = getMonthCells(now);
  const eventMonthCells = getMonthCellsSunday(now);
  const monthLabel = now.toLocaleDateString("en-US", { month: "short" }).toUpperCase();
  const eventMonthLabel = now.toLocaleDateString("en-US", { month: "long" }).toUpperCase();
  const eventWeekdayLabel = now.toLocaleDateString("en-US", { weekday: "long" }).toUpperCase();

  const renderPreview = () => {
    const innerStyle = {
      backgroundColor: activeTheme === "light" ? "#ffffff" : "#141414",
      ...(activeTheme === "dark" ? { border: "1px solid #474747" } : {}),
    };

    const { textColor, mutedTextColor, eventDividerColor } = themeColors(activeTheme);

    if (activeStyle === "default") {
      return (
        <div
          className="flex flex-col items-center justify-center h-full rounded-xl select-none"
          style={innerStyle}
        >
          <p
            className="font-sf text-red-500 font-bold"
            style={{ fontSize: `${dayFontSize}px`, lineHeight: 1.2 }}
          >
            {now.toLocaleDateString("en-US", { weekday: "short" }).toUpperCase()}
          </p>
          <p
            className="font-sf leading-none"
            style={{ fontSize: `${dateFontSize}px`, lineHeight: 1, color: textColor }}
          >
            {now.getDate()}
          </p>
        </div>
      );
    }

    if (activeStyle === "simple") {
      return (
        <div
          className="h-full w-full min-h-0 flex flex-col rounded-xl select-none"
          style={{
            ...innerStyle,
            paddingTop: `${previewMonthPaddingTop}px`,
            paddingLeft: `${previewMonthPaddingX}px`,
            paddingRight: `${previewMonthPaddingX}px`,
            paddingBottom: `${previewMonthPaddingBottom}px`,
          }}
        >
          <p
            className="font-sf text-red-500 font-bold leading-none"
            style={{
              fontSize: `${previewMonthTitleSize}px`,
              letterSpacing: "0.04em",
            }}
          >
            {monthLabel}
          </p>

          {showPreviewMonthWeekdays && (
            <div
              className="grid grid-cols-7 text-center font-sf font-semibold"
              style={{
                marginTop: `${Math.max(2, previewMonthPaddingTop * 0.45)}px`,
                fontSize: `${previewMonthWeekdaySize}px`,
                color: mutedTextColor,
                lineHeight: 1,
              }}
            >
              {WEEKDAY_LABELS.map((label, index) => (
                <p key={`${label}-${index}`}>{label}</p>
              ))}
            </div>
          )}

          <div
            className="mt-1 grid flex-1 auto-rows-fr grid-cols-7 text-center font-sf font-semibold min-h-0"
            style={{
              rowGap: `${previewMonthGapY}px`,
              fontSize: `${previewMonthDateSize}px`,
              color: textColor,
              lineHeight: 1,
            }}
          >
            {monthCells.map((day, index) => {
              if (!day) {
                return <div key={`empty-${index}`} className="min-h-0" />;
              }

              const isToday = day === now.getDate();

              return (
                <div key={`day-${day}`} className="flex items-center justify-center min-h-0">
                  {isToday ? (
                    <span
                      className="flex items-center justify-center rounded-full"
                      style={{
                        width: `${previewMonthPillSize}px`,
                        height: `${previewMonthPillSize}px`,
                        backgroundColor: "#ef4444",
                        color: "#ffffff",
                      }}
                    >
                      {day}
                    </span>
                  ) : (
                    <span>{day}</span>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      );
    }

    // events
    return (
      <div className="h-full w-full rounded-xl select-none" style={innerStyle}>
        <div
          className="h-full w-full min-h-0 grid grid-cols-[1.1fr_0.9fr]"
          style={{
            paddingLeft: `${previewEventPaddingX}px`,
            paddingRight: `${previewEventPaddingX}px`,
            paddingTop: `${previewEventPaddingY}px`,
            paddingBottom: `${previewEventPaddingY}px`,
            columnGap: `${previewEventColumnGap}px`,
          }}
        >
          <div className="flex min-h-0 flex-col">
            <p
              className="font-sf text-red-500 font-bold leading-none"
              style={{
                fontSize: `${previewEventWeekdaySize}px`,
                letterSpacing: "0.04em",
              }}
            >
              {eventWeekdayLabel}
            </p>
            <p
              className="font-sf leading-none"
              style={{
                marginTop: `${Math.max(2, previewEventSectionGap)}px`,
                fontSize: `${previewEventDateSize}px`,
                color: textColor,
              }}
            >
              {now.getDate()}
            </p>

            {showPreviewEventMessage && (
              <p
                className="font-sf mt-auto leading-none"
                style={{
                  fontSize: `${previewEventMessageSize}px`,
                  color: mutedTextColor,
                }}
              >
                No events today
              </p>
            )}
          </div>

          <div
            className="min-h-0 flex flex-col"
            style={{
              borderLeft: `1px solid ${eventDividerColor}`,
              paddingLeft: `${Math.max(5, previewEventPaddingX - 2)}px`,
            }}
          >
            <p
              className="font-sf text-red-500 font-bold leading-none"
              style={{
                fontSize: `${previewEventMonthTitleSize}px`,
                letterSpacing: "0.04em",
              }}
            >
              {eventMonthLabel}
            </p>

            <div
              className="mt-1 grid grid-cols-7 text-center font-sf font-semibold"
              style={{
                fontSize: `${previewEventCalendarWeekdaySize}px`,
                color: mutedTextColor,
                lineHeight: 1,
              }}
            >
              {WEEKDAY_LABELS_SUNDAY.map((label, index) => (
                <p key={`${label}-${index}`}>{label}</p>
              ))}
            </div>

            <div
              className="mt-1 grid flex-1 auto-rows-fr grid-cols-7 text-center font-sf font-semibold min-h-0"
              style={{
                fontSize: `${previewEventCalendarDateSize}px`,
                color: textColor,
                lineHeight: 1,
              }}
            >
              {eventMonthCells.map((day, index) => {
                if (!day) {
                  return <div key={`event-empty-${index}`} className="min-h-0" />;
                }

                const isToday = day === now.getDate();

                return (
                  <div key={`event-day-${day}`} className="flex items-center justify-center min-h-0">
                    {isToday ? (
                      <span
                        className="flex items-center justify-center rounded-full"
                        style={{
                          width: `${previewEventPillSize}px`,
                          height: `${previewEventPillSize}px`,
                          backgroundColor: "#ef4444",
                          color: "#ffffff",
                        }}
                      >
                        {day}
                      </span>
                    ) : (
                      <span>{day}</span>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        showCloseButton={false}
        className="max-w-[480px] bg-[#1e1e1e] border border-zinc-800 text-white p-0 overflow-hidden gap-0 sm:rounded-lg"
      >
        <DialogHeader className="p-4 border-b border-zinc-800 space-y-0">
          <div className="flex items-center justify-between w-full">
            <div className="flex items-center gap-2">
              <Settings2 className="w-5 h-5 text-zinc-400" />
              <DialogTitle className="text-base font-medium text-zinc-100">
                Calendar Style
              </DialogTitle>
            </div>
            <button
              onClick={() => onOpenChange(false)}
              className="w-7 h-7 rounded-lg flex items-center justify-center text-zinc-500 hover:text-white hover:bg-zinc-800 transition-all"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </DialogHeader>

        <div className="flex border-b border-zinc-800 bg-[#1e1e1e]">
          {STYLES.map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => handleChange("calendarStyle", tab.id)}
                className={cn(
                  "flex-1 flex items-center justify-center gap-2 py-3 text-sm font-medium border-b-2 transition-colors",
                  activeStyle === tab.id
                    ? "border-zinc-100 text-zinc-100 bg-zinc-800/30"
                    : "border-transparent text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800/20"
                )}
              >
                <Icon className="w-4 h-4" />
                {tab.label}
              </button>
            );
          })}
        </div>

        <div className="p-4 bg-[#1e1e1e] h-[300px] overflow-y-auto scrollbar-thin scrollbar-thumb-zinc-800">
          <div className="mb-4">
            <div
              className="rounded-xl border border-zinc-800/60 bg-[#2a2a2a] p-5 flex items-center justify-center h-[180px]"
              style={{
                backgroundImage:
                  "radial-gradient(circle at 50% 50%, rgba(255,255,255,0.01) 0%, transparent 70%)",
              }}
            >
              <div
                className="flex flex-col rounded-xl overflow-hidden"
                style={{
                  backgroundColor: "#2a2a2a",
                  width: `${previewDimensions.width}px`,
                  height: `${previewDimensions.height}px`,
                }}
              >
                {renderPreview()}
              </div>
            </div>
          </div>

          <div className="mb-4">
            <span className="text-[10px] text-zinc-500 uppercase tracking-wider mb-2 block">
              Theme
            </span>
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => handleChange("calendarTheme", "light")}
                className={cn(
                  "flex items-center justify-center gap-2 py-3 rounded-lg border text-sm font-medium transition-all",
                  activeTheme === "light"
                    ? "border-zinc-100 text-zinc-100 bg-zinc-800/50"
                    : "border-zinc-800 text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800/30"
                )}
              >
                <Lightbulb className="h-4 w-4" /><p>Light</p>
              </button>
              <button
                onClick={() => handleChange("calendarTheme", "dark")}
                className={cn(
                  "flex items-center justify-center gap-2 py-3 rounded-lg border text-sm font-medium transition-all",
                  activeTheme === "dark"
                    ? "border-zinc-100 text-zinc-100 bg-zinc-800/50"
                    : "border-zinc-800 text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800/30"
                )}
              >
                  <Moon className="h-4 w-4" /><p>Dark</p>
              </button>
            </div>
          </div>
        </div>

        <div className="p-4 border-t border-zinc-800 bg-[#1e1e1e] flex justify-end gap-2 text-sm z-10 relative">
          <Button
            variant="ghost"
            onClick={() => onOpenChange(false)}
            className="text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800"
          >
            Cancel
          </Button>
          <Button
            onClick={handleSave}
            className="bg-zinc-100 text-black hover:bg-zinc-300"
          >
            Save Changes
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
