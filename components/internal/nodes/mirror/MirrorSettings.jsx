"use client";

import React, { useState } from "react";
import { ArrowUpRight, ScanEye, Unlink } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@geiger/ui";
import { SidebarButton } from "@/components/internal/layout/sidebar/SidebarPrimitives";
import {
  MirrorSourcePicker,
  openSourceBoard,
  sourcePatch,
  useMirrorProjectId,
} from "./MirrorNode";

export default function MirrorSettings({ node, updateData }) {
  const projectId = useMirrorProjectId();
  const [open, setOpen] = useState(false);
  const data = node?.data || {};
  const hasSource = Boolean(data.sourceBoardId && data.sourceNodeId);

  return (
    <>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <SidebarButton icon={ScanEye} label="Mirror Source" active={open} title="Mirror source" />
        </PopoverTrigger>
        <PopoverContent
          side="right"
          align="start"
          sideOffset={8}
          className="w-72 bg-surface-dialog border-border p-3 shadow-xl rounded-xl"
        >
          {open && (
            <MirrorSourcePicker
              projectId={projectId}
              excludeNodeId={node?.id}
              onPick={(choice) => {
                updateData(sourcePatch(choice, projectId));
                setOpen(false);
              }}
            />
          )}
        </PopoverContent>
      </Popover>
      {hasSource && (
        <>
          <SidebarButton
            icon={ArrowUpRight}
            label="Go to board"
            title="Go to source board"
            onClick={() => openSourceBoard(data.sourceBoardId, data.sourceBoardName)}
          />
          <SidebarButton
            icon={Unlink}
            label="Unlink"
            title="Unlink source"
            onClick={() =>
              updateData({
                sourceBoardId: null,
                sourceProjectId: null,
                sourceBoardName: "",
                sourceNodeId: null,
                snapshot: null,
                fetchedAt: null,
              })
            }
          />
        </>
      )}
    </>
  );
}
