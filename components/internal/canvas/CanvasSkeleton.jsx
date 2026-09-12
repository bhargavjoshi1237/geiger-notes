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

      <div className="absolute inset-0 flex items-center -mt-20 justify-center pointer-events-none opacity-50">
        <LogoLoading size={96} />
      </div>
    </div>
  );
};

export default CanvasSkeleton;
