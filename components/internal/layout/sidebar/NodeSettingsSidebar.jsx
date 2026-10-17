"use client";

import React, { useEffect, useState } from "react";
import { SidebarShell } from "./SidebarPrimitives";
import { ColorPlug } from "./plugs/ColorPlug";
import { EditBoardNamePlug } from "./plugs/EditBoardNamePlug";
import { BoardIconPlug } from "./plugs/BoardIconPlug";
import { EditClockThemePlug } from "./plugs/clock/EditClockThemePlug";
import { EditCalendarThemePlug } from "./plugs/calendar/EditCalendarThemePlug";
import { TextFormattingPlug } from "./plugs/TextFormattingPlug";
import { DownloadBoardPlug } from "./plugs/DownloadBoardPlug";
import { ManageAccessPlug } from "./plugs/ManageAccessPlug";
import { EditSketchDetailsPlug } from "./plugs/sketch/EditSketchDetailsPlug";
import { DownloadSketchPlug } from "./plugs/sketch/DownloadSketchPlug";
import EditBoardNameDialog from "./dialogs/EditBoardNameDialog";
import EditBoardIconDialog from "./dialogs/EditBoardIconDialog";
import EditClockThemeDialog from "./dialogs/clock/EditClockThemeDialog";
import EditCalendarThemeDialog from "./dialogs/calendar/EditCalendarThemeDialog";
import DownloadBoardDialog from "./dialogs/DownloadBoardDialog";
import ManageAccessDialog from "./dialogs/ManageAccessDialog";
import EditSketchDetailsDialog from "./dialogs/sketch/EditSketchDetailsDialog";
import DownloadSketchDialog from "./dialogs/sketch/DownloadSketchDialog";
import { canManageBoard } from "@/lib/supabase/board-access";
import { NodeAppearancePlugs } from "./plugs/NodeAppearancePlugs";
import { NODE_META, NODE_SETTINGS } from "@/components/internal/nodes/registry";
import { toast } from "sonner";

