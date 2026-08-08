'use strict';

const fs = require('fs');
const path = require('path');
const { readText, getLineNumber } = require('./utils');

function getAbilityRoot(filePath) {
  const m = filePath.match(/^(?<root>.*\\js\\[^\\]+)(?:\\|$)/);
  return m ? m.groups.root : null;
}

function checkResourceLayout(inventory, combined, reporter) {
  const imageFiles = inventory.imageFiles;
  const invalidNames = imageFiles.filter((f) => !/^[A-Za-z0-9][A-Za-z0-9_-]*\.(png|jpg|jpeg|bmp|gif|webp)$/.test(f.name));
  for (const f of invalidNames) {
    reporter.warn('RELEASE BLOCKER: image filename must use English ASCII letters/digits/_/- only: ' + f.path);
  }
  const invalidDirs = new Set();
  for (const f of imageFiles) {
    const m = f.path.match(/\\(common|rawfile)\\(?<relative>.+)\\[^\\]+$/);
    if (m) {
      for (const segment of m.groups.relative.split(/\\/)) {
        if (!/^[A-Za-z0-9][A-Za-z0-9_-]*$/.test(segment)) invalidDirs.add(f.dir);
      }
    }
  }
  for (const d of [...invalidDirs].sort()) {
    reporter.warn('RELEASE BLOCKER: image resource subdirectory must use English ASCII letters/digits/_/- only: ' + d);
  }
  if (imageFiles.length > 0 && invalidNames.length === 0 && invalidDirs.size === 0) {
    reporter.pass('Image resource naming: ' + imageFiles.length + ' file(s) use English ASCII paths.');
  }

  const resourceFiles = inventory.jsFiles.concat(inventory.hmlFiles, inventory.cssFiles);
  const checkedRefs = new Set();
  let dynamicRefs = 0;
  for (const file of resourceFiles) {
    const text = readText(file.path);
    for (const pathMatch of text.matchAll(/\/common\/[^'"\s)<>]+/g)) {
      if (/[^\x00-\x7F]/.test(pathMatch[0])) {
        reporter.warn('RELEASE BLOCKER: /common image reference contains non-ASCII characters at ' + file.path + ':' + getLineNumber(text, pathMatch.index) + ': ' + pathMatch[0]);
      }
    }
    dynamicRefs += (text.match(/\/common\/[^'"\s)]*{{/g) || []).length;
    for (const match of text.matchAll(/\/common\/[A-Za-z0-9_.\-/]+/g)) {
      const reference = match[0].replace(/[\/.,]+$/, '');
      const suffix = text.slice(match.index + match[0].length, match.index + match[0].length + 40);
      if (/^\{\{/.test(suffix) || /^['"]\s*\+/.test(suffix)) { dynamicRefs++; continue; }
      if (!reference || checkedRefs.has(file.path + '|' + reference)) continue;
      checkedRefs.add(file.path + '|' + reference);
      const abilityRoot = getAbilityRoot(file.path);
      if (!abilityRoot) {
        reporter.info('Could not resolve Ability root for common resource reference ' + reference + ' at ' + file.path + ':' + getLineNumber(text, match.index));
        continue;
      }
      const relative = reference.slice('/common/'.length).replace(/\//g, path.sep);
      const candidate = path.join(abilityRoot, 'common', relative);
      if (!fs.existsSync(candidate)) {
        reporter.warn('Missing /common resource ' + reference + '; expected ' + candidate + '; referenced at ' + file.path + ':' + getLineNumber(text, match.index));
      }
    }
  }
  if (checkedRefs.size > 0) reporter.pass('Checked ' + checkedRefs.size + ' static /common resource reference(s).');
  if (dynamicRefs > 0) reporter.info('Dynamic /common paths with HML binding: ' + dynamicRefs + '. Enumerate every generated path on device.');

  for (const file of inventory.jsFiles) {
    const text = readText(file.path);
    for (const m of text.matchAll(/^\s*import\b[^\r\n]*\bfrom\s+['"]\/common\/[^'"]+['"]/gm)) {
      reporter.warn('Common JS must use a relative import, not /common absolute resource syntax: ' + file.path + ':' + getLineNumber(text, m.index));
    }
  }

  const allResourceText = resourceFiles.map((f) => readText(f.path)).join('\n');
  const usesFileApi = /['"]@system\.file['"]/.test(combined) || /\bfile\.(access|list|get|readText|writeText|copy|move|delete|mkdir|rmdir)\s*\(/.test(combined);
  const usesRawUri = /internal:\/\/app\/rawfile\//.test(allResourceText);
  const rawImageFiles = imageFiles.filter((f) => /\\resources\\rawfile\\/i.test(f.path));
  if (inventory.rawFiles.length > 0) reporter.info('rawfile packaged resources: ' + inventory.rawFiles.length + ' file(s). Treat the packaged area as read-only.');
  if (usesFileApi || usesRawUri || rawImageFiles.length > 0) {
    reporter.warn('REAL-DEVICE REQUIRED: some DevEco Studio 5.0/API 10 previewer and Lite Wearable simulator environments cannot validate @system.file/rawfile behavior.');
  }
  if (usesRawUri) reporter.info('internal://app/rawfile URI detected; verify packaged path, read/copy result, and failure recovery on a signed target device.');
  if (rawImageFiles.length > 0) reporter.warn('Images stored in rawfile: ' + rawImageFiles.length + '. Package and test their file-path/copy/render flow on a real device; preview is not evidence.');
}

module.exports = { checkResourceLayout, getAbilityRoot };
