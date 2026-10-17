"use client";

import React, { memo, useEffect, useRef, useState } from "react";
import { useTheme } from "next-themes";
import { Code2, Columns2, Eye, Workflow } from "lucide-react";
import { LogoLoading } from "@geiger/ui";
import NodeShell, { useNodeDataUpdater } from "@/components/internal/nodes/shared/NodeShell";
import TextEditingTrait from "@/components/internal/nodes/traits/TextEditingTrait";
import { DEFAULT_MERMAID_SOURCE } from "./templates";

export const nodeMeta = {
  type: "mermaid",
  label: "Mermaid diagram",
  icon: Workflow,
  cardColor: true,
  create: () => ({ data: { source: DEFAULT_MERMAID_SOURCE, view: "split" }, style: { width: 600, height: 330 } }),
};

export const MERMAID_VIEWS = [
  { value: "preview", label: "Preview", icon: Eye },
  { value: "split", label: "Split", icon: Columns2 },
  { value: "code", label: "Code", icon: Code2 },
];

// Mermaid is heavy, so it loads lazily on the client and is shared by every node.
let mermaidModule;
const loadMermaid = () => (mermaidModule ??= import("mermaid").then((m) => m.default));
let renderSeq = 0;

const cleanError = (e) =>
  String(e?.message || e || "Invalid diagram")
    .split("\n")
    .filter(Boolean)
    .slice(0, 4)
    .join("\n");

function MermaidNode({ id, data, selected, dragging }) {
  const update = useNodeDataUpdater(id);
  const { resolvedTheme } = useTheme();
  const theme = resolvedTheme === "dark" ? "dark" : "default";
  const source = data.source ?? "";
  const view = selected ? data.view || "split" : "preview";

  const [svg, setSvg] = useState("");
  const [error, setError] = useState(null);
  const [loaded, setLoaded] = useState(false);
  const renderedOnce = useRef(false);

  // Debounced render; a parse error keeps the last good SVG on screen.
  useEffect(() => {
    let cancelled = false;
    const timer = setTimeout(async () => {
      try {
        if (!source.trim()) {
          if (!cancelled) {
            setSvg("");
            setError(null);
          }
          return;
        }
        const mermaid = await loadMermaid();
        mermaid.initialize({ startOnLoad: false, theme, securityLevel: "strict", suppressErrorRendering: true });
        await mermaid.parse(source);
        const { svg: out } = await mermaid.render(`mermaid-${id.replace(/[^\w-]/g, "")}-${++renderSeq}`, source);
        if (!cancelled) {
          setSvg(out);
          setError(null);
        }
      } catch (e) {
        if (!cancelled) setError(cleanError(e));
      } finally {
        renderedOnce.current = true;
        if (!cancelled) setLoaded(true);
      }
    }, renderedOnce.current ? 400 : 0);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [source, theme, id]);

  const onCodeKeyDown = (e) => {
    if (e.key !== "Tab") return;
    e.preventDefault();
    const el = e.currentTarget;
    const { selectionStart: start, selectionEnd: end } = el;
    const next = `${source.slice(0, start)}  ${source.slice(end)}`;
    update({ source: next });
    requestAnimationFrame(() => el.setSelectionRange(start + 2, start + 2));
  };

  const editor = (
    <TextEditingTrait className="flex h-full min-h-0 flex-1">
      <textarea
        value={source}
        onChange={(e) => update({ source: e.target.value })}
        onKeyDown={onCodeKeyDown}
        spellCheck={false}
        placeholder="flowchart LR&#10;  A --> B"
        className="nowheel h-full w-full flex-1 resize-none bg-transparent p-3 font-mono text-xs leading-relaxed text-foreground placeholder:text-muted-foreground focus:outline-none scrollbar-subtle"
      />
    </TextEditingTrait>
  );

  const preview = (
    <div className="relative flex h-full min-h-0 min-w-0 flex-1 items-center justify-center overflow-hidden p-3">
      {svg ? (
        <div
          className="flex h-full w-full items-center justify-center [&>svg]:!h-full [&>svg]:!w-full [&>svg]:!max-w-full"
          dangerouslySetInnerHTML={{ __html: svg }}
        />
      ) : !loaded ? (
        <LogoLoading size={36} />
      ) : !error ? (
        <p className="text-xs text-muted-foreground">Write Mermaid code to render a diagram.</p>
      ) : null}
      {error && (
        <pre
          className={`nowheel max-h-[45%] overflow-auto whitespace-pre-wrap rounded-md border border-red-500/20 bg-red-500/10 px-2 py-1.5 font-mono text-[10px] leading-snug text-red-600 dark:text-red-400 scrollbar-subtle ${
            svg ? "absolute inset-x-2 bottom-2" : "w-full"
          }`}
        >
          {error}
        </pre>
      )}
    </div>
  );

  return (
    <NodeShell id={id} data={data} selected={selected} dragging={dragging} minWidth={240} minHeight={160}>
      <div className="flex h-full min-h-0 flex-col overflow-hidden">
        {selected && (
          <div className="nodrag flex items-center gap-1 border-b border-border px-2 py-1.5">
            <Workflow className="mx-1 h-3.5 w-3.5 text-muted-foreground" />
            <span className="mr-auto text-[11px] font-medium text-muted-foreground">Mermaid</span>
            {MERMAID_VIEWS.map(({ value, label, icon: Icon }) => (
              <button
                key={value}
                type="button"
                title={label}
                aria-label={label}
                onClick={() => update({ view: value })}
                className={`flex h-6 items-center gap-1 rounded-md px-2 text-[11px] transition-colors ${
                  view === value
                    ? "bg-surface-hover text-foreground"
                    : "text-muted-foreground hover:bg-surface-hover/60 hover:text-foreground"
                }`}
              >
                <Icon className="h-3 w-3" />
                {label}
              </button>
            ))}
          </div>
        )}
        <div className="flex min-h-0 flex-1">
          {view === "code" && editor}
          {view === "split" && (
            <>
              <div className="flex w-[42%] min-w-0 border-r border-border">{editor}</div>
              {preview}
            </>
          )}
          {view === "preview" && preview}
        </div>
      </div>
    </NodeShell>
  );
}

export default memo(MermaidNode);
