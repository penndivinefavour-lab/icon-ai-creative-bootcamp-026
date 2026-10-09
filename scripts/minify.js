'use strict';
/* String/regex-aware JavaScript minifier.
 *
 * Naive comment strippers break on the regex literal in money() and on SVG
 * strings containing "//"-like sequences, so this walks a token state machine
 * that understands line comments, block comments, strings and regex literals.
 *
 * Strings and regexes are stashed out and re-inserted AFTER the code-only
 * whitespace pass, so the pass can never corrupt their contents (an earlier
 * version collapsed "0px 0px -8% 0px" into an invalid IntersectionObserver
 * rootMargin and aborted init()).
 *
 * Usage: node scripts/minify.js <in.js> <out.js>
 * Exit code 1 on any problem; both files must parse afterwards.
 */
const fs = require('fs');

function minify(src) {
  let code = '';
  const literals = [];
  let i = 0;
  let lastSig = '';      // last significant token, for regex-vs-division

  function stashLiteral(text) {
    code += '\u0000' + literals.length + '\u0001';
    literals.push(text);
  }

  const OPERAND_END = new Set([')', ']', '}']);
  const NON_EXPR = new Set(['(', '[', '{', ',', ';', ':', '=', '+', '-', '*',
    '/', '%', '<', '>', '!', '?', '&', '|', '^', '~']);

  function isRegexStart() {
    // A "/" is a regex literal unless it directly follows a complete operand.
    const t = lastSig.trim();
    if (!t) return true;
    const c = t[t.length - 1];
    if (OPERAND_END.has(c)) return false;
    if (NON_EXPR.has(c)) return true;
    if (/^\d/.test(t)) return false;        // number → division
    if (t === 'true' || t === 'false' || t === 'this' || t === 'null') return false;
    // Keywords that cannot end an operand expression
    if (/^(return|typeof|new|instanceof|in|of|void|delete|throw|case|do|else|yield|await|if|for|while|switch|var|let|const|function)$/.test(t)) return true;
    return false;                            // identifier → division
  }

  while (i < src.length) {
    const c = src[i];
    const n = src[i + 1];

    if (c === '/' && n === '/') {           // line comment
      i += 2;
      while (i < src.length && src[i] !== '\n') i++;
      continue;
    }
    if (c === '/' && n === '*') {           // block comment
      i += 2;
      while (i < src.length && !(src[i] === '*' && src[i + 1] === '/')) i++;
      i += 2;
      continue;
    }
    if (c === '"' || c === "'") {           // string literal
      const q = c;
      let s = q;
      i++;
      while (i < src.length && src[i] !== q) {
        if (src[i] === '\\') { s += src[i] + src[i + 1]; i += 2; continue; }
        s += src[i];
        if (src[i] === '\n') throw new Error('unterminated string');
        i++;
      }
      s += q; i++;
      stashLiteral(s); lastSig = s; continue;
    }
    if (c === '`') {                        // template literal
      let s = '`'; i++;
      while (i < src.length && src[i] !== '`') {
        if (src[i] === '\\') { s += src[i] + src[i + 1]; i += 2; continue; }
        s += src[i];
        if (src[i] === '\n') throw new Error('unterminated template');
        i++;
      }
      s += '`'; i++;
      stashLiteral(s); lastSig = s; continue;
    }
    if (c === '/' && isRegexStart()) {      // regex literal
      let s = '/';
      i++;
      let inClass = false;
      while (i < src.length) {
        const ch = src[i];
        if (ch === '\\') { s += ch + src[i + 1]; i += 2; continue; }
        if (ch === '[') inClass = true;
        if (ch === ']') inClass = false;
        if (ch === '/' && !inClass) break;
        if (ch === '\n') throw new Error('unterminated regex');
        s += ch; i++;
      }
      s += '/'; i++;
      while (i < src.length && /[a-z]/i.test(src[i])) { s += src[i]; i++; }
      stashLiteral(s); lastSig = s; continue;
    }

    // Ordinary code: accumulate identifier chars so the last MEANINGFUL token
    // (e.g. the keyword "return") is available for regex-vs-division detection.
    // A fresh identifier RESETS the accumulator (lastSig must be one whole token,
    // never ";return"), while punctuation replaces it.
    if (/[A-Za-z0-9_$]/.test(c)) {
      if (lastSig && !/[A-Za-z0-9_$]/.test(lastSig[lastSig.length - 1])) lastSig = '';
      code += c;
      lastSig += c;
      i++;
      continue;
    }
    if (/[^\sA-Za-z0-9_$]/.test(c)) {
      code += c;
      lastSig = c;
      i++;
      continue;
    }

    // Whitespace runs become a single space.
    code += ' ';
    // NOTE: deliberately do NOT touch lastSig here — regex-vs-division must
    // be decided by the last MEANINGFUL token, not by whitespace.
    i++;
  }

  // Collapse the single spaces that have no semantic purpose — CODE ONLY.
  let r = code.replace(/\s+/g, ' ');
  r = r.replace(/\s*([(){}\[\];,:.<>!%&|^~?+\-*/=])\s*/g, '$1');
  // Undo damage to `++`/`--` that got split
  r = r.replace(/\+\s*\+/g, '++').replace(/-\s*-/g, '--');
  // Keep a space after keywords that must be followed by an identifier/expression
  r = r.replace(/\b(return|typeof|new|instanceof|void|delete|throw|case|in|of|var|let|const|if|else|for|while|do|switch|function|yield|await|extends|get|set)\s*\(/g, '$1 (');
  r = r.replace(/\b(return|case|throw|typeof|void|delete|new)\s+([A-Za-z_$\u0000"'])/g, '$1 $2');
  // Re-insert the untouched literals.
  r = r.replace(/\u0000(\d+)\u0001/g, (m, d) => literals[+d]);
  // Any leftover placeholder means a literal vanished — fail loudly.
  if (/\u0000|\u0001/.test(r)) throw new Error('literal placeholder leak');
  return r.trim();
}

function main() {
  const [inPath, outPath] = process.argv.slice(2);
  if (!inPath || !outPath) {
    console.error('usage: node scripts/minify.js <in.js> <out.js>');
    process.exit(1);
  }
  const src = fs.readFileSync(inPath, 'utf8');
  const res = minify(src);

  // Both must parse.
  new Function(src);
  new Function(res);

  fs.writeFileSync(outPath, res, 'utf8');
  const kb = (b) => (b / 1024).toFixed(2) + 'KB';
  console.log('%s → %s  (%s → %s)', inPath, outPath, kb(src.length), kb(res.length));
}

main();
