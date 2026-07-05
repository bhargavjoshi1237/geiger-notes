"use client";

import React, { useEffect, useMemo, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
} from "@/components/ui/dropdown-menu";
import { ChevronDown, Loader2, Lock, Unlock, Users } from "lucide-react";
import { toast } from "sonner";
import { getUser } from "@/lib/supabase/user";
import {
  ACCESS_LEVEL_LABELS,
  DEFAULT_LEVEL_OPTIONS,
  getBoardAccessConfig,
  getMyProjectRole,
  listProjectMembers,
  normalizeAccessConfig,
  resolveBoardAccess,
  saveBoardAccessConfig,
} from "@/lib/supabase/board-access";

const MEMBER_LEVEL_OPTIONS = ["none", "view", "edit", "manage"];

// Compact level picker used for the default level and per-member overrides.
function LevelDropdown({ value, onChange, options, disabled }) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild disabled={disabled}>
        <button
          type="button"
          disabled={disabled}
          className="inline-flex items-center gap-1.5 rounded-md border border-border bg-surface-card px-2.5 py-1.5 text-xs font-medium text-foreground transition-colors hover:bg-surface-hover disabled:cursor-not-allowed disabled:opacity-60"
        >
          {ACCESS_LEVEL_LABELS[value] || "Set level"}
          {!disabled && <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />}
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="end"
        className="min-w-[9rem] border-border bg-surface-dialog"
      >
        <DropdownMenuRadioGroup value={value} onValueChange={onChange}>
          {options.map((lvl) => (
            <DropdownMenuRadioItem
              key={lvl}
              value={lvl}
              className="text-sm text-foreground"
            >
              {ACCESS_LEVEL_LABELS[lvl]}
            </DropdownMenuRadioItem>
          ))}
        </DropdownMenuRadioGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export default function ManageAccessDialog({
  open,
  onOpenChange,
  boardId,
  boardName,
  projectId,
}) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [canManage, setCanManage] = useState(false);
  const [uid, setUid] = useState(null);
  const [members, setMembers] = useState([]);

  const [mode, setMode] = useState("keyless");
  const [accessKey, setAccessKey] = useState("");
  const [defaultLevel, setDefaultLevel] = useState("view");
  const [memberLevels, setMemberLevels] = useState({});

  useEffect(() => {
    if (!open || !boardId) return;

    let active = true;

    (async () => {
      setLoading(true);
      const [info, roster, user, role] = await Promise.all([
        getBoardAccessConfig(boardId),
        listProjectMembers(projectId),
        getUser(),
        getMyProjectRole(projectId),
      ]);
      if (!active) return;

      const cfg = info?.config ?? normalizeAccessConfig(null);
      setMode(cfg.mode);
      setAccessKey(cfg.key);
      setDefaultLevel(cfg.defaultLevel);
      setMemberLevels(cfg.members || {});
      setMembers(roster || []);
      setUid(user?.id ?? null);

      const resolved = resolveBoardAccess({
        config: cfg,
        configured: Boolean(info?.configured),
        uid: user?.id ?? null,
        createdBy: info?.createdBy ?? null,
        role,
      });
      setCanManage(resolved.canManage);
      setLoading(false);
    })();

    return () => {
      active = false;
    };
  }, [open, boardId, projectId]);

  // Members that get a configurable level (owners/creators are implicit managers).
  const configurableMembers = useMemo(
    () => members.filter((m) => !(m.isCreator || m.role === "owner")),
    [members],
  );
  const ownerMembers = useMemo(
    () => members.filter((m) => m.isCreator || m.role === "owner"),
    [members],
  );

  const setMemberLevel = (memberId, level) => {
    setMemberLevels((prev) => {
      const next = { ...prev };
      // Storing the default is redundant; drop it to keep the config lean.
      if (level === defaultLevel) delete next[memberId];
      else next[memberId] = level;
      return next;
    });
  };

  const handleSave = async () => {
    if (mode === "keyed" && !accessKey.trim()) {
      toast.error("Set an access key or switch to keyless entry.");
      return;
    }
    setSaving(true);
    // Keep only non-owner overrides that differ from the default.
    const cleanMembers = {};
    for (const m of configurableMembers) {
      const lvl = memberLevels[m.id];
      if (lvl && lvl !== defaultLevel) cleanMembers[m.id] = lvl;
    }
    const ok = await saveBoardAccessConfig(boardId, {
      mode,
      key: mode === "keyed" ? accessKey.trim() : "",
      defaultLevel,
      members: cleanMembers,
    });
    setSaving(false);
    if (ok) {
      toast.success("Access settings saved");
      onOpenChange(false);
    } else {
      toast.error("Couldn't save access settings.");
    }
  };

  const memberInitial = (m) => (m.name || "?").charAt(0).toUpperCase();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-surface-dialog border-border text-foreground sm:max-w-[520px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Users className="h-4 w-4" />
            Manage Access
          </DialogTitle>
          <DialogDescription>
            Control who in this project can enter, view, or edit{" "}
            <span className="text-foreground font-medium">
              {boardName || "this board"}
            </span>
            .
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center py-12 text-muted-foreground">
            <Loader2 className="h-5 w-5 animate-spin" />
          </div>
        ) : !canManage ? (
          <div className="rounded-lg border border-border bg-surface-card p-4 text-sm text-muted-foreground">
            Only the board owner or the project owner can manage access for this
            board.
          </div>
        ) : (
          <div className="space-y-5 py-1">
            {/* Entry mode */}
            <div className="space-y-2">
              <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Entry
              </Label>
              <ToggleGroup
                type="single"
                value={mode}
                onValueChange={(v) => v && setMode(v)}
                variant="outline"
                className="w-full"
              >
                <ToggleGroupItem value="keyless" className="flex-1 gap-2">
                  <Unlock className="h-3.5 w-3.5" />
                  Keyless
                </ToggleGroupItem>
                <ToggleGroupItem value="keyed" className="flex-1 gap-2">
                  <Lock className="h-3.5 w-3.5" />
                  Keyed
                </ToggleGroupItem>
              </ToggleGroup>
              <p className="text-[11px] text-muted-foreground">
                {mode === "keyed"
                  ? "Members must enter the access key to open this board."
                  : "Members enter freely, according to their access level below."}
              </p>
              {mode === "keyed" && (
                <Input
                  type="text"
                  value={accessKey}
                  placeholder="Access key"
                  onChange={(e) => setAccessKey(e.target.value)}
                  className="bg-surface-card border-border"
                />
              )}
            </div>

            {/* Default level */}
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-sm font-medium text-foreground">
                  Everyone in the project
                </p>
                <p className="text-[11px] text-muted-foreground">
                  Default access for members without a specific level.
                </p>
              </div>
              <LevelDropdown
                value={defaultLevel}
                onChange={(lvl) => setDefaultLevel(lvl)}
                options={DEFAULT_LEVEL_OPTIONS}
              />
            </div>

            {/* Per-member overrides */}
            <div className="space-y-2">
              <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Members
              </Label>
              {members.length === 0 ? (
                <div className="rounded-lg border border-border bg-surface-card p-3 text-xs text-muted-foreground">
                  No project members to configure individually. The default level
                  and entry mode above apply to everyone.
                </div>
              ) : (
                <ScrollArea className="max-h-[240px] pr-2">
                  <div className="space-y-1">
                    {ownerMembers.map((m) => (
                      <div
                        key={m.id}
                        className="flex items-center justify-between rounded-md p-2"
                      >
                        <div className="flex items-center gap-3">
                          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-surface-hover text-xs font-medium text-foreground">
                            {memberInitial(m)}
                          </div>
                          <div>
                            <div className="flex items-center gap-2 text-sm font-medium text-foreground">
                              {m.name}
                              {m.id === uid && (
                                <span className="text-xs text-muted-foreground">
                                  (You)
                                </span>
                              )}
                            </div>
                            <div className="text-xs text-muted-foreground">
                              {m.email || "Owner"}
                            </div>
                          </div>
                        </div>
                        <Badge
                          variant="outline"
                          className="border-border text-[10px] font-normal text-muted-foreground"
                        >
                          Owner
                        </Badge>
                      </div>
                    ))}

                    {configurableMembers.map((m) => (
                      <div
                        key={m.id}
                        className="flex items-center justify-between rounded-md p-2 transition-colors hover:bg-surface-hover/50"
                      >
                        <div className="flex items-center gap-3">
                          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-surface-hover text-xs font-medium text-muted-foreground">
                            {memberInitial(m)}
                          </div>
                          <div>
                            <div className="flex items-center gap-2 text-sm font-medium text-foreground">
                              {m.name}
                              {m.id === uid && (
                                <span className="text-xs text-muted-foreground">
                                  (You)
                                </span>
                              )}
                            </div>
                            <div className="text-xs text-muted-foreground">
                              {m.email || m.role}
                            </div>
                          </div>
                        </div>
                        <LevelDropdown
                          value={memberLevels[m.id] || defaultLevel}
                          onChange={(lvl) => setMemberLevel(m.id, lvl)}
                          options={MEMBER_LEVEL_OPTIONS}
                        />
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              )}
            </div>
          </div>
        )}

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={saving}
            className="border-border text-muted-foreground hover:bg-surface-hover hover:text-foreground"
          >
            {canManage ? "Cancel" : "Close"}
          </Button>
          {canManage && (
            <Button
              onClick={handleSave}
              disabled={saving || loading}
              className="bg-primary text-primary-foreground hover:bg-primary/80"
            >
              {saving ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : (
                "Save access"
              )}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
