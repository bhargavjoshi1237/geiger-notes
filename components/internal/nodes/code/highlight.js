// Tiny dependency-free regex highlighter: tokenize(code, language) -> lines of { t, v } tokens.

export const LANGUAGES = [
  { value: "js", ext: "js", label: "JavaScript" },
  { value: "ts", ext: "ts", label: "TypeScript" },
  { value: "jsx", ext: "jsx", label: "JSX" },
  { value: "python", ext: "py", label: "Python" },
  { value: "json", ext: "json", label: "JSON" },
  { value: "html", ext: "html", label: "HTML" },
  { value: "css", ext: "css", label: "CSS" },
  { value: "sql", ext: "sql", label: "SQL" },
  { value: "bash", ext: "sh", label: "Bash" },
  { value: "go", ext: "go", label: "Go" },
  { value: "rust", ext: "rs", label: "Rust" },
  { value: "java", ext: "java", label: "Java" },
  { value: "plain", ext: "txt", label: "Plain text" },
];

// Token colours tuned to read on both the light and dark code surface.
export const TOKEN_CLASS = {
  keyword: "text-violet-600 dark:text-violet-400",
  string: "text-emerald-700 dark:text-emerald-400",
  comment: "italic text-zinc-400 dark:text-zinc-500",
  number: "text-amber-600 dark:text-amber-400",
  literal: "text-orange-600 dark:text-orange-400",
  fn: "text-blue-600 dark:text-blue-400",
  type: "text-cyan-700 dark:text-cyan-400",
  punct: "text-zinc-500 dark:text-zinc-400",
  tag: "text-rose-600 dark:text-rose-400",
  attr: "text-amber-700 dark:text-amber-300",
  prop: "text-sky-700 dark:text-sky-300",
  var: "text-pink-600 dark:text-pink-400",
};

const words = (s) => new Set(s.split(/\s+/).filter(Boolean));

const C_LINE = "\\/\\/.*";
const C_BLOCK = "\\/\\*[\\s\\S]*?(?:\\*\\/|$)";
const DQ = '"(?:\\\\.|[^"\\\\\\n])*"';
const SQ = "'(?:\\\\.|[^'\\\\\\n])*'";
const BT = "`(?:\\\\.|[^`\\\\])*`";
const NUM = "\\b(?:0[xXbBoO][\\da-fA-F_]+|\\d[\\d_]*(?:\\.\\d+)?(?:[eE][+-]?\\d+)?)[a-zA-Z]*\\b";
const WORD = "[A-Za-z_$][\\w$]*";
const PUNCT = "[{}()\\[\\];,.:<>=+\\-*/%!&|^~?@#\\\\]";

const JS_KEYWORDS =
  "async await break case catch class const continue debugger default delete do else export extends finally for from function get if import in instanceof let new of return set static super switch throw try typeof var void while with yield";
const TS_KEYWORDS = `${JS_KEYWORDS} abstract as declare enum implements interface is keyof namespace private protected public readonly satisfies type infer`;

const JS_LITERALS = "true false null undefined NaN Infinity this";

