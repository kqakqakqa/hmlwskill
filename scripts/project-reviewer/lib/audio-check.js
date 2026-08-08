'use strict';

const fs = require('fs');
const { readText, getLineNumber } = require('./utils');

function checkAudio(inventory, combined, liteConfigs, timerStats, reporter) {
  if (!/['"]@system\.audio['"]/.test(combined)) return;

  const configText = liteConfigs.map((c) => readText(c)).join('\n');
  if (/ohos\.permission\.MODIFY_AUDIO_SETTINGS/.test(configText)) {
    reporter.pass('Audio permission MODIFY_AUDIO_SETTINGS is declared.');
  } else {
    reporter.warn('@system.audio is used but ohos.permission.MODIFY_AUDIO_SETTINGS was not found in Lite config.');
  }
  if (/internal:\/\/app\/rawfile\/audio\//.test(combined)) {
    reporter.warn('@system.audio source appears to use rawfile directly; copy to internal://app/ before playback.');
  }
  if (!/\baudio\.stop\s*\(/.test(combined)) {
    reporter.warn('@system.audio is used without an audio.stop() call.');
  }
  if (!/\bonDestroy\s*[:(]/.test(combined)) {
    reporter.warn('@system.audio is used without a visible onDestroy lifecycle cleanup.');
  } else if (!/\bonDestroy\s*[:(][\s\S]{0,1200}\baudio\.stop\s*\(/.test(combined)) {
    reporter.warn('onDestroy exists, but audio.stop() was not found near a destruction handler.');
  }
  if (timerStats.timerCreates > 0 && !/\bonDestroy\s*[:(][\s\S]{0,1200}\bclear(Interval|Timeout)\s*\(/.test(combined)) {
    reporter.warn('Audio project creates timers, but timer cleanup was not found near onDestroy.');
  }
  for (const file of inventory.jsFiles) {
    const text = readText(file.path);
    for (const m of text.matchAll(/\baudio\.src\s*=/g)) {
      const prefix = text.slice(Math.max(0, m.index - 500), m.index);
      if (!/\baudio\.stop\s*\(/.test(prefix)) {
        reporter.warn('audio.src assignment has no nearby preceding audio.stop() at ' + file.path + ':' + getLineNumber(text, m.index));
      }
    }
  }
  if (!/internal:\/\/app\/(music|audio)\//.test(combined)) {
    reporter.info('No copied internal://app/music or internal://app/audio playback path was detected; verify the destination path.');
  }
  for (const m of combined.matchAll(/\baudio\.volume\s*=\s*(-?\d+(?:\.\d+)?)/g)) {
    const volume = parseFloat(m[1]);
    if (volume < 0 || volume > 1) reporter.warn('audio.volume literal outside 0.0-1.0: ' + volume);
  }
  if (/\bfile\.copy\s*\(/.test(combined) && /\bfile\.rmdir\s*\(/.test(combined)) {
    reporter.info('file.copy and file.rmdir coexist; verify rmdir runs only after every asynchronous copy and access check completes.');
  }

  const audioBytes = inventory.audioFiles.reduce((s, f) => s + f.size, 0);
  if (inventory.audioFiles.length > 0) {
    reporter.info('Audio assets: files=' + inventory.audioFiles.length + ', compressed total=' + (audioBytes / (1024 * 1024)).toFixed(2) + ' MiB.');
  }
  for (const f of inventory.audioFiles) {
    if (f.ext !== '.mp3') {
      if (['.m4a', '.aac', '.ogg'].includes(f.ext)) {
        reporter.info('Audio format requires explicit target-device decoder verification: ' + f.path);
      }
      continue;
    }
    const buf = Buffer.alloc(12);
    const fd = fs.openSync(f.path, 'r');
    const bytesRead = fs.readSync(fd, buf, 0, 12, 0);
    fs.closeSync(fd);
    const head = bytesRead < 12 ? buf.slice(0, bytesRead) : buf;
    const valid = head.length >= 3 && ((head[0] === 0x49 && head[1] === 0x44 && head[2] === 0x33) || (head[0] === 0xff && (head[1] & 0xe0) === 0xe0));
    if (!valid) reporter.warn('File has .mp3 extension but no ID3/MPEG header: ' + f.path);
    if (f.size > 5 * 1024 * 1024) {
      reporter.info('MP3 exceeds the shalu2 guide experience target of 5 MiB; verify storage/device budget: ' + f.path);
    }
  }
}

module.exports = { checkAudio };
