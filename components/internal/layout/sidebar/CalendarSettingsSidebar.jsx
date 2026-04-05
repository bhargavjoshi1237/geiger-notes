"use client";

import React, { useState } from "react";
import { SidebarShell } from "./SidebarPrimitives";
import { ColorPlug } from "./plugs/ColorPlug";
import { ReactionPlug } from "./plugs/ReactionPlug";
import { LabelPlug } from "./plugs/LabelPlug";
import { CalendarMonthPlug } from "./plugs/calendar/CalendarMonthPlug";
import EditCalendarThemeDialog from "./dialogs/calendar/EditCalendarThemeDialog";

export default function CalendarSettingsSidebar({
  selectedNode,
  onUpdateNode,
  onBack,
}) {
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  if (!selectedNode || selectedNode.type !== "calendar") return null;

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

  const handleSaveTheme = (themeData) => {
    updateData({ ...themeData });
  };

  return (
    <>
      <SidebarShell onBack={onBack} title="Calendar Settings">
        <CalendarMonthPlug onEdit={() => setIsSettingsOpen(true)} />

        <ColorPlug
          value={currentColor}
          onChange={(color) => updateData({ backgroundColor: color })}
          label="Card Color"
        />

        <LabelPlug
          value={selectedNode.data?.label || ""}
          onChange={(label) => updateData({ label })}
          title="Calendar Label"
          placeholder="Calendar name..."
        />

        <ReactionPlug onReaction={handleAddReaction} />
      </SidebarShell>

      <EditCalendarThemeDialog
        open={isSettingsOpen}
        onOpenChange={setIsSettingsOpen}
        initialData={selectedNode.data}
        onSave={handleSaveTheme}
      />
    </>
  );
}
