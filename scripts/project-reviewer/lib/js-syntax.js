'use strict';

const fs = require('fs');
const path = require('path');
const { readText, stripJsStringsAndComments, getLineNumber, findPatternInFiles } = require('./utils');

const DOCUMENTED = [
  { label: 'documented Lite ES6: let/const', pattern: '(?m)\\b(let|const)\\s+[A-Za-z_$]' },
  { label: 'documented Lite ES6: arrow function', pattern: '=>' },
  { label: 'documented Lite ES6: class', pattern: '(?m)\\bclass\\s+[A-Za-z_$]' },
  { label: 'documented Lite ES6: for-of', pattern: '(?m)\\bfor\\s*\\([^)]*\\bof\\b' },
  { label: 'documented Lite ES6: template string', pattern: '`' },
  { label: 'documented Lite ES6: static module declaration', pattern: '(?m)^\\s*(import|export)\\b' },
];

const FORBIDDEN = [
  { label: 'not in Lite allowlist: async/await', pattern: '(?m)\\basync\\b|\\bawait\\b' },
  { label: 'not in Lite allowlist: generator/yield', pattern: '(?m)\\bfunction\\s*\\*|\\byield\\b' },
  { label: 'not in Lite allowlist: optional chaining', pattern: '\\?\\.' },
  { label: 'not in Lite allowlist: nullish coalescing', pattern: '\\?\\?' },
  { label: 'not in Lite allowlist: dynamic import', pattern: '\\bimport\\s*\\(' },
  { label: 'not in Lite allowlist: BigInt literal', pattern: '(?<![A-Za-z0-9_$])\\d+n\\b' },
  { label: 'dynamic code execution', pattern: '(?m)(^|[^A-Za-z0-9_])(eval\\s*\\(|new\\s+Function\\s*\\(|Function\\s*\\()' },
  { label: 'QuickJS/interpreter embedding', pattern: '(?i)quickjs|evalCode|quickjsContext' },
];

const BUILTINS = '\\b(Promise|Map|Set|WeakMap|WeakSet|Symbol|Proxy|Reflect)\\b';
const COMMONJS = '(?m)\\b(require\\s*\\(|Buffer\\b|process\\.|__dirname\\b)';
const MAX_BUILT_JS_BYTES = 48 * 1024;

function findSpreadAndRest(files, prefix, reporter) {
  let restCount = 0;
  let spreadCount = 0;
  const spreadExamples = [];
  for (const file of files) {
    const original = readText(file.path);
    const text = stripJsStringsAndComments(original);
    for (const match of text.matchAll(/\.\.\./g)) {
      const before = text.slice(0, match.index);
      const after = text.slice(match.index + 3);
      const openIndex = before.lastIndexOf('(');
      const closeOffset = after.indexOf(')');
      let isRest = false;
      if (openIndex >= 0 && closeOffset >= 0) {
        const beforeOpen = before.slice(Math.max(0, openIndex - 100), openIndex);
        const afterClose = after.slice(closeOffset + 1).trimStart();
        if (
          /(?:\bfunction(?:\s+[A-Za-z_$][A-Za-z0-9_$]*)?\s*$)/.test(beforeOpen) ||
          afterClose.startsWith('=>') ||
          (afterClose.startsWith('{') && /[A-Za-z_$][A-Za-z0-9_$]*\s*$/.test(beforeOpen))
        ) {
          isRest = true;
        }
      }
      if (isRest) restCount++;
      else {
        spreadCount++;
        if (spreadExamples.length < 5) spreadExamples.push(file.path + ':' + getLineNumber(original, match.index));
      }
    }
  }
  if (restCount > 0) reporter.info(prefix + 'documented Lite ES6 rest parameter: ' + restCount + ' occurrence(s).');
  if (spreadCount > 0) {
    reporter.warn(prefix + 'spread syntax is not in the Lite allowlist: ' + spreadCount + ' occurrence(s); examples: ' + spreadExamples.join(', '));
  }
}

function checkSource(jsFiles, combined, reporter) {
  for (const check of DOCUMENTED) {
    findPatternInFiles(jsFiles, check.pattern, 'INFO', check.label + ' (allowed in .js source; check heap/build output)', reporter);
  }
  for (const check of FORBIDDEN) {
    findPatternInFiles(jsFiles, check.pattern, 'WARN', check.label, reporter);
  }
  findSpreadAndRest(jsFiles, '', reporter);
  findPatternInFiles(jsFiles, BUILTINS, 'INFO', 'runtime built-in requires SDK/build/device proof', reporter);
  findPatternInFiles(jsFiles, COMMONJS, 'WARN', 'CommonJS/Node-style construct in runtime JS; Lite docs only list static import/export', reporter);

  const count = (re) => (combined.match(re) || []).length;
  const timerCreates = count(/\bset(Interval|Timeout)\s*\(/g);
  const timerClears = count(/\bclear(Interval|Timeout)\s*\(/g);
  if (timerCreates > 0) {
    const level = timerClears === 0 ? 'WARN' : 'INFO';
    reporter[level.toLowerCase()]('Timers: create calls=' + timerCreates + ', clear calls=' + timerClears + '. Review every lifecycle path.');
  }
  const subscribes = count(/\.subscribe[A-Za-z0-9_]*\s*\(/g);
  const unsubscribes = count(/\.unsubscribe[A-Za-z0-9_]*\s*\(/g);
  if (subscribes > 0) {
    const level = unsubscribes === 0 ? 'WARN' : 'INFO';
    reporter[level.toLowerCase()]('Subscriptions: subscribe calls=' + subscribes + ', unsubscribe calls=' + unsubscribes + '.');
  }
  return { timerCreates, timerClears };
}

function checkBuilt(builtJsPath, reporter) {
  if (!builtJsPath) return null;
  if (!fs.existsSync(builtJsPath)) {
    reporter.warn('Built JS path not found: ' + builtJsPath);
    return null;
  }
  const builtFiles = [];
  const walk = (dir) => {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) { walk(full); continue; }
      if (entry.name.endsWith('.js')) builtFiles.push({ path: full, size: fs.statSync(full).size, name: entry.name, dir, ext: '.js' });
    }
  };
  walk(builtJsPath);
  reporter.info('Built JS path: ' + path.resolve(builtJsPath) + '; files=' + builtFiles.length);
  const oversized = builtFiles.filter((f) => f.size > MAX_BUILT_JS_BYTES).sort((a, b) => b.size - a.size);
  for (const f of oversized) {
    reporter.warn('RELEASE BLOCKER: Built JS exceeds 48 KiB limit (' + f.size.toLocaleString() + ' bytes): ' + f.path);
  }
  for (const check of FORBIDDEN) {
    findPatternInFiles(builtFiles, check.pattern, 'WARN', 'built output ' + check.label, reporter);
  }
  findSpreadAndRest(builtFiles, 'built output ', reporter);
  for (const check of DOCUMENTED) {
    findPatternInFiles(builtFiles, check.pattern, 'INFO', 'modern syntax remains in built output: ' + check.label, reporter);
  }
  findPatternInFiles(builtFiles, BUILTINS, 'WARN', 'built output runtime built-in dependency', reporter);
  return builtFiles.length;
}

module.exports = { checkSource, checkBuilt, findSpreadAndRest };
