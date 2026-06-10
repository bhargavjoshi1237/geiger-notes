import React from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Bell, Check, X, User } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

export default function NotificationDialog({
  open,
  onOpenChange,
  sessionData,
  role,
  onAcceptRequest,
  onKickMember,
  dialogContainer,
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
    // Sort by timestamp descending
    return list.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
  }, [sessionData, role]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        container={dialogContainer}
        overlayClassName={dialogContainer ? "absolute inset-0" : undefined}
        className={`${dialogContainer ? "absolute max-h-[calc(100%-1rem)]" : ""} max-w-md bg-surface-dialog border-border text-foreground p-0 overflow-hidden shadow-xl sm:rounded-lg`}
      >
        <DialogHeader className="p-4 border-b border-border">
          <div className="flex items-center gap-2">
            <Bell className="w-5 h-5 text-muted-foreground" />
            <DialogTitle className="text-base font-medium text-foreground">
              Notifications
            </DialogTitle>
            {notifications.length > 0 && (
              <span className="flex items-center justify-center w-5 h-5 text-[10px] font-bold text-white bg-red-500 rounded-full ml-auto">
                {notifications.length}
              </span>
            )}
          </div>
        </DialogHeader>

        <ScrollArea className="h-[min(400px,calc(100dvh-180px))] flex items-center justify-center">
          {notifications.length === 0 ? (
            <div className="flex flex-col mt-10 items-center justify-center h-full p-8 text-center space-y-3 opacity-60">
              <div className="text-center space-y-5 animate-in fade-in -mt-10">
                <Bell className="w-8 h-8 opacity-20 ml-auto mr-auto" />
              </div>
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
                  className="p-4 flex gap-4 hover:bg-surface-hover/30 transition-colors"
                >
                  <div className="mt-1">
                    {notification.type === "request" && (
                      <div className="relative">
                        <Avatar className="h-10 w-10 border border-border">
                          <AvatarImage src={notification.data.avatar_url} />
                          <AvatarFallback className="bg-surface-hover text-muted-foreground">
                            {notification.data.name?.charAt(0).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <div className="absolute -bottom-1 -right-1 bg-muted rounded-full p-0.5 border border-border">
                          <User className="w-3 h-3 text-blue-400 fill-blue-400" />
                        </div>
                      </div>
                    )}
                  </div>
                  <div className="flex-1 space-y-1">
                    <div className="flex items-start justify-between">
                      <p className="text-sm font-medium text-foreground">
                        {notification.title}
                      </p>
                      <span className="text-[10px] text-muted-foreground">
                        {new Date(notification.timestamp).toLocaleTimeString(
                          [],
                          { hour: "2-digit", minute: "2-digit" },
                        )}
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground leading-relaxed">
                      {notification.message}
                    </p>

                    {notification.type === "request" && (
                      <div className="flex items-center gap-2 mt-3">
                        <Button
                          size="sm"
                          className="h-7 text-xs bg-emerald-600 hover:bg-emerald-700 text-white"
                          onClick={() => onAcceptRequest(notification.id)}
                        >
                          <Check className="w-3 h-3 mr-1.5" />
                          Accept
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-7 text-xs text-muted-foreground hover:text-red-400 hover:bg-red-900/10"
                          onClick={() => onKickMember(notification.id)}
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
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
