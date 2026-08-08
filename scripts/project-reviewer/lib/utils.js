'use strict';

const fs = require('fs');
const path = require('path');

const EXCLUDED = /\\+?(build|\.preview|\.hvigor|node_modules|oh_modules|\.git)\\+?/i;

function scanFiles(roots, extensions) {
  const result = [];
  for (const root of roots) {
    const walk = (dir) => {
      for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
        if (EXCLUDED.test(path.join(dir, entry.name))) continue;
        const full = path.join(dir, entry.name);
        if (entry.isDirectory()) { walk(full); continue; }
        const ext = path.extname(entry.name).toLowerCase();
        if (extensions.includes(ext)) {
          result.push({ path: full, size: fs.statSync(full).size, name: entry.name, dir, ext });
        }
      }
    };
    walk(root);
  }
  result.sort((a, b) => (a.path < b.path ? -1 : a.path > b.path ? 1 : 0));
  return result;
}

function readText(p) {
  // CRLF -> LF: JS treats \r as a line terminator for ^ anchoring while .NET does not,
  // normalizing keeps example line numbers identical to the ps1 version.
  return fs.readFileSync(p, 'utf8').replace(/\r\n/g, '\n');
}

function getLineNumber(text, index) {
  if (index <= 0) return 1;
  return text.slice(0, index).split('\n').length;
}

function stripJsStringsAndComments(text) {
  const pattern = /\/\*[\s\S]*?\*\/|(?:\/\/)[^\r\n]*|"(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*'|`(?:\\.|[^`\\])*`/g;
  return text.replace(pattern, (m) => m.replace(/[^\r\n]/g, ' '));
}

function findPatternInFiles(files, pattern, level, label, reporter) {
  const prefixMatch = pattern.match(/^\(\?([ims]+)\)/);
  const baseFlags = prefixMatch ? prefixMatch[1] : '';
  const re = new RegExp(prefixMatch ? pattern.slice(prefixMatch[0].length) : pattern, baseFlags + 'g');
  let count = 0;
  const examples = [];
  for (const file of files) {
    const text = readText(file.path);
    re.lastIndex = 0;
    let m;
    while ((m = re.exec(text)) !== null) {
      count++;
      if (examples.length < 5) examples.push(file.path + ':' + getLineNumber(text, m.index));
      if (m[0].length === 0) re.lastIndex++;
    }
  }
  if (count > 0) {
    reporter[level.toLowerCase()](
      label + ': ' + count + ' occurrence(s); examples: ' + examples.join(', ')
    );
  }
}

module.exports = {
  EXCLUDED,
  scanFiles,
  readText,
  getLineNumber,
  stripJsStringsAndComments,
  findPatternInFiles,
};
