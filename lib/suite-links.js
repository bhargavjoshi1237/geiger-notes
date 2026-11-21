// Suite hub (geiger-dash) links; in production notes is served under the hub's domain.
export const DASH_URL = (process.env.NEXT_PUBLIC_DASH_URL || "https://geiger.studio").replace(/\/$/, "");

export const SUITE_LINKS = {
  organizations: `${DASH_URL}/org`,
  organization: (orgId) => `${DASH_URL}/org/${orgId}`,
  profile: (userId) => `${DASH_URL}/profile/${userId}`,
  billing: `${DASH_URL}/billing`,
  docs: `${DASH_URL}/docs`,
  changelog: `${DASH_URL}/changelog`,
  support: "mailto:support@geiger.studio?subject=Geiger%20Notes%20Support",
};
