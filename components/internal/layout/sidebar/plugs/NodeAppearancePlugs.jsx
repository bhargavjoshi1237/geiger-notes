"use client";

import React from "react";
import {
  Paintbrush,
  Type,
  Layers,
  Lock,
  Unlock,
  ArrowUpToLine,
  ArrowDownToLine,
  Copy,
  Trash2,
  SmilePlus,
} from "lucide-react";
import { Input } from "@geiger/ui";
import { SidebarButton } from "../SidebarPrimitives";
import { PlugPopover, PlugSection, ChoiceGrid, SliderRow, ColorRow, MenuRow } from "./PlugControls";
import { BORDER_STYLES, FONTS, FONT_SIZES, SHADOWS, setLocked, withAppearance } from "@/lib/canvas/node-appearance";
import { useSessionControlsContext } from "@/components/internal/colab/live/SessionContext";

const REACTIONS = ["👍", "❤️", "😂", "😮", "🎉", "🔥", "👀", "✅", "❓", "💡"];

const sizeOf = (node) => ({
  w: Math.round(node.width ?? node.measured?.width ?? node.style?.width ?? 0),
  h: Math.round(node.height ?? node.measured?.height ?? node.style?.height ?? 0),
});

// Generic styling, text, arrange and reaction plugs available on every node; `layout="menu"` lists them as labelled rows.
export function NodeAppearancePlugs({ node, onUpdateNode, onNodeCommand, textControls = true, layout = "rail" }) {
  const a = node.data?.appearance || {};
  const locked = !!node.data?.locked;
  const { inSession, moderator } = useSessionControlsContext();
  const hostLocked = locked && !!node.data?.lockedByHost;
  const lockBlocked = hostLocked && !moderator;
  const lockLabel = lockBlocked ? "Locked by the host" : locked ? "Unlock position" : inSession && moderator ? "Lock for everyone" : "Lock position";
  const toggleLock = () => {
    if (!lockBlocked) onUpdateNode(node.id, setLocked(node, !locked, { byHost: inSession && moderator }));
  };
  const setA = (patch) => onUpdateNode(node.id, withAppearance(node, { ...a, ...patch }));
  const { w, h } = sizeOf(node);
  const asMenu = layout === "menu";
  // Rail plugs keep PlugPopover's icon trigger; menu plugs get a labelled row.
  const menuTrigger = (icon, label, active) => (asMenu ? <MenuRow icon={icon} label={label} active={active} chevron /> : undefined);
  const appearanceActive = !!(a.borderWidth || a.radius != null || a.shadow || a.opacity < 1);
  const textActive = !!(a.fontFamily || a.fontSize || a.textColor);

  const setSize = (key, value) => {
    const v = Math.max(20, Number(value) || 0);
    const next = key === "w" ? { width: v } : { height: v };
    onUpdateNode(node.id, { ...next, style: { ...node.style, ...next } });
  };

  const addReaction = (emoji) => {
    const current = node.data?.reactions || {};
    onUpdateNode(node.id, { data: { ...node.data, reactions: { ...current, [emoji]: (current[emoji] || 0) + 1 } } });
  };

  return (
    <>
      <PlugPopover icon={Paintbrush} label="Appearance" active={appearanceActive} trigger={menuTrigger(Paintbrush, "Appearance", appearanceActive)}>
        <PlugSection label="Border">
          <ChoiceGrid
            options={[0, 1, 2, 4].map((v) => ({ value: v, label: v ? `${v}px` : "None" }))}
            value={a.borderWidth || 0}
            onChange={(borderWidth) => setA({ borderWidth })}
            columns={4}
          />
          {a.borderWidth > 0 && (
            <>
              <ChoiceGrid
                options={BORDER_STYLES.map((s) => ({ value: s, label: s[0].toUpperCase() + s.slice(1) }))}
                value={a.borderStyle || "solid"}
                onChange={(borderStyle) => setA({ borderStyle })}
              />
              <ColorRow value={a.borderColor} onChange={(borderColor) => setA({ borderColor })} placeholder="Foreground" />
            </>
          )}
        </PlugSection>
        <PlugSection
          label="Corner radius"
          aside={
            a.radius != null ? (
              <button type="button" onClick={() => setA({ radius: null })} className="text-[11px] text-muted-foreground hover:text-foreground">
                Style default
              </button>
            ) : null
          }
        >
          <SliderRow value={a.radius ?? 0} min={0} max={40} onChange={(radius) => setA({ radius })} format={(v) => `${v}px`} />
        </PlugSection>
        <PlugSection label="Shadow">
          <ChoiceGrid
            options={[{ value: "default", label: "Style" }, ...Object.keys(SHADOWS).map((k) => ({ value: k, label: k === "sm" ? "Soft" : k === "md" ? "Medium" : k === "lg" ? "Deep" : k[0].toUpperCase() + k.slice(1) }))]}
            value={a.shadow || "default"}
            onChange={(shadow) => setA({ shadow })}
          />
        </PlugSection>
        <PlugSection label="Opacity">
          <SliderRow
            value={Math.round((a.opacity ?? 1) * 100)}
            min={10}
            max={100}
            step={5}
            onChange={(v) => setA({ opacity: v / 100 })}
            format={(v) => `${v}%`}
          />
        </PlugSection>
      </PlugPopover>

      {textControls && (
        <PlugPopover icon={Type} label="Text style" active={textActive} trigger={menuTrigger(Type, "Text style", textActive)}>
          <PlugSection label="Font">
            <ChoiceGrid
              options={[{ value: "", label: "Default" }, ...Object.keys(FONTS).map((k) => ({ value: k, label: k === "hand" ? "Hand" : k[0].toUpperCase() + k.slice(1) }))]}
              value={a.fontFamily || ""}
              onChange={(fontFamily) => setA({ fontFamily })}
              render={(opt) => <span style={{ fontFamily: FONTS[opt.value] }}>{opt.label}</span>}
            />
          </PlugSection>
          <PlugSection label="Size">
            <ChoiceGrid
              options={[{ value: "", label: "Auto" }, ...Object.keys(FONT_SIZES).map((k) => ({ value: k, label: k.toUpperCase() }))]}
              value={a.fontSize || ""}
              onChange={(fontSize) => setA({ fontSize })}
              columns={5}
            />
          </PlugSection>
          <PlugSection label="Colour">
            <ColorRow value={a.textColor} onChange={(textColor) => setA({ textColor })} />
          </PlugSection>
        </PlugPopover>
      )}

      <PlugPopover icon={Layers} label="Arrange" trigger={menuTrigger(Layers, "Arrange")}>
        <PlugSection label="Layer">
          <div className="grid grid-cols-2 gap-1">
            <ArrangeButton icon={ArrowUpToLine} label="To front" onClick={() => onNodeCommand?.("front", node.id)} />
            <ArrangeButton icon={ArrowDownToLine} label="To back" onClick={() => onNodeCommand?.("back", node.id)} />
            <ArrangeButton icon={Copy} label="Duplicate" onClick={() => onNodeCommand?.("duplicate", node.id)} />
            <ArrangeButton
              icon={Trash2}
              label="Delete"
              disabled={locked}
              className="text-red-600 dark:text-red-400 hover:bg-red-500/10"
              onClick={() => onNodeCommand?.("delete", node.id)}
            />
          </div>
        </PlugSection>
        <PlugSection label="Size">
          <div className="grid grid-cols-2 gap-2">
            {["w", "h"].map((key) => (
              <label key={key} className="flex items-center gap-1.5 rounded-lg border border-border bg-surface-card px-2">
                <span className="text-[11px] uppercase text-muted-foreground">{key}</span>
                <Input
                  type="number"
                  key={`${node.id}-${key}-${key === "w" ? w : h}`}
                  defaultValue={key === "w" ? w : h}
                  onBlur={(e) => setSize(key, e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && e.currentTarget.blur()}
                  className="h-7 border-0 bg-transparent p-0 text-xs focus-visible:ring-0"
                />
              </label>
            ))}
          </div>
        </PlugSection>
      </PlugPopover>

      {asMenu ? (
        <MenuRow
          icon={locked ? Lock : Unlock}
          label={lockLabel}
          active={locked}
          disabled={lockBlocked}
          onClick={toggleLock}
        />
      ) : (
        <SidebarButton
          icon={locked ? Lock : Unlock}
          label={locked ? "Unlock" : "Lock"}
          title={lockLabel}
          aria-label={lockLabel}
          active={locked}
          disabled={lockBlocked}
          className={lockBlocked ? "cursor-not-allowed opacity-50" : undefined}
          onClick={toggleLock}
        />
      )}

      <PlugPopover icon={SmilePlus} label="Add reaction" width="w-auto" trigger={menuTrigger(SmilePlus, "Add reaction")}>
        <div className="grid grid-cols-5 gap-1">
          {REACTIONS.map((emoji) => (
            <button
              key={emoji}
              type="button"
              onClick={() => addReaction(emoji)}
              className="flex h-9 w-9 items-center justify-center rounded-lg text-lg transition-transform hover:scale-110 hover:bg-surface-hover"
            >
              {emoji}
            </button>
          ))}
        </div>
      </PlugPopover>
    </>
  );
}

function ArrangeButton({ icon: Icon, label, onClick, disabled, className = "" }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`flex items-center gap-2 rounded-lg border border-border/60 px-2 py-1.5 text-xs text-muted-foreground transition-colors hover:bg-surface-hover hover:text-foreground disabled:pointer-events-none disabled:opacity-40 ${className}`}
    >
      <Icon className="h-3.5 w-3.5" />
      {label}
    </button>
  );
}
