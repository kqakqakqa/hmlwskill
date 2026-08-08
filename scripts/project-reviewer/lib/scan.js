'use strict';

const fs = require('fs');
const path = require('path');
const { scanFiles, readText, EXCLUDED } = require('./utils');

function findLiteConfigs(projectPath) {
  const out = [];
  const walk = (dir) => {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      if (EXCLUDED.test(path.join(dir, entry.name))) continue;
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) { walk(full); continue; }
      if (entry.name === 'config.json') {
        const content = readText(full);
        if (content.includes('liteWearable')) out.push(full);
      }
    }
  };
  walk(projectPath);
  return out;
}

function collectInventory(liteConfigs) {
  const roots = liteConfigs.map((c) => path.dirname(c));
  const uniqueRoots = [...new Set(roots)];
  const jsFiles = scanFiles(uniqueRoots, ['.js']).filter((f) => !/\\resources\\rawfile\\/i.test(f.path));
  const rawToolJs = scanFiles(uniqueRoots, ['.js']).filter((f) => /\\resources\\rawfile\\/i.test(f.path));
  const hmlFiles = scanFiles(uniqueRoots, ['.hml']);
  const cssFiles = scanFiles(uniqueRoots, ['.css', '.less', '.scss']);
  const imageFiles = scanFiles(uniqueRoots, ['.png', '.jpg', '.jpeg', '.bmp', '.webp', '.gif']);
  const audioFiles = scanFiles(uniqueRoots, ['.mp3', '.wav', '.ogg', '.m4a', '.aac']);
  const rawFiles = [];
  const walkAll = (dir) => {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) walkAll(full);
      else rawFiles.push({ path: full, size: fs.statSync(full).size, name: entry.name, dir, ext: path.extname(entry.name).toLowerCase() });
    }
  };
  for (const root of uniqueRoots) {
    const rawRoot = path.join(root, 'resources', 'rawfile');
    if (fs.existsSync(rawRoot)) walkAll(rawRoot);
  }
  return { roots: uniqueRoots, jsFiles, rawToolJs, hmlFiles, cssFiles, imageFiles, audioFiles, rawFiles };
}

function checkInventory(liteConfigs, inventory, targetHeapKB, reporter) {
  if (liteConfigs.length === 0) {
    reporter.warn('No source config.json containing liteWearable was found.');
    return;
  }
  for (const c of liteConfigs) reporter.pass('Lite Wearable config: ' + c);
  reporter.info('Scanning configured module root(s): ' + inventory.roots.join(', '));

  const jsBytes = inventory.jsFiles.reduce((s, f) => s + f.size, 0);
  reporter.info(
    'Runtime source files: JS=' + inventory.jsFiles.length + ' (' + jsBytes.toLocaleString() + ' bytes), HML=' +
    inventory.hmlFiles.length + ', styles=' + inventory.cssFiles.length + ', images=' +
    inventory.imageFiles.length + ', audio=' + inventory.audioFiles.length
  );
  if (inventory.rawToolJs.length > 0) {
    reporter.info('Rawfile JS utilities excluded from runtime scan: ' + inventory.rawToolJs.map((f) => f.path).join(', '));
  }
  reporter.info('Source byte size is not runtime heap usage; use it only to locate large modules.');

  const threshold = Math.max(32768, Math.floor((targetHeapKB * 1024) / 2));
  const large = inventory.jsFiles
    .filter((f) => f.size >= threshold)
    .sort((a, b) => b.size - a.size);
  for (const f of large) {
    reporter.warn('Large JS source (' + f.size.toLocaleString() + ' bytes): ' + f.path);
  }
}

module.exports = { findLiteConfigs, collectInventory, checkInventory };
