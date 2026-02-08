"use client";

import React from "react";
import { ArrowLeft } from "lucide-react";

/**
 * SidebarButton
 * Minimalist version.
 * - Removes bold borders and glows.
 * - Relies on subtle background shifts for hover.
 * - Tooltip is understated and precise.
 */
export const SidebarButton = React.forwardRef(
  (
    { icon: Icon, label, active, onClick, className, children, ...props },
    ref,
  ) => {
    return (
      <button
        ref={ref}
        onClick={onClick}
        type="button"
        className={`
          relative group flex items-center justify-center p-2 rounded-lg
          transition-colors duration-200 ease-in-out
          outline-none
          
          text-zinc-500 hover:text-zinc-900 
          hover:bg-zinc-800 
          
          dark:text-zinc-400 dark:hover:text-zinc-100 
          dark:hover:bg-zinc-800
          
          ${
            active
              ? "bg-zinc-200/50 text-zinc-900 dark:bg-zinc-800/80 dark:text-zinc-50"
              : "bg-transparent"
          }

          ${className || ""}
        `}
        {...props}
      >
        <div className="flex items-center justify-center relative z-10">
          {children || (Icon && <Icon className="w-5 h-5" strokeWidth={1.5} />)}
        </div>
      </button>
    );
  },
);

SidebarButton.displayName = "SidebarButton";

export const SidebarHeader = ({ onBack, label = "Back" }) => (
  <div className="w-full flex flex-col items-center pt-4 pb-2">
    <div className="w-full flex justify-center mb-2">
      <SidebarButton
        icon={ArrowLeft}
        label={label}
        onClick={onBack}
        className="w-10 h-10 bg-zinc-800/40 text-zinc-400 hover:text-zinc-100 hover:bg-zinc-700/60 border border-transparent hover:border-zinc-700"
      />
    </div>
  </div>
);

export const SidebarSection = ({ children, className = "" }) => (
  <div className={`flex flex-col gap-3 w-full items-center px-2 ${className}`}>
    {children}
  </div>
);

export const SidebarShell = ({ children, onBack, title }) => (
  <div className="flex flex-col w-full h-full bg-transparent transition-colors duration-300">
    <SidebarHeader onBack={onBack} label={title} />
    <nav className="flex-1 overflow-y-auto py-2 scrollbar-none">
      <SidebarSection>{children}</SidebarSection>
    </nav>
  </div>
);
