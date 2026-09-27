"use client";

import React from "react";

// Small uppercase group heading used to break a section into logical groups.
export function GroupLabel({ children, className = "" }) {
  return (
    <h4
      className={`text-[11px] font-semibold text-muted-foreground uppercase tracking-wider ${className}`}
    >
      {children}
    </h4>
  );
}
