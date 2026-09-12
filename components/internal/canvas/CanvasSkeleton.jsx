import { LogoLoading } from "@geiger/ui";

const CanvasSkeleton = () => {
  return (
    <div className="flex-1 relative h-full w-full bg-transparent overflow-hidden">
      <div
        className="absolute inset-0 opacity-10 pointer-events-none"
        style={{
          backgroundImage: "radial-gradient(var(--canvas-dots) 1px, transparent 1px)",
          backgroundSize: "20px 20px",
        }}
      />

      <div className="absolute inset-0 flex items-center -mt-20 justify-center pointer-events-none opacity-[0.16]">
        <LogoLoading size={112} />
      </div>

      <div className="absolute bottom-10 right-10 flex items-center gap-2 text-muted-foreground text-sm font-medium animate-pulse">
        <div className="w-2 h-2 rounded-full bg-blue-500 animate-bounce"></div>
        Loading Canvas...
      </div>
    </div>
  );
};

export default CanvasSkeleton;
