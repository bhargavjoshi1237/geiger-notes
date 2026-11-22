import React, { memo } from "react";
import {
  Handle,
  Position,
  NodeResizeControl,
  useReactFlow,
  useConnection,
} from "@xyflow/react";
import { ArrowRight, Plus, X } from "lucide-react";
import Reactions from "../ui/Reactions";
import { ResizeHandle } from "@geiger/ui";
import TextEditingTrait from "./traits/TextEditingTrait";

const DEFAULT_COLUMNS = ["Column 1", "Column 2"];
const DEFAULT_ROWS = [
  ["", ""],
  ["", ""],
];

// Sizes each input to its text so columns fit their content (size is the fallback where field-sizing is unsupported).
const cellSize = (value) => Math.max(String(value ?? "").length, 4);

const ADD_STRIP =
  "nodrag flex h-full min-h-6 w-full items-center justify-center gap-1 rounded-md border border-dashed border-foreground/20 text-[11px] text-muted-foreground transition-colors hover:border-foreground/40 hover:text-foreground";

const TableNode = ({ id, data, selected, dragging }) => {
  const { setNodes } = useReactFlow();
  const connection = useConnection();
  const [isVisible, setIsVisible] = React.useState(false);
  const isConnecting = connection.inProgress;

  const outline = data.outline || { enabled: false };
  const addControls = `transition-opacity duration-200 ${
    selected ? "opacity-100" : "opacity-0 pointer-events-none group-hover:opacity-100 group-hover:pointer-events-auto"
  }`;

  React.useEffect(() => {
    requestAnimationFrame(() => setIsVisible(true));
  }, []);

  const columns =
    Array.isArray(data?.columns) && data.columns.length > 0
      ? data.columns
      : DEFAULT_COLUMNS;
  const rows = Array.isArray(data?.rows) ? data.rows : DEFAULT_ROWS;

  const update = (nextColumns, nextRows) => {
    setNodes((nodes) =>
      nodes.map((n) =>
        n.id === id
          ? {
              ...n,
              data: {
                ...n.data,
                columns: nextColumns ?? n.data.columns ?? columns,
                rows: nextRows ?? n.data.rows ?? rows,
              },
            }
          : n,
      ),
    );
  };

  const handleHeaderChange = (colIndex, value) => {
    const next = columns.map((c, i) => (i === colIndex ? value : c));
    update(next, null);
  };

  const handleCellChange = (rowIndex, colIndex, value) => {
    const next = rows.map((row, r) =>
      r === rowIndex ? row.map((cell, c) => (c === colIndex ? value : cell)) : row,
    );
    update(null, next);
  };

  const handleAddColumn = () => {
    const nextColumns = [...columns, `Column ${columns.length + 1}`];
    const nextRows = rows.map((row) => [...row, ""]);
    update(nextColumns, nextRows);
  };

  const handleRemoveColumn = (colIndex) => {
    if (columns.length <= 1) return;
    const nextColumns = columns.filter((_, i) => i !== colIndex);
    const nextRows = rows.map((row) => row.filter((_, i) => i !== colIndex));
    update(nextColumns, nextRows);
  };

  const handleAddRow = () => {
    const nextRows = [...rows, columns.map(() => "")];
    update(null, nextRows);
  };

  const handleRemoveRow = (rowIndex) => {
    if (rows.length <= 1) return;
    const nextRows = rows.filter((_, i) => i !== rowIndex);
    update(null, nextRows);
  };

  const handleReactionClick = (emoji) => {
    setNodes((nodes) =>
      nodes.map((n) => {
        if (n.id === id) {
          const currentReactions = n.data.reactions || {};
          const newCount = (currentReactions[emoji] || 0) + 1;
          return {
            ...n,
            data: {
              ...n.data,
              reactions: {
                ...currentReactions,
                [emoji]: newCount,
              },
            },
          };
        }
        return n;
      }),
    );
  };

  return (
    <>
      <div
        className={`
            node-chrome relative flex flex-col w-full h-full min-h-[120px] min-w-[338px] group
            transition-all duration-300 ease-out
            ${selected ? "border-2 border-foreground" : "border-2 border-transparent hover:border-border"}
            ${dragging ? "shadow-2xl shadow-black/50 z-50" : ""}
            ${isVisible ? "opacity-100 translate-y-0 scale-100" : "opacity-0 translate-y-2 scale-95"}
        `}
        style={{
          backgroundColor: data.backgroundColor || "var(--node-default)",
          ...(outline.enabled
            ? {
                borderColor: outline.color,
              }
            : {}),
        }}
      >
        <NodeResizeControl
          minWidth={338}
          minHeight={120}
          className="!bg-transparent !border-none"
          position="bottom-right"
          style={{
            opacity: 1,
            pointerEvents: "all",
          }}
          onResizeEnd={(_, params) => {
            setNodes((nodes) =>
              nodes.map((n) => {
                if (n.id === id) {
                  return {
                    ...n,
                    width: Math.round(params.width / 15) * 15,
                    height: Math.round(params.height / 15) * 15,
                    position: {
                      x: Math.round(params.x / 15) * 15,
                      y: Math.round(params.y / 15) * 15,
                    },
                  };
                }
                return n;
              }),
            );
          }}
        >
          <div
            className={`transition-opacity duration-200 ${selected ? "opacity-100" : "opacity-0 group-hover:opacity-100"}`}
          >
            <ResizeHandle />
          </div>
        </NodeResizeControl>

        {outline.enabled && (
          <div
            className="flex items-center gap-2 h-5 absolute left-4 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider text-background shadow-sm transform -translate-y-1/2 transition-all duration-300"
            style={{ backgroundColor: outline.color }}
          >
            {outline.name}
          </div>
        )}

        <div className="flex-1 w-full h-full overflow-auto nopan nowheel scrollbar-subtle flex flex-col">
          <table className="border-collapse w-full">
            <thead>
              <tr className="border-b border-foreground/15 bg-foreground/[0.04]">
                {columns.map((col, colIndex) => (
                  <th
                    key={colIndex}
                    className="relative px-3 py-2 min-w-[72px] border-r border-foreground/10 last:border-r-0 group/col"
                  >
                    <TextEditingTrait>
                      <input
                        type="text"
                        value={col}
                        size={cellSize(col)}
                        onChange={(e) =>
                          handleHeaderChange(colIndex, e.target.value)
                        }
                        placeholder="Header"
                        className="w-full field-sizing-content bg-transparent text-muted-foreground text-xs font-medium text-left focus:outline-none placeholder:text-muted-foreground"
                      />
                    </TextEditingTrait>
                    {columns.length > 1 && (
                      <button
                        type="button"
                        onClick={() => handleRemoveColumn(colIndex)}
                        className="nodrag absolute -top-2 left-1/2 -translate-x-1/2 w-4 h-4 rounded-full bg-surface-hover text-foreground hover:bg-red-500 hover:text-white flex items-center justify-center opacity-0 group-hover/col:opacity-100 transition-opacity"
                        title="Delete column"
                      >
                        <X className="w-2.5 h-2.5" />
                      </button>
                    )}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((row, rowIndex) => (
                <tr
                  key={rowIndex}
                  className="group/row border-b border-foreground/10 last:border-b-0 transition-colors hover:bg-foreground/[0.03]"
                >
                  {columns.map((_, colIndex) => (
                    <td
                      key={colIndex}
                      className="relative px-3 py-2 border-r border-foreground/10 last:border-r-0"
                    >
                      <TextEditingTrait>
                        <input
                          type="text"
                          value={row[colIndex] ?? ""}
                          size={cellSize(row[colIndex])}
                          onChange={(e) =>
                            handleCellChange(rowIndex, colIndex, e.target.value)
                          }
                          className={`w-full field-sizing-content bg-transparent text-foreground text-xs focus:outline-none placeholder:text-muted-foreground ${colIndex === 0 ? "font-medium" : ""}`}
                        />
                      </TextEditingTrait>
                      {colIndex === 0 && rows.length > 1 && (
                        <button
                          type="button"
                          onClick={() => handleRemoveRow(rowIndex)}
                          className="nodrag absolute top-1/2 -left-2 -translate-y-1/2 w-4 h-4 rounded-full bg-surface-hover text-foreground hover:bg-red-500 hover:text-white flex items-center justify-center opacity-0 group-hover/row:opacity-100 transition-opacity"
                          title="Delete row"
                        >
                          <X className="w-2.5 h-2.5" />
                        </button>
                      )}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>

        </div>

        {/* Add row / column strips sit just outside the table and appear on hover, so the resting table has no empty band. */}
        <div className={`absolute left-0 right-6 top-full pt-1 ${addControls}`}>
          <button type="button" onClick={handleAddRow} title="Add row" className={ADD_STRIP}>
            <Plus className="w-3 h-3" />
            Row
          </button>
        </div>
        <div className={`absolute top-0 bottom-6 left-full pl-1 ${addControls}`}>
          <button type="button" onClick={handleAddColumn} title="Add column" className={`${ADD_STRIP} w-6`}>
            <Plus className="w-3 h-3" />
          </button>
        </div>

        <Reactions
          reactions={data.reactions}
          onReactionClick={handleReactionClick}
        />

        <Handle
          type="target"
          position={Position.Center}
          className={`
            !w-full !h-full !border-0 !rounded-none !bg-transparent absolute !inset-0 !transform-none
            ${isConnecting ? "pointer-events-auto z-50" : "pointer-events-none -z-10"}
          `}
          style={{
            top: 0,
            left: 0,
            opacity: 0,
          }}
        />
        <Handle
          type="source"
          position={Position.Right}
          className={`
    !w-2 !h-2 !bg-foreground !border-0
    absolute !top-0 !-right-[1px]
    flex items-center justify-center

    origin-top-right
    transition-transform duration-200 hover:scale-[2.5]

    !translate-x-0 !translate-y-0
    group/handle
    ${selected ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"}
  `}
        >
          <ArrowRight className="w-[10px] h-[10px] opacity-0 group-hover/handle:opacity-100 transition-opacity duration-200 text-background -rotate-45" />
        </Handle>
      </div>
    </>
  );
};

export default memo(TableNode);
