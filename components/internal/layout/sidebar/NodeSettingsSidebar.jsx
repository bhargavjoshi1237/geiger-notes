"use client";

import React, { useState } from "react";
import { MessageSquarePlus } from "lucide-react";
import { SidebarShell } from "./SidebarPrimitives";
import { ColorPlug } from "./plugs/ColorPlug";
import { ReactionPlug } from "./plugs/ReactionPlug";
import { ActionPlug } from "./plugs/ActionPlug";
import { EditBoardNamePlug } from "./plugs/EditBoardNamePlug";
import { BoardIconPlug } from "./plugs/BoardIconPlug";
import EditBoardNameDialog from "./dialogs/EditBoardNameDialog";
import EditBoardIconDialog from "./dialogs/EditBoardIconDialog";
import { toast } from "sonner";

export default function NodeSettingsSidebar({
  selectedNode,
  onUpdateNode,
  onBack,
}) {
  const [isEditNameOpen, setIsEditNameOpen] = useState(false);
  const [isEditIconOpen, setIsEditIconOpen] = useState(false);

  if (!selectedNode) return null;

  const updateData = (newData) => {
    onUpdateNode(selectedNode.id, {
      data: { ...selectedNode.data, ...newData },
    });
  };

  const currentColor = selectedNode.data?.backgroundColor || "#333333";

  const handleAddReaction = (emoji) => {
    const currentReactions = selectedNode.data?.reactions || {};
    const newCount = (currentReactions[emoji] || 0) + 1;
    updateData({ reactions: { ...currentReactions, [emoji]: newCount } });
  };

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

  const handleSaveBoardIcon = (iconData) => {
    updateData({
      iconName: iconData.iconName,
      iconLightAccent: iconData.iconLightAccent,
      iconDarkAccent: iconData.iconDarkAccent,
    });
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

        <ColorPlug
          value={currentColor}
          onChange={(color) => updateData({ backgroundColor: color })}
          label="Card Color"
        />

        {selectedNode.type !== "board" && (
          <ReactionPlug onReaction={handleAddReaction} />
        )}

        {selectedNode.type !== "board" && (
          <ActionPlug
            icon={MessageSquarePlus}
            label="Comment"
            onClick={() => console.log("Comment")}
          />
        )}
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
        </>
      )}
    </>
  );
}
