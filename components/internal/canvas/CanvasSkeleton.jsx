import React from "react";

const CanvasSkeleton = () => {
  return (
    <div className="flex-1 relative h-full w-full bg-[#232323] overflow-hidden">
      <div
        className="absolute inset-0 opacity-10 pointer-events-none"
        style={{
          backgroundImage: "radial-gradient(#999 1px, transparent 1px)",
          backgroundSize: "20px 20px",
        }}
      />

      <div className="absolute inset-0 flex items-center -mt-20 justify-center pointer-events-none">
        <img
          src={`${process.env.NEXT_PUBLIC_BASE_PATH || ""}/logo1.svg`}
          alt=""
          className="w-28 h-28 grayscale brightness-0 invert"
          style={{
            animation: "pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite",
            opacity: 0.05,
          }}
        />
      </div>

      <div className="absolute bottom-10 right-10 flex items-center gap-2 text-zinc-500 text-sm font-medium animate-pulse">
        <div className="w-2 h-2 rounded-full bg-blue-500 animate-bounce"></div>
        Loading Canvas...
      </div>
    </div>
  );
};

export default CanvasSkeleton;
