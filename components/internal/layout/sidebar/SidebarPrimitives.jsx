"use client";

import React from "react";
import { ArrowLeft } from "lucide-react";

/**
 * SidebarButton
 * Minimalist version — geiger-flow color palette.
 * Uses transparent bg with subtle #2a2a2a hover states.
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
          
          text-[#a3a3a3] hover:text-[#e7e7e7]
          hover:bg-[#2a2a2a]
          
          ${
            active
              ? "bg-[#242424] text-white"
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
        className="w-10 h-10 bg-[#242424]/40 text-[#a3a3a3] hover:text-[#e7e7e7] hover:bg-[#2a2a2a] border border-transparent hover:border-[#333333]"
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
