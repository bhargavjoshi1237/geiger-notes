// The landing page's live playground card: the app's own /playground route in an
// iframe, so the workspace's portalled dialogs, menus and toasts stay inside the card.
// It mounts straight away with no skeleton; the route paints its own canvas frame.
//
// `src` is the full path including the app's base path (e.g. "/assets/playground"),
// so geiger-dash can embed any app's playground through its product rewrites.
export function PlaygroundFrame({ src, title, className = "" }) {
  return (
    <div
      className={`relative h-[640px] overflow-hidden rounded-lg border border-border bg-background sm:h-[700px] lg:h-[860px] ${className}`}
    >
      <iframe src={src} title={title} className="block h-full w-full border-0" />
    </div>
  );
}

export default PlaygroundFrame;
