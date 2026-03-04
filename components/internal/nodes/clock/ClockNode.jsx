import React, { memo, useEffect, useState, useRef } from "react";
import {
  Handle,
  Position,
  NodeResizeControl,
  useReactFlow,
  useConnection,
} from "@xyflow/react";
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

const ClockNode = ({ id, data, selected, dragging }) => {
  const { setNodes } = useReactFlow();
  const connection = useConnection();
  const [isVisible, setIsVisible] = useState(false);
  const isConnecting = connection.inProgress;

  const [time, setTime] = useState(new Date());
  const frameRef = useRef();

  useEffect(() => {
    requestAnimationFrame(() => setIsVisible(true));
  }, []);

  const clockType = data.clockType || "analog";
  const movement = data.movement || "smooth";
  const showSeconds = data.showSeconds !== false;
  const showBackground = data.showBackground !== false;

  useEffect(() => {
    if (clockType === "analog") {
      setNodes((nds) =>
        nds.map((n) => {
          if (n.id === id) {
            const w = n.width;
            const h = n.height;
            if (w && h && w !== h) {
              const max = Math.max(w, h);
              return {
                ...n,
                width: max,
                height: max,
              };
            }
          }
          return n;
        }),
      );
    }
  }, [clockType, id, setNodes]);

  useEffect(() => {
    const updateClock = () => {
      setTime(new Date());
      if (clockType === "analog" && movement === "smooth") {
        frameRef.current = requestAnimationFrame(updateClock);
      } else {
        setTimeout(() => {
          frameRef.current = requestAnimationFrame(updateClock);
        }, 100);
      }
    };
    frameRef.current = requestAnimationFrame(updateClock);

    return () => cancelAnimationFrame(frameRef.current);
  }, [clockType, movement]);

  const bgColor =
    clockType === "analog"
      ? data.backgroundColor || "#232323"
      : data.digitalBackgroundColor || "#232323";
  const clockFaceColor = data.clockFaceColor || "rgba(0,0,0,0.2)";
  const hourHandColor = data.hourHandColor || "#555";
  const minuteHandColor = data.minuteHandColor || "#666";
  const secondHandColor = data.secondHandColor || "#ff8da1";
  const centerDotColor = data.centerDotColor || "#333";
  const borderColor = data.borderColor || "rgba(0,0,0,0.1)";

  const digitalTextColor = data.digitalTextColor || "#ffffff";
  const digitalDateColor = data.digitalDateColor || "#a1a1aa";
  const digitalShowDate = data.digitalShowDate !== false;
  const digitalShowSeconds = data.digitalShowSeconds !== false;
  const circularSeconds = data.circularSeconds || false;
  const digitalFontSize = data.digitalFontSize || "medium";

  const hours = time.getHours();
  const minutes = time.getMinutes();
  const seconds = time.getSeconds();
  const milliseconds = time.getMilliseconds();

  const secondDeg =
    movement === "smooth" ? (seconds + milliseconds / 1000) * 6 : seconds * 6;
  const minuteDeg = (minutes + seconds / 60) * 6;
  const hourDeg = ((hours % 12) + minutes / 60) * 30;

  const formattedTime = time.toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });

  const hourMarkers = data.hourMarkers || "none";
  const numbers = data.numbers || "none";

  const renderMarkers = () => {
    if (hourMarkers === "none") return null;
    const showAll = hourMarkers === "all";
    const markers = [];
    for (let i = 1; i <= 12; i++) {
      if (!showAll && i % 3 !== 0) continue;
      markers.push(
        <div
          key={`marker-${i}`}
          className="absolute left-1/2 top-1/2 origin-center"
          style={{
            width: i % 3 === 0 ? "4px" : "2px",
            height: "100%",
            transform: `translate(-50%, -50%) rotate(${i * 30}deg)`,
          }}
        >
          <div
            className="mx-auto rounded-full"
            style={{
              width: "100%",
              height: i % 3 === 0 ? "8px" : "4px",
              backgroundColor: hourHandColor,
              marginTop: "2px",
            }}
          />
        </div>,
      );
    }
    return markers;
  };

  const renderNumbers = () => {
    if (numbers === "none") return null;
    const showAll = numbers === "all";
    const nums = [];
    for (let i = 1; i <= 12; i++) {
      if (!showAll && i % 3 !== 0) continue;
      const angle = i * 30 * (Math.PI / 180);
      const radius = 38;
      const x = 50 + radius * Math.sin(angle);
      const y = 50 - radius * Math.cos(angle);
      nums.push(
        <div
          key={`num-${i}`}
          className="absolute font-semibold text-center transform -translate-x-1/2 -translate-y-1/2 leading-none"
          style={{
            left: `${x}%`,
            top: `${y}%`,
            color: hourHandColor,
            fontSize: "12px",
          }}
        >
          {i}
        </div>,
      );
    }
    return nums;
  };

  return (
    <>
      <div
        className={`
            relative flex flex-col w-full h-full min-h-[100px] min-w-[100px] group
            transition-all duration-300 ease-out 
            ${showBackground ? "rounded-xl" : "rounded-full"}
            ${showBackground ? (selected ? "ring-2 ring-white ring-offset-2 ring-offset-[#1e1e1e]" : "ring-2 ring-transparent hover:ring-zinc-600") : ""}
            ${dragging ? "shadow-2xl shadow-black/50 z-50" : ""}
            ${isVisible ? "opacity-100 translate-y-0 scale-100" : "opacity-0 translate-y-2 scale-95"}
        `}
        style={{
          background: showBackground ? bgColor : "transparent",
        }}
      >
        <NodeResizeControl
          minWidth={100}
          minHeight={100}
          keepAspectRatio={clockType === "analog"}
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
                  let w = params.width;
                  let h = params.height;
                  if (clockType === "analog") {
                    const size = Math.max(w, h);
                    w = size;
                    h = size;
                  }
                  return {
                    ...n,
                    width: Math.round(w / 15) * 15,
                    height: Math.round(h / 15) * 15,
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

        <div
          className={`flex-1 w-full h-full overflow-hidden flex items-center justify-center ${showBackground ? "p-4" : "p-0"}`}
        >
          {clockType === "analog" ? (
            <div className="relative w-full h-full min-w-[120px] min-h-[120px] aspect-square max-w-[min(100%,100%)] max-h-[min(100%,100%)] flex items-center justify-center">
              <div
                className="absolute inset-0 rounded-full shadow-[inset_0_2px_10px_rgba(0,0,0,0.5)] border-[4px]"
                style={{
                  backgroundColor: clockFaceColor,
                  borderColor: borderColor,
                }}
              >
                {renderMarkers()}
                {renderNumbers()}
                <div
                  className="absolute left-1/2 bottom-1/2 w-[6px] rounded-full origin-bottom"
                  style={{
                    height: "25%",
                    backgroundColor: hourHandColor,
                    transform: `translateX(-50%) rotate(${hourDeg}deg)`,
                  }}
                />
                <div
                  className="absolute left-1/2 bottom-1/2 w-[4px] rounded-full origin-bottom"
                  style={{
                    height: "35%",
                    backgroundColor: minuteHandColor,
                    transform: `translateX(-50%) rotate(${minuteDeg}deg)`,
                  }}
                />
                {showSeconds && (
                  <div
                    className="absolute left-1/2 bottom-1/2 w-[2px] rounded-full origin-bottom"
                    style={{
                      height: "40%",
                      backgroundColor: secondHandColor,
                      transform: `translateX(-50%) rotate(${secondDeg}deg)`,
                    }}
                  />
                )}

                <div
                  className="absolute left-1/2 top-1/2 w-4 h-4 rounded-full border-2 -translate-x-1/2 -translate-y-1/2 z-10"
                  style={{
                    backgroundColor: centerDotColor,
                    borderColor: hourHandColor,
                  }}
                />
              </div>
            </div>
          ) : (
            <div
              className={`relative flex flex-col items-center justify-center text-center w-full h-full ${circularSeconds ? "p-4" : ""}`}
            >
              {circularSeconds && (
                <>
                  <div
                    className={`absolute inset-[8px] pointer-events-none ${showBackground ? "rounded-[12px]" : "rounded-full"}`}
                    style={{
                      padding: "4px",
                      background: "rgba(255,255,255,0.06)",
                      WebkitMask:
                        "linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)",
                      WebkitMaskComposite: "xor",
                      maskComposite: "exclude",
                    }}
                  />
                  <div
                    className={`absolute inset-[8px] pointer-events-none ${showBackground ? "rounded-[12px]" : "rounded-full"}`}
                    style={{
                      padding: "4px",
                      background: `conic-gradient(from 0deg, ${secondHandColor || "#ff8da1"} ${((seconds + milliseconds / 1000) / 60) * 360}deg, transparent 0deg)`,
                      WebkitMask:
                        "linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)",
                      WebkitMaskComposite: "xor",
                      maskComposite: "exclude",
                    }}
                  />
                </>
              )}
              <div
                className={`font-black tracking-wider drop-shadow-lg tabular-nums ${
                  digitalFontSize === "small"
                    ? "text-3xl md:text-4xl lg:text-5xl"
                    : digitalFontSize === "large"
                      ? "text-5xl md:text-6xl lg:text-7xl"
                      : "text-4xl md:text-5xl lg:text-6xl"
                }`}
                style={{ color: digitalTextColor }}
              >
                {time.toLocaleTimeString([], {
                  hour: "2-digit",
                  minute: "2-digit",
                  ...(digitalShowSeconds ? { second: "2-digit" } : {}),
                })}
              </div>
              {digitalShowDate && (
                <div
                  className={`mt-2 uppercase tracking-widest font-semibold ${
                    digitalFontSize === "small"
                      ? "text-[10px]"
                      : digitalFontSize === "large"
                        ? "text-base"
                        : "text-sm"
                  }`}
                  style={{ color: digitalDateColor }}
                >
                  {time.toLocaleDateString(undefined, {
                    weekday: "short",
                    month: "short",
                    day: "numeric",
                  })}
                </div>
              )}
            </div>
          )}
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

export default memo(ClockNode);
