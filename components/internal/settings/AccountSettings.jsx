"use client";

import React, { useEffect, useState } from "react";
import { Mail, Shield, CreditCard, LogOut, Loader2 } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { createClient } from "@/utils/supabase/client";
import { useRouter } from "next/navigation";

export default function AccountSettings() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const supabase = createClient();
  const router = useRouter();

  useEffect(() => {
    (async () => {
      const {
        data: { user: auth },
      } = await supabase.auth.getUser();
      if (auth)
        setUser({
          name: auth.user_metadata?.full_name || auth.email.split("@")[0],
          email: auth.email,
          avatarUrl:
            auth.user_metadata?.avatar_url || auth.user_metadata?.picture,
          plan: "Pro",
          memberSince: new Date(auth.created_at).toLocaleDateString("en-US", {
            month: "short",
            year: "numeric",
          }),
        });
      setLoading(false);
    })();
  }, []);

  const handleSignOut = async () => {
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
    <div className="space-y-8">
      <div className="flex items-center justify-between pb-4 border-b border-zinc-800/50">
        <div>
          <h3 className="text-sm font-medium text-zinc-200">Account Profile</h3>
          <p className="text-xs text-zinc-500 mt-1">
            Manage your personal information and subscription.
          </p>
        </div>
        <Badge
          variant="outline"
          className="text-[10px] bg-emerald-500/10 text-emerald-500 border-emerald-500/20 px-2 h-5"
        >
          {user.plan} Plan
        </Badge>
      </div>

      <div className="space-y-5">
        <h4 className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">
          Personal Information
        </h4>

        <div className="flex items-center gap-4 p-3 rounded-lg border border-zinc-800/50 bg-zinc-900/20">
          <Avatar className="h-16 w-16 border border-zinc-700 bg-zinc-800">
            <AvatarImage src={user.avatarUrl} />
            <AvatarFallback className="bg-zinc-800 text-zinc-400 font-medium text-lg">
              {user.name?.charAt(0).toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 space-y-1">
            <div className="text-sm font-medium text-zinc-200">{user.name}</div>
            <div className="text-xs text-zinc-500 flex items-center gap-2">
              <Mail className="w-3 h-3" />
              {user.email}
            </div>
            <div className="text-[10px] text-zinc-600 pt-1">
              Member since {user.memberSince}
            </div>
          </div>
          <Button
            variant="ghost"
            size="sm"
            className="h-8 text-zinc-400 hover:text-zinc-100"
          >
            Edit
          </Button>
        </div>
      </div>

      <div className="space-y-4 pt-4 border-t border-zinc-800/50">
        <h4 className="text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-2">
          Settings
        </h4>

        <div className="flex items-center justify-between py-2 group cursor-pointer">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded bg-zinc-900/50 border border-zinc-800/50 text-zinc-400 group-hover:text-zinc-200 group-hover:border-zinc-700 transition-colors">
              <CreditCard className="w-4 h-4" />
            </div>
            <div>
              <div className="text-sm font-medium text-zinc-300 group-hover:text-zinc-100 transition-colors">
                Subscription
              </div>
              <div className="text-xs text-zinc-500">
                Manage billing and payment methods
              </div>
            </div>
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="text-zinc-500 group-hover:text-zinc-300"
          >
            <div className="text-[10px] mr-2">Manage</div>
          </Button>
        </div>

        <div className="flex items-center justify-between py-2 group cursor-pointer">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded bg-zinc-900/50 border border-zinc-800/50 text-zinc-400 group-hover:text-zinc-200 group-hover:border-zinc-700 transition-colors">
              <Shield className="w-4 h-4" />
            </div>
            <div>
              <div className="text-sm font-medium text-zinc-300 group-hover:text-zinc-100 transition-colors">
                Security
              </div>
              <div className="text-xs text-zinc-500">
                Password and 2FA settings
              </div>
            </div>
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="text-zinc-500 group-hover:text-zinc-300"
          >
            <div className="text-[10px] mr-2">Update</div>
          </Button>
        </div>
      </div>

      <div className="pt-6 mt-2 border-t border-zinc-800/50">
        <div
          className="flex items-center justify-between p-3 rounded-md border border-zinc-800/50 bg-red-900/5 hover:bg-red-900/10 hover:border-red-900/30 transition-colors cursor-pointer"
          onClick={handleSignOut}
        >
          <div className="space-y-0.5">
            <h4 className="text-sm font-medium text-red-400/90">Sign Out</h4>
            <p className="text-xs text-red-500/50">
              End your current session safely
            </p>
          </div>
          <Button
            variant="ghost"
            size="sm"
            className="h-8 w-8 p-0 text-red-400 hover:text-red-300 hover:bg-red-500/10"
          >
            <LogOut className="w-3.5 h-3.5" />
          </Button>
        </div>
      </div>
    </div>
  );
}