export default function NodeSettingsSidebar({
  selectedNode,
  onUpdateNode,
  onBack,
  projectId,
  onNodeCommand,
}) {
  const [isEditNameOpen, setIsEditNameOpen] = useState(false);
  const [isEditIconOpen, setIsEditIconOpen] = useState(false);
  const [isEditClockThemeOpen, setIsEditClockThemeOpen] = useState(false);
  const [isEditCalendarThemeOpen, setIsEditCalendarThemeOpen] = useState(false);
  const [isDownloadOpen, setIsDownloadOpen] = useState(false);
  const [isManageAccessOpen, setIsManageAccessOpen] = useState(false);
  const [canManageAccess, setCanManageAccess] = useState(false);
  const [isSketchDetailsOpen, setIsSketchDetailsOpen] = useState(false);
  const [isSketchDownloadOpen, setIsSketchDownloadOpen] = useState(false);

  const isProjectBoardNode =
    selectedNode?.type === "board" &&
    Boolean(projectId) &&
    Boolean(selectedNode?.data?.boardId);

  // Only surface Manage Access when the current user may actually manage it.
  useEffect(() => {
    let active = true;
    if (isProjectBoardNode) {
      canManageBoard(selectedNode.data.boardId, projectId).then((ok) => {
        if (active) setCanManageAccess(ok);
      });
    } else {
      setCanManageAccess(false);
    }
    return () => {
      active = false;
    };
  }, [isProjectBoardNode, selectedNode?.data?.boardId, projectId]);

  if (!selectedNode) return null;

  const updateData = (newData) => {
    onUpdateNode(selectedNode.id, {
      data: { ...selectedNode.data, ...newData },
    });
  };

  const currentColor = selectedNode.data?.backgroundColor;
  const TypeSettings = NODE_SETTINGS[selectedNode.type];
  const showCardColor = NODE_META[selectedNode.type]?.cardColor !== false;

  const handleSaveBoardName = async (newName, newCaption) => {
    updateData({ label: newName, name: newName, caption: newCaption });

    if (selectedNode.type === "board" && selectedNode.data.boardId) {
      try {
        const response = await fetch(
          `${process.env.NEXT_PUBLIC_BASE_PATH || ""}/api/update-board`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              boardId: selectedNode.data.boardId,
              name: newName,
            }),
          },
        );
        if (!response.ok) throw new Error("Failed to update board name");
        toast.success("Board name updated successfully");
      } catch (error) {
        console.error(error);
        toast.error("Failed to save board name to server");
      }
    }
  };

  // Name/description live on both the node (canvas label) and the sketches row (editor title).
  const handleSaveSketchDetails = async (name, description) => {
    updateData({ label: name, caption: description });
    if (!selectedNode.data?.sketchId) return true;
    try {
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_BASE_PATH || ""}/api/sketches`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            id: selectedNode.data.sketchId,
            name,
            description,
          }),
        },
      );
      if (!res.ok) throw new Error("Failed to update sketch");
      toast.success("Sketch updated");
      return true;
    } catch (error) {
      console.error(error);
      toast.error("Couldn't save sketch details");
      return false;
    }
  };

  const handleSaveBoardIcon = (iconData) => {
    updateData({
      iconName: iconData.iconName,
      iconLightAccent: iconData.iconLightAccent,
      iconDarkAccent: iconData.iconDarkAccent,
    });
  };

  const handleSaveClockTheme = (themeData) => {
    updateData({ ...themeData });
  };

  return (
    <>
      <SidebarShell onBack={onBack} title="Node Settings">
        {selectedNode.type === "board" && (
          <EditBoardNamePlug
            currentName={selectedNode.data.label}
            onEdit={() => setIsEditNameOpen(true)}
          />
        )}
        {selectedNode.type === "board" && (
          <BoardIconPlug onEdit={() => setIsEditIconOpen(true)} />
        )}
        {selectedNode.type === "board" && (
          <DownloadBoardPlug onDownload={() => setIsDownloadOpen(true)} />
        )}
        {selectedNode.type === "sketch" && (
          <>
            <EditSketchDetailsPlug
              currentName={selectedNode.data.label}
              onEdit={() => setIsSketchDetailsOpen(true)}
            />
            <DownloadSketchPlug onDownload={() => setIsSketchDownloadOpen(true)} />
          </>
        )}
        {isProjectBoardNode && canManageAccess && (
          <ManageAccessPlug onManage={() => setIsManageAccessOpen(true)} />
        )}

        {selectedNode.type === "clock" ? (
          <EditClockThemePlug onEdit={() => setIsEditClockThemeOpen(true)} />
        ) : selectedNode.type === "calendar" ? (
          <EditCalendarThemePlug onEdit={() => setIsEditCalendarThemeOpen(true)} />
        ) : showCardColor ? (
          <ColorPlug
            value={currentColor}
            onChange={(color) => updateData({ backgroundColor: color })}
            label="Card Color"
          />
        ) : null}

        {selectedNode.type === "custom" && (
          <TextFormattingPlug
            data={selectedNode.data}
            onChange={(updates) => updateData(updates)}
          />
        )}

        {TypeSettings && (
          <TypeSettings
            node={selectedNode}
            updateData={updateData}
            updateNode={(patch) => onUpdateNode(selectedNode.id, patch)}
          />
        )}

        <div className="w-8 h-px bg-divider/60 my-1" />
        <NodeAppearancePlugs
          node={selectedNode}
          onUpdateNode={onUpdateNode}
          onNodeCommand={onNodeCommand}
          textControls={!["clock", "calendar", "image", "sticker"].includes(selectedNode.type)}
        />
      </SidebarShell>

      {selectedNode.type === "board" && (
        <>
          <EditBoardNameDialog
            open={isEditNameOpen}
            onOpenChange={setIsEditNameOpen}
            initialName={selectedNode.data.label}
            initialCaption={selectedNode.data.caption}
            onSave={handleSaveBoardName}
          />
          <EditBoardIconDialog
            open={isEditIconOpen}
            onOpenChange={setIsEditIconOpen}
            initialIcon={selectedNode.data.iconName}
            initialLightAccent={selectedNode.data.iconLightAccent}
            initialDarkAccent={selectedNode.data.iconDarkAccent}
            onSave={handleSaveBoardIcon}
          />
          <DownloadBoardDialog
            open={isDownloadOpen}
            onOpenChange={setIsDownloadOpen}
            boardId={selectedNode.data.boardId}
            boardName={selectedNode.data.label || selectedNode.data.name}
          />
          {isProjectBoardNode && (
            <ManageAccessDialog
              open={isManageAccessOpen}
              onOpenChange={setIsManageAccessOpen}
              boardId={selectedNode.data.boardId}
              boardName={selectedNode.data.label || selectedNode.data.name}
              projectId={projectId}
            />
          )}
        </>
      )}

      {selectedNode.type === "sketch" && (
        <>
          <EditSketchDetailsDialog
            open={isSketchDetailsOpen}
            onOpenChange={setIsSketchDetailsOpen}
            initialName={selectedNode.data.label}
            initialDescription={selectedNode.data.caption}
            onSave={handleSaveSketchDetails}
          />
          <DownloadSketchDialog
            open={isSketchDownloadOpen}
            onOpenChange={setIsSketchDownloadOpen}
            sketchId={selectedNode.data.sketchId}
            sketchName={selectedNode.data.label}
          />
        </>
      )}

      {selectedNode.type === "clock" && (
        <EditClockThemeDialog
          open={isEditClockThemeOpen}
          onOpenChange={setIsEditClockThemeOpen}
          initialData={selectedNode.data}
          onSave={handleSaveClockTheme}
        />
      )}

      {selectedNode.type === "calendar" && (
        <EditCalendarThemeDialog
          open={isEditCalendarThemeOpen}
          onOpenChange={setIsEditCalendarThemeOpen}
          initialData={selectedNode.data}
          onSave={handleSaveClockTheme}
        />
      )}
    </>
  );
}