const SPECS = {
  js: {
    rules: [["comment", `${C_BLOCK}|${C_LINE}`], ["string", `${BT}|${DQ}|${SQ}`], ["number", NUM], ["word", WORD], ["punct", PUNCT]],
    keywords: words(JS_KEYWORDS),
    literals: words(JS_LITERALS),
  },
  ts: {
    rules: [["comment", `${C_BLOCK}|${C_LINE}`], ["string", `${BT}|${DQ}|${SQ}`], ["number", NUM], ["word", WORD], ["punct", PUNCT]],
    keywords: words(TS_KEYWORDS),
    literals: words(JS_LITERALS),
    types: words("string number boolean any unknown never void object bigint symbol"),
  },
  jsx: {
    rules: [
      ["comment", `${C_BLOCK}|${C_LINE}`],
      ["string", `${BT}|${DQ}|${SQ}`],
      ["tag", "<\\/?[A-Za-z][\\w.:-]*(?=[\\s/>])|\\/?>"],
      ["attr", "[A-Za-z_][\\w-]*(?==[\"'{])"],
      ["number", NUM],
      ["word", WORD],
      ["punct", PUNCT],
    ],
    keywords: words(JS_KEYWORDS),
    literals: words(JS_LITERALS),
  },
  python: {
    rules: [
      ["comment", "#.*"],
      ["string", `[rRbBfFuU]{0,2}(?:"""[\\s\\S]*?(?:"""|$)|'''[\\s\\S]*?(?:'''|$)|${DQ}|${SQ})`],
      ["attr", "@[\\w.]+"],
      ["number", NUM],
      ["word", "[A-Za-z_]\\w*"],
      ["punct", PUNCT],
    ],
    keywords: words(
      "and as assert async await break class continue def del elif else except finally for from global if import in is lambda nonlocal not or pass raise return try while with yield match case",
    ),
    literals: words("True False None self cls"),
    types: words("int float str bool list dict set tuple bytes object"),
  },
  json: {
    rules: [["prop", `${DQ}(?=\\s*:)`], ["string", DQ], ["number", "-?\\b\\d+(?:\\.\\d+)?(?:[eE][+-]?\\d+)?\\b"], ["word", "[A-Za-z]+"], ["punct", PUNCT]],
    keywords: words(""),
    literals: words("true false null"),
  },
  html: {
    rules: [
      ["comment", "<!--[\\s\\S]*?(?:-->|$)"],
      ["tag", "<\\/?[A-Za-z][\\w:-]*|\\/?>|<!DOCTYPE[^>]*>"],
      ["attr", "[A-Za-z_:@][\\w:.-]*(?=\\s*=)"],
      ["string", `${DQ}|${SQ}`],
      ["literal", "&[#\\w]+;"],
    ],
  },
  css: {
    rules: [
      ["comment", C_BLOCK],
      ["string", `${DQ}|${SQ}`],
      ["keyword", "@[\\w-]+|!important"],
      ["prop", "--?[A-Za-z][\\w-]*(?=\\s*:(?:\\s|$|[^a-z-]))|[A-Za-z][\\w-]*(?=\\s*:(?:\\s|$|[^a-z-]))"],
      ["number", "#[\\da-fA-F]{3,8}\\b|-?(?:\\d*\\.)?\\d+(?:px|em|rem|%|vh|vw|vmin|vmax|s|ms|deg|fr|ch|ex|pt)?"],
      ["word", "[A-Za-z_-][\\w-]*"],
      ["punct", PUNCT],
    ],
    keywords: words(""),
    literals: words("inherit initial unset auto none transparent currentColor"),
  },
  sql: {
    flags: "i",
    rules: [["comment", `--.*|${C_BLOCK}`], ["string", "'(?:''|[^'])*'"], ["prop", '"[^"\\n]*"'], ["number", NUM], ["word", "[A-Za-z_]\\w*"], ["punct", PUNCT]],
    keywords: words(
      "select from where and or not insert into values update set delete create table alter drop index view join left right inner outer full cross on as group by order having limit offset distinct union all case when then else end is in like ilike between exists primary key foreign references default unique check constraint returning with recursive begin commit rollback grant revoke to schema if cascade asc desc using over partition",
    ),
    literals: words("null true false"),
    types: words("int integer bigint smallint serial bigserial text varchar char boolean bool uuid jsonb json date time timestamp timestamptz numeric decimal real float double"),
    caseInsensitive: true,
  },
  bash: {
    rules: [
      ["comment", "(?<![\\w$])#.*"],
      ["string", `"(?:\\\\.|[^"\\\\])*"|'[^']*'`],
      ["var", "\\$(?:\\{[^}\\n]*\\}|\\w+|[@#?$!*])"],
      ["attr", "(?<=\\s)--?[A-Za-z][\\w-]*"],
      ["number", NUM],
      ["word", "[A-Za-z_][\\w-]*"],
      ["punct", "[{}()\\[\\];|&<>=]"],
    ],
    keywords: words("if then else elif fi for while until do done case esac in function return export local readonly select break continue exit source alias unset shift"),
    literals: words("true false"),
    noTypes: true,
  },
  go: {
    rules: [["comment", `${C_BLOCK}|${C_LINE}`], ["string", `${DQ}|\`[^\`]*\`|'(?:\\\\.|[^'\\\\])+'`], ["number", NUM], ["word", WORD], ["punct", PUNCT]],
    keywords: words(
      "break case chan const continue default defer else fallthrough for func go goto if import interface map package range return select struct switch type var",
    ),
    literals: words("true false nil iota"),
    types: words("int int8 int16 int32 int64 uint uint8 uint16 uint32 uint64 float32 float64 string bool byte rune error any"),
  },
  rust: {
    rules: [
      ["comment", `${C_BLOCK}|${C_LINE}`],
      ["string", `${DQ}|'(?:\\\\.|[^'\\\\])'`],
      ["type", "'[a-z_]\\w*(?!')"],
      ["fn", "[A-Za-z_]\\w*!"],
      ["number", NUM],
      ["word", "[A-Za-z_]\\w*"],
      ["punct", PUNCT],
    ],
    keywords: words(
      "as async await break const continue crate dyn else enum extern fn for if impl in let loop match mod move mut pub ref return static struct super trait type unsafe use where while",
    ),
    literals: words("true false self Self Some None Ok Err"),
    types: words("i8 i16 i32 i64 i128 isize u8 u16 u32 u64 u128 usize f32 f64 bool char str String Vec Option Result Box"),
  },
  java: {
    rules: [
      ["comment", `${C_BLOCK}|${C_LINE}`],
      ["string", `"""[\\s\\S]*?(?:"""|$)|${DQ}|'(?:\\\\.|[^'\\\\])'`],
      ["attr", "@\\w+"],
      ["number", NUM],
      ["word", WORD],
      ["punct", PUNCT],
    ],
    keywords: words(
      "abstract assert break case catch class const continue default do else enum extends final finally for goto if implements import instanceof interface native new package private protected public return static strictfp super switch synchronized throw throws transient try var void volatile while record yield sealed permits",
    ),
    literals: words("true false null this"),
    types: words("int long short byte char float double boolean String Object"),
  },
};

