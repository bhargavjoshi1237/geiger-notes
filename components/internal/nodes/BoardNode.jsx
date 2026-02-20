import React, { memo } from "react";
import {
  Handle,
  Position,
  NodeResizeControl,
  useReactFlow,
  useConnection,
} from "@xyflow/react";
import * as LucideIcons from "lucide-react";
import { ArrowRight } from "lucide-react";

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

const BoardNode = ({ id, data, selected, dragging }) => {
  const { setNodes } = useReactFlow();
  const connection = useConnection();
  const [isVisible, setIsVisible] = React.useState(false);
  const isConnecting = connection.inProgress;

  React.useEffect(() => {
    requestAnimationFrame(() => setIsVisible(true));
  }, []);

  return (
    <>
      <div
        className={`
            relative flex flex-col w-full h-full min-h-[60px] min-w-[328px] group
            transition-all duration-300 ease-out
            ${selected ? "border-2 border-white" : "border-2 border-transparent hover:border-zinc-600"}
            ${dragging ? "shadow-2xl shadow-black/50 z-50" : ""}
            ${isVisible ? "opacity-100 translate-y-0 scale-100" : "opacity-0 translate-y-2 scale-95"}
        `}
        style={{
          backgroundColor: data.backgroundColor || "#1e1e1e",
        }}
      >
        <NodeResizeControl
          minWidth={328}
          minHeight={60}
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

        <div className="flex-1 w-full h-full overflow-hidden flex items-center px-4 gap-3">
          <div
            className="p-2 rounded-md shrink-0 flex items-center justify-center transition-colors"
            style={{
              backgroundColor:
                data.iconLightAccent || "rgba(168, 85, 247, 0.1)", // default purple-500/10
              color: data.iconDarkAccent || "#c084fc", // default purple-400
            }}
          >
            {(() => {
              const IconComp =
                LucideIcons[data.iconName] || LucideIcons.LayoutDashboard;
              return <IconComp className="w-5 h-5" />;
            })()}
          </div>
          <div className="flex flex-col min-w-0">
            <span className="text-zinc-200 font-medium text-sm truncate">
              {data.label || "Untitled Board"}
            </span>
            <span className="text-zinc-500 text-[10px] uppercase tracking-wider font-semibold truncate">
              {data.caption ? data.caption : "Double click to open"}
            </span>
          </div>
        </div>

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

        {/* Top Right Handle */}
        <Handle
          type="source"
          id="source-top-right"
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

        {/* Top Left Handle */}
        <Handle
          type="source"
          id="source-top-left"
          position={Position.Left}
          className={`
            !w-2 !h-2 !bg-zinc-100 !border-0
            absolute !top-0 !-left-[1px]
            flex items-center justify-center
            origin-top-left
            transition-transform duration-200 hover:scale-[2.5]
            !translate-x-0 !translate-y-0
            group/handle-tl
            ${selected ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"}
          `}
        >
          <ArrowRight className="w-[10px] h-[10px] opacity-0 group-hover/handle-tl:opacity-100 transition-opacity duration-200 text-black -rotate-[135deg]" />
        </Handle>

        <Handle
          type="source"
          id="source-bottom-left"
          position={Position.Left}
          className={`
            !w-2 !h-2 !bg-zinc-100 !border-0
            absolute !bottom-[-9] !-left-[1px] !top-auto
            flex items-center justify-center
            origin-bottom-left
            transition-transform duration-200 hover:scale-[2.5]
            !translate-x-0 !translate-y-0
            group/handle-bl
            ${selected ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"}
          `}
        >
          <ArrowRight className="w-[10px] h-[10px] opacity-0 group-hover/handle-bl:opacity-100 transition-opacity duration-200 text-black rotate-[135deg]" />
        </Handle>
      </div>
    </>
  );
};

export default memo(BoardNode);
