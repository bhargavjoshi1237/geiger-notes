"use client";

import React, { useState, useEffect } from "react";
import { ArrowLeft, ArrowRight, Minus, Activity } from "lucide-react";
import { SidebarShell } from "./SidebarPrimitives";
import { ColorPlug } from "./plugs/ColorPlug";
import { LabelPlug } from "./plugs/LabelPlug";
import { StrokeWidthPlug } from "./plugs/StrokeWidthPlug";
import { ActionPlug } from "./plugs/ActionPlug";
import { MarkerType } from "@xyflow/react";

export default function EdgeSettingsSidebar({
  selectedEdge,
  onUpdateEdge,
  onBack,
}) {
  const [label, setLabel] = useState("");

  useEffect(() => {
    if (selectedEdge) {
      setLabel(selectedEdge.label || selectedEdge.data?.label || "");
    }
  }, [selectedEdge]);

  if (!selectedEdge) return null;

  const updateStyle = (newStyle) => {
    onUpdateEdge(selectedEdge.id, {
      style: { ...selectedEdge.style, ...newStyle },
    });
  };

  const updateMarker = (side) => {
    const markerKey = side === "start" ? "markerStart" : "markerEnd";
    const currentMarker = selectedEdge[markerKey];
    const newValue = currentMarker
      ? undefined
      : {
          type: MarkerType.ArrowClosed,
          width: 20,
          height: 20,
          color: selectedEdge.style?.stroke,
        };

    onUpdateEdge(selectedEdge.id, { [markerKey]: newValue });
  };

  const currentStrokeWidth = selectedEdge.style?.strokeWidth || 1;
  const isDashed = selectedEdge.style?.strokeDasharray === "5 5";

  return (
    <SidebarShell onBack={onBack} title="Edge Settings">
      <ColorPlug
        value={selectedEdge.style?.stroke}
        onChange={(color) => updateStyle({ stroke: color })}
      />

      <ActionPlug
        icon={ArrowLeft}
        label="Start Arrow"
        active={!!selectedEdge.markerStart}
        onClick={() => updateMarker("start")}
      />

      <ActionPlug
        icon={ArrowRight}
        label="End Arrow"
        active={!!selectedEdge.markerEnd}
        onClick={() => updateMarker("end")}
      />

      <LabelPlug
        value={label}
        onChange={(val) => {
          setLabel(val);
          onUpdateEdge(selectedEdge.id, { label: val });
        }}
      />

      <ActionPlug
        icon={Minus}
        label="Dashed Line"
        active={isDashed}
        onClick={() => updateStyle({ strokeDasharray: isDashed ? "0" : "5 5" })}
        className={isDashed ? "" : "opacity-80"}
      >
        <Minus
          className={`w-5 h-5 ${isDashed ? "-rotate-45" : ""} transition-transform duration-300`}
        />
      </ActionPlug>

      <StrokeWidthPlug
        value={currentStrokeWidth}
        onChange={(val) => updateStyle({ strokeWidth: val })}
      />

      <ActionPlug
        icon={Activity}
        label="Animated"
        active={selectedEdge.animated}
        onClick={() =>
          onUpdateEdge(selectedEdge.id, { animated: !selectedEdge.animated })
        }
        className={selectedEdge.animated ? "text-green-400 bg-surface-hover/50" : ""}
      />
    </SidebarShell>
  );
}
