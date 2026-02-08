"use client";

import React, { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
  Users2,
  Copy,
  Check,
  Trash2,
  Play,
  LogIn,
  LucideDoorClosed,
  UserMinus,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";

export default function CollaborateDilouge({ id, open, onOpenChange }) {
  const [copied, setCopied] = useState(false);
  const [activeTab, setActiveTab] = useState("host");
  const [isHosting, setIsHosting] = useState(!!id);
  const [sessionCode, setSessionCode] = useState("GEIGER-7X2P-9Y8Q" || "");

  // Mock data for members
  const [members, setMembers] = useState([
    { id: 1, name: "You", status: "online", role: "Owner", isMe: true },
    {
      id: 2,
      name: "Sarah Chen",
      status: "online",
      role: "Editor",
      isMe: false,
      type: "joined",
    },

    // Requested users (only visible to host)
    {
      id: 4,
      name: "Mike Ross",
      status: "pending",
      role: "Viewer",
      isMe: false,
      type: "requested",
    },
    {
      id: 5,
      name: "Rachel Zane",
      status: "pending",
      role: "Editor",
      isMe: false,
      type: "requested",
    },
  ]);

  const [isStarting, setIsStarting] = useState(false);
  const isHost = true;
  const startSession = () => {
    setIsStarting(true);
    setTimeout(() => {
      const newCode = "GEIGER-7X2P-9Y8Q";
      setSessionCode(newCode);
      setIsHosting(true);
      setIsStarting(false);
    }, 1500);
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(sessionCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const joinedMembers = members.filter((m) => m.type !== "requested");
  const requestedMembers = members.filter((m) => m.type === "requested");

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        showCloseButton={false}
        className="max-w-md bg-[#1e1e1e] border-zinc-800 text-zinc-100 p-0 overflow-hidden gap-0 sm:rounded-lg shadow-xl"
      >
        <DialogHeader className="p-4 border-b border-zinc-800 space-y-0">
          <div className="flex items-center justify-between w-full">
            <div className="flex items-center gap-2">
              <Users2 className="w-4 h-4 text-zinc-400" />
              <DialogTitle className="text-base font-sm text-zinc-100">
                Collaborate
              </DialogTitle>
            </div>

            <div
              className={cn(
                "flex items-center gap-1.5 px-2 py-1 rounded-full border text-[10px] font-medium tracking-wide uppercase transition-colors",
                isHosting
                  ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-500"
                  : "bg-red-500/10 border-red-500/20 text-red-500",
              )}
            >
              <span
                className={cn(
                  "w-1.5 h-1.5 rounded-full",
                  isHosting ? "bg-emerald-500 animate-pulse" : "bg-red-500",
                )}
              />
              {isHosting ? "Live" : "Offline"}
            </div>
          </div>
        </DialogHeader>

        <div className="flex border-b border-zinc-800 bg-[#1e1e1e]">
          {[
            { id: "host", label: "Host" },
            { id: "members", label: "Members" },
            { id: "join", label: "Join" },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={cn(
                "flex-1 py-3 text-sm font-medium border-b-2 transition-colors",
                activeTab === tab.id
                  ? "border-zinc-100 text-zinc-100 bg-zinc-800/30"
                  : "border-transparent text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800/20",
              )}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="p-4 bg-[#1e1e1e] min-h-[300px]">
          {activeTab === "host" && (
            <div className="flex flex-col items-center justify-center min-h-[320px] py-6 px-4">
              {!isHosting ? (
                <div className="text-center space-y-5 animate-in fade-in zoom-in-95">
                  <div className="w-14 h-14 bg-zinc-800 rounded-full flex items-center justify-center mx-auto">
                    <Play className="w-6 h-6 text-zinc-400 ml-0.5" />
                  </div>

                  <div className="space-y-1">
                    <h3 className="text-lg font-semibold text-zinc-100">
                      Start a Session
                    </h3>
                    <p className="text-sm text-zinc-500 max-w-[260px] mx-auto">
                      Create a live collaborative workspace and invite others
                      instantly.
                    </p>
                  </div>

                  <Button
                    onClick={startSession}
                    disabled={isStarting}
                    className="bg-zinc-100 text-black hover:bg-zinc-200 min-w-[150px] transition-all active:scale-95"
                  >
                    {isStarting ? "Starting…" : "Start Session"}
                  </Button>
                </div>
              ) : (
                <div className="w-full max-w-sm space-y-6 animate-in fade-in zoom-in-95">
                  <div className="space-y-4">
                    <div className="flex items-center justify-between px-1">
                      <span className="text-xs font-medium text-zinc-500 uppercase tracking-wider">
                        Session Active
                      </span>
                      <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/20">
                        <span className="relative flex h-1.5 w-1.5">
                          <span
                            className={cn(
                              "w-1.5 h-1.5 rounded-full",
                              isHosting
                                ? "bg-emerald-500 animate-pulse"
                                : "bg-red-500",
                            )}
                          />
                        </span>
                        <span className="text-[10px] font-medium text-emerald-500 tracking-wide">
                          ONLINE
                        </span>
                      </div>
                    </div>

                    <div className="relative group">
                      <div className="absolute -inset-0.5 bg-gradient-to-r from-emerald-500/20 to-teal-500/20 rounded-xl blur opacity-20 group-hover:opacity-40 transition duration-500" />
                      <button
                        onClick={copyToClipboard}
                        className="relative w-full flex flex-col items-center justify-center gap-3 bg-zinc-900 border border-zinc-800 hover:border-zinc-700/50 rounded-xl p-6 transition-all duration-300 group-hover:shadow-2xl group-hover:shadow-emerald-900/10"
                      >
                        <div className="flex items-center gap-3">
                          <span className="font-mono text-xl font-bold text-zinc-100 tracking-[0.15em] select-all">
                            {sessionCode}
                          </span>
                        </div>

                        <div className="flex items-center gap-1.5 text-xs text-zinc-500 font-medium group-hover:text-emerald-500/80 transition-colors">
                          {copied ? (
                            <>
                              <Check className="w-3.5 h-3.5" />
                              <span>Copied to clipboard</span>
                            </>
                          ) : (
                            <>
                              <Copy className="w-3.5 h-3.5" />
                              <span>Click to copy code</span>
                            </>
                          )}
                        </div>
                      </button>
                    </div>

                    <p className="text-[11px] text-zinc-600 text-center px-4">
                      Share this code with team members to let them join your
                      workspace instantly.
                    </p>
                  </div>

                  <div className="text-center space-y-1">
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => {
                        setIsHosting(false);
                        setSessionCode("");
                      }}
                      className="h-8 text-xs"
                    >
                      <LucideDoorClosed className="w-5 h-5 mr-1 text-white" />
                      <p className="-mt-0.5 text-white">End Session</p>
                    </Button>
                  </div>
                </div>
              )}
            </div>
          )}

          {activeTab === "members" && (
            <div className="h-full flex flex-col">
              {!isHosting ? (
                <div className="flex flex-col items-center justify-center h-[200px] text-zinc-500 space-y-2">
                  <Users2 className="w-8 h-8 opacity-20" />
                  <p className="text-sm">No active session</p>
                  <p className="text-xs text-zinc-600">
                    Start or join a session to see members
                  </p>
                </div>
              ) : (
                <div className="flex-1 -mx-2">
                  <ScrollArea className="h-[300px] px-2">
                    {isHost && requestedMembers.length > 0 && (
                      <div className="mb-6">
                        <h4 className="text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-2 px-1 flex items-center justify-between">
                          Requests
                          <Badge
                            variant="secondary"
                            className="bg-zinc-800 text-zinc-400 text-[10px] h-5 px-1.5"
                          >
                            {requestedMembers.length}
                          </Badge>
                        </h4>
                        <div className="space-y-1">
                          {requestedMembers.map((user) => (
                            <div
                              key={user.id}
                              className="flex items-center justify-between p-2 rounded bg-zinc-800/30 border border-zinc-800/50"
                            >
                              <div className="flex items-center gap-3">
                                <div className="w-8 h-8 rounded-full bg-zinc-800 flex items-center justify-center text-xs font-medium text-zinc-400">
                                  {user.name.charAt(0)}
                                </div>
                                <div>
                                  <div className="text-sm font-medium text-zinc-200">
                                    {user.name}
                                  </div>
                                  <div className="text-xs text-zinc-500">
                                    Wants to join
                                  </div>
                                </div>
                              </div>
                              <div className="flex gap-1">
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  className="h-7 w-7 p-0 text-red-400 hover:text-red-300 hover:bg-red-900/20"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </Button>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  className="h-7 w-7 p-0 text-emerald-400 hover:text-emerald-300 hover:bg-emerald-900/20"
                                >
                                  <Check className="w-3.5 h-3.5" />
                                </Button>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    <div>
                      <h4 className="text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-2 px-1">
                        In Session ({joinedMembers.length})
                      </h4>
                      <div className="space-y-1">
                        {joinedMembers.map((user) => (
                          <div
                            key={user.id}
                            className="flex items-center justify-between p-2 rounded hover:bg-zinc-800/50 transition-colors group"
                          >
                            <div className="flex items-center gap-3">
                              <div className="relative">
                                <div className="w-8 h-8 rounded-full bg-zinc-800 flex items-center justify-center text-xs font-medium text-zinc-300 border border-zinc-700">
                                  {user.name.charAt(0)}
                                </div>
                                <div
                                  className={cn(
                                    "absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full border-2 border-[#1e1e1e]",
                                    user.status === "online"
                                      ? "bg-emerald-500"
                                      : "bg-amber-500",
                                  )}
                                />
                              </div>
                              <div>
                                <div className="text-sm font-medium text-zinc-200 flex items-center gap-2">
                                  {user.name}
                                  {user.isMe && (
                                    <span className="text-zinc-500 text-xs">
                                      (You)
                                    </span>
                                  )}
                                  {user.role === "Owner" && (
                                    <Badge
                                      variant="outline"
                                      className="text-[10px] h-4 py-0 px-1 border-zinc-700 text-zinc-400 font-normal"
                                    >
                                      Host
                                    </Badge>
                                  )}
                                </div>
                                <div className="text-xs text-zinc-500">
                                  {user.role}
                                </div>
                              </div>
                            </div>
                            {isHost && !user.isMe && (
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 opacity-0 group-hover:opacity-100 text-red-500 hover:text-red-400 hover:bg-red-900/20"
                              >
                                <UserMinus className="w-4 h-4" />
                              </Button>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  </ScrollArea>
                </div>
              )}
            </div>
          )}

          {activeTab === "join" && (
            <div className="space-y-6 flex flex-col justify-center h-full pl-10 pr-10">
              {isHosting ? (
                <div className="text-center space-y-2 py-8">
                  <p className="text-sm text-zinc-300">
                    You are currently in a session.
                  </p>
                  <p className="text-xs text-zinc-500">
                    Leave the current session to join another.
                  </p>
                </div>
              ) : (
                <>
                  <div className="gap-2 flex flex-col">
                    <label className="text-xs font-medium text-zinc-400 uppercase tracking-wider">
                      Enter Session Code
                    </label>
                    <input
                      type="text"
                      placeholder="GEIGER-XXXX-XXXX"
                      className="w-full bg-zinc-900 border border-zinc-800 rounded-md px-3 py-2 text-sm text-zinc-200 placeholder:text-zinc-600 focus:outline-none focus:border-zinc-700 transition-colors font-mono"
                    />
                  </div>
                  <div className="space-y-4">
                    <Button className="w-full bg-zinc-100 text-black hover:bg-zinc-200">
                      <LogIn className="w-4 h-4 mr-2" />
                      Join Session
                    </Button>
                  </div>
                </>
              )}
            </div>
          )}
        </div>

        <div className="p-4 border-t border-zinc-800 bg-[#1e1e1e] flex justify-end gap-2">
          <Button
            variant="ghost"
            onClick={() => onOpenChange(false)}
            className="text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800"
          >
            Close
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
