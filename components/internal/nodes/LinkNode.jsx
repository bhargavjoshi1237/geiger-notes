import React, { memo } from "react";
import {
  Handle,
  Position,
  NodeResizeControl,
  useReactFlow,
  useConnection,
} from "@xyflow/react";
import { Link, ArrowRight } from "lucide-react";
import Reactions from "../ui/Reactions";
import TextEditingTrait from "./traits/TextEditingTrait";

const ResizeHandle = () => {
  return (
    <div className="absolute bottom-1 right-1 p-1">
      <svg width="10" height="10" viewBox="0 0 10 10" className="opacity-50">
        <path
          d="M 6 10 L 10 6 L 10 10 Z"
          fill="currentColor"
          className="text-zinc-400"
        />
        <path
          d="M 2 10 L 10 2 L 10 4 L 4 10 Z"
          fill="currentColor"
          className="text-zinc-400"
        />
      </svg>
    </div>
  );
};

const LinkNode = ({ id, data, selected, dragging }) => {
  const { setNodes } = useReactFlow();
  const connection = useConnection();
  const [isVisible, setIsVisible] = React.useState(false);
  const isConnecting = connection.inProgress;

  React.useEffect(() => {
    requestAnimationFrame(() => setIsVisible(true));
  }, []);

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
            relative flex flex-col w-full h-full min-h-[68px] min-w-[338px] group
            transition-all duration-300 ease-out
            ${selected ? "border-2 border-white" : "border-2 border-transparent hover:border-zinc-600"}
            ${dragging ? "shadow-2xl shadow-black/50 z-50" : ""}
            ${isVisible ? "opacity-100 translate-y-0 scale-100" : "opacity-0 translate-y-2 scale-95"}
        `}
        style={{
          backgroundColor: data.backgroundColor || "#333333",
        }}
      >
        <NodeResizeControl
          minWidth={338}
          minHeight={68}
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

        <div className="flex-1 w-full h-full overflow-hidden flex items-center px-4">
          <Link className="w-5 h-5 text-zinc-500 mr-3 flex-shrink-0" />
          <TextEditingTrait className="w-full">
            <input
              className="w-full bg-transparent outline-none text-zinc-300 placeholder:text-zinc-600 font-sans"
              placeholder="Enter a link URL"
              value={data.url || ""}
              onChange={(evt) => {
                setNodes((nodes) =>
                  nodes.map((n) => {
                    if (n.id === id) {
                      return {
                        ...n,
                        data: {
                          ...n.data,
                          url: evt.target.value,
                        },
                      };
                    }
                    return n;
                  }),
                );
              }}
            />
          </TextEditingTrait>
        </div>

        <Reactions
          reactions={data.reactions}
          onReactionClick={handleReactionClick}
        />

        <Handle
          type="target"
          position={Position.Left}
          className={`
            !w-2 !h-full !border-0 !rounded-none !bg-transparent absolute !left-0 !top-0 !transform-none
            ${isConnecting ? "pointer-events-auto z-50" : "pointer-events-none -z-10"}
          `}
          style={{
            opacity: 0,
          }}
        />
        {/* Using Center handle for connection logic often seen in Milanote clones, 
             but CustomNode used Left/Right/Center. I'll stick to CustomNode's pattern mostly 
             but simpler for LinkNode as it usually connects from sides? 
             Actually CustomNode had a Center target handle covering the whole node 
             and a Right source handle. I will replicate that. */}

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
    !w-2 !h-2 !bg-zinc-100 !border-0
    absolute !top-0 !-right-[1px]
    flex items-center justify-center

    origin-top-right
    transition-transform duration-200 hover:scale-[2.5]

    !translate-x-0 !translate-y-0
    group/handle
    ${selected ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"}
  `}
        >
          <ArrowRight className="w-[10px] h-[10px] opacity-0 group-hover/handle:opacity-100 transition-opacity duration-200 text-black -rotate-45" />
        </Handle>
      </div>
    </>
  );
};

export default memo(LinkNode);
