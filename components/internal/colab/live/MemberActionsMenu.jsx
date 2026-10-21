"use client";

import React from "react";
import { Crown, Eye, EyeOff, Hand, Pencil, ShieldCheck, ShieldOff, UserMinus } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@geiger/ui";
import { ROLE_LABEL, canModerate } from "@/lib/collab/session";

// Per-person actions shared by the topbar avatars and the members dialog: follow for everyone, moderation for hosts.

// Co-hosts manage participants; only the host manages other co-hosts.
const canModerateMember = (member, myRole) =>
  canModerate(myRole) && !member.isMe && member.role !== "host" && (member.role !== "cohost" || myRole === "host");

export const memberHasActions = (member, myRole, online) =>
  canModerateMember(member, myRole) || (online && !member.isMe);

export default function MemberActionsMenu({
  member,
  myRole,
  online,
  following,
  handRaised,
  onFollow,
  onStopFollow,
  onSetRole,
  onMakeHost,
  onRemove,
  onLowerHand,
  align = "end",
  children,
}) {
  const moderate = canModerateMember(member, myRole);
  const canFollow = online && !member.isMe;
  if (!moderate && !canFollow) return children;

  return (
    <DropdownMenu modal={false}>
      <DropdownMenuTrigger asChild>{children}</DropdownMenuTrigger>
      <DropdownMenuContent align={align} sideOffset={6} className="w-56">
        <DropdownMenuLabel className="flex items-center justify-between gap-2">
          <span className="truncate">{member.name}</span>
          <span className="shrink-0 text-[10px] font-normal uppercase tracking-wide text-muted-foreground">
            {ROLE_LABEL[member.role] || member.role}
          </span>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        {canFollow ? (
          following ? (
            <DropdownMenuItem onSelect={onStopFollow}>
              <EyeOff /> Stop following
            </DropdownMenuItem>
          ) : (
            <DropdownMenuItem onSelect={() => onFollow(member.id)}>
              <Eye /> Follow their view
            </DropdownMenuItem>
          )
        ) : null}
        {moderate && handRaised ? (
          <DropdownMenuItem onSelect={() => onLowerHand(member.id)}>
            <Hand /> Lower hand
          </DropdownMenuItem>
        ) : null}
        {moderate ? (
          <>
            {canFollow || handRaised ? <DropdownMenuSeparator /> : null}
            {member.role === "pending" ? (
              <>
                <DropdownMenuItem onSelect={() => onSetRole(member.id, "editor")}>
                  <Pencil /> Admit as editor
                </DropdownMenuItem>
                <DropdownMenuItem onSelect={() => onSetRole(member.id, "viewer")}>
                  <Eye /> Admit as viewer
                </DropdownMenuItem>
              </>
            ) : (
              <>
                {member.role === "viewer" ? (
                  <DropdownMenuItem onSelect={() => onSetRole(member.id, "editor")}>
                    <Pencil /> Let them edit
                  </DropdownMenuItem>
                ) : null}
                {member.role !== "viewer" ? (
                  <DropdownMenuItem onSelect={() => onSetRole(member.id, "viewer")}>
                    <Eye /> Make view-only
                  </DropdownMenuItem>
                ) : null}
                {myRole === "host" && member.role !== "cohost" ? (
                  <DropdownMenuItem onSelect={() => onSetRole(member.id, "cohost")}>
                    <ShieldCheck /> Make co-host
                  </DropdownMenuItem>
                ) : null}
                {myRole === "host" && member.role === "cohost" ? (
                  <DropdownMenuItem onSelect={() => onSetRole(member.id, "editor")}>
                    <ShieldOff /> Revoke co-host
                  </DropdownMenuItem>
                ) : null}
                {myRole === "host" ? (
                  <DropdownMenuItem onSelect={() => onMakeHost(member)}>
                    <Crown /> Make host…
                  </DropdownMenuItem>
                ) : null}
              </>
            )}
            <DropdownMenuSeparator />
            <DropdownMenuItem variant="destructive" onSelect={() => onRemove(member.id)}>
              <UserMinus /> {member.role === "pending" ? "Decline request" : "Remove from session"}
            </DropdownMenuItem>
          </>
        ) : null}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
