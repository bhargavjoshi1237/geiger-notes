import Link from "next/link";
import Image from "next/image";
import {
  ArrowRight,
  ContainerIcon,
  Cpu,
  Layers,
  Menu,
  Zap,
} from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { createClient } from "@/utils/supabase/server";

function HeaderMenu({ userId, notesRoot, loginHref }) {
  const notesHref = userId ? `${notesRoot}/${userId}/home` : notesRoot;
  const dashboardHref = userId ? notesHref : loginHref;
  const products = [
    {
      icon: ContainerIcon,
      label: "Flow",
      description: "Plan and track work.",
      href: "/flow",
    },
    {
      icon: Zap,
      label: "Notes",
      description: "Write and collaborate.",
      href: notesHref,
    },
    {
      icon: Layers,
      label: "DAM",
      description: "Manage your media.",
      href: "#",
    },
    {
      icon: Cpu,
      label: "Grey",
      description: "AI workspace tools.",
      href: "#",
    },
  ];

  const resources = [
    { label: "Documentation", href: "/docs" },
    { label: "Changelog", href: "/changelog" },
    { label: "Blog", href: "/blog" },
    { label: "GitHub Repository", href: "#" },
    { label: "Self Host Geiger", href: "#" },
  ];

  return (
    <>
      <nav className="absolute left-1/2 top-1/2 hidden -translate-x-1/2 -translate-y-1/2 items-center gap-8 text-sm font-medium text-zinc-400 md:flex">
        <div className="group">
          <button className="flex items-center gap-1 py-6 transition-colors hover:text-zinc-100">
            Features
          </button>

          <div className="invisible absolute left-1/2 top-full w-[640px] -translate-x-1/2 translate-y-2 opacity-0 transition-all duration-200 group-hover:visible group-hover:translate-y-0 group-hover:opacity-100">
            <div className="rounded-xl border border-zinc-800 bg-[#1a1a1a] p-4 shadow-xl">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-zinc-500">
                    Products
                  </p>
                  <div className="space-y-1">
                    {products.map((item) => {
                      const Icon = item.icon;
                      return (
                        <Link
                          href={item.href}
                          key={item.label}
                          className="flex items-center gap-3 rounded-lg px-3 py-2 transition-colors hover:bg-zinc-800"
                        >
                          <Icon className="h-4 w-4 text-zinc-400" />
                          <div>
                            <p className="text-sm text-zinc-100">{item.label}</p>
                            <p className="text-xs text-zinc-500">
                              {item.description}
                            </p>
                          </div>
                        </Link>
                      );
                    })}
                  </div>
                </div>

                <div>
                  <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-zinc-500">
                    Resources
                  </p>
                  <div className="space-y-1">
                    {resources.map((item) => (
                      <Link
                        href={item.href}
                        key={item.label}
                        className="flex items-center justify-between rounded-lg px-3 py-2 text-sm text-zinc-300 transition-colors hover:bg-zinc-800 hover:text-zinc-100"
                      >
                        {item.label}
                        <ArrowRight className="h-3.5 w-3.5 text-zinc-500" />
                      </Link>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <Link href="/pricing" className="py-6 transition-colors hover:text-zinc-100">
          Pricing
        </Link>
      </nav>

      <details className="group relative md:hidden">
        <summary className="flex h-8 w-8 cursor-pointer list-none items-center justify-center rounded-md text-zinc-300 transition-colors hover:bg-zinc-800 hover:text-zinc-100 [&::-webkit-details-marker]:hidden">
          <Menu className="h-5 w-5" />
          <span className="sr-only">Open Menu</span>
        </summary>
        <div className="absolute right-0 top-10 w-[280px] rounded-xl border border-zinc-800 bg-[#1a1a1a] p-3 shadow-xl">
          <div className="grid grid-cols-2 gap-2">
            {products.map((item) => {
              const Icon = item.icon;
              return (
                <Link
                  href={item.href}
                  key={item.label}
                  className="flex flex-col items-center justify-center gap-2 rounded-lg border border-zinc-800 bg-zinc-900/50 px-2 py-3 text-center text-xs text-zinc-200"
                >
                  <Icon className="h-4 w-4 text-zinc-400" />
                  {item.label}
                </Link>
              );
            })}
          </div>
          <Link
            href={dashboardHref}
            className="mt-3 inline-flex w-full items-center justify-center rounded-lg bg-zinc-100 px-4 py-2 text-sm font-medium text-zinc-900"
          >
            {userId ? "Open Dashboard" : "Sign In"}
          </Link>
        </div>
      </details>
    </>
  );
}

export async function Header() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const basePath = process.env.NEXT_PUBLIC_BASE_PATH || "";
  const notesRoot = basePath.replace("/notes", "") || "/notes";
  const dashOrigin = (process.env.NEXT_PUBLIC_DASH_ORIGIN || "").replace(/\/$/, "");
  const loginHref = `${dashOrigin}/login?next=${encodeURIComponent(notesRoot)}`;
  const userId = user?.id;
  const profileName =
    user?.user_metadata?.full_name ||
    user?.user_metadata?.name ||
    user?.email ||
    "User";
  const profileInitials =
    profileName
      .split(" ")
      .filter(Boolean)
      .map((name) => name[0])
      .join("")
      .toUpperCase()
      .slice(0, 2) || "U";
  const profileImage =
    userId && process.env.NEXT_PUBLIC_SUPABASE_URL
      ? `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/pfp/${userId}/latest.jpg`
      : "";
  const boardHref = userId ? `${notesRoot}/${userId}/home` : loginHref;

  return (
    <header className="fixed left-0 right-0 top-0 z-50 border-b border-zinc-800 bg-zinc-950 md:border-zinc-800/50 md:bg-zinc-950/85 md:backdrop-blur-md">
      <div className="relative mx-auto flex h-12 w-full max-w-6xl items-center justify-between px-4 sm:px-6">
        <Link href="/" className="flex min-w-0 items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center">
            <Image src={`${basePath}/logo1.svg`} alt="Logo" width={20} height={20} />
          </div>
          <span className="truncate bg-gradient-to-r from-zinc-100 to-zinc-400 bg-clip-text text-sm font-bold tracking-tight text-transparent sm:text-base">
            Geiger Studios
          </span>
        </Link>

        <HeaderMenu userId={userId} notesRoot={notesRoot} loginHref={loginHref} />

        <div className="hidden items-center gap-4 md:flex">
          {user ? (
            <Link
              href={boardHref}
              className="ml-1 h-8 w-8 overflow-hidden rounded-full border border-[#333333] transition-colors hover:border-[#474747]"
              aria-label="Open dashboard"
            >
              <Avatar className="size-full">
                <AvatarImage src={profileImage} alt={profileName} />
                <AvatarFallback className="border-0 bg-[#474747] text-[10px] font-semibold text-white">
                  {profileInitials}
                </AvatarFallback>
              </Avatar>
            </Link>
          ) : (
            <Link
              href={loginHref}
              className="text-sm font-medium text-zinc-400 transition-colors hover:text-zinc-100"
            >
              Sign In
            </Link>
          )}
        </div>
      </div>
    </header>
  );
}
