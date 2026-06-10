"use client";

import React from "react";
import { Bell, Check, X, User } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

export default function NotificationDropdown({
  children,
  sessionData,
  role,
  onAcceptRequest,
  onKickMember,
}) {
  const notifications = React.useMemo(() => {
    const list = [];
    if (role === "host" && sessionData?.joiners) {
      Object.entries(sessionData.joiners).forEach(([id, joiner]) => {
        if (joiner.status === "requested") {
          list.push({
            id,
            type: "request",
            title: "Access Request",
            message: `${joiner.name} wants to join the session.`,
            data: joiner,
            timestamp: joiner.requestedAt,
          });
        }
      });
    }
    return list.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
  }, [sessionData, role]);

  return (
    <DropdownMenu modal={false}>
      <DropdownMenuTrigger asChild>{children}</DropdownMenuTrigger>
      <DropdownMenuContent
        align="end"
        sideOffset={8}
        className="z-[100] w-80 max-w-[calc(100vw-2rem)] bg-muted border-border text-foreground shadow-xl p-0"
        onCloseAutoFocus={(event) => event.preventDefault()}
      >
        <DropdownMenuLabel className="flex items-center gap-2 px-3 py-2.5">
          <Bell className="w-4 h-4 text-muted-foreground" />
          <span className="text-sm font-medium text-foreground">
            Notifications
          </span>
          {notifications.length > 0 && (
            <span className="flex items-center justify-center min-w-5 h-5 px-1.5 text-[10px] font-bold text-white bg-red-500 rounded-full ml-auto">
              {notifications.length}
            </span>
          )}
        </DropdownMenuLabel>
        <DropdownMenuSeparator className="bg-surface-active m-0" />

        <div className="max-h-[min(380px,60vh)] overflow-y-auto">
          {notifications.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-2 px-6 py-10 text-center">
              <Bell className="w-7 h-7 text-muted-foreground/50" />
              <p className="text-sm font-medium text-foreground">
                No new notifications
              </p>
              <p className="text-xs text-muted-foreground">
                We&apos;ll notify you when something important happens.
              </p>
            </div>
          ) : (
            <div className="divide-y divide-border/50">
              {notifications.map((notification) => (
                <div
                  key={notification.id}
                  className="p-3 flex gap-3 hover:bg-surface-hover/30 transition-colors"
                >
                  <div className="mt-0.5">
                    {notification.type === "request" && (
                      <div className="relative">
                        <Avatar className="h-9 w-9 border border-border">
                          <AvatarImage src={notification.data.avatar_url} />
                          <AvatarFallback className="bg-surface-hover text-muted-foreground text-xs">
                            {notification.data.name?.charAt(0).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <div className="absolute -bottom-1 -right-1 bg-muted rounded-full p-0.5 border border-border">
                          <User className="w-2.5 h-2.5 text-blue-400 fill-blue-400" />
                        </div>
                      </div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0 space-y-1">
                    <div className="flex items-start justify-between gap-2">
                      <p className="text-sm font-medium text-foreground">
                        {notification.title}
                      </p>
                      {notification.timestamp && (
                        <span className="text-[10px] text-muted-foreground shrink-0">
                          {new Date(notification.timestamp).toLocaleTimeString(
                            [],
                            { hour: "2-digit", minute: "2-digit" }
                          )}
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground leading-relaxed">
                      {notification.message}
                    </p>

                    {notification.type === "request" && (
                      <div className="flex items-center gap-2 pt-2">
                        <Button
                          size="sm"
                          className="h-7 text-xs bg-emerald-600 hover:bg-emerald-700 text-white"
                          onClick={(e) => {
                            e.preventDefault();
                            onAcceptRequest?.(notification.id);
                          }}
                        >
                          <Check className="w-3 h-3 mr-1.5" />
                          Accept
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-7 text-xs text-muted-foreground hover:text-red-400 hover:bg-red-900/10"
                          onClick={(e) => {
                            e.preventDefault();
                            onKickMember?.(notification.id);
                          }}
                        >
                          <X className="w-3 h-3 mr-1.5" />
                          Decline
                        </Button>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
