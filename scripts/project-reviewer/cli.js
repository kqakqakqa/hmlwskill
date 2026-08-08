'use strict';

const path = require('path');
const { createReporter } = require('./lib/reporter');
const utils = require('./lib/utils');
const scan = require('./lib/scan');
const jsSyntax = require('./lib/js-syntax');
const apiCheck = require('./lib/api-check');
const hmlCheck = require('./lib/hml-check');
const resources = require('./lib/resources');
const audioCheck = require('./lib/audio-check');
const imageCheck = require('./lib/image-check');

function parseArgs(argv) {
  const args = { targetHeapKB: 64, targetApi: 6, skipImageDimensions: false, projectPath: null, sdkApiPath: null, builtJsPath: null };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    const next = () => { i++; return argv[i]; };
    if (/^-ProjectPath$/i.test(a)) args.projectPath = next();
    else if (/^-TargetHeapKB$/i.test(a)) args.targetHeapKB = parseInt(next(), 10);
    else if (/^-TargetApi$/i.test(a)) args.targetApi = parseInt(next(), 10);
    else if (/^-SkipImageDimensions$/i.test(a)) args.skipImageDimensions = true;
    else if (/^-SdkApiPath$/i.test(a)) args.sdkApiPath = next();
    else if (/^-BuiltJsPath$/i.test(a)) args.builtJsPath = next();
  }
  return args;
}

function main(argv) {
  const args = parseArgs(argv);
  const reporter = createReporter();
  const ctx = { targetHeapKB: args.targetHeapKB, targetApi: args.targetApi, sdkApiPath: args.sdkApiPath, builtJsPath: args.builtJsPath };

  if (!args.projectPath) {
    console.error('[ERROR] -ProjectPath is required.');
    process.exit(2);
  }
  const root = path.resolve(args.projectPath);
  reporter.raw('Huawei Lite Wearable project review');
  reporter.raw('Project: ' + root);
  reporter.raw('Target: API ' + ctx.targetApi + ', JS heap ' + ctx.targetHeapKB + ' KB');

  const liteConfigs = scan.findLiteConfigs(root);
  const inventory = scan.collectInventory(liteConfigs);
  scan.checkInventory(liteConfigs, inventory, ctx.targetHeapKB, reporter);

  const combined = inventory.jsFiles.map((f) => utils.readText(f.path)).join('\n');
  reporter.section('JavaScript source syntax');
  const jsSyntaxStats = jsSyntax.checkSource(inventory.jsFiles, combined, reporter);
  jsSyntax.checkBuilt(ctx.builtJsPath, reporter);

  reporter.section('Platform API declarations');
  apiCheck.checkPlatform(combined, ctx, reporter);

  reporter.section('HML Lite whitelist');
  hmlCheck.checkHmlFiles(inventory.hmlFiles, ctx.targetApi, reporter);

  reporter.section('Resource layout and paths');
  resources.checkResourceLayout(inventory, combined, reporter);

  reporter.section('Audio');
  audioCheck.checkAudio(inventory, combined, liteConfigs, jsSyntaxStats, reporter);

  reporter.section('Image pool');
  imageCheck.checkImagePool(inventory.imageFiles, args.skipImageDimensions, reporter);

  console.log(reporter.getLines().join('\n'));
  console.log('Review complete. Findings are heuristic and do not replace DevEco build, Lite Wearable simulator, or target-device testing.');
}

main(process.argv.slice(2));
