// Applies supabase/migrations/*.sql in filename order over a direct Postgres
// connection (STRING_URI). Ported from geiger-flow. Statements are split with a
// dollar-quote-aware parser so plpgsql function bodies stay intact.
//
//   npm run db:push          apply every migration (idempotent)
//   npm run db:clean         drop only the notes project/ability objects, then
//                            leave personal tables (boards/base/collab/...) alone
//
// STRING_URI is a direct (server-only) Postgres URI — never NEXT_PUBLIC_. The
// npm scripts load it via `node --env-file=.env`; the optional dotenv require
// below is a fallback when the script is run directly.

try {
  require("dotenv").config();
} catch {
  // dotenv is optional — `node --env-file=.env` already populated process.env.
}

const { Client } = require("pg");
const fs = require("fs");
const path = require("path");

const STRING_URI = process.env.STRING_URI;

if (!STRING_URI) {
  console.error("ERROR: STRING_URI environment variable is not set.");
  process.exit(1);
}

const MIGRATIONS_DIR = "supabase/migrations";

// Migrations run sequentially, ordered by filename (e.g. 0001_*, 0002_*).
// Drop a new numbered .sql file into the migrations folder to add a feature.
function getMigrationFiles() {
  const dir = path.join(process.cwd(), MIGRATIONS_DIR);
  if (!fs.existsSync(dir)) {
    return [];
  }
  return fs
    .readdirSync(dir)
    .filter((file) => file.endsWith(".sql"))
    .sort()
    .map((file) => `${MIGRATIONS_DIR}/${file}`);
}

const SQL_FILES = getMigrationFiles();

function stripLeadingComments(stmt) {
  const lines = stmt.split("\n");
  let i = 0;
  while (
    i < lines.length &&
    (lines[i].trim() === "" || lines[i].trim().startsWith("--"))
  ) {
    i++;
  }
  return lines.slice(i).join("\n").trim();
}

// Dollar-quote ($$ … $$) aware splitter so plpgsql bodies are not cut on the
// semicolons inside them.
function splitStatements(sql) {
  const statements = [];
  let current = "";
  let inDollarQuote = false;
  let dollarTag = "";
  let i = 0;

  while (i < sql.length) {
    if (sql[i] === "$") {
      const tagMatch = sql.slice(i).match(/^\$([a-zA-Z_]*)\$/);
      if (tagMatch) {
        const tag = tagMatch[0];
        if (!inDollarQuote) {
          inDollarQuote = true;
          dollarTag = tag;
          current += tag;
          i += tag.length;
          continue;
        } else if (tag === dollarTag) {
          inDollarQuote = false;
          current += tag;
          i += tag.length;
          dollarTag = "";
          continue;
        }
      }
    }

    if (sql[i] === ";" && !inDollarQuote) {
      current += ";";
      const code = stripLeadingComments(current);
      if (code) {
        statements.push(code);
      }
      current = "";
      i++;
      continue;
    }

    if (sql[i] === "-" && sql[i + 1] === "-" && !inDollarQuote) {
      const lineEnd = sql.indexOf("\n", i);
      if (lineEnd === -1) {
        current += sql.slice(i);
        break;
      }
      current += sql.slice(i, lineEnd + 1);
      i = lineEnd + 1;
      continue;
    }

    current += sql[i];
    i++;
  }

  const code = stripLeadingComments(current);
  if (code) {
    statements.push(code);
  }

  return statements;
}

// --clean drops ONLY the project-access layer this repo added to the notes
// schema. It never touches the relocated personal tables (boards/base/collab/
// documents/user_settings) or the suite-shared public.* tables.
async function clean(client) {
  console.log("Dropping notes project/ability objects...");
  const tables = ["project_boards", "role_ability", "open_module"];
  for (const t of tables) {
    await client.query(`DROP TABLE IF EXISTS notes.${t} CASCADE`);
    console.log(`  Dropped table: notes.${t}`);
  }
  const functions = [
    "has_ability(uuid, text)",
    "project_role(uuid)",
    "project_org(uuid)",
    "is_org_member(uuid)",
    "can_access_project(uuid)",
  ];
  for (const fn of functions) {
    await client.query(`DROP FUNCTION IF EXISTS notes.${fn} CASCADE`);
    console.log(`  Dropped function: notes.${fn}`);
  }
  console.log("Clean complete.\n");
}

async function run() {
  const client = new Client({
    connectionString: STRING_URI,
    ssl: { rejectUnauthorized: false },
  });

  try {
    await client.connect();
    console.log("Connected to database.\n");

    if (process.argv.includes("--clean")) {
      await clean(client);
    }

    for (const file of SQL_FILES) {
      const filePath = path.join(process.cwd(), file);
      if (!fs.existsSync(filePath)) {
        console.log(`SKIP (not found): ${file}`);
        continue;
      }

      console.log(`\n========== ${file} ==========`);
      const sql = fs.readFileSync(filePath, "utf-8");
      const statements = splitStatements(sql);

      for (const stmt of statements) {
        try {
          await client.query(stmt);
          console.log(`  OK: ${stmt.slice(0, 80).replace(/\n/g, " ")}`);
        } catch (err) {
          console.error("Statement error:");
          console.error(err);
        }
      }
    }

    console.log("\nDone.");
  } catch (err) {
    console.error("Fatal error:");
    console.error(err);
    process.exit(1);
  } finally {
    await client.end();
  }
}

run();
