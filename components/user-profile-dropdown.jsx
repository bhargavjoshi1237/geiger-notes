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
          className="ml-1 h-8 w-8 overflow-hidden rounded-full border border-[#333333] transition-colors hover:border-[#474747]"
        >
          <Avatar className="size-full">
            {user?.avatarUrl && (
              <CachedAvatarImage
                src={user.avatarUrl}
                cacheKey={user.id}
                alt={displayName}
              />
            )}
            <AvatarFallback className="border-0 bg-[#474747] text-[10px] font-semibold text-white">
              {fallbackInitials}
            </AvatarFallback>
          </Avatar>
          <span className="sr-only">Open user menu</span>
        </button>
      </DropdownMenuTrigger>

      <DropdownMenuContent
        align="end"
        sideOffset={8}
        className="z-[100] w-[150px] min-w-[150px] max-w-[208px] bg-[#1a1a1a] border-[#242424] shadow-xl"
        onCloseAutoFocus={(event) => event.preventDefault()}
      >
        <DropdownMenuGroup>
          <DropdownMenuItem
            asChild
            className="text-[#a3a3a3] focus:bg-[#2a2a2a] focus:text-white cursor-pointer gap-2"
          >
            <Link href={user?.dashboardHref || "/notes"}>
              <HomeIcon className="w-3.5 h-3.5" />
              <span>Dashboard</span>
            </Link>
          </DropdownMenuItem >

          <form action={logout} onSubmit={() => clearProfileImageCache()}>
            <DropdownMenuItem
              asChild
              className="text-[#737373] focus:bg-[#2a2a2a] focus:text-white cursor-pointer gap-2"
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
