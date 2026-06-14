"use client";

import React, { useState } from "react";
import {
  Undo2,
  Redo2,
  Smartphone,
  HelpCircle,
  Bell,
  Settings,
  Users2,
  PanelLeft,
  LucideChevronRight,
} from "lucide-react";

import SettingsDialog from "../settings/SettingsDilouge";
import CollaborateDilouge from "./CollaborateDilouge";
import DigitalClock from "./DigitalClock";
import NotificationDropdown from "./NotificationDropdown";
import AppDialog from "./AppDialog";
import ThemeToggle from "@/components/ui/theme-toggle";
import Logo from "@/components/ui/logo";

export default function Topbar({
  id,
  settings,
  onSettingsChange,
  onSettingsSave,
  onSettingsDiscard,
  onSettingsReset,
  settingsDirty,
  settingsSaving,
  nodes,
  edges,
  sessionData,
  role,
  onAcceptRequest,
  onKickMember,
  onLeaveSession,
  onMerge,
  breadcrumbs,
  onBreadcrumbClick,
  isSyncing,
  onToggleSidebar,
  onUndo,
  onRedo,
  canUndo = false,
  canRedo = false,
  dialogContainer,
}) {
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isCollaborateOpen, setIsCollaborateOpen] = useState(false);
  const [isAppOpen, setIsAppOpen] = useState(false);

  return (
    <>
      <header className="relative h-14 px-4 flex items-center justify-between border-b border-topbar-border/50 bg-topbar-bg backdrop-blur-md text-foreground z-20 w-full shrink-0">
        <div
          className={`absolute top-0 left-0 right-0 h-[3px] z-50 transition-opacity duration-500 ${
            isSyncing ? "opacity-100" : "opacity-0"
          }`}
        >
          <div
            className={`h-full w-1/3 bg-gradient-to-r from-transparent via-ring to-transparent ${
              isSyncing ? "animate-sync-progress" : ""
            }`}
          ></div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={onToggleSidebar}
            className="inline-flex items-center justify-center rounded-md text-muted-foreground hover:text-foreground hover:bg-surface-hover h-7 w-7 md:hidden -ml-2 transition-colors"
            title="Toggle Sidebar"
          >
            <PanelLeft className="w-4 h-4" />
          </button>
          <a
            className="w-10 h-8 rounded flex items-center justify-center shrink-0 md:-ml-1.5 transition-colors"
            href={
              process.env.NODE_ENV === "development"
                ? "http://localhost:3000"
                : "/"
            }
          >
            <Logo className="w-5 h-5 -mr-1.5 text-foreground" size={20} />
          </a>
          <div
            onClick={() => onBreadcrumbClick && onBreadcrumbClick(null)}
            className="flex items-center gap-1 cursor-pointer group group-data-[collapsible=icon]:hidden md:border-l md:border-divider ml-1.5 pl-2 hidden sm:flex"
          >
            <span className="text-foreground font-semibold text-sm ml-2.5">Notes</span>
          </div>
          {breadcrumbs &&
            breadcrumbs.map((crumb) => (
              <React.Fragment key={crumb.id}>
                <LucideChevronRight className="w-4 h-4 text-ring" />
                <div
                  onClick={() =>
                    onBreadcrumbClick && onBreadcrumbClick(crumb.id)
                  }
                  className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors cursor-pointer p-1 rounded"
                >
                  <span className="text-sm font-medium text-foreground">
                    {crumb.name}
                  </span>
                </div>
              </React.Fragment>
            ))}
        </div>

        <div className="flex items-center gap-2 sm:gap-4">
          {(settings?.showClock ?? true) && (
            <>
              <div className="hidden md:block">
                <DigitalClock animated={settings?.clockAnimation ?? true} />
              </div>
              <div className="hidden sm:block h-5 w-[1px] bg-divider mx-1"></div>
            </>
          )}
          <div className="flex items-center gap-0 text-muted-foreground">
            <button
              onClick={onUndo}
              disabled={!canUndo}
              className="p-2 hover:bg-surface-hover rounded transition-colors hover:text-foreground disabled:opacity-30 disabled:hover:bg-transparent disabled:hover:text-muted-foreground disabled:cursor-default"
              title="Undo (Ctrl+Z)"
            >
              <Undo2 className="w-4 h-4" />
            </button>
            <button
              onClick={onRedo}
              disabled={!canRedo}
              className="p-2 hover:bg-surface-hover rounded transition-colors hover:text-foreground disabled:opacity-30 disabled:hover:bg-transparent disabled:hover:text-muted-foreground disabled:cursor-default"
              title="Redo (Ctrl+Shift+Z)"
            >
              <Redo2 className="w-4 h-4" />
            </button>
          </div>
          <div className="hidden sm:block h-5 w-[1px] bg-divider mx-1"></div>
          <div className="flex items-center gap-0 sm:gap-1 text-muted-foreground">
            <button
              onClick={() => setIsCollaborateOpen(true)}
              className={`relative group p-2 rounded-lg transition-all duration-300`}
              title={
                sessionData
                  ? role === "host"
                    ? "Hosting Session"
                    : "Connected to Session"
                  : "Collaborate"
              }
            >
              {sessionData && (
                <>
                  <span
                    className={`absolute inset-1 rounded-lg animate-ping opacity-20 ${
                      role === "host" ? "bg-ring" : "bg-emerald-500"
                    }`}
                    style={{ animationDuration: "2s" }}
                  ></span>
                  <span className="absolute inset-0 rounded-lg"></span>
                </>
              )}
              <div className="relative p-2 hover:bg-surface-hover rounded transition-colors hover:text-foreground">
                <Users2
                  className={`w-[18px] h-[18px] transition-transform duration-300 ${
                    sessionData ? "drop-shadow-sm" : ""
                  }`}
                  strokeWidth={2}
                />
              </div>
            </button>
          </div>

          <div className="hidden sm:block h-5 w-[1px] bg-divider mx-1"></div>

          <div className="flex items-center gap-0 sm:gap-1">
            <ThemeToggle />
            <button
              onClick={() => setIsAppOpen(true)}
              className="w-8 h-8 rounded-sm border border-transparent hover:bg-surface-hover hidden sm:flex items-center justify-center transition-colors text-muted-foreground hover:text-foreground"
              title="Mobile"
            >
              <Smartphone className="w-[18px] h-[18px]" strokeWidth={2} />
            </button>
            <a
              href="/docs"
              target="_blank"
              rel="noopener noreferrer"
              className="w-8 h-8 rounded-sm border border-transparent hover:bg-surface-hover flex items-center justify-center transition-colors text-muted-foreground hover:text-foreground"
              title="Help & Docs"
            >
              <HelpCircle className="w-[18px] h-[18px]" strokeWidth={2} />
            </a>
            <NotificationDropdown
              sessionData={sessionData}
              role={role}
              onAcceptRequest={onAcceptRequest}
              onKickMember={onKickMember}
            >
              <button
                className="w-8 h-8 rounded-sm border border-transparent hover:bg-surface-hover hidden items-center justify-center transition-colors text-muted-foreground hover:text-foreground relative outline-none sm:flex"
                title="Notifications"
              >
                <Bell className="w-[18px] h-[18px]" strokeWidth={2} />
                {sessionData?.joiners &&
                  Object.values(sessionData.joiners).some(
                    (j) => j.status === "requested"
                  ) &&
                  role === "host" && (
                    <div className="absolute top-[6px] right-[7px] w-2 h-2 rounded-sm bg-notification-dot border border-background"></div>
                  )}
              </button>
            </NotificationDropdown>
            <button
              onClick={() => setIsSettingsOpen(true)}
              className="w-8 h-8 rounded-sm border border-transparent hover:bg-surface-hover hidden sm:flex items-center justify-center transition-colors text-muted-foreground hover:text-foreground"
              title="Settings"
            >
              <div className="w-full h-full flex items-center justify-center">
                <Settings className="w-[18px] h-[18px]" strokeWidth={2} />
              </div>
            </button>
          </div>
        </div>
      </header>
      <SettingsDialog
        open={isSettingsOpen}
        onOpenChange={setIsSettingsOpen}
        settings={settings}
        onSettingsChange={onSettingsChange}
        onSave={onSettingsSave}
        onDiscard={onSettingsDiscard}
        onReset={onSettingsReset}
        isDirty={settingsDirty}
        isSaving={settingsSaving}
        nodeCount={Array.isArray(nodes) ? nodes.length : 0}
        edgeCount={Array.isArray(edges) ? edges.length : 0}
        dialogContainer={dialogContainer}
      />
      <CollaborateDilouge
        id={id}
        open={isCollaborateOpen}
        onOpenChange={setIsCollaborateOpen}
        nodes={nodes}
        edges={edges}
        sessionData={sessionData}
        role={role}
        onAcceptRequest={onAcceptRequest}
        onKickMember={onKickMember}
        onLeaveSession={onLeaveSession}
        onMerge={onMerge}
        dialogContainer={dialogContainer}
      />
      <AppDialog
        open={isAppOpen}
        onOpenChange={setIsAppOpen}
        dialogContainer={dialogContainer}
      />
    </>
  );
}
