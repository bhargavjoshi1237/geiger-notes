"use client";

import React, { memo } from "react";
import { Check, Copy, FileCode2, WrapText } from "lucide-react";
import { toast } from "sonner";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@geiger/ui";
import NodeShell, { useNodeDataUpdater } from "@/components/internal/nodes/shared/NodeShell";
import { LANGUAGES, TOKEN_CLASS, tokenize } from "./highlight";

const MONO = "var(--font-geist-mono), ui-monospace, SFMono-Regular, Menlo, Consolas, monospace";
const GAP = 12;

export const CODE_DEFAULTS = { code: "", language: "js", wrap: false, showLineNumbers: true, filename: "" };

export const languageLabel = (value) => LANGUAGES.find((l) => l.value === value)?.label ?? "Plain text";

export async function copyCode(code) {
  try {
    await navigator.clipboard.writeText(code || "");
    toast.success("Code copied");
    return true;
  } catch {
    toast.error("Couldn't copy to clipboard");
    return false;
  }
}

// Insert text at the caret, keeping native undo where the browser allows it.
function insertAtCaret(ta, text, onFallback) {
  ta.focus();
  if (document.execCommand?.("insertText", false, text)) return;
  const { selectionStart: s, selectionEnd: e, value } = ta;
  onFallback(value.slice(0, s) + text + value.slice(e), s + text.length);
}

function HeaderButton({ onClick, label, active, children }) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={label}
      aria-label={label}
      className={`nodrag nopan flex h-6 w-6 shrink-0 items-center justify-center rounded-md transition-colors hover:bg-surface-hover hover:text-foreground ${
        active ? "bg-surface-active text-foreground" : "text-muted-foreground"
      }`}
    >
      {children}
    </button>
  );
}

