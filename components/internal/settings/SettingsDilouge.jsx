"use client";

import React, { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Activity,
  Settings,
  MousePointer2,
  Layout,
  ArrowRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

import ColorPicker from "../edges/ColorePicker";
import ToolbarOptions from "./ToolbarOptions";
import AccountSettings from "./AccountSettings";
import GeneralSettings from "./GeneralSettings";

const STROKE_WIDTHS = [
  { label: "Thin", value: 1 },
  { label: "Medium", value: 2 },
  { label: "Thick", value: 4 },
];

export default function SettingsDialog({
  open,
  onOpenChange,
  settings,
  onSettingsChange,
}) {
  const [activeTab, setActiveTab] = useState("general"); // general, defaults, account

  const [edgeDefaults, setEdgeDefaults] = useState({
    stroke: "#71717a",
    strokeWidth: 2,
    animated: false,
    strokeDasharray: "0",
  });

  const [selectedTools, setSelectedTools] = useState([
    "note",
    "link",
    "todo",
    "line",
    "board",
    "column",
    "comment",
    "table",
    "add_image",
    "upload",
    "draw",
  ]);

  const toggleTool = (toolId) => {
    setSelectedTools((prev) =>
      prev.includes(toolId)
        ? prev.filter((id) => id !== toolId)
        : [...prev, toolId],
    );
  };

  const resetTools = () => {
    setSelectedTools([
      "note",
      "link",
      "todo",
      "line",
      "board",
      "column",
      "comment",
      "table",
      "add_image",
      "upload",
      "draw",
    ]);
  };

  const updateEdgeDefault = (key, value) => {
    setEdgeDefaults((prev) => ({ ...prev, [key]: value }));
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        showCloseButton={false}
        className="max-w-2xl bg-[#1e1e1e] border-zinc-800 text-zinc-100 p-0 overflow-hidden shadow-xl sm:rounded-lg"
      >
        <DialogHeader className="p-4 border-b border-zinc-800 ">
          <div className="flex items-center gap-2">
            <Settings className="w-5 h-5 text-zinc-400" />
            <DialogTitle className="text-base font-medium text-zinc-100">
              Settings
            </DialogTitle>
          </div>
        </DialogHeader>

        <div className="flex border-b border-zinc-800 bg-[#1e1e1e] -mt-4">
          {[
            { id: "general", label: "General" },
            { id: "defaults", label: "Defaults" },
            { id: "account", label: "Account" },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={cn(
                "flex-1 py-3 text-sm font-medium border-b-2 transition-colors",
                activeTab === tab.id
                  ? "border-zinc-100 text-zinc-100 bg-zinc-800/30"
                  : "border-transparent text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800/20",
              )}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Content Area */}
        <div className="h-[500px] overflow-y-auto p-0 bg-[#1e1e1e]">
          {activeTab === "general" && (
            <div className="p-6">
              <GeneralSettings
                settings={settings}
                onSettingsChange={onSettingsChange}
              />
            </div>
          )}

          {activeTab === "defaults" && (
            <div className="p-6 space-y-6">
              <div>
                <h3 className="text-sm font-medium text-zinc-200 mb-1">
                  Global Preferences
                </h3>
                <p className="text-xs text-zinc-500 mb-4">
                  Set default properties for new items created on the canvas.
                </p>

                <Accordion
                  type="single"
                  collapsible
                  className="w-full space-y-2"
                  defaultValue="edges"
                >
                  {/* Edge Styles */}
                  <AccordionItem
                    value="edges"
                    className="border border-zinc-800 rounded-md bg-zinc-900/30"
                  >
                    <AccordionTrigger className="px-4 py-3 hover:no-underline text-zinc-300 hover:text-zinc-100">
                      <div className="flex items-center gap-2">
                        <ArrowRight className="w-4 h-4 text-zinc-500" />
                        <span>Edge Styles</span>
                      </div>
                    </AccordionTrigger>
                    <AccordionContent className="px-4 py-4 space-y-4 border-t border-zinc-800/50">
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <Label className="text-xs text-zinc-400 mb-2 block">
                            Default Color
                          </Label>
                          <ColorPicker
                            value={edgeDefaults.stroke}
                            onChange={(color) =>
                              updateEdgeDefault("stroke", color)
                            }
                          >
                            <button className="flex items-center w-full h-9 px-3 gap-2 border border-zinc-700 rounded hover:border-zinc-500 transition-colors bg-transparent">
                              <div
                                className="w-4 h-4 rounded-full border border-zinc-600"
                                style={{ backgroundColor: edgeDefaults.stroke }}
                              />
                              <span className="text-sm text-zinc-300 font-mono">
                                {edgeDefaults.stroke}
                              </span>
                            </button>
                          </ColorPicker>
                        </div>
                        <div>
                          <Label className="text-xs text-zinc-400 mb-2 block">
                            Stroke Style
                          </Label>
                          <Popover>
                            <PopoverTrigger asChild>
                              <button className="flex items-center justify-center w-full h-9 px-3 border border-zinc-700 rounded hover:border-zinc-500 transition-colors bg-transparent text-zinc-300">
                                <div
                                  className="w-12 bg-current rounded-full"
                                  style={{ height: edgeDefaults.strokeWidth }}
                                />
                              </button>
                            </PopoverTrigger>
                            <PopoverContent
                              className="w-40 bg-[#1e1e1e] border-zinc-800 p-1"
                              side="bottom"
                            >
                              {STROKE_WIDTHS.map((sw) => (
                                <button
                                  key={sw.label}
                                  onClick={() =>
                                    updateEdgeDefault("strokeWidth", sw.value)
                                  }
                                  className={cn(
                                    "flex items-center gap-3 px-2 py-2 w-full rounded text-sm transition-colors",
                                    edgeDefaults.strokeWidth === sw.value
                                      ? "bg-zinc-800 text-zinc-100"
                                      : "text-zinc-400 hover:bg-zinc-800/50 hover:text-zinc-200",
                                  )}
                                >
                                  <div
                                    className="w-8 bg-current rounded-full"
                                    style={{ height: sw.value }}
                                  />
                                  <span className="text-xs ml-auto">
                                    {sw.label}
                                  </span>
                                </button>
                              ))}
                            </PopoverContent>
                          </Popover>
                        </div>
                      </div>

                      <div className="flex items-center justify-between pt-2">
                        <div className="flex items-center gap-3 text-zinc-300">
                          <Activity className="w-4 h-4 text-zinc-500" />
                          <span className="text-sm font-medium">
                            Animated Edges
                          </span>
                        </div>
                        <Switch
                          checked={edgeDefaults.animated}
                          onCheckedChange={(c) =>
                            updateEdgeDefault("animated", c)
                          }
                        />
                      </div>
                    </AccordionContent>
                  </AccordionItem>

                  <AccordionItem
                    value="toolbar"
                    className="border border-zinc-800 rounded-md bg-zinc-900/30"
                  >
                    <AccordionTrigger className="px-4 py-3 hover:no-underline text-zinc-300 hover:text-zinc-100">
                      <div className="flex items-center gap-2">
                        <MousePointer2 className="w-4 h-4 text-zinc-500" />
                        <span>Toolbar Options</span>
                      </div>
                    </AccordionTrigger>
                    <AccordionContent className="px-4 py-4 border-t border-zinc-800/50">
                      <ToolbarOptions
                        selectedTools={selectedTools}
                        onToggleTool={toggleTool}
                        onReset={resetTools}
                      />
                    </AccordionContent>
                  </AccordionItem>

                  <AccordionItem
                    value="nodes"
                    className="border border-zinc-800 rounded-md bg-zinc-900/30"
                  >
                    <AccordionTrigger className="px-4 py-3 hover:no-underline text-zinc-300 hover:text-zinc-100">
                      <div className="flex items-center gap-2">
                        <Layout className="w-4 h-4 text-zinc-500" />
                        <span>Node Styles</span>
                      </div>
                    </AccordionTrigger>
                    <AccordionContent className="px-4 py-4 text-zinc-500 text-sm border-t border-zinc-800/50">
                      Node default settings are not yet implemented.
                    </AccordionContent>
                  </AccordionItem>
                </Accordion>
              </div>
            </div>
          )}

          {activeTab === "account" && (
            <div className="p-6">
              <AccountSettings />
            </div>
          )}
        </div>

        <div className="p-4 border-t border-zinc-800 bg-[#1e1e1e] flex justify-end gap-2 text-sm z-10 relative">
          <Button
            variant="ghost"
            onClick={() => onOpenChange(false)}
            className="text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800"
          >
            Cancel
          </Button>
          <Button className="bg-zinc-100 text-black hover:bg-zinc-300">
            Save Changes
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
