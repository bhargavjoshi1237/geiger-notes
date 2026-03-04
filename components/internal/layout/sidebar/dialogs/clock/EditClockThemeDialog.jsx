"use client";

import React, { useState, useEffect, useRef } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import ColorPicker from "../../../../edges/ColorePicker";
import { Settings2, Clock, Monitor, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";

const ColorField = ({ label, value, onChange }) => (
  <div className="flex items-center justify-between py-1.5 group/color">
    <span className="text-[12px] text-zinc-400 group-hover/color:text-zinc-300 transition-colors">
      {label}
    </span>
    <ColorPicker value={value} onChange={onChange} align="center">
      <button
        className="w-8 h-5 rounded-[5px] border border-zinc-700/80 cursor-pointer hover:border-zinc-500 transition-all hover:scale-110 focus:outline-none focus:ring-1 focus:ring-zinc-500 focus:ring-offset-1 focus:ring-offset-[#141414]"
        style={{ backgroundColor: value }}
      />
    </ColorPicker>
  </div>
);

const ToggleRow = ({ label, checked, onChange }) => (
  <div className="flex items-center justify-between py-1">
    <span className="text-[12px] text-zinc-400">{label}</span>
    <Switch checked={checked} onCheckedChange={onChange} />
  </div>
);

export default function EditClockThemeDialog({
  open,
  onOpenChange,
  initialData,
  onSave,
}) {
  const [data, setData] = useState({});

  useEffect(() => {
    if (open) {
      setData({
        clockType: initialData?.clockType || "analog",
        backgroundColor: initialData?.backgroundColor || "#232323",
        clockFaceColor: initialData?.clockFaceColor || "rgba(0,0,0,0.2)",
        borderColor: initialData?.borderColor || "rgba(0,0,0,0.1)",
        hourHandColor: initialData?.hourHandColor || "#555",
        minuteHandColor: initialData?.minuteHandColor || "#666",
        secondHandColor: initialData?.secondHandColor || "#ff8da1",
        centerDotColor: initialData?.centerDotColor || "#333",
        movement: initialData?.movement || "smooth",
        showSeconds: initialData?.showSeconds !== false,
        hourMarkers: initialData?.hourMarkers || "none",
        numbers: initialData?.numbers || "none",

        digitalBackgroundColor:
          initialData?.digitalBackgroundColor || "#232323",
        digitalTextColor: initialData?.digitalTextColor || "#ffffff",
        digitalDateColor: initialData?.digitalDateColor || "#a1a1aa",
        digitalShowDate: initialData?.digitalShowDate !== false,
        digitalShowSeconds: initialData?.digitalShowSeconds !== false,
        showBackground: initialData?.showBackground !== false,
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

  const [time, setTime] = useState(new Date());
  const frameRef = useRef();

  useEffect(() => {
    if (!open) return;
    const updateClock = () => {
      setTime(new Date());
      frameRef.current = requestAnimationFrame(updateClock);
    };
    frameRef.current = requestAnimationFrame(updateClock);
    return () => cancelAnimationFrame(frameRef.current);
  }, [open]);

  const hours = time.getHours();
  const minutes = time.getMinutes();
  const seconds = time.getSeconds();
  const milliseconds = time.getMilliseconds();

  const secondDegSmooth = (seconds + milliseconds / 1000) * 6;
  const secondDegQuartz = seconds * 6;
  const secondDeg =
    data.movement === "smooth" ? secondDegSmooth : secondDegQuartz;

  const minuteDeg = (minutes + seconds / 60) * 6;
  const hourDeg = ((hours % 12) + minutes / 60) * 30;
  const activeTab = data.clockType || "analog";

  const renderMarkers = () => {
    if (!data.hourMarkers || data.hourMarkers === "none") return null;
    const showAll = data.hourMarkers === "all";
    const markers = [];
    for (let i = 1; i <= 12; i++) {
      if (!showAll && i % 3 !== 0) continue;
      markers.push(
        <div
          key={`marker-${i}`}
          className="absolute left-1/2 top-1/2 origin-center"
          style={{
            width: i % 3 === 0 ? "4px" : "2px",
            height: "100%",
            transform: `translate(-50%, -50%) rotate(${i * 30}deg)`,
          }}
        >
          <div
            className="mx-auto rounded-full"
            style={{
              width: "100%",
              height: i % 3 === 0 ? "8px" : "4px",
              backgroundColor: data.hourHandColor,
              marginTop: "2px",
            }}
          />
        </div>,
      );
    }
    return markers;
  };

  const renderNumbers = () => {
    if (!data.numbers || data.numbers === "none") return null;
    const showAll = data.numbers === "all";
    const nums = [];
    for (let i = 1; i <= 12; i++) {
      if (!showAll && i % 3 !== 0) continue;
      const angle = i * 30 * (Math.PI / 180);
      const radius = 38;
      const x = 50 + radius * Math.sin(angle);
      const y = 50 - radius * Math.cos(angle);
      nums.push(
        <div
          key={`num-${i}`}
          className="absolute font-semibold text-center transform -translate-x-1/2 -translate-y-1/2 leading-none"
          style={{
            left: `${x}%`,
            top: `${y}%`,
            color: data.hourHandColor,
            fontSize: "12px",
          }}
        >
          {i}
        </div>,
      );
    }
    return nums;
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
                Clock Settings
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
          {[
            { id: "analog", label: "Analog", icon: Clock },
            { id: "digital", label: "Digital", icon: Monitor },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => handleChange("clockType", tab.id)}
              className={cn(
                "flex-1 flex items-center justify-center gap-2 py-3 text-sm font-medium border-b-2 transition-colors",
                activeTab === tab.id
                  ? "border-zinc-100 text-zinc-100 bg-zinc-800/30"
                  : "border-transparent text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800/20",
              )}
            >
              <tab.icon className="w-4 h-4" />
              {tab.label}
            </button>
          ))}
        </div>

        <div className="p-4 bg-[#1e1e1e] h-[450px] overflow-y-auto scrollbar-thin scrollbar-thumb-zinc-800">
          <div className="mb-2">
            <div
              className="rounded-xl border border-zinc-800/60 bg-[#232323] p-5 flex items-center justify-center h-[180px]"
              style={{
                backgroundImage:
                  "radial-gradient(circle at 50% 50%, rgba(255,255,255,0.01) 0%, transparent 70%)",
              }}
            >
              <div
                className="flex items-center justify-center rounded-xl transition-all duration-300 relative w-[146px] h-[146px]"
                style={{
                  backgroundColor: data.showBackground
                    ? activeTab === "analog"
                      ? data.backgroundColor
                      : data.digitalBackgroundColor
                    : "transparent",
                }}
              >
                {activeTab === "analog" ? (
                  <div className="relative w-[110px] h-[110px] flex items-center justify-center">
                    <div
                      className="absolute inset-0 rounded-full shadow-[inset_0_2px_12px_rgba(0,0,0,0.5)] border-[4px]"
                      style={{
                        backgroundColor: data.clockFaceColor,
                        borderColor: data.borderColor,
                      }}
                    >
                      {renderMarkers()}
                      {renderNumbers()}
                      <div
                        className="absolute left-1/2 bottom-1/2 w-[6px] rounded-full origin-bottom"
                        style={{
                          height: "25%",
                          backgroundColor: data.hourHandColor,
                          transform: `translateX(-50%) rotate(${hourDeg}deg)`,
                        }}
                      />
                      <div
                        className="absolute left-1/2 bottom-1/2 w-[4px] rounded-full origin-bottom"
                        style={{
                          height: "35%",
                          backgroundColor: data.minuteHandColor,
                          transform: `translateX(-50%) rotate(${minuteDeg}deg)`,
                        }}
                      />
                      {data.showSeconds && (
                        <div
                          className="absolute left-1/2 bottom-1/2 w-[2px] rounded-full origin-bottom"
                          style={{
                            height: "40%",
                            backgroundColor: data.secondHandColor,
                            transform: `translateX(-50%) rotate(${secondDeg}deg)`,
                          }}
                        />
                      )}
                      <div
                        className="absolute left-1/2 top-1/2 w-4 h-4 rounded-full border-2 -translate-x-1/2 -translate-y-1/2 z-10"
                        style={{
                          backgroundColor: data.centerDotColor,
                          borderColor: data.hourHandColor,
                        }}
                      />
                    </div>
                  </div>
                ) : (
                  <div className="relative flex flex-col items-center justify-center text-center w-full h-full p-2">
                    <div
                      className="font-black tracking-wider tabular-nums text-2xl"
                      style={{ color: data.digitalTextColor }}
                    >
                      {time.toLocaleTimeString([], {
                        hour: "2-digit",
                        minute: "2-digit",
                        ...(data.digitalShowSeconds
                          ? { second: "2-digit" }
                          : {}),
                      })}
                    </div>
                    {data.digitalShowDate && (
                      <div
                        className="mt-1.5 uppercase tracking-widest font-semibold text-[10px]"
                        style={{ color: data.digitalDateColor }}
                      >
                        {time.toLocaleDateString(undefined, {
                          weekday: "short",
                          day: "numeric",
                        })}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="mb-4">
            <div className="rounded-lg px-1.5 py-2 space-y-0.5">
              <ToggleRow
                label="Square Node"
                checked={data.showBackground}
                onChange={(v) => handleChange("showBackground", v)}
              />
              {activeTab === "analog" && (
                <>
                  <div className="h-px my-1" />
                  <ToggleRow
                    label="Smooth Movement / Qwertz"
                    checked={data.movement === "smooth"}
                    onChange={(v) =>
                      handleChange("movement", v ? "smooth" : "quartz")
                    }
                  />
                  <div className="h-px my-1" />
                  <ToggleRow
                    label="Show Seconds"
                    checked={data.showSeconds}
                    onChange={(v) => handleChange("showSeconds", v)}
                  />
                  <div className="h-px my-2" />
                  <div className="flex flex-col gap-1.5 pt-1 pb-1">
                    <div className="grid grid-cols-2 gap-2 mt-1">
                      <div className="flex flex-col gap-1">
                        <span className="text-[10px] text-zinc-500 uppercase">
                          Markers
                        </span>
                        <ToggleGroup
                          type="single"
                          value={data.hourMarkers || "none"}
                          onValueChange={(v) => {
                            if (v) handleChange("hourMarkers", v);
                          }}
                          className="w-full justify-start gap-0.5 p-0.5 bg-[#161616] border border-zinc-800/50 rounded-lg"
                        >
                          <ToggleGroupItem
                            value="none"
                            className="flex-1 h-6 text-[10px] rounded-md data-[state=on]:bg-[#2c2c2c] data-[state=on]:text-white text-zinc-400 hover:text-zinc-300 transition-all"
                          >
                            None
                          </ToggleGroupItem>
                          <ToggleGroupItem
                            value="four"
                            className="flex-1 h-6 text-[10px] rounded-md data-[state=on]:bg-[#2c2c2c] data-[state=on]:text-white text-zinc-400 hover:text-zinc-300 transition-all"
                          >
                            4
                          </ToggleGroupItem>
                          <ToggleGroupItem
                            value="all"
                            className="flex-1 h-6 text-[10px] rounded-md data-[state=on]:bg-[#2c2c2c] data-[state=on]:text-white text-zinc-400 hover:text-zinc-300 transition-all"
                          >
                            All
                          </ToggleGroupItem>
                        </ToggleGroup>
                      </div>
                      <div className="flex flex-col gap-1">
                        <span className="text-[10px] text-zinc-500 uppercase">
                          Numbers
                        </span>
                        <ToggleGroup
                          type="single"
                          value={data.numbers || "none"}
                          onValueChange={(v) => {
                            if (v) handleChange("numbers", v);
                          }}
                          className="w-full justify-start gap-0.5 p-0.5 bg-[#141414] border border-zinc-800/50 rounded-lg"
                        >
                          <ToggleGroupItem
                            value="none"
                            className="flex-1 h-6 text-[10px] rounded-md data-[state=on]:bg-[#2c2c2c] data-[state=on]:text-white text-zinc-400 hover:text-zinc-300 transition-all"
                          >
                            None
                          </ToggleGroupItem>
                          <ToggleGroupItem
                            value="four"
                            className="flex-1 h-6 text-[10px] rounded-md data-[state=on]:bg-[#2c2c2c] data-[state=on]:text-white text-zinc-400 hover:text-zinc-300 transition-all"
                          >
                            4
                          </ToggleGroupItem>
                          <ToggleGroupItem
                            value="all"
                            className="flex-1 h-6 text-[10px] rounded-md data-[state=on]:bg-[#2c2c2c] data-[state=on]:text-white text-zinc-400 hover:text-zinc-300 transition-all"
                          >
                            All
                          </ToggleGroupItem>
                        </ToggleGroup>
                      </div>
                    </div>
                  </div>
                </>
              )}
              {activeTab === "digital" && (
                <>
                  <div className="h-px my-1" />
                  <ToggleRow
                    label="Show Date"
                    checked={data.digitalShowDate}
                    onChange={(v) => handleChange("digitalShowDate", v)}
                  />
                  <div className="h-px my-1" />
                  <ToggleRow
                    label="Show Seconds"
                    checked={data.digitalShowSeconds}
                    onChange={(v) => handleChange("digitalShowSeconds", v)}
                  />
                </>
              )}
            </div>
          </div>
          <div>
            <div className="rounded-lg border border-zinc-800/60 bg-[#232323] px-3.5 py-2">
              {activeTab === "analog" ? (
                <div className="grid grid-cols-2 gap-x-6 gap-y-0">
                  {data.showBackground && (
                    <ColorField
                      label="Background"
                      value={data.backgroundColor}
                      onChange={(v) => handleChange("backgroundColor", v)}
                    />
                  )}
                  <ColorField
                    label="Clock Face"
                    value={data.clockFaceColor}
                    onChange={(v) => handleChange("clockFaceColor", v)}
                  />
                  <ColorField
                    label="Border"
                    value={data.borderColor}
                    onChange={(v) => handleChange("borderColor", v)}
                  />
                  <ColorField
                    label="Hour Hand"
                    value={data.hourHandColor}
                    onChange={(v) => handleChange("hourHandColor", v)}
                  />
                  <ColorField
                    label="Minute Hand"
                    value={data.minuteHandColor}
                    onChange={(v) => handleChange("minuteHandColor", v)}
                  />
                  {data.showSeconds && (
                    <ColorField
                      label="Second Hand"
                      value={data.secondHandColor}
                      onChange={(v) => handleChange("secondHandColor", v)}
                    />
                  )}
                  <ColorField
                    label="Center Dot"
                    value={data.centerDotColor}
                    onChange={(v) => handleChange("centerDotColor", v)}
                  />
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-x-6 gap-y-0">
                  {data.showBackground && (
                    <ColorField
                      label="Background"
                      value={data.digitalBackgroundColor}
                      onChange={(v) =>
                        handleChange("digitalBackgroundColor", v)
                      }
                    />
                  )}
                  <ColorField
                    label="Time Text"
                    value={data.digitalTextColor}
                    onChange={(v) => handleChange("digitalTextColor", v)}
                  />
                  <ColorField
                    label="Date Text"
                    value={data.digitalDateColor}
                    onChange={(v) => handleChange("digitalDateColor", v)}
                  />
                </div>
              )}
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
