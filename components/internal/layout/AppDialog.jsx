import React from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Smartphone } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";

export default function AppDialog({ open, onOpenChange, dialogContainer }) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        container={dialogContainer}
        overlayClassName={dialogContainer ? "absolute inset-0" : undefined}
        className={`${dialogContainer ? "absolute max-h-[calc(100%-1rem)]" : ""} max-w-md bg-surface-dialog border-border text-foreground p-0 overflow-hidden shadow-xl sm:rounded-lg`}
      >
        <DialogHeader className="p-4 border-b border-border">
          <div className="flex items-center gap-2">
            <Smartphone className="w-5 h-5 text-muted-foreground" />
            <DialogTitle className="text-base font-medium text-foreground">
              Mobile App
            </DialogTitle>
          </div>
        </DialogHeader>

        <ScrollArea className="h-[min(400px,calc(100dvh-180px))]">
          <div className="flex flex-col mt-10 items-center justify-center h-full p-8 text-center space-y-3 opacity-60">
            <div className="text-center space-y-5 animate-in fade-in -mt-10">
              <Smartphone className="w-8 h-8 opacity-20 ml-auto mr-auto" />
            </div>
            <p className="text-sm font-medium text-foreground">
              Coming Soon to iOS & Android
            </p>
            <p className="text-xs text-muted-foreground">
              We&apos;re building a seamless mobile experience for you. Stay tuned
              for updates!
            </p>
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
