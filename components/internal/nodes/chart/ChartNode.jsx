"use client";

import React, { memo, useCallback, useMemo, useState } from "react";
import { useNodesData, useStore } from "@xyflow/react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { ChartColumnBig, Table2, ChartNoAxesColumn } from "lucide-react";
import NodeShell, { useNodeDataUpdater } from "@/components/internal/nodes/shared/NodeShell";
import TextEditingTrait from "@/components/internal/nodes/traits/TextEditingTrait";

// Validated categorical order (dataviz reference palette); dark steps are re-picked for the dark surface, not flipped.
const SERIES_LIGHT = ["#2a78d6", "#eb6834", "#1baf7a", "#eda100", "#e87ba4", "#008300", "#6250d6", "#e34948"];
const SERIES_DARK = ["#3987e5", "#d95926", "#199e70", "#c98500", "#d55181", "#008300", "#9085e9", "#e66767"];
const MAX_SERIES = SERIES_LIGHT.length;
const MAX_SLICES = 6;

const PALETTE_CSS = [
  `.chart-node{${SERIES_LIGHT.map((c, i) => `--chart-s${i}:${c};`).join("")}}`,
  `.dark .chart-node{${SERIES_DARK.map((c, i) => `--chart-s${i}:${c};`).join("")}}`,
].join("");

export const seriesColor = (i) => `var(--chart-s${i % MAX_SERIES})`;

export const SAMPLE_DATASET = {
  columns: ["Month", "Revenue", "Costs"],
  rows: [
    ["Jan", "120", "80"],
    ["Feb", "150", "95"],
    ["Mar", "170", "110"],
    ["Apr", "160", "100"],
    ["May", "210", "120"],
  ],
};

export const CHART_TYPES = ["bar", "line", "area", "pie", "donut"];

export const nodeMeta = {
  type: "chart",
  label: "Chart",
  icon: ChartColumnBig,
  cardColor: true,
  create: () => ({
    data: {
      title: "",
      chartType: "bar",
      source: "connected",
      inline: SAMPLE_DATASET,
      legend: true,
      stacked: false,
    },
    style: { width: 420, height: 300 },
  }),
};

const toNumber = (v) => {
  const s = String(v ?? "").replace(/[\s,$€£¥%]/g, "");
  if (!s) return null;
  const n = Number(s);
  return Number.isFinite(n) ? n : NaN;
};

// First column = category labels; every column whose filled cells are all numeric becomes a series.
export function tableToDataset(columns = [], rows = []) {
  const cols = columns.map((c, i) => String(c ?? "").trim() || `Column ${i + 1}`);
  const body = rows.filter((r) => Array.isArray(r) && r.some((c) => String(c ?? "").trim()));
  const numericIdx = cols
    .map((_, i) => i)
    .filter(
      (i) =>
        i > 0 &&
        body.some((r) => toNumber(r[i]) != null) &&
        body.every((r) => !Number.isNaN(toNumber(r[i]))),
    );
  const series = numericIdx.slice(0, MAX_SERIES).map((i, slot) => ({ key: `s${slot}`, label: cols[i], col: i, slot }));
  const points = body.map((r, k) => {
    const point = { category: String(r[0] ?? "").trim() || `Row ${k + 1}` };
    series.forEach((s) => {
      point[s.key] = toNumber(r[s.col]);
    });
    return point;
  });
  return { series, points, hidden: Math.max(0, numericIdx.length - MAX_SERIES), header: cols[0] || "Category" };
}

const compact = new Intl.NumberFormat(undefined, { notation: "compact", maximumFractionDigits: 1 });
const full = new Intl.NumberFormat(undefined, { maximumFractionDigits: 2 });
const formatTick = (v) => (Math.abs(v) >= 1000 ? compact.format(v) : full.format(v));

