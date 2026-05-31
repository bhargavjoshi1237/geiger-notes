import React, { memo } from "react";
import { Handle, Position, useReactFlow } from "@xyflow/react";
import { Check, Plus, X } from "lucide-react";
import TextEditingTrait from "./traits/TextEditingTrait";

let itemCounter = 0;
const makeItemId = () => `todo-${Date.now()}-${itemCounter++}`;

const CheckboxNode = ({ id, data, selected }) => {
  const { setNodes } = useReactFlow();

  const title = data?.title ?? "To-do";
  const items =
    Array.isArray(data?.items) && data.items.length > 0
      ? data.items
      : [{ id: "todo-default", text: "New task", checked: false }];

  const updateData = (updater) => {
    setNodes((nodes) =>
      nodes.map((n) =>
        n.id === id ? { ...n, data: { ...n.data, ...updater(n.data) } } : n,
      ),
    );
  };

  const handleTitleChange = (e) => {
    const value = e.target.value;
    updateData(() => ({ title: value }));
  };

  const handleToggle = (itemId) => {
    updateData((d) => ({
      items: (d.items || items).map((it) =>
        it.id === itemId ? { ...it, checked: !it.checked } : it,
      ),
    }));
  };

  const handleTextChange = (itemId, value) => {
    updateData((d) => ({
      items: (d.items || items).map((it) =>
        it.id === itemId ? { ...it, text: value } : it,
      ),
    }));
  };

  const handleAddItem = () => {
    updateData((d) => ({
      items: [
        ...(d.items || items),
        { id: makeItemId(), text: "", checked: false },
      ],
    }));
  };

  const handleRemoveItem = (itemId) => {
    updateData((d) => {
      const next = (d.items || items).filter((it) => it.id !== itemId);
      return { items: next };
    });
  };

  const completed = items.filter((it) => it.checked).length;

  return (
    <div className="relative group">
      <div
        className={`
          flex flex-col min-w-[260px] max-w-[360px] bg-[#2a2a2a] rounded-xl shadow-lg overflow-hidden transition-all duration-200
          ${selected ? "ring-2 ring-white" : "ring-1 ring-transparent hover:ring-zinc-600"}
        `}
      >
        <div className="flex items-center justify-between gap-2 px-3 pt-3 pb-2 border-b border-[#3a3a3a]">
          <TextEditingTrait className="flex-1">
            <input
              type="text"
              value={title}
              onChange={handleTitleChange}
              placeholder="Untitled list"
              className="w-full bg-transparent text-zinc-100 text-sm font-semibold focus:outline-none placeholder:text-zinc-500"
            />
          </TextEditingTrait>
          <span className="shrink-0 text-[11px] text-zinc-500 tabular-nums">
            {completed}/{items.length}
          </span>
        </div>

        <div className="flex flex-col py-1.5">
          {items.map((item) => (
            <div
              key={item.id}
              className="flex items-center gap-2.5 px-3 py-1.5 group/item"
            >
              <button
                type="button"
                onClick={() => handleToggle(item.id)}
                className={`
                  nodrag shrink-0 w-[18px] h-[18px] rounded-[5px] border flex items-center justify-center transition-colors
                  ${
                    item.checked
                      ? "bg-emerald-500 border-emerald-500 text-black"
                      : "border-zinc-600 text-transparent hover:border-zinc-400"
                  }
                `}
              >
                <Check className="w-3 h-3" strokeWidth={3} />
              </button>

              <TextEditingTrait className="flex-1">
                <input
                  type="text"
                  value={item.text}
                  onChange={(e) => handleTextChange(item.id, e.target.value)}
                  placeholder="Add a task..."
                  className={`
                    w-full bg-transparent text-sm focus:outline-none placeholder:text-zinc-600
                    ${item.checked ? "text-zinc-500 line-through" : "text-zinc-200"}
                  `}
                />
              </TextEditingTrait>

              <button
                type="button"
                onClick={() => handleRemoveItem(item.id)}
                className="nodrag shrink-0 text-zinc-600 hover:text-red-400 opacity-0 group-hover/item:opacity-100 transition-opacity"
                title="Remove"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          ))}
        </div>

        <button
          type="button"
          onClick={handleAddItem}
          className="nodrag flex items-center gap-1.5 px-3 py-2 text-xs text-zinc-500 hover:text-zinc-200 border-t border-[#3a3a3a] transition-colors"
        >
          <Plus className="w-3.5 h-3.5" />
          Add item
        </button>
      </div>

      <Handle
        type="target"
        position={Position.Left}
        className="!w-2 !h-2 !bg-zinc-500 !border-0 opacity-0 group-hover:opacity-100 transition-opacity"
      />
      <Handle
        type="source"
        position={Position.Right}
        className="!w-2 !h-2 !bg-zinc-500 !border-0 opacity-0 group-hover:opacity-100 transition-opacity"
      />
    </div>
  );
};

export default memo(CheckboxNode);
