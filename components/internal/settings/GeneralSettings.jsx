"use client";

import React from "react";
import {
  Database,
  HardDrive,
  Info,
  MousePointerClick,
  RefreshCcw,
  Clock,
  Trash2,
} from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";

export default function GeneralSettings({ settings, onSettingsChange }) {
  const usage = {
    nodes: 540,
    maxNodes: 1000,
    projects: 3,
    maxProjects: 10,
    storage: "1.2 GB",
    maxStorage: "5 GB",
  };
  const nodePercentage = (usage.nodes / usage.maxNodes) * 100;

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between pb-4 border-b border-zinc-800/50">
        <div>
          <h3 className="text-sm font-medium text-zinc-200">System Status</h3>
          <p className="text-xs text-zinc-500 mt-1">
            Usage metrics and cache options.
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-zinc-500 hover:text-zinc-300"
          >
            <RefreshCcw className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Usage Section */}
      <div className="space-y-5">
        <h4 className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">
          Resources
        </h4>

        <div className="space-y-3">
          <div className="flex justify-between text-xs">
            <span className="text-zinc-400">Node Allowance</span>
            <span className="text-zinc-500">
              <span className="text-zinc-200 font-medium">{usage.nodes}</span> /{" "}
              {usage.maxNodes}
            </span>
          </div>
          <Progress
            value={nodePercentage}
            className="h-1.5 bg-zinc-800"
            indicatorClassName={
              nodePercentage > 90 ? "bg-red-500" : "bg-zinc-100"
            }
          />
        </div>

        <div className="space-y-3 pt-2">
          <div className="flex justify-between text-xs">
            <span className="text-zinc-400">Storage</span>
            <span className="text-zinc-500">{usage.storage} used</span>
          </div>
          <div className="flex h-1.5 w-full rounded-full bg-zinc-800 overflow-hidden">
            <div className="h-full bg-zinc-400" style={{ width: "25%" }} />
            <div className="h-full bg-zinc-600" style={{ width: "10%" }} />
          </div>
          <div className="flex gap-4 text-[10px] text-zinc-500 pt-1">
            <div className="flex items-center gap-1.5">
              <div className="w-1.5 h-1.5 rounded-full bg-zinc-400" />
              <span>Media</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-1.5 h-1.5 rounded-full bg-zinc-600" />
              <span>Docs</span>
            </div>
          </div>
        </div>
      </div>

      {/* Preferences Section */}
      <div className="space-y-4 pt-4 border-t border-zinc-800/50">
        <h4 className="text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-2">
          Controls
        </h4>

        <div className="flex items-center justify-between py-2">
          <div className="space-y-0.5">
            <Label className="text-sm font-medium text-zinc-200">
              Double Click to Insert
            </Label>
            <p className="text-xs text-zinc-500">Fast card creation</p>
          </div>
          <Switch
            checked={settings?.doubleClickToInsert}
            onCheckedChange={(checked) =>
              onSettingsChange?.("doubleClickToInsert", checked)
            }
          />
        </div>

        <div className="flex items-center justify-between py-2">
          <div className="space-y-0.5">
            <Label className="text-sm font-medium text-zinc-200">
              Show Clock
            </Label>
            <p className="text-xs text-zinc-500">Display time in toolbar</p>
          </div>
          <Switch
            checked={settings?.showClock ?? true}
            onCheckedChange={(checked) =>
              onSettingsChange?.("showClock", checked)
            }
          />
        </div>

        <div className="flex items-center justify-between py-2">
          <div className="space-y-0.5">
            <Label className="text-sm font-medium text-zinc-200">
              Clock Animation
            </Label>
            <p className="text-xs text-zinc-500">Shimmer effect on time</p>
          </div>
          <Switch
            checked={settings?.clockAnimation ?? true}
            onCheckedChange={(checked) =>
              onSettingsChange?.("clockAnimation", checked)
            }
          />
        </div>
      </div>

      {/* Danger Zone / Cache */}
      <div className="pt-6 mt-2 border-t border-zinc-800/50">
        <div className="flex items-center justify-between p-3 rounded-md border border-zinc-800/50 bg-zinc-900/20 hover:border-red-900/30 transition-colors">
          <div className="space-y-0.5">
            <h4 className="text-sm font-medium text-zinc-300">Local Cache</h4>
            <p className="text-xs text-zinc-500">Clear temporary files</p>
          </div>
          <Button
            variant="outline"
            size="sm"
            className="h-8 border-zinc-700 text-zinc-400 hover:text-red-400 hover:border-red-900/50 hover:bg-red-900/10"
          >
            <Trash2 className="w-3.5 h-3.5 mr-2" />
            Clear
          </Button>
        </div>
      </div>
    </div>
  );
}
