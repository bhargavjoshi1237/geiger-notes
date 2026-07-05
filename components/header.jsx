import { createClient } from "@/utils/supabase/server";
import { SuiteMegaMenu } from "@/components/landing/suite-mega-menu";
import { UserProfileDropdown } from "@/components/user-profile-dropdown";
import Logo from "@/components/ui/logo";

export async function Header() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const userId = user?.id;
  const userProfile = userId
    ? {
        id: userId,
        email: user.email,
        name: user.user_metadata?.name,
        fullName: user.user_metadata?.full_name,
        avatarUrl: process.env.NEXT_PUBLIC_SUPABASE_URL
          ? `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/pfp/${userId}/latest.jpg`
          : "",
        dashboardHref: `/${userId}/home`,
      }
    : null;

  return (
    <header className="fixed top-0 left-0 right-0 z-50 border-b border-border bg-background md:border-border/50 md:bg-background/85 md:backdrop-blur-md">
      <div className="mx-auto flex h-12 w-full max-w-6xl items-center justify-between px-4 sm:px-6 relative">
        <div className="flex items-center gap-2 min-w-0">
          <div className="w-8 h-8 flex items-center justify-center">
            <Logo size={20} className="text-foreground" />
          </div>
          <span className="truncate font-bold text-sm tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-foreground to-muted-foreground sm:text-md">Geiger Studios</span>
        </div>
        <SuiteMegaMenu />
        <div className="hidden items-center gap-4 md:flex">
          {userProfile ? (
            <UserProfileDropdown user={userProfile} />
          ) : (
            <a
              href="/login"
              className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
            >
              Sign In
            </a>
          )}
        </div>
      </div>
    </header>
  );
}
