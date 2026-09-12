// The first frame of a workspace route. Pure SVG + CSS keyframes, so it paints
// straight out of the prerendered HTML before any JavaScript has loaded, and it
// is the same frame BoardCanvas shows while it boots — the loader never swaps
// treatments between the CDN shell and the mounted canvas.

import CanvasSkeleton from "@/components/internal/canvas/CanvasSkeleton";

export default function WorkspaceShell() {
  return (
    <div className="flex h-screen w-screen overflow-hidden bg-background">
      <CanvasSkeleton />
    </div>
  );
}
