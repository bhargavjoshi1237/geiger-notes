import React, { useMemo } from "react";
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
  DrawerClose,
} from "@/components/ui/drawer";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Users2,
  Crown,
  UserMinus,
  CircuitBoard,
  LogOut,
  LogIn,
  Loader2,
  X,
} from "lucide-react";

export default function UserDrawer({
  sessionData,
  role,
  currentUser,
  onKickMember,
  onLeaveSession,
  onRequestAccess,
}) {
  const members = useMemo(() => {
    if (!sessionData) return [];
    const list = [];
    const joinersMap = sessionData.joiners || {};

    Object.keys(joinersMap).forEach((uid) => {
      const m = joinersMap[uid];
      if (m.status === "joined") {
        list.push({
          id: uid,
          name: m.name || m.email || "Unknown",
          color: m.color,
          role: "Editor",
          isMe: currentUser?.id === uid,
          joinedAt: m.joinedAt,
        });
      }
    });

    const hostId = sessionData.host;
    const existingHost = list.find((m) => m.id === hostId);
    if (!existingHost) {
      list.unshift({
        id: hostId,
        name: currentUser?.id === hostId ? "You (Host)" : "Host",
        role: "Owner",
        color: null,
        isMe: currentUser?.id === hostId,
        joinedAt: sessionData.created_at,
      });
    } else {
      existingHost.role = "Owner";
    }

    return list;
  }, [sessionData, currentUser]);

  if (!sessionData) return null;

  const initial = (name) => (name || "?").charAt(0).toUpperCase();

  return (
    <div className="fixed bottom-4 right-4 z-50">
      <Drawer>
        <DrawerTrigger asChild>
          <div className="flex items-center -space-x-3 cursor-pointer hover:-translate-y-0.5 transition-transform duration-200 group">
            {members.slice(0, 3).map((member) => (
              <div
                key={member.id}
                className="relative w-10 h-10 rounded-full border-2 border-[#161616] bg-[#2a2a2a] flex items-center justify-center text-xs font-semibold text-zinc-300 shadow-lg"
                style={
                  member.color
                    ? { backgroundColor: member.color, color: "#000" }
                    : {}
                }
                title={member.name}
              >
                {initial(member.name)}
              </div>
            ))}
            {members.length > 3 && (
              <div className="w-10 h-10 rounded-full border-2 border-[#161616] bg-[#333333] flex items-center justify-center text-[10px] font-bold text-zinc-300 shadow-lg">
                +{members.length - 3}
              </div>
            )}
            <div className="w-10 h-10 rounded-full border-2 border-[#161616] bg-[#1a1a1a] flex items-center justify-center text-[#a3a3a3] shadow-lg group-hover:bg-[#2a2a2a] group-hover:text-white transition-colors">
              <Users2 className="w-4 h-4" />
            </div>
          </div>
        </DrawerTrigger>

        <DrawerContent className="bg-[#161616] border-t border-[#2a2a2a] text-zinc-100 max-w-md mx-auto">
          <div className="w-full">
            <DrawerHeader className="border-b border-[#2a2a2a] px-4 pb-3 pt-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-[#1e1e1e] border border-[#2a2a2a] rounded-lg">
                    <CircuitBoard className="w-5 h-5 text-emerald-500" />
                  </div>
                  <div className="text-left">
                    <DrawerTitle className="text-sm font-semibold text-white">
                      Session Members
                    </DrawerTitle>
                    <p className="text-xs text-[#a3a3a3] mt-0.5 flex items-center gap-1.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                      {members.length} active
                    </p>
                  </div>
                </div>
                <DrawerClose asChild>
                  <button
                    className="h-8 w-8 inline-flex items-center justify-center rounded-md text-[#a3a3a3] hover:text-white hover:bg-[#2a2a2a] transition-colors"
                    title="Close"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </DrawerClose>
              </div>
            </DrawerHeader>

            <div className="px-4 py-3">
              <ScrollArea className="h-[300px] -mr-2 pr-2">
                <div className="space-y-1">
                  {members.map((member) => (
                    <div
                      key={member.id}
                      className="group flex items-center justify-between p-2 rounded-lg border border-transparent hover:bg-[#1e1e1e] hover:border-[#2a2a2a] transition-colors"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="relative shrink-0">
                          <div
                            className="w-9 h-9 rounded-full bg-[#2a2a2a] flex items-center justify-center text-sm font-bold shadow-sm"
                            style={
                              member.color
                                ? { backgroundColor: member.color, color: "#000" }
                                : { color: "#a1a1aa" }
                            }
                          >
                            {initial(member.name)}
                          </div>
                          {member.role === "Owner" && (
                            <div className="absolute -bottom-1 -right-1 bg-[#161616] rounded-full p-0.5 border border-[#2a2a2a]">
                              <Crown className="w-3 h-3 text-amber-500 fill-amber-500" />
                            </div>
                          )}
                        </div>

                        <div className="flex flex-col min-w-0">
                          <span className="text-sm font-medium text-zinc-200 truncate flex items-center gap-1.5">
                            {member.name}
                            {member.isMe && (
                              <span className="text-xs text-[#a3a3a3] font-normal">
                                (You)
                              </span>
                            )}
                          </span>
                          <span
                            className={`text-[10px] flex items-center gap-1 ${
                              member.role === "Owner"
                                ? "text-amber-500/80"
                                : "text-[#a3a3a3]"
                            }`}
                          >
                            {member.role}
                          </span>
                        </div>
                      </div>

                      {role === "host" && !member.isMe && (
                        <button
                          onClick={() => onKickMember && onKickMember(member.id)}
                          className="h-8 w-8 inline-flex items-center justify-center rounded-md text-[#a3a3a3] hover:text-red-400 hover:bg-red-500/10 opacity-0 group-hover:opacity-100 transition-all shrink-0"
                          title="Remove member"
                        >
                          <UserMinus className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </ScrollArea>

              <div className="mt-3 pt-3 border-t border-[#2a2a2a]">
                {role === "host" && (
                  <p className="text-[11px] text-[#6b6b6b] text-center">
                    Hover a member to remove them from the session.
                  </p>
                )}

                {role === "editor" && (
                  <button
                    onClick={onLeaveSession}
                    className="w-full inline-flex items-center justify-center gap-2 h-9 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/30 text-sm font-medium transition-colors"
                  >
                    <LogOut className="w-4 h-4" />
                    Leave Session
                  </button>
                )}

                {role === "pending" && (
                  <div className="w-full inline-flex items-center justify-center gap-2 h-9 rounded-lg bg-[#1e1e1e] text-[#a3a3a3] border border-[#2a2a2a] text-sm font-medium">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Waiting for host approval…
                  </div>
                )}

                {role === "viewer" && (
                  <button
                    onClick={onRequestAccess}
                    className="w-full inline-flex items-center justify-center gap-2 h-9 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-sm font-medium transition-colors"
                  >
                    <LogIn className="w-4 h-4" />
                    Request to join
                  </button>
                )}
              </div>
            </div>
          </div>
        </DrawerContent>
      </Drawer>
    </div>
  );
}
