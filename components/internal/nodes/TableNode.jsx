import React, { memo } from "react";
import { Handle, Position, useReactFlow } from "@xyflow/react";
import { Plus, X } from "lucide-react";
import TextEditingTrait from "./traits/TextEditingTrait";

const DEFAULT_COLUMNS = ["Column 1", "Column 2"];
const DEFAULT_ROWS = [
  ["", ""],
  ["", ""],
];

const TableNode = ({ id, data, selected }) => {
  const { setNodes } = useReactFlow();

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

  return (
    <div className="relative group">
      <div
        className={`
          bg-surface-hover rounded-xl shadow-lg overflow-hidden transition-all duration-200
          ${selected ? "ring-2 ring-foreground" : "ring-1 ring-transparent hover:ring-border"}
        `}
      >
        <table className="border-collapse">
          <thead>
            <tr>
              {columns.map((col, colIndex) => (
                <th
                  key={colIndex}
                  className="relative border border-border bg-surface-dialog px-2 py-1.5 min-w-[120px] group/col"
                >
                  <TextEditingTrait>
                    <input
                      type="text"
                      value={col}
                      onChange={(e) =>
                        handleHeaderChange(colIndex, e.target.value)
                      }
                      placeholder="Header"
                      className="w-full bg-transparent text-foreground text-xs font-semibold text-left focus:outline-none placeholder:text-muted-foreground"
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
              <tr key={rowIndex} className="group/row">
                {columns.map((_, colIndex) => (
                  <td
                    key={colIndex}
                    className="relative border border-border px-2 py-1.5"
                  >
                    <TextEditingTrait>
                      <input
                        type="text"
                        value={row[colIndex] ?? ""}
                        onChange={(e) =>
                          handleCellChange(rowIndex, colIndex, e.target.value)
                        }
                        className="w-full bg-transparent text-foreground text-xs focus:outline-none placeholder:text-muted-foreground"
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

        <div className="flex border-t border-border">
          <button
            type="button"
            onClick={handleAddRow}
            className="nodrag flex-1 flex items-center justify-center gap-1 py-1.5 text-[11px] text-muted-foreground hover:text-foreground hover:bg-node-default transition-colors"
          >
            <Plus className="w-3 h-3" />
            Row
          </button>
          <div className="w-px bg-border" />
          <button
            type="button"
            onClick={handleAddColumn}
            className="nodrag flex-1 flex items-center justify-center gap-1 py-1.5 text-[11px] text-muted-foreground hover:text-foreground hover:bg-node-default transition-colors"
          >
            <Plus className="w-3 h-3" />
            Column
          </button>
        </div>
      </div>

      <Handle
        type="target"
        position={Position.Left}
        className="!w-2 !h-2 !bg-muted-foreground !border-0 opacity-0 group-hover:opacity-100 transition-opacity"
      />
      <Handle
        type="source"
        position={Position.Right}
        className="!w-2 !h-2 !bg-muted-foreground !border-0 opacity-0 group-hover:opacity-100 transition-opacity"
      />
    </div>
  );
};

export default memo(TableNode);
