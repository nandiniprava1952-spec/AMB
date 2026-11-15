/* Minimal XLSForm (XPath-lite) engine */
(function (root) {
  const TOK = /\s*(\$\{[^}]+\}|'[^']*'|"[^"]*"|\d+(?:\.\d+)?|\.|[A-Za-z_][\w\-]*|<=|>=|!=|[=<>+\-*(),])/y;
  const isDate = s => /^\d{4}-\d\d-\d\d/.test(s);
  const num = v => typeof v === 'boolean' ? +v : typeof v === 'number' ? v :
    v === '' ? NaN : isDate(v) ? Math.floor(Date.UTC(+v.slice(0, 4), +v.slice(5, 7) - 1, +v.slice(8, 10)) / 864e5) : Number(v);
  const bool = v => typeof v === 'boolean' ? v : typeof v === 'number' ? (v !== 0 && !isNaN(v)) : v.length > 0;
  const today = () => { const d = new Date(); return Math.floor(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()) / 864e5); };
  const FN = {
    today, 'false': () => false, 'true': () => true, not: a => !bool(a), number: num,
    int: a => Math.trunc(num(a)), 'decimal-date-time': num,
    round: (a, d = 0) => { const k = 10 ** num(d); return Math.round(num(a) * k) / k; },
    date: a => typeof a === 'number' ? new Date(a * 864e5).toISOString().slice(0, 10) : a,
    regex: (s, p) => new RegExp(p).test(String(s)),
  };
  const cache = {};
  function compile(src) {
    if (cache[src]) return cache[src];
    const t = []; TOK.lastIndex = 0; let m;
    while (TOK.lastIndex < src.length && (m = TOK.exec(src))) t.push(m[1]);
    let i = 0; const peek = () => t[i], next = () => t[i++];
    const bin = (sub, ops) => () => { let l = sub(); while (ops.includes(peek())) { const o = next(), r = sub(), L = l; l = e => OP[o](L(e), r(e)); } return l; };
    const OP = {
      or: (a, b) => bool(a) || bool(b), and: (a, b) => bool(a) && bool(b),
      '=': (a, b) => eq(a, b), '!=': (a, b) => !eq(a, b),
      '<': (a, b) => num(a) < num(b), '>': (a, b) => num(a) > num(b), '<=': (a, b) => num(a) <= num(b), '>=': (a, b) => num(a) >= num(b),
      '+': (a, b) => num(a) + num(b), '-': (a, b) => num(a) - num(b), '*': (a, b) => num(a) * num(b),
      div: (a, b) => num(a) / num(b), mod: (a, b) => num(a) % num(b),
    };
    const eq = (a, b) => (typeof a === 'boolean' || typeof b === 'boolean') ? bool(a) === bool(b)
      : (typeof a === 'number' || typeof b === 'number') ? num(a) === num(b) : String(a) === String(b);
    function primary() {
      const x = next();
      if (x === '(') { const e = or(); next(); return e; }
      if (x === '-') { const e = primary(); return env => -num(e(env)); }
      if (x === '.') return env => env.dot;
      if (x[0] === '$') { const n = x.slice(2, -1); return env => env.get(n); }
      if (x[0] === "'" || x[0] === '"') { const s = x.slice(1, -1); return () => s; }
      if (/^\d/.test(x)) { const n = +x; return () => n; }
      if (peek() === '(') {
        next(); const a = [];
        if (peek() !== ')') { do { a.push(or()); } while (peek() === ',' && next()); }
        next();
        if (x === 'if') return env => bool(a[0](env)) ? a[1](env) : a[2](env);
        const f = FN[x]; return env => f(...a.map(g => g(env)));
      }
      throw new Error('bad token ' + x);
    }
    const mul = bin(primary, ['*', 'div', 'mod']), add = bin(mul, ['+', '-']),
      rel = bin(add, ['<', '>', '<=', '>=']), equ = bin(rel, ['=', '!=']), and = bin(equ, ['and']), or = bin(and, ['or']);
    return (cache[src] = or());
  }
  const fmt = v => typeof v === 'number' ? (isNaN(v) ? '' : String(parseFloat(v.toFixed(6)))) : typeof v === 'boolean' ? (v ? '1' : '') : v;

  // Recompute relevance + calculations. vals: {name: string}. Returns {rel: {name: bool}}
  function run(items, vals) {
    const rel = {}, env = { get: n => vals[n] ?? '', dot: '' };
    for (let pass = 0; pass < 3; pass++) {
      for (const it of items) {
        let ok = true;
        for (const g of it.g || []) if (!bool(compile(g)(env))) { ok = false; break; }
        if (ok && it.rel) ok = bool(compile(it.rel)(env));
        rel[it.n] = ok;
        if (!ok) { if (it.t !== 'note') vals[it.n] = ''; }
        else if (it.t === 'calculate') vals[it.n] = fmt(compile(it.calc)(env));
      }
    }
    return rel;
  }
  const valid = (it, v, vals) => !it.con || bool(compile(it.con)({ get: n => vals[n] ?? '', dot: v }));
  root.Engine = { run, valid, compile };
  if (typeof module !== 'undefined') module.exports = root.Engine;
})(typeof window !== 'undefined' ? window : globalThis);
