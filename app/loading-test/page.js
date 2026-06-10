import CanvasSkeleton from "@/components/internal/canvas/CanvasSkeleton";

export const metadata = {
  title: "Loading Test - Geiger Notes",
};

export default function LoadingTestPage() {
  return (
    <main className="h-screen w-screen overflow-hidden bg-background text-foreground">
      <CanvasSkeleton />
    </main>
  );
}