// Undirected neighbour ids as a stable string so the selector only re-renders on real changes.
const useNeighborIds = (id) => {
  const key = useStore(
    useCallback(
      (s) =>
        s.edges
          .filter((e) => e.source === id || e.target === id)
          .map((e) => (e.source === id ? e.target : e.source))
          .filter((n) => n !== id)
          .sort()
          .join("|"),
      [id],
    ),
  );
  return useMemo(() => (key ? [...new Set(key.split("|"))] : []), [key]);
};

function ChartTooltip({ active, payload, label, labels }) {
  if (!active || !payload?.length) return null;
  const isPie = payload[0]?.payload?.isSlice;
  return (
    <div className="min-w-32 rounded-lg border border-border bg-surface-dialog px-2.5 py-2 text-xs shadow-xl">
      {!isPie && label != null && <p className="mb-1 font-medium text-foreground">{label}</p>}
      {payload.map((p) => (
        <div key={`${p.dataKey}-${p.name}`} className="flex items-center gap-2 py-0.5">
          <span className="h-2 w-2 shrink-0 rounded-[2px]" style={{ backgroundColor: p.payload?.fill || p.color }} />
          <span className="text-muted-foreground">{isPie ? p.name : labels[p.dataKey] || p.name}</span>
          <span className="ml-auto pl-3 font-medium tabular-nums text-foreground">
            {p.value == null ? "—" : full.format(p.value)}
          </span>
        </div>
      ))}
    </div>
  );
}

