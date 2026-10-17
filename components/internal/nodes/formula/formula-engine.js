// Safe arithmetic evaluator + input extraction for the formula node (no eval / new Function).

const FUNCTIONS = {
  round: (x, d = 0) => {
    const f = 10 ** Math.max(0, Math.min(10, Math.trunc(d)));
    return Math.round(x * f) / f;
  },
  floor: (x) => Math.floor(x),
  ceil: (x) => Math.ceil(x),
  abs: (x) => Math.abs(x),
  min: (...xs) => Math.min(...xs),
  max: (...xs) => Math.max(...xs),
  sqrt: (x) => Math.sqrt(x),
};

export const FORMULA_FUNCTIONS = Object.keys(FUNCTIONS);

function tokenize(src) {
  const tokens = [];
  let i = 0;
  while (i < src.length) {
    const ch = src[i];
    if (/\s/.test(ch)) {
      i += 1;
      continue;
    }
    if (/[0-9.]/.test(ch)) {
      let j = i;
      while (j < src.length && /[0-9.]/.test(src[j])) j += 1;
      if (/[eE]/.test(src[j] || "") && /[-+0-9]/.test(src[j + 1] || "")) {
        j += 2;
        while (j < src.length && /[0-9]/.test(src[j])) j += 1;
      }
      const raw = src.slice(i, j);
      const num = Number(raw);
      if (!Number.isFinite(num)) throw new Error(`Invalid number "${raw}"`);
      tokens.push({ type: "num", value: num });
      i = j;
      continue;
    }
    if (/[A-Za-z_]/.test(ch)) {
      let j = i;
      while (j < src.length && /[A-Za-z0-9_]/.test(src[j])) j += 1;
      tokens.push({ type: "id", value: src.slice(i, j) });
      i = j;
      continue;
    }
    if ("+-*/%^(),".includes(ch)) {
      tokens.push({ type: "op", value: ch });
      i += 1;
      continue;
    }
    throw new Error(`Unexpected "${ch}"`);
  }
  return tokens;
}

// Recursive descent: expr := term (('+'|'-') term)*; term := unary (('*'|'/'|'%') unary)*; unary := '-' unary | power; power := atom ('^' unary)?
function parse(tokens, vars) {
  let pos = 0;
  const peek = () => tokens[pos];
  const isOp = (v) => peek()?.type === "op" && peek().value === v;
  const expect = (v) => {
    if (!isOp(v)) throw new Error(`Expected "${v}"`);
    pos += 1;
  };

  const expr = () => {
    let left = term();
    while (isOp("+") || isOp("-")) {
      const op = tokens[pos++].value;
      const right = term();
      left = op === "+" ? left + right : left - right;
    }
    return left;
  };

  const term = () => {
    let left = unary();
    while (isOp("*") || isOp("/") || isOp("%")) {
      const op = tokens[pos++].value;
      const right = unary();
      if (op === "*") left *= right;
      else if (op === "/") left = right === 0 ? NaN : left / right;
      else left = right === 0 ? NaN : left % right;
    }
    return left;
  };

  const unary = () => {
    if (isOp("-")) {
      pos += 1;
      return -unary();
    }
    if (isOp("+")) {
      pos += 1;
      return unary();
    }
    return power();
  };

  const power = () => {
    const base = atom();
    if (isOp("^")) {
      pos += 1;
      return base ** unary();
    }
    return base;
  };

  const atom = () => {
    const tok = peek();
    if (!tok) throw new Error("Unexpected end of expression");
    if (tok.type === "num") {
      pos += 1;
      return tok.value;
    }
    if (tok.type === "id") {
      pos += 1;
      const name = tok.value;
      if (isOp("(")) {
        const fname = name.toLowerCase();
        const fn = Object.hasOwn(FUNCTIONS, fname) ? FUNCTIONS[fname] : null;
        if (!fn) throw new Error(`Unknown function "${name}"`);
        pos += 1;
        const args = [];
        if (!isOp(")")) {
          args.push(expr());
          while (isOp(",")) {
            pos += 1;
            args.push(expr());
          }
        }
        expect(")");
        if (args.length === 0) throw new Error(`${name}() needs an argument`);
        return fn(...args);
      }
      const key = name.toUpperCase();
      if (!Object.hasOwn(vars, key)) throw new Error(`Unknown variable "${name}"`);
      return vars[key];
    }
    if (tok.type === "op" && tok.value === "(") {
      pos += 1;
      const v = expr();
      expect(")");
      return v;
    }
    throw new Error(`Unexpected "${tok.value}"`);
  };

  const result = expr();
  if (pos < tokens.length) throw new Error(`Unexpected "${tokens[pos].value}"`);
  return result;
}

// Evaluate an arithmetic expression against { A: 1, B: 2 } variables; never throws.
export function evaluateExpression(expression, vars = {}) {
  const src = String(expression ?? "").trim();
  if (!src) return { value: null, error: "Enter an expression" };
  if (src.length > 500) return { value: null, error: "Expression is too long" };
  try {
    const value = parse(tokenize(src), vars);
    if (!Number.isFinite(value)) return { value: null, error: "Result is not a number" };
    return { value, error: null };
  } catch (e) {
    return { value: null, error: e.message };
  }
}

// A, B, ... Z, AA, AB ...
export function variableName(index) {
  let n = index;
  let name = "";
  do {
    name = String.fromCharCode(65 + (n % 26)) + name;
    n = Math.floor(n / 26) - 1;
  } while (n >= 0);
  return name;
}

