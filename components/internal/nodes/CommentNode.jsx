import React, { memo } from "react";
import {
  Handle,
  Position,
  NodeResizeControl,
  useReactFlow,
  useConnection,
} from "@xyflow/react";
import { ArrowRight } from "lucide-react";
import Reactions from "../ui/Reactions";
import CommentComposer, { useCommentAuthor } from "../ui/CommentComposer";
import ResizeHandle from "@/components/ui/ResizeHandle";

const CommentNode = ({ id, data, selected, dragging }) => {
  const { setNodes } = useReactFlow();
  const connection = useConnection();
  const [isVisible, setIsVisible] = React.useState(false);
  const isConnecting = connection.inProgress;

  const outline = data.outline || { enabled: false };

  const [comment, setComment] = React.useState(data?.label || "");
  const [lastLabel, setLastLabel] = React.useState(data?.label || "");
  const author = useCommentAuthor(data);

  React.useEffect(() => {
    requestAnimationFrame(() => setIsVisible(true));
  }, []);

  // Reset the draft when the stored comment changes elsewhere (e.g. realtime).
  if ((data?.label || "") !== lastLabel) {
    setLastLabel(data?.label || "");
    setComment(data?.label || "");
  }

  const handleSend = () => {
    const authorId = author.userId ?? data?.avatarUserId ?? null;
    const authorName = author.userName ?? data?.authorName ?? null;
    setNodes((nodes) =>
      nodes.map((n) => {
        if (n.id === id) {
          return {
            ...n,
            data: {
              ...n.data,
              label: comment,
              // Stamp the commenter so collaborators see their face, not ours.
              avatarUserId: authorId,
              authorName,
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
    <>
      <div
        className={`
            relative flex flex-col w-full h-full min-h-[68px] min-w-[300px] group rounded-lg
            transition-all duration-300 ease-out
            ${selected ? "border-2 border-foreground" : "border-2 border-transparent hover:border-border"}
            ${dragging ? "shadow-2xl shadow-black/50 z-50" : ""}
            ${isVisible ? "opacity-100 translate-y-0 scale-100" : "opacity-0 translate-y-2 scale-95"}
        `}
        style={{
          backgroundColor: data.backgroundColor || "var(--comment-bg)",
          ...(outline.enabled
            ? {
                borderColor: outline.color,
              }
            : {}),
        }}
      >
        <NodeResizeControl
          minWidth={300}
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

        {outline.enabled && (
          <div
            className="flex items-center gap-2 h-5 absolute left-4 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider text-background shadow-sm transform -translate-y-1/2 transition-all duration-300"
            style={{ backgroundColor: outline.color }}
          >
            {outline.name}
          </div>
        )}

        <div className="flex h-full w-full flex-1 items-center overflow-hidden">
          <CommentComposer
            author={author}
            value={comment}
            onChange={setComment}
            onSend={handleSend}
          />
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

export default memo(CommentNode);
