// The browser client is a singleton, so its default schema must not depend on which factory loads first. Run from the app root:
//   npm run test:collab
import test from "node:test";
import assert from "node:assert/strict";

process.env.NEXT_PUBLIC_SUPABASE_URL = "http://localhost:54321";
process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = "test-anon-key";
// createBrowserClient only caches its singleton when it detects a browser.
globalThis.window = { document: { cookie: "" }, location: { href: "http://localhost/", pathname: "/", search: "", hash: "" } };
globalThis.document = globalThis.window.document;

const { createClient: createFromLib } = await import("../../supabase/client.js");
const { createClient: createFromUtils } = await import("../../../utils/supabase/client.js");

test("the shared client defaults to notes when the lib factory runs first", () => {
  const client = createFromLib();
  assert.equal(createFromUtils(), client);
  assert.equal(client.rest.schemaName, "notes");
});
