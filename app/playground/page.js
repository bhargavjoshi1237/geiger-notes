import NotesPlaygroundLoader from "@/components/landing/NotesPlaygroundLoader";

// The landing-page playground on its own route, so the showcase embeds it in an
// iframe that keeps the canvas's dialogs, menus and toasts inside the card.
export const metadata = {
  title: "Notes Playground - Geiger Studio",
  robots: { index: false, follow: false },
};

export default function NotesPlaygroundPage() {
  return (
    <div className="h-[100dvh] w-full overflow-hidden bg-background">
      <NotesPlaygroundLoader />
    </div>
  );
}
