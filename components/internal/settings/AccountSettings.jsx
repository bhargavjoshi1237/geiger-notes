"use client";

import React, { useEffect, useState } from "react";
import {
  Mail,
  Shield,
  LogOut,
  Loader2,
  Check,
  X,
  Pencil,
  Calendar,
  LifeBuoy,
} from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { createClient } from "@/utils/supabase/client";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { GroupLabel } from "./SettingsPrimitives";

export default function AccountSettings() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [editingName, setEditingName] = useState(false);
  const [nameDraft, setNameDraft] = useState("");
  const [savingName, setSavingName] = useState(false);
  const [sendingReset, setSendingReset] = useState(false);
  const [signingOut, setSigningOut] = useState(false);
  const supabase = createClient();
  const router = useRouter();

  useEffect(() => {
    let active = true;
    (async () => {
      const {
        data: { user: auth },
      } = await supabase.auth.getUser();
      if (auth && active) {
        const name =
          auth.user_metadata?.full_name ||
          auth.user_metadata?.name ||
          auth.email.split("@")[0];
        setUser({
          id: auth.id,
          name,
          email: auth.email,
          avatarUrl:
            auth.user_metadata?.avatar_url || auth.user_metadata?.picture,
          plan: "Pro",
          memberSince: new Date(auth.created_at).toLocaleDateString("en-US", {
            month: "short",
            day: "numeric",
            year: "numeric",
          }),
        });
        setNameDraft(name);
      }
      if (active) setLoading(false);
    })();
    return () => {
      active = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const startEdit = () => {
    setNameDraft(user.name);
    setEditingName(true);
  };

  const saveName = async () => {
    const trimmed = nameDraft.trim();
    if (!trimmed || trimmed === user.name) {
      setEditingName(false);
      return;
    }
    setSavingName(true);
    const { error } = await supabase.auth.updateUser({
      data: { full_name: trimmed },
    });
    setSavingName(false);
    if (error) {
      toast.error("Couldn't update your name");
      return;
    }
    setUser((u) => ({ ...u, name: trimmed }));
    setEditingName(false);
    toast.success("Name updated");
  };

  const handlePasswordReset = async () => {
    if (!user?.email) return;
    setSendingReset(true);
    const { error } = await supabase.auth.resetPasswordForEmail(user.email, {
      redirectTo:
        typeof window !== "undefined"
          ? `${window.location.origin}/login`
          : undefined,
    });
    setSendingReset(false);
    if (error) {
      toast.error("Couldn't send reset email");
      return;
    }
    toast.success(`Password reset link sent to ${user.email}`);
  };

  const handleSignOut = async () => {
    setSigningOut(true);
    await supabase.auth.signOut();
    router.push("/");
    router.refresh();
  };

  if (loading)
    return (
      <div className="flex h-40 items-center justify-center">
        <Loader2 className="w-5 h-5 text-muted-foreground animate-spin" />
      </div>
    );

  if (!user) return null;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-medium text-foreground">Account</h3>
          <p className="text-xs text-muted-foreground mt-1">
            Manage your profile and security.
          </p>
        </div>
        <Badge
          variant="outline"
          className="text-[10px] bg-emerald-500/10 text-emerald-500 border-emerald-500/20 px-2 h-5"
        >
          {user.plan} Plan
        </Badge>
      </div>

        <div className="flex items-center gap-4 pt-3 pb-3 rounded-lg">
          <Avatar className="h-16 w-16 border border-border bg-surface-hover">
            <AvatarImage src={user.avatarUrl} />
            <AvatarFallback className="bg-surface-hover text-muted-foreground font-medium text-lg">
              {user.name?.charAt(0).toUpperCase()}
            </AvatarFallback>
          </Avatar>

          <div className="flex-1 min-w-0 space-y-1.5">
            {editingName ? (
              <div className="flex items-center gap-2">
                <Input
                  autoFocus
                  value={nameDraft}
                  onChange={(e) => setNameDraft(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") saveName();
                    if (e.key === "Escape") setEditingName(false);
                  }}
                  maxLength={60}
                  className="h-8 bg-muted/50 border-border text-foreground"
                />
                <Button
                  size="icon"
                  onClick={saveName}
                  disabled={savingName}
                  className="h-8 w-8 bg-primary text-primary-foreground hover:bg-primary/60 shrink-0"
                >
                  {savingName ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <Check className="w-3.5 h-3.5" />
                  )}
                </Button>
                <Button
                  size="icon"
                  variant="ghost"
                  onClick={() => setEditingName(false)}
                  className="h-8 w-8 text-muted-foreground hover:text-foreground shrink-0"
                >
                  <X className="w-3.5 h-3.5" />
                </Button>
              </div>
            ) : (
              <div className="flex items-center gap-2 group">
                <span className="text-sm font-medium text-foreground truncate">
                  {user.name}
                </span>
                <button
                  type="button"
                  onClick={startEdit}
                  className="text-muted-foreground hover:text-foreground opacity-0 group-hover:opacity-100 transition-opacity"
                  title="Edit name"
                >
                  <Pencil className="w-3.5 h-3.5" />
                </button>
              </div>
            )}
            <div className="text-xs text-muted-foreground flex items-center gap-2 truncate">
              <Mail className="w-3 h-3 shrink-0" />
              <span className="truncate">{user.email}</span>
            </div>
            <div className="text-[10px] text-text-secondary flex items-center gap-1.5">
              <Calendar className="w-3 h-3" />
              Member since {user.memberSince}
            </div>
          </div>
        </div>

      {/* Security */}
      <div className="space-y-2 pt-2 border-t border-border/50">
        <GroupLabel className="mt-4">Security</GroupLabel>
        <div className="flex items-center justify-between py-2">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded bg-muted/50 border border-border/50 text-muted-foreground">
              <Shield className="w-4 h-4" />
            </div>
            <div>
              <div className="text-sm font-medium text-foreground">Password</div>
              <div className="text-xs text-muted-foreground">
                Receive a secure reset link by email
              </div>
            </div>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={handlePasswordReset}
            disabled={sendingReset}
            className="h-8 border-border text-foreground hover:text-foreground hover:border-ring"
          >
            {sendingReset ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              "Reset"
            )}
          </Button>
        </div>

        <div className="flex items-center justify-between py-2">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded bg-muted/50 border border-border/50 text-muted-foreground">
              <LifeBuoy className="w-4 h-4" />
            </div>
            <div>
              <div className="text-sm font-medium text-foreground">Support</div>
              <div className="text-xs text-muted-foreground">
                Questions about billing or your plan
              </div>
            </div>
          </div>
          <a
            href="mailto:support@vardaam.com?subject=Geiger%20Notes%20Support"
            className="inline-flex items-center h-8 px-3 rounded-md border border-border text-foreground hover:text-foreground hover:border-ring text-sm transition-colors"
          >
            Contact
          </a>
        </div>
      </div>

      {/* Sign out */}
      <div className="pt-4 border-t border-border/50">
        <Button
          onClick={handleSignOut}
          disabled={signingOut}
          className="w-full bg-red-800 text-white hover:bg-red-600/80 transition-colors"
        >
          {signingOut ? (
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
          ) : (
            <LogOut className="w-3.5 h-3.5" />
          )}
          Sign out
        </Button>
      </div>
    </div>
  );
}
