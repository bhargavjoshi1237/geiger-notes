"use client";

import React, { useEffect, useState } from "react";
import {
  Mail,
  Shield,
  CreditCard,
  LogOut,
  CheckCircle2,
  Loader2,
  User,
} from "lucide-react";
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
      {/* Header / Profile Section */}
      <div className="flex items-center gap-4 py-2">
        <Avatar className="h-16 w-16 border border-zinc-700 bg-zinc-800">
          <AvatarImage src={user.avatarUrl} />
          <AvatarFallback className="bg-zinc-800 text-zinc-400 font-medium">
            {user.name?.charAt(0).toUpperCase()}
          </AvatarFallback>
        </Avatar>
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <h3 className="text-lg font-medium text-zinc-100">{user.name}</h3>
            <Badge
              variant="outline"
              className="text-[10px] bg-emerald-500/10 text-emerald-500 border-emerald-500/20 px-2 h-5"
            >
              {user.plan}
            </Badge>
          </div>
          <div className="flex items-center gap-2 text-sm text-zinc-500">
            <Mail className="w-3.5 h-3.5" />
            <span>{user.email}</span>
          </div>
        </div>
      </div>

      {/* Settings List */}
      <div className="space-y-1">
        <h4 className="text-xs font-medium text-zinc-500 uppercase tracking-wider mb-3 px-1">
          Subscription & Security
        </h4>

        <div className="group flex items-center justify-between p-3 rounded-md hover:bg-zinc-800/40 transition-colors cursor-pointer border border-transparent hover:border-zinc-800">
          <div className="flex items-center gap-3">
            <CreditCard className="w-4 h-4 text-zinc-400" />
            <div>
              <div className="text-sm font-medium text-zinc-200">
                Subscription
              </div>
              <div className="text-xs text-zinc-500">
                Manage billing and payment methods
              </div>
            </div>
          </div>
          <Button
            variant="ghost"
            size="sm"
            className="h-8 text-zinc-400 hover:text-zinc-100"
          >
            Manage
          </Button>
        </div>

        <div className="group flex items-center justify-between p-3 rounded-md hover:bg-zinc-800/40 transition-colors cursor-pointer border border-transparent hover:border-zinc-800">
          <div className="flex items-center gap-3">
            <Shield className="w-4 h-4 text-zinc-400" />
            <div>
              <div className="text-sm font-medium text-zinc-200">Security</div>
              <div className="text-xs text-zinc-500">
                Password and authentication
              </div>
            </div>
          </div>
          <Button
            variant="ghost"
            size="sm"
            className="h-8 text-zinc-400 hover:text-zinc-100"
          >
            Update
          </Button>
        </div>
      </div>

      <div className="pt-4 border-t border-zinc-800/50">
        <Button
          variant="ghost"
          className="w-full justify-start text-red-400 hover:text-red-300 hover:bg-red-500/10 h-10 px-3"
          onClick={handleSignOut}
        >
          <LogOut className="w-4 h-4 mr-2" />
          Sign Out
        </Button>
      </div>
    </div>
  );
}
