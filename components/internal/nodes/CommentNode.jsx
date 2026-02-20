import React, { memo } from "react";
import { Handle, Position, useReactFlow } from "@xyflow/react";
import { ArrowRight, Send } from "lucide-react";
import Reactions from "../ui/Reactions";
import TextEditingTrait from "./traits/TextEditingTrait";

const Avatar = ({ initials, className }) => (
  <div
    className={`w-8 h-8 rounded-full bg-[#FACC15] text-black flex items-center justify-center text-xs font-bold ${className}`}
  >
    {initials}
  </div>
);

const CommentNode = ({ id, data, selected }) => {
  const { setNodes } = useReactFlow();
  const [comment, setComment] = React.useState(data?.label || "");

  React.useEffect(() => {
    setComment(data?.label || "");
  }, [data?.label]);

  const handleChange = (e) => {
    setComment(e.target.value);
  };

  const handleSend = () => {
    setNodes((nodes) =>
      nodes.map((n) => {
        if (n.id === id) {
          return {
            ...n,
            data: {
              ...n.data,
              label: comment,
            },
          };
        }
        return n;
      }),
    );
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
    <div className="relative group">
      <div
        className={`
          relative flex items-center p-3 gap-3 min-w-[300px] bg-[#2A3441] rounded-lg shadow-lg transition-all duration-200
          ${selected ? "ring-2 ring-blue-500" : "hover:ring-1 hover:ring-zinc-600"}
        `}
      >
        <Avatar initials="JJ" className="shrink-0" />

        <div className="flex-1 relative flex items-center">
          <TextEditingTrait
            className="w-full"
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                handleSend();
              }
            }}
          >
            <input
              type="text"
              className="w-full bg-[#3B4654] text-zinc-200 text-sm rounded px-3 py-2 pr-10 focus:outline-none focus:ring-1 focus:ring-zinc-500 placeholder:text-zinc-500"
              placeholder="Write a comment..."
              value={comment}
              onChange={handleChange}
            />
          </TextEditingTrait>
          <button
            onClick={handleSend}
            className="absolute right-2 text-blue-400 hover:text-blue-300 text-xs font-medium transition-colors"
          >
            Send
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
      <Reactions
        reactions={data.reactions}
        onReactionClick={handleReactionClick}
      />
    </div>
  );
};

export default memo(CommentNode);
