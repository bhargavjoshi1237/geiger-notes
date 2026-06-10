"use client";

import React from "react";
import { ArrowLeft } from "lucide-react";

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
          
          text-muted-foreground hover:text-foreground
          hover:bg-surface-hover
          
          ${
            active
              ? "bg-surface-active text-foreground"
              : "bg-transparent"
          }

          ${className || ""}
        `}
        {...props}
      >
        <div className="flex items-center justify-center relative z-10">
          {children || (Icon && <Icon className="w-5 h-5" strokeWidth={1.75} />)}
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
        className="w-10 h-10 bg-surface-active/40 text-muted-foreground hover:text-foreground hover:bg-surface-hover border border-transparent hover:border-divider"
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
