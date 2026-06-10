"use client";

import React, { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/utils/supabase/client";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Users2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

import HostTab from "../colab/HostTab";
import MembersTab from "../colab/MembersTab";
import JoinTab from "../colab/JoinTab";
import MergeTab from "../colab/MergeTab";

export default function CollaborateDilouge({
  id,
  open,
  onOpenChange,
  nodes,
  edges,
  sessionData,
  role,
  onAcceptRequest,
  onKickMember,
  onLeaveSession,
  onMerge,
  dialogContainer,
}) {
  const router = useRouter();
  const supabase = createClient();
  const [currentUser, setCurrentUser] = useState(null);
  const [copied, setCopied] = useState(false);
  const [activeTab, setActiveTab] = useState("host");
  const [isStarting, setIsStarting] = useState(false);
  const [sessionCodeInput, setSessionCodeInput] = useState("");
  const [mergeSessions, setMergeSessions] = useState([]);
  const [selectedMergeSession, setSelectedMergeSession] = useState(null);
  const [mergeDiff, setMergeDiff] = useState(null);

  useEffect(() => {
    async function getUser() {
      const { data } = await supabase.auth.getUser();
      setCurrentUser(data.user);
    }
    getUser();
  }, [supabase]);

  useEffect(() => {
    if (activeTab === "merge" && currentUser) {
      async function fetchHostedSessions() {
        const { data } = await supabase
          .from("collab")
          .select("*")
          .eq("host", currentUser.id)
          .order("created_at", { ascending: false });
        if (data) setMergeSessions(data);
      }
      fetchHostedSessions();
    }
  }, [activeTab, currentUser, supabase]);

  const computeDiff = (session) => {
    try {
      const sNodes =
        typeof session.state_nodes === "string"
          ? JSON.parse(session.state_nodes)
          : session.state_nodes || [];
      const sEdges =
        typeof session.state_edges === "string"
          ? JSON.parse(session.state_edges)
          : session.state_edges || [];
      const currentIds = new Set(nodes.map((n) => n.id));
      const newNodes = sNodes.filter((n) => !currentIds.has(n.id));
      const changedNodes = sNodes.filter((n) => {
        if (!currentIds.has(n.id)) return false;
        const current = nodes.find((cn) => cn.id === n.id);
        return JSON.stringify(n) !== JSON.stringify(current);
      });
      const sessionIds = new Set(sNodes.map((n) => n.id));
      const deletedNodes = nodes.filter((n) => !sessionIds.has(n.id));

      setMergeDiff({
        newNodes,
        changedNodes,
        deletedNodes,
        sNodes,
        sEdges,
      });
    } catch (e) {
      console.error("Error computing diff", e);
      toast.error("Failed to compute diff");
    }
  };

  const handleMergeSessionSelect = (session) => {
    setSelectedMergeSession(session);
    computeDiff(session);
  };

  const confirmMerge = async () => {
    if (!mergeDiff || !onMerge) return;
    const rollbackState = {
      nodes: nodes,
      edges: edges,
      merged_at: new Date().toISOString(),
    };

    if (selectedMergeSession) {
      const { error } = await supabase
        .from("collab")
        .update({ rollback: rollbackState })
        .eq("id", selectedMergeSession.id);

      if (error) {
        console.error("Error saving rollback state:", error);
        toast.error("Failed to save rollback state");
      } else {
        const updatedSession = {
          ...selectedMergeSession,
          rollback: rollbackState,
        };
        setMergeSessions((prev) =>
          prev.map((s) => (s.id === updatedSession.id ? updatedSession : s)),
        );
      }
    }

    const combinedNodes = [...mergeDiff.sNodes, ...mergeDiff.deletedNodes];
    const sessionEdgeIds = new Set(mergeDiff.sEdges.map((e) => e.id));
    const localUniqueEdges = edges.filter((e) => !sessionEdgeIds.has(e.id));
    const combinedEdges = [...mergeDiff.sEdges, ...localUniqueEdges];
    onMerge(combinedNodes, combinedEdges);
    toast.success("Merged successfully");
    onOpenChange(false);
    setSelectedMergeSession(null);
  };

  const handleRollback = async () => {
    if (!selectedMergeSession?.rollback || !onMerge) return;
    const { nodes: rollbackNodes, edges: rollbackEdges } =
      selectedMergeSession.rollback;
    onMerge(rollbackNodes, rollbackEdges);
    const { error } = await supabase
      .from("collab")
      .update({ rollback: null })
      .eq("id", selectedMergeSession.id);

    if (error) {
      console.error("Error clearing rollback state:", error);
      toast.error("Failed to clear rollback state");
    } else {
      const updatedSession = { ...selectedMergeSession, rollback: null };
      setMergeSessions((prev) =>
        prev.map((s) => (s.id === updatedSession.id ? updatedSession : s)),
      );
    }
    onOpenChange(false);
    setSelectedMergeSession(null);
    toast.success("Rolled back successfully");
  };

  const isSessionActive = !!sessionData;
  const isHost = role === "host";
  const sessionCode = sessionData?.code;

  const members = useMemo(() => {
    if (!sessionData) return [];
    const list = [];
    const joinersMap = sessionData.joiners || {};
    Object.keys(joinersMap).forEach((uid) => {
      const m = joinersMap[uid];
      // Only active members (joined) and pending requests are relevant here.
      // Kicked/left entries are retained for access control but must not show
      // up as members or as fake join requests.
      if (m.status !== "joined" && m.status !== "requested") return;
      list.push({
        id: uid,
        name: m.name || m.email || "Unknown",
        status: m.status === "joined" ? "online" : "pending",
        role: m.status === "joined" ? "Editor" : "Viewer",
        type: m.status === "joined" ? "joined" : "requested",
        isMe: currentUser?.id === uid,
      });
    });

    const hostId = sessionData.host;
    if (!list.find((m) => m.id === hostId)) {
      list.unshift({
        id: hostId,
        name: currentUser?.id === hostId ? "You (Host)" : "Host",
        status: "online",
        role: "Owner",
        type: "joined",
        isMe: currentUser?.id === hostId,
      });
    } else {
      const m = list.find((m) => m.id === hostId);
      if (m) m.role = "Owner";
    }

    return list;
  }, [sessionData, currentUser]);

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

  const handleEndSession = async () => {
    router.push(`/${currentUser?.id}/home`);
    toast.info("Session ended");
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        container={dialogContainer}
        overlayClassName={dialogContainer ? "absolute inset-0" : undefined}
        showCloseButton={false}
        className={`${dialogContainer ? "absolute max-h-[calc(100%-1rem)]" : ""} max-w-md bg-surface-dialog border-border text-foreground p-0 overflow-hidden gap-0 sm:rounded-lg shadow-xl`}
      >
        <DialogHeader className="p-4 border-b border-border space-y-0">
          <div className="flex items-center justify-between w-full">
            <div className="flex items-center gap-2">
              <Users2 className="w-4 h-4 text-muted-foreground" />
              <DialogTitle className="text-base font-sm text-foreground">
                Collaborate
              </DialogTitle>
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

        <div className="flex border-b border-border bg-surface-dialog">
          {[
            { id: "host", label: isSessionActive ? "Session" : "Host" },
            { id: "members", label: "Members" },
            (!isSessionActive || !isHost) && { id: "join", label: "Join" },
            !isSessionActive && { id: "merge", label: "Merge" },
          ]
            .filter(Boolean)
            .map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={cn(
                  "flex-1 py-3 text-sm font-medium border-b-2 transition-colors",
                  activeTab === tab.id
                    ? "border-primary text-foreground bg-surface-hover/30"
                    : "border-transparent text-muted-foreground hover:text-foreground hover:bg-surface-hover/20",
                )}
              >
                {tab.label}
              </button>
            ))}
        </div>

        <div className="p-4 bg-surface-dialog h-[min(300px,calc(100dvh-220px))] overflow-y-auto">
          {activeTab === "host" && (
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

          {activeTab === "members" && (
            <MembersTab
              isSessionActive={isSessionActive}
              isHost={isHost}
              requestedMembers={requestedMembers}
              joinedMembers={joinedMembers}
              onAcceptRequest={onAcceptRequest}
              onKickMember={onKickMember}
              handleLeave={handleLeave}
            />
          )}

          {activeTab === "join" && (
            <JoinTab
              isSessionActive={isSessionActive}
              sessionCodeInput={sessionCodeInput}
              setSessionCodeInput={setSessionCodeInput}
              joinError={joinError}
              joinByCode={joinByCode}
              isJoining={isJoining}
            />
          )}

          {activeTab === "merge" && (
            <MergeTab
              selectedMergeSession={selectedMergeSession}
              mergeSessions={mergeSessions}
              handleMergeSessionSelect={handleMergeSessionSelect}
              mergeDiff={mergeDiff}
              confirmMerge={confirmMerge}
              setSelectedMergeSession={setSelectedMergeSession}
              handleRollback={handleRollback}
              currentUser={currentUser}
            />
          )}
        </div>

        <div className="p-4 border-t border-border bg-surface-dialog flex justify-end gap-2">
          <Button
            variant="ghost"
            onClick={() => onOpenChange(false)}
            className="text-muted-foreground hover:text-foreground hover:bg-surface-hover"
          >
            Close
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
