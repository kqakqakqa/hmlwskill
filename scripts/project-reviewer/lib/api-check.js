'use strict';

const fs = require('fs');
const path = require('path');

function extractImports(combined) {
  const imports = [];
  const bindings = [];
  const importRe = /import\s+([A-Za-z_$][A-Za-z0-9_$]*)\s+from\s+['"](@(?:system|ohos|kit)[^'"]+)['"]/g;
  let m;
  while ((m = importRe.exec(combined)) !== null) {
    imports.push(m[2]);
    bindings.push({ local: m[1], module: m[2] });
  }
  return {
    imports: [...new Set(imports)].sort(),
    bindings: bindings.sort((a, b) => (a.local + a.module < b.local + b.module ? -1 : 1)),
  };
}

function annotationsBefore(lines, lineIndex, kind) {
  const values = new Set();
  const start = Math.max(0, lineIndex - 100);
  for (let i = lineIndex - 1; i >= start; i--) {
    const line = lines[i];
    if (kind === 'since') {
      const m = line.match(/@since\s+(\d+)/);
      if (m) values.add(parseInt(m[1], 10));
    } else {
      const m = line.match(/@deprecated\s+since\s+(\d+)/);
      if (m) values.add(parseInt(m[1], 10));
    }
    if (!/^\s*(\/\*\*|\*|\*\/|$)/.test(line)) break;
  }
  return [...values].sort((a, b) => a - b);
}

function resolveSdkApiPath(explicit, env) {
  if (explicit) return explicit;
  for (const key of ['DEVECO_SDK_HOME', 'HARMONYOS_SDK_HOME', 'OHOS_SDK_HOME']) {
    const root = env[key];
    if (!root) continue;
    const candidates = [
      path.join(root, 'default', 'openharmony', 'js', 'api'),
      path.join(root, 'js', 'api'),
    ];
    for (const c of candidates) {
      if (fs.existsSync(c)) return c;
    }
  }
  return null;
}

function checkApi(bindings, combined, sdkApiPath, targetApi, reporter) {
  if (!sdkApiPath || !fs.existsSync(sdkApiPath)) {
    const msg = sdkApiPath
      ? 'SDK API path not found; symbol version checks skipped: ' + sdkApiPath
      : 'SDK API path was not supplied or discovered; symbol version checks skipped.';
    reporter.info(msg);
    return;
  }
  for (const binding of bindings) {
    const declarationPath = path.join(sdkApiPath, binding.module + '.d.ts');
    if (!fs.existsSync(declarationPath)) {
      reporter.info('No local declaration file for ' + binding.module + '; check bundled docs and target SDK.');
      continue;
    }
    const lines = fs.readFileSync(declarationPath, 'utf8').split('\n');
    const usedMethods = [];
    const escaped = binding.local.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const methodRe = new RegExp('\\b' + escaped + '\\.([A-Za-z_$][A-Za-z0-9_$]*)\\s*\\(', 'g');
    let mm;
    while ((mm = methodRe.exec(combined)) !== null) {
      usedMethods.push(mm[1]);
    }
    for (const method of [...new Set(usedMethods)].sort()) {
      let declIndex = -1;
      for (let i = 0; i < lines.length; i++) {
        if (new RegExp('\\b' + method + '\\s*\\(').test(lines[i])) { declIndex = i; break; }
      }
      if (declIndex < 0) {
        reporter.info('SDK symbol not located: ' + binding.module + '.' + method + ' in ' + declarationPath);
        continue;
      }
      const sinceValues = annotationsBefore(lines, declIndex, 'since');
      const deprecatedValues = annotationsBefore(lines, declIndex, 'deprecated');
      const since = sinceValues.length > 0 ? Math.min(...sinceValues) : null;
      if (since !== null && since > targetApi) {
        reporter.warn('API mismatch: ' + binding.module + '.' + method + ' earliest declaration is @since ' + since + ', above target API ' + targetApi + '.');
      } else if (since !== null) {
        reporter.pass('API version: ' + binding.module + '.' + method + ' earliest declaration is @since ' + since + ' (target API ' + targetApi + ').');
      }
      if (deprecatedValues.length > 0) {
        reporter.info('API deprecation: ' + binding.module + '.' + method + ' annotation(s) at API ' + deprecatedValues.join(', ') + '.');
      }
    }
  }
}

function checkPlatform(combined, ctx, reporter) {
  const { imports, bindings } = extractImports(combined);
  if (imports.length > 0) {
    reporter.info('Platform imports: ' + imports.join(', '));
    reporter.info('Check every import against target SDK @since, syscap, permission, and Lite Wearable behavior.');
  }
  checkApi(bindings, combined, ctx.sdkApiPath, ctx.targetApi, reporter);
}

module.exports = { extractImports, resolveSdkApiPath, checkPlatform, checkApi };
