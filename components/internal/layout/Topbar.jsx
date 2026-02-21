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
  LucideChevronRight,
} from "lucide-react";

import SettingsDialog from "../settings/SettingsDilouge";
import CollaborateDilouge from "./CollaborateDilouge";
import DigitalClock from "./DigitalClock";
import NotificationDialog from "./NotificationDialog";
import AppDialog from "./AppDialog";
import HelpDialog from "./HelpDialog";

export default function Topbar({
  id,
  settings,
  onSettingsChange,
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
}) {
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isCollaborateOpen, setIsCollaborateOpen] = useState(false);
  const [isNotificationOpen, setIsNotificationOpen] = useState(false);
  const [isAppOpen, setIsAppOpen] = useState(false);
  const [isHelpOpen, setIsHelpOpen] = useState(false);

  return (
    <>
      <header className="shadow-lg h-12 w-full bg-[#1e1e1e] flex items-center justify-between px-4 z-[100] border-b border-zinc-800/50">
        <div className="flex items-center gap-2">
          <a
            className="p-1 rounded hover:bg-zinc-800"
            href={
              process.env.NODE_ENV === "development"
                ? "http://localhost:3000"
                : "/"
            }
          >
            <img
              src={`${process.env.NEXT_PUBLIC_BASE_PATH || ""}/logo1.svg`}
              className="w-4 h-4"
              alt=""
            />
          </a>
          <div
            onClick={() => onBreadcrumbClick && onBreadcrumbClick(null)}
            className="flex items-center gap-2 text-zinc-400 hover:text-white transition-colors cursor-pointer p-1 rounded hover:bg-zinc-800"
          >
            <span className="text-sm font-medium text-white">Notes</span>
          </div>
          {breadcrumbs &&
            breadcrumbs.map((crumb) => (
              <React.Fragment key={crumb.id}>
                <LucideChevronRight className="w-4 h-4 text-zinc-500" />
                <div
                  onClick={() =>
                    onBreadcrumbClick && onBreadcrumbClick(crumb.id)
                  }
                  className="flex items-center gap-2 text-zinc-400 hover:text-white transition-colors cursor-pointer p-1 rounded hover:bg-zinc-800"
                >
                  <span className="text-sm font-medium text-white">
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
              <div className="hidden sm:block h-5 w-[1px] bg-zinc-700 mx-1"></div>
            </>
          )}
          <div className="flex items-center gap-1 text-zinc-400">
            <button
              className="p-2 hover:bg-zinc-800 rounded transition-colors hover:text-white"
              title="Undo"
            >
              <Undo2 className="w-4 h-4" />
            </button>
            <button
              className="p-2 hover:bg-zinc-800 rounded transition-colors hover:text-white"
              title="Redo"
            >
              <Redo2 className="w-4 h-4" />
            </button>
          </div>
          <div className="hidden sm:block h-5 w-[1px] bg-zinc-700 mx-1"></div>
          <div className="flex items-center gap-3 text-zinc-400">
            <button
              onClick={() => setIsCollaborateOpen(true)}
              className={`relative group p-2 rounded-lg transition-all duration-300 `}
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
                      role === "host" ? "bg-zinc-500" : "bg-emerald-500"
                    }`}
                    style={{ animationDuration: "2s" }}
                  ></span>
                  <span className={`absolute inset-0 rounded-lg`}></span>
                </>
              )}
              <div className="relative p-2 hover:bg-zinc-800 rounded transition-colors hover:text-white">
                <Users2
                  className={`w-4 h-4 transition-transform duration-300 ${
                    sessionData ? "drop-shadow-sm" : ""
                  }`}
                />
              </div>
            </button>
          </div>

          <div className="hidden sm:block h-5 w-[1px] bg-zinc-700 mx-1"></div>

          <div className="flex items-center gap-1">
            <button
              onClick={() => setIsAppOpen(true)}
              className="p-2 text-zinc-400 hover:text-white hover:bg-zinc-800 rounded transition-colors"
              title="Mobile"
            >
              <Smartphone className="w-4 h-4" />
            </button>
            <button
              onClick={() => setIsHelpOpen(true)}
              className="p-2 text-zinc-400 hover:text-white hover:bg-zinc-800 rounded transition-colors"
              title="Help"
            >
              <HelpCircle className="w-5 h-5" />
            </button>
            <button
              onClick={() => setIsNotificationOpen(true)}
              className="p-2 text-zinc-400 hover:text-white hover:bg-zinc-800 rounded transition-colors relative"
              title="Notifications"
            >
              <Bell className="w-5 h-5" />
              {sessionData?.joiners &&
                Object.values(sessionData.joiners).some(
                  (j) => j.status === "requested",
                ) &&
                role === "host" && (
                  <span className="absolute top-2 right-2 w-2 h-2 bg-red-500 rounded-full animate-pulse" />
                )}
            </button>
            <button
              onClick={() => setIsSettingsOpen(true)}
              className="p-2 text-zinc-400 hover:text-white hover:bg-zinc-800 rounded transition-colors"
              title="Settings"
            >
              <Settings className="w-5 h-5" />
            </button>
          </div>
        </div>
      </header>
      <SettingsDialog
        open={isSettingsOpen}
        onOpenChange={setIsSettingsOpen}
        settings={settings}
        onSettingsChange={onSettingsChange}
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
      />
      <NotificationDialog
        open={isNotificationOpen}
        onOpenChange={setIsNotificationOpen}
        sessionData={sessionData}
        role={role}
        onAcceptRequest={onAcceptRequest}
        onKickMember={onKickMember}
      />
      <AppDialog open={isAppOpen} onOpenChange={setIsAppOpen} />
      <HelpDialog open={isHelpOpen} onOpenChange={setIsHelpOpen} />
    </>
  );
}
