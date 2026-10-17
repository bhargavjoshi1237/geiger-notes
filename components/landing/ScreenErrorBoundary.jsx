"use client";

import React from "react";
import { TriangleAlert } from "lucide-react";

// The playground runs the real workspace screens on the public landing page, so
// one screen tripping over unexpected data must not take the page down with it.
// Give it a `key` (the tab) so switching tabs resets it.
//
// Notes has no screen kit, so the fallback stays plain markup sized for the canvas.
export class ScreenErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { failed: false };
  }

  static getDerivedStateFromError() {
    return { failed: true };
  }

  componentDidCatch(error) {
    console.error("[playground] screen failed to render", error);
  }

  render() {
    if (!this.state.failed) return this.props.children;

    const title = this.props.title || "This screen";
    return (
      <div className="flex h-screen w-screen items-center justify-center bg-background p-8">
        <div className="flex max-w-sm flex-col items-center gap-3 rounded-2xl border border-dashed border-border p-8 text-center">
          <TriangleAlert className="h-6 w-6 text-muted-foreground" />
          <p className="font-medium text-foreground">{title} couldn&apos;t load in the playground</p>
          <p className="text-sm text-muted-foreground">
            Reload the playground, or open Geiger Notes to see it with your own boards.
          </p>
        </div>
      </div>
    );
  }
}

export default ScreenErrorBoundary;
