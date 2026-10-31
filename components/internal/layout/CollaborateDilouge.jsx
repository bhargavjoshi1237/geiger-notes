"use client";

import React, { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/utils/supabase/client";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, cn } from "@geiger/ui";
import { Users2 } from "lucide-react";
import { toast } from "sonner";
import { buildMergedBoard, computeMergeDiff } from "@/lib/collab/merge";
import { ROLE_LABEL, sessionMembers } from "@/lib/collab/session";

import HostTab from "../colab/HostTab";
import MembersTab from "../colab/MembersTab";
import JoinTab from "../colab/JoinTab";
import MergeTab from "../colab/MergeTab";
import MeetTab from "../colab/MeetTab";

export default function CollaborateDilouge({
  id,
  open,
  onOpenChange,
  nodes,
  edges,
  sessionData,
  role,
  onAcceptRequest,
  onRejectRequest,
  onKickMember,
  onLeaveSession,
  onEndSession,
  onMerge,
  dialogContainer,
  onEnterMeeting,
}) {
  const router = useRouter();
  const supabase = createClient();
  const [currentUser, setCurrentUser] = useState(null);
  const [copied, setCopied] = useState(false);
  const [activeTab, setActiveTab] = useState("host");
  const [isStarting, setIsStarting] = useState(false);
  const [sessionCodeInput, setSessionCodeInput] = useState("");
  // Null until the first fetch resolves, so the tab can tell "loading" from "no sessions".
  const [mergeSessions, setMergeSessions] = useState(null);
  const [mergeLoadError, setMergeLoadError] = useState(false);
  const [mergeReloadKey, setMergeReloadKey] = useState(0);
  const [selectedMergeSession, setSelectedMergeSession] = useState(null);
  const [isMergeBusy, setIsMergeBusy] = useState(false);

  const isSessionActive = !!sessionData;
  const isHost = role === "host";
  const sessionCode = sessionData?.code;

  const tabs = [
    { id: "host", label: isSessionActive ? "Session" : "Host" },
    { id: "members", label: "Members" },
    // Always available: a meeting doesn't depend on a session.
    { id: "meet", label: "Meeting" },
    (!isSessionActive || !isHost) && { id: "join", label: "Join" },
    !isSessionActive && { id: "merge", label: "Merge" },
  ].filter(Boolean);

  // A tab can disappear while selected (Merge once a session starts); fall back to the first one.
  const currentTab = tabs.some((tab) => tab.id === activeTab) ? activeTab : tabs[0].id;

  useEffect(() => {
    async function getUser() {
      const { data } = await supabase.auth.getUser();
      setCurrentUser(data.user);
    }
    getUser();
  }, [supabase]);

  // Refetched on every visit so sessions that ended since the last one show up.
  useEffect(() => {
    if (!open || currentTab !== "merge" || !currentUser) return undefined;
    let cancelled = false;
    async function fetchHostedSessions() {
      const { data, error } = await supabase
        .from("collab")
        .select("*")
        .eq("host", currentUser.id)
        .order("created_at", { ascending: false });
      if (cancelled) return;
      if (error) {
        console.error("Error loading hosted sessions:", error);
        setMergeLoadError(true);
        return;
      }
      setMergeSessions(data || []);
    }
    fetchHostedSessions();
    return () => {
      cancelled = true;
    };
  }, [open, currentTab, currentUser, supabase, mergeReloadKey]);

  const retryMergeSessions = () => {
    setMergeLoadError(false);
    setMergeReloadKey((key) => key + 1);
  };

  const mergeDiff = useMemo(
    () => (selectedMergeSession ? computeMergeDiff(selectedMergeSession, nodes, edges) : null),
    [selectedMergeSession, nodes, edges],
  );

  const handleOpenChange = (next) => {
    if (!next) setSelectedMergeSession(null);
    onOpenChange(next);
  };

  const finishMergeAction = (rollback) => {
    setMergeSessions((prev) =>
      prev.map((s) => (s.id === selectedMergeSession.id ? { ...s, rollback } : s)),
    );
    handleOpenChange(false);
  };

  // The undo point is saved first: if that fails the board stays untouched rather than merging with no way back.
  const confirmMerge = async () => {
    if (!mergeDiff || !onMerge) return;
    const rollback = {
      nodes,
      edges,
      board_id: id,
      merged_at: new Date().toISOString(),
    };
    setIsMergeBusy(true);
    const { error } = await supabase
      .from("collab")
      .update({ rollback })
      .eq("id", selectedMergeSession.id);
    setIsMergeBusy(false);

    if (error) {
      console.error("Error saving rollback state:", error);
      toast.error("Couldn't save an undo point, so nothing was merged");
      return;
    }
    const merged = buildMergedBoard(mergeDiff, edges);
    onMerge(merged.nodes, merged.edges);
    finishMergeAction(rollback);
    toast.success("Session merged");
  };

  const handleRollback = async () => {
    const rollback = selectedMergeSession?.rollback;
    if (!rollback || !onMerge) return;
    setIsMergeBusy(true);
    const { error } = await supabase
      .from("collab")
      .update({ rollback: null })
      .eq("id", selectedMergeSession.id);
    setIsMergeBusy(false);

    if (error) {
      console.error("Error clearing rollback state:", error);
      toast.error("Couldn't undo the merge");
      return;
    }
    onMerge(rollback.nodes, rollback.edges);
    finishMergeAction(null);
    toast.success("Merge undone");
  };

  // Kicked/left entries stay in joiners for access control, so sessionMembers drops them here.
  const members = useMemo(
    () =>
      sessionMembers(sessionData, currentUser?.id).map((m) => ({
        ...m,
        role: ROLE_LABEL[m.role],
        type: m.status === "requested" ? "requested" : "joined",
        status: m.status === "requested" ? "pending" : "online",
      })),
    [sessionData, currentUser],
  );

  const joinedMembers = members.filter((m) => m.type !== "requested");
  const requestedMembers = members.filter((m) => m.type === "requested");

  const startSession = async () => {
    setIsStarting(true);
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_BASE_PATH || ''}/api/collab/create`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nodes, edges }),
      });
      const data = await response.json();
      if (data.sessionId) {
        router.push(`/colab/${data.sessionId}`);
        toast.success("Session started");
        onOpenChange(false);
      }
    } catch (e) {
      console.error(e);
      toast.error("Failed to start session");
    }
    setIsStarting(false);
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(sessionCode);
    setCopied(true);
    toast.success("Copied to clipboard");
    setTimeout(() => setCopied(false), 2000);
  };

  const [isJoining, setIsJoining] = useState(false);
  const [joinError, setJoinError] = useState("");

  const joinByCode = async () => {
    if (!sessionCodeInput.trim()) return;
    setIsJoining(true);
    setJoinError("");

    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_BASE_PATH || ''}/api/collab/lookup`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: sessionCodeInput.trim() }),
      });

      const data = await response.json();

      if (response.ok && data.sessionId) {
        router.push(`/colab/${data.sessionId}`);
        onOpenChange(false);
        toast.success("Joined session");
      } else {
        const err = data.error || "Invalid session code";
        setJoinError(err);
        toast.error(err);
      }
    } catch (e) {
      setJoinError("Failed to join session");
      toast.error("Failed to join session");
    } finally {
      setIsJoining(false);
    }
  };

  const handleLeave = async () => {
    if (onLeaveSession) {
      await onLeaveSession();
    }
    router.push(`/${currentUser?.id}/home`);
  };

  // Ends the session for everyone; the session page then shows its ended screen.
  const handleEndSession = async () => {
    if (!onEndSession) return;
    const ok = await onEndSession();
    if (ok) onOpenChange(false);
  };

  // Starting or joining hands the meeting (plus who we are) up to the Topbar, which docks the stage.
  const enterMeeting = (details) => {
    const meta = currentUser?.user_metadata || {};
    onEnterMeeting?.({
      ...details,
      me: {
        id: currentUser?.id,
        name: meta.full_name || meta.name || currentUser?.email || "Guest",
        avatarUrl: meta.avatar_url || meta.picture || null,
      },
    });
    onOpenChange(false);
  };

  return (
    <>
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent
        container={dialogContainer}
        overlayClassName={dialogContainer ? "absolute inset-0" : undefined}
        className={`${dialogContainer ? "absolute max-h-[calc(100%-1rem)]" : ""} max-w-md bg-surface-dialog border-border text-foreground p-0 overflow-hidden gap-0 sm:rounded-lg shadow-xl`}
      >
        <DialogHeader className="py-3.5 pl-4 pr-12 border-b border-border space-y-0">
          <div className="flex items-center justify-between w-full">
            <div className="flex items-center gap-2">
              <Users2 className="w-4 h-4 text-muted-foreground" />
              <DialogTitle className="text-base font-medium text-foreground">
                Collaborate
              </DialogTitle>
              <DialogDescription className="sr-only">
                Host, join or merge live sessions and start meetings for this board.
              </DialogDescription>
            </div>

            <div
              className={cn(
                "flex items-center gap-1.5 px-2 py-1 rounded-full border text-[10px] font-medium tracking-wide uppercase transition-colors",
                isSessionActive
                  ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-500"
                  : "bg-muted/10 border-border/20 text-muted-foreground",
              )}
            >
              <span
                className={cn(
                  "w-1.5 h-1.5 rounded-full",
                  isSessionActive
                    ? "bg-emerald-500 animate-pulse"
                    : "bg-muted-foreground",
                )}
              />
              {isSessionActive ? "Live" : "Offline"}
            </div>
          </div>
        </DialogHeader>

        <div role="tablist" className="flex border-b border-border bg-surface-dialog">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              type="button"
              role="tab"
              aria-selected={currentTab === tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={cn(
                "flex-1 py-2.5 text-sm font-medium border-b-2 transition-colors",
                currentTab === tab.id
                  ? "border-primary text-foreground bg-surface-hover/30"
                  : "border-transparent text-muted-foreground hover:text-foreground hover:bg-surface-hover/20",
              )}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div
          className={cn(
            "bg-surface-dialog h-[min(380px,calc(100dvh-120px))]",
            currentTab === "merge" ? "overflow-hidden" : "p-4 overflow-y-auto",
          )}
        >
          {currentTab === "host" && (
            <HostTab
              isSessionActive={isSessionActive}
              startSession={startSession}
              isStarting={isStarting}
              sessionCode={sessionCode}
              copyToClipboard={copyToClipboard}
              copied={copied}
              isHost={isHost}
              handleEndSession={handleEndSession}
              handleLeave={handleLeave}
            />
          )}

          {currentTab === "members" && (
            <MembersTab
              isSessionActive={isSessionActive}
              isHost={isHost || role === "cohost"}
              requestedMembers={requestedMembers}
              joinedMembers={joinedMembers}
              onAcceptRequest={onAcceptRequest}
              onRejectRequest={onRejectRequest || onKickMember}
              onKickMember={onKickMember}
              handleLeave={handleLeave}
            />
          )}

          {currentTab === "meet" && (
            <MeetTab
              isSessionActive={isSessionActive}
              sessionData={sessionData}
              onJoined={enterMeeting}
            />
          )}

          {currentTab === "join" && (
            <JoinTab
              isSessionActive={isSessionActive}
              sessionCodeInput={sessionCodeInput}
              setSessionCodeInput={setSessionCodeInput}
              joinError={joinError}
              joinByCode={joinByCode}
              isJoining={isJoining}
            />
          )}

          {currentTab === "merge" && (
            <MergeTab
              mergeSessions={mergeSessions}
              mergeLoadError={mergeLoadError}
              retryMergeSessions={retryMergeSessions}
              selectedMergeSession={selectedMergeSession}
              handleMergeSessionSelect={setSelectedMergeSession}
              setSelectedMergeSession={setSelectedMergeSession}
              mergeDiff={mergeDiff}
              confirmMerge={confirmMerge}
              handleRollback={handleRollback}
              isMergeBusy={isMergeBusy}
              nodes={nodes}
              edges={edges}
              boardId={id}
              currentUser={currentUser}
            />
          )}
        </div>
      </DialogContent>
    </Dialog>
    </>
  );
}
