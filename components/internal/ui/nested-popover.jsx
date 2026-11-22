"use client";

import React from "react";
import { PopoverAnchor } from "@geiger/ui";

// A popover opened from inside another popover sits beside its parent, centred on it, with the rail's 14px gap.
export const NESTED_POPOVER = { side: "right", align: "center", sideOffset: 14, collisionPadding: 16 };

// The box of the popover the trigger lives in, or the trigger itself when it isn't inside one.
function parentBox(triggerRef) {
  const trigger = triggerRef.current;
  const parent = trigger?.closest("[data-radix-popper-content-wrapper]")?.firstElementChild;
  return (parent || trigger)?.getBoundingClientRect() ?? new DOMRect();
}

// Anchors a nested popover to the popover its trigger lives in. Put `ref={triggerRef}` on the
// PopoverTrigger and render `anchor` inside the same Popover. The virtual element is rebuilt each
// render so it re-claims the anchor after Radix remounts the trigger (otherwise it can stick to a
// detached node and open in the corner).
export function useNestedAnchor() {
  const triggerRef = React.useRef(null);
  const virtualRef = { current: { getBoundingClientRect: () => parentBox(triggerRef) } };
  return { triggerRef, anchor: <PopoverAnchor virtualRef={virtualRef} /> };
}