function ChartNode({ id, data, selected, dragging }) {
  const update = useNodeDataUpdater(id);
  const [showTable, setShowTable] = useState(false);
  const chartType = data.chartType || "bar";
  const source = data.source || "connected";
  const surface = data.backgroundColor || "var(--node-default)";

  const neighborIds = useNeighborIds(id);
  const neighbors = useNodesData(source === "connected" ? neighborIds : []);
  const table = source === "connected" ? (neighbors || []).find((n) => n?.type === "table") : null;
  const tableColumns = table?.data?.columns;
  const tableRows = table?.data?.rows;

  const dataset = useMemo(() => {
    if (source === "inline") return tableToDataset(data.inline?.columns, data.inline?.rows);
    if (!tableColumns) return null;
    return tableToDataset(tableColumns, tableRows);
  }, [source, data.inline, tableColumns, tableRows]);

  const isPie = chartType === "pie" || chartType === "donut";
  const stackId = data.stacked ? "stack" : undefined;
  const labels = useMemo(
    () => Object.fromEntries((dataset?.series || []).map((s) => [s.key, s.label])),
    [dataset],
  );

  // Part-to-whole stays readable only with a handful of slices; the tail folds into "Other".
  const slices = useMemo(() => {
    if (!isPie || !dataset?.series.length) return [];
    const key = dataset.series[0].key;
    const positive = dataset.points
      .map((p, i) => ({ category: p.category, value: p[key] ?? 0, slot: i }))
      .filter((p) => p.value > 0);
    const head = positive.slice(0, MAX_SLICES - 1);
    const tail = positive.slice(MAX_SLICES - 1);
    const out = tail.length > 1 ? [...head, { category: "Other", value: tail.reduce((s, p) => s + p.value, 0), slot: MAX_SLICES - 1 }] : positive;
    return out.map((p) => ({ ...p, isSlice: true, fill: seriesColor(p.slot) }));
  }, [isPie, dataset]);

  const hasData = dataset && dataset.series.length > 0 && dataset.points.length > 0;
  const legendItems = isPie
    ? slices.map((s) => ({ key: s.category, label: s.category, color: s.fill }))
    : (dataset?.series || []).map((s) => ({ key: s.key, label: s.label, color: seriesColor(s.slot) }));
  const showLegend = data.legend !== false && legendItems.length >= 2;

  const axisProps = {
    tick: { fill: "var(--muted-foreground)", fontSize: 11 },
    tickLine: false,
  };

  const renderCartesian = () => {
    const common = { data: dataset.points, margin: { top: 8, right: 8, bottom: 0, left: 0 } };
    const axes = [
      <CartesianGrid key="grid" vertical={false} stroke="var(--border)" strokeWidth={1} />,
      <XAxis key="x" dataKey="category" {...axisProps} axisLine={{ stroke: "var(--border)" }} minTickGap={8} />,
      <YAxis key="y" {...axisProps} axisLine={false} width={40} tickFormatter={formatTick} />,
    ];
    const tooltip = (
      <Tooltip
        key="tip"
        content={<ChartTooltip labels={labels} />}
        cursor={chartType === "bar" ? { fill: "var(--surface-hover)", opacity: 0.6 } : { stroke: "var(--border)" }}
        isAnimationActive={false}
      />
    );
    const last = dataset.series.length - 1;
    if (chartType === "line") {
      return (
        <LineChart {...common}>
          {axes}
          {tooltip}
          {dataset.series.map((s) => (
            <Line
              key={s.key}
              dataKey={s.key}
              name={s.label}
              type="monotone"
              stroke={seriesColor(s.slot)}
              strokeWidth={2}
              strokeLinecap="round"
              strokeLinejoin="round"
              dot={false}
              activeDot={{ r: 4, stroke: surface, strokeWidth: 2 }}
              connectNulls
            />
          ))}
        </LineChart>
      );
    }
    if (chartType === "area") {
      return (
        <AreaChart {...common}>
          {axes}
          {tooltip}
          {dataset.series.map((s) => (
            <Area
              key={s.key}
              dataKey={s.key}
              name={s.label}
              type="monotone"
              stackId={stackId}
              stroke={seriesColor(s.slot)}
              strokeWidth={2}
              fill={seriesColor(s.slot)}
              fillOpacity={0.1}
              activeDot={{ r: 4, stroke: surface, strokeWidth: 2 }}
              connectNulls
            />
          ))}
        </AreaChart>
      );
    }
    return (
      <BarChart {...common} barGap={2} barCategoryGap="20%">
        {axes}
        {tooltip}
        {dataset.series.map((s, i) => (
          <Bar
            key={s.key}
            dataKey={s.key}
            name={s.label}
            stackId={stackId}
            fill={seriesColor(s.slot)}
            maxBarSize={24}
            radius={!stackId || i === last ? [4, 4, 0, 0] : 0}
            stroke={stackId ? surface : undefined}
            strokeWidth={stackId ? 2 : 0}
          />
        ))}
      </BarChart>
    );
  };

  return (
    <NodeShell id={id} data={data} selected={selected} dragging={dragging} minWidth={260} minHeight={180}>
      <style href="geiger-chart-node-palette" precedence="default">
        {PALETTE_CSS}
      </style>
      <div className="chart-node flex h-full w-full flex-col gap-2 p-4 text-foreground">
        <div className="flex items-center gap-2">
          {selected ? (
            <TextEditingTrait className="min-w-0 flex-1">
              <input
                value={data.title || ""}
                onChange={(e) => update({ title: e.target.value })}
                placeholder="Chart title..."
                className="w-full bg-transparent text-sm font-semibold focus:outline-none placeholder:text-muted-foreground"
              />
            </TextEditingTrait>
          ) : (
            <p className={`min-w-0 flex-1 truncate text-sm font-semibold ${data.title ? "" : "text-muted-foreground"}`}>
              {data.title || (dataset?.series.length === 1 ? dataset.series[0].label : "Untitled chart")}
            </p>
          )}
          {hasData && (
            <button
              type="button"
              onClick={() => setShowTable((v) => !v)}
              aria-label={showTable ? "Show chart" : "Show data table"}
              title={showTable ? "Show chart" : "Show data table"}
              className={`nodrag flex h-6 w-6 shrink-0 items-center justify-center rounded-md transition-colors hover:bg-surface-hover hover:text-foreground ${
                showTable ? "bg-surface-active text-foreground" : "text-muted-foreground"
              }`}
            >
              {showTable ? <ChartNoAxesColumn className="h-3.5 w-3.5" /> : <Table2 className="h-3.5 w-3.5" />}
            </button>
          )}
        </div>

        {!hasData ? (
          <EmptyState source={source} hasTable={!!table} onUseSample={() => update({ source: "inline" })} />
        ) : showTable ? (
          <DataTable dataset={dataset} />
        ) : (
          <div className="relative min-h-0 flex-1">
            <div className="absolute inset-0">
              <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0}>
                {isPie ? (
                  <PieChart>
                    <Tooltip content={<ChartTooltip labels={labels} />} isAnimationActive={false} />
                    <Pie
                      data={slices}
                      dataKey="value"
                      nameKey="category"
                      innerRadius={chartType === "donut" ? "58%" : 0}
                      outerRadius="88%"
                      stroke={surface}
                      strokeWidth={2}
                    >
                      {slices.map((s) => (
                        <Cell key={s.category} fill={s.fill} />
                      ))}
                    </Pie>
                  </PieChart>
                ) : (
                  renderCartesian()
                )}
              </ResponsiveContainer>
            </div>
          </div>
        )}

        {hasData && !showTable && (showLegend || dataset.hidden > 0) && (
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-muted-foreground">
            {showLegend &&
              legendItems.map((item) => (
                <span key={item.key} className="flex items-center gap-1.5">
                  {chartType === "line" ? (
                    <span className="h-0.5 w-3 rounded-full" style={{ backgroundColor: item.color }} />
                  ) : (
                    <span className="h-2 w-2 rounded-[2px]" style={{ backgroundColor: item.color }} />
                  )}
                  <span className="text-foreground/80">{item.label}</span>
                </span>
              ))}
            {dataset.hidden > 0 && <span>+{dataset.hidden} more series not shown</span>}
          </div>
        )}
      </div>
    </NodeShell>
  );
}

