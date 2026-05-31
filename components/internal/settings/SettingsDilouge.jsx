"use client";

import React, { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { SlidersHorizontal, Shapes, UserRound, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

import GeneralSettings from "./GeneralSettings";
import DefaultsSettings from "./DefaultsSettings";
import AccountSettings from "./AccountSettings";

const NAV = [
  { id: "general", label: "General", icon: SlidersHorizontal },
  { id: "defaults", label: "Defaults", icon: Shapes },
  { id: "account", label: "Account", icon: UserRound },
];

export default function SettingsDialog({
  open,
  onOpenChange,
  settings,
  onSettingsChange,
  dialogContainer,
  // Optional persistence wiring (provided by the authenticated board canvas).
  onSave,
  onDiscard,
  onReset,
  isDirty = false,
  isSaving = false,
  nodeCount = 0,
  edgeCount = 0,
}) {
  const [activeTab, setActiveTab] = useState("general");

  const close = () => onOpenChange(false);

  const handleCancel = () => {
    onDiscard?.();
    close();
  };

  const handleSave = async () => {
    if (!onSave) {
      close();
      return;
    }
    const ok = await onSave();
    if (ok) {
      toast.success("Settings saved");
      close();
    } else {
      toast.error("Couldn't save settings");
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        container={dialogContainer}
        overlayClassName={dialogContainer ? "absolute inset-0" : undefined}
        showCloseButton={false}
        className={cn(
          dialogContainer ? "absolute max-h-[calc(100%-1rem)]" : "",
          "max-w-2xl bg-[#1e1e1e] border-zinc-800 text-zinc-100 p-0 overflow-hidden shadow-xl sm:rounded-lg"
        )}
      >
        <div className="flex h-[min(560px,calc(100dvh-120px))]">
          {/* Left rail */}
          <nav className="w-14 sm:w-48 shrink-0 border-r border-zinc-800 bg-[#1a1a1a] flex flex-col">
            <DialogHeader className="p-4 pb-3 space-y-0 text-left">
              <DialogTitle className="text-base font-medium text-zinc-100 hidden sm:block">
                Settings
              </DialogTitle>
              <div className="sm:hidden flex justify-center">
                <SlidersHorizontal className="w-4 h-4 text-zinc-300" />
              </div>
            </DialogHeader>
            <div className="flex-1 px-2 sm:px-3 space-y-1 pt-1">
              {NAV.map((item) => {
                const Icon = item.icon;
                const active = activeTab === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => setActiveTab(item.id)}
                    className={cn(
                      "w-full flex items-center justify-center sm:justify-start gap-2.5 rounded-md px-2 sm:px-3 py-2 text-sm font-medium transition-colors",
                      active
                        ? "bg-zinc-800 text-zinc-100"
                        : "text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/50"
                    )}
                    title={item.label}
                  >
                    <Icon className="w-4 h-4 shrink-0" />
                    <span className="hidden sm:inline">{item.label}</span>
                  </button>
                );
              })}
            </div>
          </nav>

          {/* Content + footer */}
          <div className="flex-1 flex flex-col min-w-0">
            <div className="flex-1 overflow-y-auto p-6">
              {activeTab === "general" && (
                <GeneralSettings
                  settings={settings}
                  onSettingsChange={onSettingsChange}
                  onReset={onReset}
                  nodeCount={nodeCount}
                  edgeCount={edgeCount}
                />
              )}
              {activeTab === "defaults" && (
                <DefaultsSettings
                  settings={settings}
                  onSettingsChange={onSettingsChange}
                />
              )}
              {activeTab === "account" && <AccountSettings />}
            </div>

            {/* Footer — only the preference tabs need a save action */}
            {activeTab !== "account" && (
              <div className="p-3 px-4 border-t border-zinc-800 bg-[#1e1e1e] flex items-center justify-end gap-2 text-sm">
                {onSave && isDirty && (
                  <span className="mr-auto text-xs text-amber-400/80">
                    Unsaved changes
                  </span>
                )}
                {onSave ? (
                  <>
                    <Button
                      variant="ghost"
                      onClick={handleCancel}
                      className="text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800"
                    >
                      Cancel
                    </Button>
                    <Button
                      onClick={handleSave}
                      disabled={!isDirty || isSaving}
                      className="bg-zinc-100 text-black hover:bg-zinc-300 disabled:opacity-40"
                    >
                      {isSaving ? (
                        <>
                          <Loader2 className="w-3.5 h-3.5 mr-2 animate-spin" />
                          Saving
                        </>
                      ) : (
                        "Save changes"
                      )}
                    </Button>
                  </>
                ) : (
                  <Button
                    onClick={close}
                    className="bg-zinc-100 text-black hover:bg-zinc-300"
                  >
                    Done
                  </Button>
                )}
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