const CodeNode = ({ id, data, selected, dragging }) => {
  const update = useNodeDataUpdater(id);
  const textareaRef = React.useRef(null);
  const [copied, setCopied] = React.useState(false);

  const code = data.code ?? "";
  const language = data.language || CODE_DEFAULTS.language;
  const wrap = !!data.wrap;
  const showLineNumbers = data.showLineNumbers !== false;

  const lines = React.useMemo(() => tokenize(code, language), [code, language]);
  const gutter = `${String(lines.length).length + 1}ch`;

  const textStyle = {
    fontFamily: MONO,
    fontSize: 12.5,
    lineHeight: "20px",
    tabSize: 2,
    fontVariantLigatures: "none",
    letterSpacing: 0,
    whiteSpace: wrap ? "pre-wrap" : "pre",
    overflowWrap: wrap ? "anywhere" : "normal",
  };

  const handleCopy = async () => {
    if (await copyCode(code)) {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    }
  };

  const handleKeyDown = (e) => {
    e.stopPropagation();
    const ta = e.currentTarget;
    if (e.key === "Escape") return ta.blur();
    if (e.key !== "Tab") return;
    e.preventDefault();
    const restore = (next, start, end = start) => {
      update({ code: next });
      requestAnimationFrame(() => ta.setSelectionRange(start, end));
    };
    if (e.shiftKey) {
      const { selectionStart: s, selectionEnd: en, value } = ta;
      const lineStart = value.lastIndexOf("\n", s - 1) + 1;
      const remove = /^ {1,2}/.exec(value.slice(lineStart))?.[0].length || 0;
      if (remove) restore(value.slice(0, lineStart) + value.slice(lineStart + remove), Math.max(lineStart, s - remove), Math.max(lineStart, en - remove));
      return;
    }
    insertAtCaret(ta, "  ", restore);
  };

  return (
    <NodeShell
      id={id}
      data={data}
      selected={selected}
      dragging={dragging}
      minWidth={240}
      minHeight={120}
      background="var(--card)"
    >
      <div className="flex h-full w-full flex-1 flex-col overflow-hidden rounded-[inherit]">
        <div className="flex h-9 shrink-0 items-center gap-1.5 border-b border-border px-3">
          <FileCode2 className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
          {selected ? (
            <input
              value={data.filename ?? ""}
              onChange={(e) => update({ filename: e.target.value })}
              onKeyDown={(e) => e.stopPropagation()}
              placeholder={`untitled.${LANGUAGES.find((l) => l.value === language)?.ext ?? "txt"}`}
              className="nodrag nopan min-w-0 flex-1 bg-transparent text-xs text-foreground outline-none placeholder:text-muted-foreground"
            />
          ) : (
            <span className="min-w-0 flex-1 truncate text-xs text-muted-foreground">
              {data.filename || languageLabel(language)}
            </span>
          )}
          {selected && (
            <Select value={language} onValueChange={(v) => update({ language: v })}>
              <SelectTrigger
                size="sm"
                className="nodrag nopan w-auto gap-1 border-transparent bg-transparent px-1.5 text-xs text-muted-foreground hover:bg-surface-hover data-[size=sm]:h-6"
              >
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="border-border bg-surface-dialog">
                {LANGUAGES.map((l) => (
                  <SelectItem key={l.value} value={l.value} className="text-xs">
                    {l.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
          <HeaderButton label={wrap ? "Disable wrap" : "Wrap lines"} active={wrap} onClick={() => update({ wrap: !wrap })}>
            <WrapText className="h-3.5 w-3.5" />
          </HeaderButton>
          <HeaderButton label="Copy code" onClick={handleCopy}>
            {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
          </HeaderButton>
        </div>

        <div
          className={`min-h-0 flex-1 overflow-auto ${selected ? "nodrag nopan nowheel cursor-text" : ""}`}
          onClick={() => selected && textareaRef.current?.focus()}
        >
          <div
            className={`relative py-2.5 pr-3 ${wrap ? "" : "w-max min-w-full"}`}
            style={{ paddingLeft: showLineNumbers ? `calc(${gutter} + ${GAP * 2}px)` : GAP }}
          >
            <div className="relative">
              <pre aria-hidden className="m-0 p-0 text-foreground" style={textStyle}>
                {lines.map((line, i) => (
                  <div key={i} className="relative">
                    {showLineNumbers && (
                      <code
                        className="absolute select-none text-right text-zinc-400 [font:inherit] dark:text-zinc-600"
                        style={{ left: `calc(-1 * (${gutter} + ${GAP}px))`, width: gutter }}
                      >
                        {i + 1}
                      </code>
                    )}
                    {line.length ? (
                      line.map((tok, j) => (
                        <code key={j} className={`[font:inherit] ${TOKEN_CLASS[tok.t] || ""}`}>
                          {tok.v}
                        </code>
                      ))
                    ) : (
                      <code className="[font:inherit]">{"​"}</code>
                    )}
                  </div>
                ))}
              </pre>
              {!code && !selected && (
                <code className="pointer-events-none absolute left-0 top-0 text-muted-foreground" style={textStyle}>
                  {"// Empty snippet"}
                </code>
              )}
              {selected && (
                <textarea
                  ref={textareaRef}
                  value={code}
                  onChange={(e) => update({ code: e.target.value })}
                  onKeyDown={handleKeyDown}
                  spellCheck={false}
                  autoCapitalize="off"
                  autoComplete="off"
                  autoCorrect="off"
                  wrap={wrap ? "soft" : "off"}
                  placeholder="// Start typing…"
                  aria-label="Code"
                  data-gramm="false"
                  className="absolute inset-0 m-0 h-full w-full resize-none overflow-hidden border-0 bg-transparent p-0 text-transparent caret-foreground outline-none placeholder:text-muted-foreground selection:bg-primary/25"
                  style={textStyle}
                />
              )}
            </div>
          </div>
        </div>
      </div>
    </NodeShell>
  );
};

export const nodeMeta = {
  type: "code",
  label: "Code",
  icon: FileCode2,
  cardColor: false,
  create: () => ({ data: { ...CODE_DEFAULTS }, style: { width: 440, height: 260 } }),
};

export default memo(CodeNode);
