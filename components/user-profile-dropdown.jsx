"use client";

import Link from "next/link";
import { HomeIcon, LogOut } from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { CachedAvatarImage } from "@/components/cached-avatar-image";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { logout } from "@/app/login/actions";
import { clearProfileImageCache } from "@/lib/profile-image-cache";

export function UserProfileDropdown({ user }) {
  const displayName =
    user?.name || user?.fullName || user?.email?.split("@")[0] || "User";
  const initials = displayName
    .split(" ")
    .filter(Boolean)
    .map((name) => name[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  const fallbackInitials = initials || "U";

  return (
    <DropdownMenu modal={false}>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          className="ml-1 h-8 w-8 overflow-hidden rounded-full border border-border transition-colors hover:border-ring"
        >
          <Avatar className="size-full">
            {user?.avatarUrl && (
              <CachedAvatarImage
                src={user.avatarUrl}
                cacheKey={user.id}
                alt={displayName}
              />
            )}
            <AvatarFallback className="border-0 bg-ring text-[10px] font-semibold text-foreground">
              {fallbackInitials}
            </AvatarFallback>
          </Avatar>
          <span className="sr-only">Open user menu</span>
        </button>
      </DropdownMenuTrigger>

      <DropdownMenuContent
        align="end"
        sideOffset={8}
        className="z-[100] w-[150px] min-w-[150px] max-w-[208px] bg-surface-dialog border-border shadow-xl"
        onCloseAutoFocus={(event) => event.preventDefault()}
      >
        <DropdownMenuGroup>
          <DropdownMenuItem
            asChild
            className="text-muted-foreground focus:bg-surface-hover focus:text-foreground cursor-pointer gap-2"
          >
            <Link href={user?.dashboardHref || "/"}>
              <HomeIcon className="w-3.5 h-3.5" />
              <span>Dashboard</span>
            </Link>
          </DropdownMenuItem >

          <form action={logout} onSubmit={() => clearProfileImageCache()}>
            <DropdownMenuItem
              asChild
              className="text-text-secondary focus:bg-surface-hover focus:text-foreground cursor-pointer gap-2"
            >
              <button type="submit" className="w-full">
                <LogOut className="w-3.5 h-3.5" />
                <span>Sign out</span>
              </button>
            </DropdownMenuItem>
          </form>
        </DropdownMenuGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
