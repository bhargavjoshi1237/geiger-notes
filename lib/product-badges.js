// Live badges as { href: label }, or null if the read fails so SuiteHeader keeps its built-in ones.
// Plain REST on purpose: the table is public and lives in the public schema, while this app's clients default to notes.
export async function fetchProductBadges() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return null;

  try {
    const response = await fetch(`${url}/rest/v1/suite_product_badges?select=href,badge&deleted_at=is.null&badge=not.is.null`, {
      headers: { apikey: key, "Accept-Profile": "public" },
      next: { revalidate: 60 },
      signal: AbortSignal.timeout(2000),
    });
    if (!response.ok) return null;
    const rows = await response.json();
    return Object.fromEntries(rows.map((row) => [row.href, row.badge]));
  } catch {
    return null;
  }
}
