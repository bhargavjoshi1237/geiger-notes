// Migration config for @geiger/orm. This product's tables live in the dedicated
// "notes" Postgres schema of the suite-shared Supabase project, and so does
// its migration ledger (notes.geiger_migrations).
export default {
  schema: "notes",
  url: process.env.STRING_URI,
};
