// Subpath import, not the barrel: this is a Server Component, so pulling
// @geiger/ui's index would resolve every optional peer this app does not install.
import { SuiteHeader } from "@geiger/ui/suite-header";
import { createClient } from "@/utils/supabase/server";
import { UserProfileDropdown } from "@/components/user-profile-dropdown";
import { fetchProductBadges } from "@/lib/product-badges";

export async function Header() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const userId = user?.id;
  const badges = await fetchProductBadges();

  const profile = userId ? (
    <UserProfileDropdown
      user={{
        id: userId,
        email: user.email,
        name: user.user_metadata?.name,
        fullName: user.user_metadata?.full_name,
        avatarUrl: process.env.NEXT_PUBLIC_SUPABASE_URL
          ? `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/pfp/${userId}/latest.jpg`
          : "",
        dashboardHref: `/${userId}/home`,
      }}
    />
  ) : null;

  return (
    <SuiteHeader
      userId={userId}
      profile={profile}
      badges={badges}
      dashboardHref={userId ? `/${userId}/home` : "/org"}
    />
  );
}
