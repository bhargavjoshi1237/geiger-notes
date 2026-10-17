"use client";

import React, { memo, useEffect, useMemo } from "react";
import { useEdges, useNodesData, useStore } from "@xyflow/react";
import { Sigma } from "lucide-react";
import NodeShell, { useNodeDataUpdater } from "@/components/internal/nodes/shared/NodeShell";
import TextEditingTrait from "@/components/internal/nodes/traits/TextEditingTrait";
import {
  FORMULA_OPS,
  computeFormula,
  extractInput,
  formatValue,
  variableName,
} from "./formula-engine";

export const nodeMeta = {
  type: "formula",
  label: "Formula",
  icon: Sigma,
  cardColor: true,
  create: () => ({
    data: { label: "Total", op: "sum", expression: "A + B", format: "number", decimals: 0, unit: "", value: null, column: "" },
    style: { width: 300, height: 180 },
  }),
};

const formulaIdsSelector = (s) =>
  s.nodes
    .filter((n) => n.type === "formula")
    .map((n) => n.id)
    .join(",");

// True when this formula feeds back into itself through formula -> formula edges.
function hasCycle(id, edges, formulaIds) {
  const upstream = (target) =>
    edges.filter((e) => e.target === target && formulaIds.has(e.source)).map((e) => e.source);
  const seen = new Set();
  const stack = upstream(id);
  while (stack.length) {
    const next = stack.pop();
    if (next === id) return true;
    if (seen.has(next)) continue;
    seen.add(next);
    stack.push(...upstream(next));
  }
  return false;
}

function FormulaNode({ id, data, selected, dragging }) {
  const update = useNodeDataUpdater(id);
  const edges = useEdges();
  const formulaIdsKey = useStore(formulaIdsSelector);
  const op = data.op || "sum";

  // Connected node ids in edge order (stable across drags); formulas only count when they point into this node.
  const formulaIds = useMemo(() => new Set(formulaIdsKey ? formulaIdsKey.split(",") : []), [formulaIdsKey]);
  const connectedIds = useMemo(() => {
    const ids = [];
    edges.forEach((e) => {
      if (e.source !== id && e.target !== id) return;
      const other = e.source === id ? e.target : e.source;
      if (formulaIds.has(other) && e.target !== id) return;
      if (!ids.includes(other)) ids.push(other);
    });
    return ids;
  }, [edges, id, formulaIds]);
  const circular = useMemo(() => hasCycle(id, edges, formulaIds), [id, edges, formulaIds]);

  const nodesData = useNodesData(connectedIds);

  const inputs = useMemo(() => {
    const list = [];
    connectedIds.forEach((nid) => {
      const node = nodesData.find((n) => n.id === nid);
      const input = node ? extractInput(node, { column: data.column }) : null;
      if (input) list.push({ ...input, id: nid, variable: variableName(list.length) });
    });
    return list;
  }, [connectedIds, nodesData, data.column]);

  const result = useMemo(() => {
    if (circular) return { value: null, error: "Circular reference" };
    return computeFormula(op, inputs, data.expression);
  }, [circular, op, inputs, data.expression]);

  // Persist only real changes so chained formulas don't re-render in a loop.
  useEffect(() => {
    const next = result.value === null ? null : Math.round(result.value * 1e9) / 1e9;
    if (next !== (data.value ?? null)) update({ value: next });
  }, [result.value, data.value, update]);

  const opLabel = FORMULA_OPS.find((o) => o.value === op)?.label ?? "Sum";
  const showLegend = op === "custom" || selected;

  return (
    <NodeShell id={id} data={data} selected={selected} dragging={dragging} minWidth={220} minHeight={120}>
      <div className="flex h-full min-h-0 flex-col gap-2 p-4">
        <div className="flex items-center gap-2">
          <Sigma className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
          {selected ? (
            <TextEditingTrait className="min-w-0 flex-1">
              <input
                value={data.label ?? ""}
                onChange={(e) => update({ label: e.target.value })}
                placeholder="Label"
                className="w-full bg-transparent text-xs font-semibold uppercase tracking-wider text-muted-foreground focus:outline-none"
              />
            </TextEditingTrait>
          ) : (
            <span className="min-w-0 flex-1 truncate text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              {data.label || "Formula"}
            </span>
          )}
          <span className="shrink-0 rounded-full border border-border px-2 py-0.5 text-[10px] text-muted-foreground">
            {opLabel}
          </span>
        </div>

        <div className="flex min-w-0 items-baseline gap-1.5">
          <span className="truncate text-4xl font-semibold tabular-nums tracking-tight text-foreground">
            {formatValue(result.value, data)}
          </span>
          {data.unit ? <span className="shrink-0 text-base text-muted-foreground">{data.unit}</span> : null}
        </div>

        {result.error ? <p className="truncate text-xs text-red-600 dark:text-red-400">{result.error}</p> : null}

        {selected && op === "custom" && (
          <TextEditingTrait>
            <input
              value={data.expression ?? ""}
              onChange={(e) => update({ expression: e.target.value })}
              placeholder="e.g. (A + B) / C"
              spellCheck={false}
              className="w-full rounded-md border border-border bg-surface-card px-2 py-1 font-mono text-xs text-foreground focus:outline-none"
            />
          </TextEditingTrait>
        )}

        {showLegend && inputs.length > 0 && (
          <div className="nowheel mt-auto max-h-24 overflow-y-auto border-t border-border pt-2 scrollbar-subtle">
            {inputs.map((inp) => (
              <div key={inp.id} className="flex items-center gap-2 py-0.5 text-[11px]">
                <span className="w-5 shrink-0 font-mono font-semibold text-foreground">{inp.variable}</span>
                <span className="min-w-0 flex-1 truncate text-muted-foreground">{inp.label}</span>
                <span className="shrink-0 tabular-nums text-text-secondary">
                  {inp.scalar === null || inp.scalar === undefined ? "—" : formatValue(inp.scalar, { decimals: Number.isInteger(inp.scalar) ? 0 : 2 })}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </NodeShell>
  );
}

export default memo(FormulaNode);
