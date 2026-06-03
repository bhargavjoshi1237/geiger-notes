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
        <Loader2 className="w-5 h-5 text-zinc-500 animate-spin" />
      </div>
    );

  if (!user) return null;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-medium text-zinc-200">Account</h3>
          <p className="text-xs text-zinc-500 mt-1">
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
          <Avatar className="h-16 w-16 border border-zinc-700 bg-zinc-800">
            <AvatarImage src={user.avatarUrl} />
            <AvatarFallback className="bg-zinc-800 text-zinc-400 font-medium text-lg">
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
                  className="h-8 bg-zinc-950/50 border-zinc-700 text-zinc-100"
                />
                <Button
                  size="icon"
                  onClick={saveName}
                  disabled={savingName}
                  className="h-8 w-8 bg-zinc-100 text-black hover:bg-zinc-300 shrink-0"
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
                  className="h-8 w-8 text-zinc-400 hover:text-zinc-200 shrink-0"
                >
                  <X className="w-3.5 h-3.5" />
                </Button>
              </div>
            ) : (
              <div className="flex items-center gap-2 group">
                <span className="text-sm font-medium text-zinc-200 truncate">
                  {user.name}
                </span>
                <button
                  type="button"
                  onClick={startEdit}
                  className="text-zinc-500 hover:text-zinc-200 opacity-0 group-hover:opacity-100 transition-opacity"
                  title="Edit name"
                >
                  <Pencil className="w-3.5 h-3.5" />
                </button>
              </div>
            )}
            <div className="text-xs text-zinc-500 flex items-center gap-2 truncate">
              <Mail className="w-3 h-3 shrink-0" />
              <span className="truncate">{user.email}</span>
            </div>
            <div className="text-[10px] text-zinc-600 flex items-center gap-1.5">
              <Calendar className="w-3 h-3" />
              Member since {user.memberSince}
            </div>
          </div>
        </div>

      {/* Security */}
      <div className="space-y-2 pt-2 border-t border-zinc-800/50">
        <GroupLabel className="mt-4">Security</GroupLabel>
        <div className="flex items-center justify-between py-2">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded bg-zinc-900/50 border border-zinc-800/50 text-zinc-400">
              <Shield className="w-4 h-4" />
            </div>
            <div>
              <div className="text-sm font-medium text-zinc-300">Password</div>
              <div className="text-xs text-zinc-500">
                Receive a secure reset link by email
              </div>
            </div>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={handlePasswordReset}
            disabled={sendingReset}
            className="h-8 border-zinc-700 text-zinc-300 hover:text-zinc-100 hover:border-zinc-600"
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
            <div className="p-2 rounded bg-zinc-900/50 border border-zinc-800/50 text-zinc-400">
              <LifeBuoy className="w-4 h-4" />
            </div>
            <div>
              <div className="text-sm font-medium text-zinc-300">Support</div>
              <div className="text-xs text-zinc-500">
                Questions about billing or your plan
              </div>
            </div>
          </div>
          <a
            href="mailto:support@vardaam.com?subject=Geiger%20Notes%20Support"
            className="inline-flex items-center h-8 px-3 rounded-md border border-zinc-700 text-zinc-300 hover:text-zinc-100 hover:border-zinc-600 text-sm transition-colors"
          >
            Contact
          </a>
        </div>
      </div>

      {/* Sign out */}
      <div className="pt-4 border-t border-zinc-800/50">
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
