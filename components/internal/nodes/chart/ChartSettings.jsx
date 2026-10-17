"use client";

import React, { useState } from "react";
import {
  ChartArea,
  ChartColumnBig,
  ChartLine,
  ChartPie,
  CircleDashed,
  Database,
  Layers,
  List,
  Plus,
  Table2,
  Type,
  X,
} from "lucide-react";
import {
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Input,
  Label,
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@geiger/ui";
import { SidebarButton } from "@/components/internal/layout/sidebar/SidebarPrimitives";
import { SAMPLE_DATASET } from "./ChartNode";

const TYPES = [
  { value: "bar", label: "Bar", icon: ChartColumnBig },
  { value: "line", label: "Line", icon: ChartLine },
  { value: "area", label: "Area", icon: ChartArea },
  { value: "pie", label: "Pie", icon: ChartPie },
  { value: "donut", label: "Donut", icon: CircleDashed },
];

const SECTION_LABEL = "text-[10px] uppercase tracking-wider text-muted-foreground font-semibold";

function OptionRow({ active, icon: Icon, title, hint, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex items-center gap-3 rounded-lg px-2 py-2 text-left transition-colors ${
        active ? "bg-surface-hover text-foreground" : "text-muted-foreground hover:bg-surface-hover/50 hover:text-foreground"
      }`}
    >
      <Icon className="h-4 w-4 shrink-0" />
      <span className="flex flex-col">
        <span className="text-sm">{title}</span>
        {hint && <span className="text-[11px] text-muted-foreground">{hint}</span>}
      </span>
    </button>
  );
}

function SettingPopover({ icon, label, children }) {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <SidebarButton icon={icon} label={label} aria-label={label} title={label} />
      </PopoverTrigger>
      <PopoverContent
        side="right"
        align="start"
        sideOffset={8}
        className="w-64 bg-surface-dialog border-border p-3 shadow-xl rounded-xl"
      >
        <div className="flex flex-col gap-0.5">
          <Label className={`px-2 py-1.5 ${SECTION_LABEL}`}>{label}</Label>
          {children}
        </div>
      </PopoverContent>
    </Popover>
  );
}

// Small grid editor for the inline dataset; edits stay local until saved.
function DataEditorDialog({ open, onOpenChange, initial, onSave }) {
  const [columns, setColumns] = useState(initial.columns);
  const [rows, setRows] = useState(initial.rows);

  const setHeader = (c, v) => setColumns((cols) => cols.map((x, i) => (i === c ? v : x)));
  const setCell = (r, c, v) => setRows((rs) => rs.map((row, i) => (i === r ? row.map((x, j) => (j === c ? v : x)) : row)));
  const addColumn = () => {
    setColumns((cols) => [...cols, `Series ${cols.length}`]);
    setRows((rs) => rs.map((row) => [...row, ""]));
  };
  const removeColumn = (c) => {
    if (columns.length <= 2) return;
    setColumns((cols) => cols.filter((_, i) => i !== c));
    setRows((rs) => rs.map((row) => row.filter((_, i) => i !== c)));
  };
  const addRow = () => setRows((rs) => [...rs, columns.map(() => "")]);
  const removeRow = (r) => setRows((rs) => rs.filter((_, i) => i !== r));

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl bg-surface-dialog border-border">
        <DialogHeader>
          <DialogTitle>Chart data</DialogTitle>
          <DialogDescription>
            The first column labels each category; numeric columns become series.
          </DialogDescription>
        </DialogHeader>
        <div className="max-h-[50vh] overflow-auto rounded-lg border border-border">
          <table className="w-full text-sm">
            <thead className="bg-surface-subtle">
              <tr>
                {columns.map((col, c) => (
                  <th key={c} className="border-b border-border p-1">
                    <div className="flex items-center gap-1">
                      <Input
                        value={col}
                        onChange={(e) => setHeader(c, e.target.value)}
                        className="h-8 bg-surface-card text-xs font-semibold"
                      />
                      {c > 0 && columns.length > 2 && (
                        <button
                          type="button"
                          onClick={() => removeColumn(c)}
                          aria-label="Remove column"
                          className="text-muted-foreground hover:text-red-600 dark:hover:text-red-400"
                        >
                          <X className="h-3.5 w-3.5" />
                        </button>
                      )}
                    </div>
                  </th>
                ))}
                <th className="w-8 border-b border-border p-1">
                  <button
                    type="button"
                    onClick={addColumn}
                    aria-label="Add column"
                    className="flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground hover:bg-surface-hover hover:text-foreground"
                  >
                    <Plus className="h-4 w-4" />
                  </button>
                </th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row, r) => (
                <tr key={r}>
                  {columns.map((_, c) => (
                    <td key={c} className="p-1">
                      <Input
                        value={row[c] ?? ""}
                        onChange={(e) => setCell(r, c, e.target.value)}
                        inputMode={c > 0 ? "decimal" : undefined}
                        className={`h-8 bg-surface-card text-xs ${c > 0 ? "text-right tabular-nums" : ""}`}
                      />
                    </td>
                  ))}
                  <td className="p-1">
                    <button
                      type="button"
                      onClick={() => removeRow(r)}
                      aria-label="Remove row"
                      className="flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground hover:text-red-600 dark:hover:text-red-400"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <button
          type="button"
          onClick={addRow}
          className="flex items-center justify-center gap-1 rounded-lg border border-dashed border-border py-1.5 text-xs text-muted-foreground transition-colors hover:text-foreground"
        >
          <Plus className="h-3.5 w-3.5" /> Add row
        </button>
        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            className="bg-primary"
            onClick={() => {
              onSave({ columns, rows });
              onOpenChange(false);
            }}
          >
            Save data
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default function ChartSettings({ node, updateData }) {
  const data = node.data || {};
  const chartType = data.chartType || "bar";
  const source = data.source || "connected";
  const [editorOpen, setEditorOpen] = useState(false);
  const isPie = chartType === "pie" || chartType === "donut";

  return (
    <>
      <SettingPopover icon={ChartColumnBig} label="Chart type">
        {TYPES.map((t) => (
          <OptionRow
            key={t.value}
            active={chartType === t.value}
            icon={t.icon}
            title={t.label}
            onClick={() => updateData({ chartType: t.value })}
          />
        ))}
      </SettingPopover>

      <SettingPopover icon={Database} label="Data source">
        <OptionRow
          active={source === "connected"}
          icon={Table2}
          title="Connected table"
          hint="Draw an edge to a table node"
          onClick={() => updateData({ source: "connected" })}
        />
        <OptionRow
          active={source === "inline"}
          icon={List}
          title="Inline data"
          hint="A small dataset stored on the chart"
          onClick={() => updateData({ source: "inline" })}
        />
        {source === "inline" && (
          <button
            type="button"
            onClick={() => setEditorOpen(true)}
            className="mt-2 rounded-md border border-border px-2 py-1.5 text-xs text-muted-foreground transition-colors hover:bg-surface-hover hover:text-foreground"
          >
            Edit data…
          </button>
        )}
      </SettingPopover>

      <SettingPopover icon={Type} label="Title">
        <div className="px-2 pb-1">
          <Input
            value={data.title || ""}
            onChange={(e) => updateData({ title: e.target.value })}
            placeholder="Chart title"
            className="h-8 bg-surface-card text-sm"
          />
        </div>
      </SettingPopover>

      <SidebarButton
        icon={List}
        label="Legend"
        aria-label="Toggle legend"
        title={data.legend !== false ? "Hide legend" : "Show legend"}
        active={data.legend !== false}
        onClick={() => updateData({ legend: data.legend === false })}
      />

      {!isPie && chartType !== "line" && (
        <SidebarButton
          icon={Layers}
          label="Stacked"
          aria-label="Toggle stacked"
          title={data.stacked ? "Unstack series" : "Stack series"}
          active={!!data.stacked}
          onClick={() => updateData({ stacked: !data.stacked })}
        />
      )}

      {editorOpen && (
        <DataEditorDialog
          open={editorOpen}
          onOpenChange={setEditorOpen}
          initial={data.inline?.columns?.length ? data.inline : SAMPLE_DATASET}
          onSave={(inline) => updateData({ inline })}
        />
      )}
    </>
  );
}