const toNumber = (v) => {
  if (typeof v === "number") return Number.isFinite(v) ? v : null;
  if (typeof v !== "string") return null;
  const cleaned = v.replace(/[,\s$€£%]/g, "");
  if (!cleaned || !/^[-+]?(\d+\.?\d*|\.\d+)(e[-+]?\d+)?$/i.test(cleaned)) return null;
  const n = Number(cleaned);
  return Number.isFinite(n) ? n : null;
};

export const firstNumber = (text) => {
  const match = String(text ?? "").replace(/,(?=\d{3}\b)/g, "").match(/-?\d+(\.\d+)?/);
  return match ? Number(match[0]) : null;
};

const stripHtml = (s) => String(s ?? "").replace(/<[^>]*>/g, " ");

// Pull numbers out of a connected node: { label, values, scalar, done?, total? } or null when unsupported.
export function extractInput(node, { column = "" } = {}) {
  const data = node?.data ?? {};
  switch (node?.type) {
    case "table": {
      const columns = Array.isArray(data.columns) ? data.columns : [];
      const rows = Array.isArray(data.rows) ? data.rows : [];
      const wanted = String(column ?? "").trim().toLowerCase();
      const colIndex = wanted ? columns.findIndex((c) => String(c).trim().toLowerCase() === wanted) : -1;
      const values = [];
      rows.forEach((row) =>
        (Array.isArray(row) ? row : []).forEach((cell, i) => {
          if (colIndex >= 0 && i !== colIndex) return;
          const n = toNumber(cell);
          if (n !== null) values.push(n);
        }),
      );
      const scope = colIndex >= 0 ? columns[colIndex] : "all cells";
      return { label: `Table · ${scope}`, values, scalar: values.reduce((a, b) => a + b, 0) };
    }
    case "todo": {
      const items = Array.isArray(data.items) ? data.items : [];
      const done = items.filter((it) => it.checked).length;
      return { label: `To-do · ${done}/${items.length} done`, values: [done], scalar: done, done, total: items.length };
    }
    case "column": {
      const items = Array.isArray(data.items) ? data.items : [];
      const todos = items.filter((it) => it.kind === "todo");
      const done = todos.filter((it) => it.checked).length;
      return {
        label: `${data.title || "Column"} · ${items.length} items`,
        values: [items.length],
        scalar: items.length,
        done,
        total: todos.length,
      };
    }
    case "formula": {
      const n = toNumber(data.value);
      return { label: data.label || "Formula", values: n === null ? [] : [n], scalar: n };
    }
    case "custom":
    case "comment":
    case "text": {
      const raw = stripHtml(data.text ?? data.label);
      const n = firstNumber(raw);
      const snippet = raw.trim().slice(0, 24) || "Note";
      return { label: snippet, values: n === null ? [] : [n], scalar: n };
    }
    case "progress": {
      let pct = toNumber(data.percent ?? data.pct);
      if (pct === null) {
        const value = toNumber(data.value);
        const max = toNumber(data.max) ?? 100;
        pct = value === null ? null : max ? (value / max) * 100 : 0;
      }
      return {
        label: data.label || "Progress",
        values: pct === null ? [] : [pct],
        scalar: pct,
        done: pct ?? 0,
        total: 100,
      };
    }
    case "timer": {
      let ms = toNumber(data.elapsedMs ?? data.elapsed) ?? 0;
      const started = toNumber(data.startedAt);
      if (data.running && started) ms += Date.now() - started;
      const minutes = Math.round((ms / 60000) * 100) / 100;
      return { label: data.label || "Timer · minutes", values: [minutes], scalar: minutes };
    }
    default:
      return null;
  }
}

export const FORMULA_OPS = [
  { value: "sum", label: "Sum" },
  { value: "average", label: "Average" },
  { value: "min", label: "Minimum" },
  { value: "max", label: "Maximum" },
  { value: "count", label: "Count" },
  { value: "percent", label: "Percent done" },
  { value: "custom", label: "Custom expression" },
];

// Compute the node value from extracted inputs; returns { value, error }.
export function computeFormula(op, inputs, expression) {
  const all = inputs.flatMap((inp) => inp.values);
  switch (op) {
    case "custom": {
      const vars = {};
      inputs.forEach((inp) => {
        vars[inp.variable] = inp.scalar ?? 0;
      });
      return evaluateExpression(expression, vars);
    }
    case "count":
      return { value: all.length, error: null };
    case "percent": {
      const tracked = inputs.filter((inp) => typeof inp.total === "number" && inp.total > 0);
      if (!tracked.length) return { value: null, error: "Connect a to-do, column or progress node" };
      const done = tracked.reduce((a, inp) => a + inp.done, 0);
      const total = tracked.reduce((a, inp) => a + inp.total, 0);
      return { value: (done / total) * 100, error: null };
    }
    default: {
      if (!all.length) return { value: null, error: inputs.length ? "No numbers found" : "Connect nodes to compute" };
      if (op === "average") return { value: all.reduce((a, b) => a + b, 0) / all.length, error: null };
      if (op === "min") return { value: Math.min(...all), error: null };
      if (op === "max") return { value: Math.max(...all), error: null };
      return { value: all.reduce((a, b) => a + b, 0), error: null };
    }
  }
}

// Render a computed value with the node's number/currency/percent format.
export function formatValue(value, { format = "number", decimals = 0 } = {}) {
  if (typeof value !== "number" || !Number.isFinite(value)) return "—";
  const digits = Math.max(0, Math.min(6, Number(decimals) || 0));
  const opts = { minimumFractionDigits: digits, maximumFractionDigits: digits };
  if (format === "currency") {
    return new Intl.NumberFormat(undefined, { style: "currency", currency: "USD", ...opts }).format(value);
  }
  const text = new Intl.NumberFormat(undefined, opts).format(value);
  return format === "percent" ? `${text}%` : text;
}
