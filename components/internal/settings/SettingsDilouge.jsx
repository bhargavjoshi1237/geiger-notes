"use client";

import React, { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { SlidersHorizontal, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

import GeneralSettings from "./GeneralSettings";
import DefaultsSettings from "./DefaultsSettings";
import AccountSettings from "./AccountSettings";

const NAV = [
  { id: "general", label: "General", },
  { id: "defaults", label: "Defaults", },
  { id: "account", label: "Account", },
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
        <div className="flex flex-col h-[min(680px,calc(100dvh-80px))]">
          <DialogHeader className="p-4 border-b border-zinc-800 space-y-0">
            <div className="flex items-center gap-2">
              <SlidersHorizontal className="w-4 h-4 text-zinc-400" />
              <DialogTitle className="text-base font-sm text-zinc-100">
                Settings
              </DialogTitle>
            </div>
          </DialogHeader>

          <div className="flex border-b border-zinc-800 bg-[#1e1e1e]">
            {NAV.map((item) => {
              const active = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => setActiveTab(item.id)}
                  className={cn(
                    "flex-1 py-3 text-sm font-medium border-b-2 transition-colors flex items-center justify-center gap-2",
                    active
                      ? "border-zinc-100 text-zinc-100 bg-zinc-800/30"
                      : "border-transparent text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800/20"
                  )}
                >
                  <span>{item.label}</span>
                </button>
              );
            })}
          </div>

          {/* Content + footer */}
          <div className="flex-1 flex flex-col min-w-0">
            <div className="flex-1 overflow-y-auto p-4">
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
