"use client";

import React, { useState } from "react";
import {
  Undo2,
  Redo2,
  Smartphone,
  HelpCircle,
  Bell,
  Settings,
  Users2,
} from "lucide-react";
import SettingsDialog from "../settings/SettingsDilouge";
import CollaborateDilouge from "./CollaborateDilouge";
import DigitalClock from "./DigitalClock";

export default function Topbar({ id, settings, onSettingsChange }) {
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isCollaborateOpen, setIsCollaborateOpen] = useState(false);

  return (
    <>
      <header className="shadow-lg h-12 w-full bg-[#1e1e1e] flex items-center justify-between px-4 z-[100] border-b border-zinc-800/50">
        <div className="flex items-center gap-2">
          <img src="/logo1.svg" className="w-4 h-4" alt="" />
          <div className="flex items-center gap-2 text-zinc-400 hover:text-white transition-colors cursor-pointer p-1 rounded hover:bg-zinc-800">
            <span className="text-sm font-medium text-white">Home</span>
          </div>
        </div>

        <div className="flex items-center gap-2 sm:gap-4">
          {(settings?.showClock ?? true) && (
            <>
              <div className="hidden md:block">
                <DigitalClock animated={settings?.clockAnimation ?? true} />
              </div>
              <div className="hidden sm:block h-5 w-[1px] bg-zinc-700 mx-1"></div>
            </>
          )}

          <div className="flex items-center gap-1 text-zinc-400">
            <button
              className="p-2 hover:bg-zinc-800 rounded transition-colors hover:text-white"
              title="Undo"
            >
              <Undo2 className="w-4 h-4" />
            </button>
            <button
              className="p-2 hover:bg-zinc-800 rounded transition-colors hover:text-white"
              title="Redo"
            >
              <Redo2 className="w-4 h-4" />
            </button>
          </div>

          <div className="hidden sm:block h-5 w-[1px] bg-zinc-700 mx-1"></div>

          <div className="flex items-center text-zinc-400">
            <button
              onClick={() => setIsCollaborateOpen(true)}
              className="p-2 hover:bg-zinc-800 rounded transition-colors hover:text-white"
              title="Collaborate"
            >
              <Users2 className="w-4 h-4" />
            </button>
          </div>

          <div className="hidden sm:block h-5 w-[1px] bg-zinc-700 mx-1"></div>

          <div className="flex items-center gap-1">
            <button
              className="p-2 text-zinc-400 hover:text-white hover:bg-zinc-800 rounded transition-colors"
              title="Mobile"
            >
              <Smartphone className="w-4 h-4" />
            </button>
            <button
              className="p-2 text-zinc-400 hover:text-white hover:bg-zinc-800 rounded transition-colors"
              title="Help"
            >
              <HelpCircle className="w-5 h-5" />
            </button>
            <button
              className="p-2 text-zinc-400 hover:text-white hover:bg-zinc-800 rounded transition-colors"
              title="Notifications"
            >
              <Bell className="w-5 h-5" />
            </button>
            <button
              onClick={() => setIsSettingsOpen(true)}
              className="p-2 text-zinc-400 hover:text-white hover:bg-zinc-800 rounded transition-colors"
              title="Settings"
            >
              <Settings className="w-5 h-5" />
            </button>
          </div>
        </div>
      </header>

      <SettingsDialog
        open={isSettingsOpen}
        onOpenChange={setIsSettingsOpen}
        settings={settings}
        onSettingsChange={onSettingsChange}
      />

      <CollaborateDilouge
        id={id}
        open={isCollaborateOpen}
        onOpenChange={setIsCollaborateOpen}
      />
    </>
  );
}