function EmptyState({ source, hasTable, onUseSample }) {
  return (
    <div className="flex min-h-0 flex-1 flex-col items-center justify-center gap-2 rounded-lg border border-dashed border-border px-4 text-center">
      <Table2 className="h-5 w-5 text-muted-foreground" />
      <p className="text-sm font-medium">{source === "inline" ? "No numeric data yet" : hasTable ? "No numbers in the table" : "Connect a table"}</p>
      <p className="max-w-64 text-xs text-muted-foreground">
        {source === "inline"
          ? "Add a numeric column in the chart's data settings."
          : hasTable
            ? "The first column labels categories; numeric columns become series."
            : "Draw an edge from this chart to a table node, or start from sample data."}
      </p>
      {source === "connected" && !hasTable && (
        <button
          type="button"
          onClick={onUseSample}
          className="nodrag mt-1 rounded-md border border-border px-2.5 py-1 text-xs text-muted-foreground transition-colors hover:bg-surface-hover hover:text-foreground"
        >
          Use sample data
        </button>
      )}
    </div>
  );
}

function DataTable({ dataset }) {
  return (
    <div className="nowheel nodrag min-h-0 flex-1 overflow-auto rounded-lg border border-border">
      <table className="w-full text-xs">
        <thead className="sticky top-0 bg-surface-hover">
          <tr>
            <th className="px-2 py-1.5 text-left font-medium text-muted-foreground">{dataset.header}</th>
            {dataset.series.map((s) => (
              <th key={s.key} className="px-2 py-1.5 text-right font-medium text-muted-foreground">
                {s.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {dataset.points.map((p, i) => (
            <tr key={`${p.category}-${i}`} className="border-t border-border">
              <td className="px-2 py-1">{p.category}</td>
              {dataset.series.map((s) => (
                <td key={s.key} className="px-2 py-1 text-right tabular-nums">
                  {p[s.key] == null ? "—" : full.format(p[s.key])}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default memo(ChartNode);