const compiled = new Map();

function getSpec(language) {
  const spec = SPECS[language];
  if (!spec) return null;
  if (!compiled.has(language)) {
    const source = spec.rules.map(([, src]) => `(${src})`).join("|");
    compiled.set(language, new RegExp(source, `g${spec.flags || ""}`));
  }
  return { ...spec, regex: compiled.get(language) };
}

function classifyWord(spec, word, code, end) {
  const key = spec.caseInsensitive ? word.toLowerCase() : word;
  if (spec.keywords?.has(key)) return "keyword";
  if (spec.literals?.has(key)) return "literal";
  if (spec.types?.has(key)) return "type";
  if (/^\s*\(/.test(code.slice(end, end + 40))) return "fn";
  if (!spec.caseInsensitive && !spec.noTypes && /^[A-Z][a-z\d]/.test(word)) return "type";
  return null;
}

// Split a flat token list into per-line token arrays.
function toLines(tokens) {
  const lines = [[]];
  for (const tok of tokens) {
    tok.v.split("\n").forEach((part, i) => {
      if (i > 0) lines.push([]);
      if (part) lines[lines.length - 1].push({ t: tok.t, v: part });
    });
  }
  return lines;
}

export function tokenize(code, language) {
  const text = code || "";
  const spec = getSpec(language);
  if (!spec) return toLines([{ t: null, v: text }]);

  const re = spec.regex;
  re.lastIndex = 0;
  const tokens = [];
  let last = 0;
  let m;
  while ((m = re.exec(text))) {
    if (m[0] === "") {
      re.lastIndex++;
      continue;
    }
    if (m.index > last) tokens.push({ t: null, v: text.slice(last, m.index) });
    const group = m.findIndex((g, i) => i > 0 && g !== undefined);
    let type = spec.rules[group - 1][0];
    if (type === "word") type = classifyWord(spec, m[0], text, re.lastIndex);
    tokens.push({ t: type, v: m[0] });
    last = re.lastIndex;
  }
  if (last < text.length) tokens.push({ t: null, v: text.slice(last) });
  return toLines(tokens);
}
