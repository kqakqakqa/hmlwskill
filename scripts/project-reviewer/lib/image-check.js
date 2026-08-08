'use strict';

const fs = require('fs');

function readImageSize(filePath) {
  const fd = fs.openSync(filePath, 'r');
  const buf = Buffer.alloc(4096);
  const bytesRead = fs.readSync(fd, buf, 0, 4096, 0);
  fs.closeSync(fd);
  const b = buf.slice(0, bytesRead);
  if (b.length < 8) return null;

  if (b[0] === 0x89 && b[1] === 0x50 && b[2] === 0x4e && b[3] === 0x47) {
    if (b.length >= 24) {
      return { width: b.readUInt32BE(16), height: b.readUInt32BE(20) };
    }
  } else if (b[0] === 0x47 && b[1] === 0x49 && b[2] === 0x46) {
    return { width: b.readUInt16LE(6), height: b.readUInt16LE(8) };
  } else if (b[0] === 0x42 && b[1] === 0x4d) {
    return { width: b.readUInt32LE(18), height: b.readUInt32LE(22) };
  } else if (b[0] === 0xff && b[1] === 0xd8) {
    let offset = 2;
    while (offset + 9 <= b.length) {
      if (b[offset] !== 0xff) { offset++; continue; }
      const marker = b[offset + 1];
      if (marker === 0xd8 || marker === 0xd9) { offset += 2; continue; }
      const length = b.readUInt16BE(offset + 2);
      if (marker >= 0xc0 && marker <= 0xc3) {
        return { width: b.readUInt16BE(offset + 7), height: b.readUInt16BE(offset + 5) };
      }
      if (marker === 0xda) break;
      offset += 2 + length;
    }
  }
  return null;
}

function checkImagePool(imageFiles, skipDimensions, reporter) {
  const imageBytes = imageFiles.reduce((s, f) => s + f.size, 0);
  reporter.info('Compressed image assets total: ' + imageBytes.toLocaleString() + ' bytes. This is not decoded pool usage.');
  if (skipDimensions) {
    reporter.info('Decoded image estimates skipped by -SkipImageDimensions.');
    return;
  }
  const details = [];
  for (const f of imageFiles) {
    try {
      const size = readImageSize(f.path);
      if (!size) {
        reporter.info('Could not inspect image dimensions: ' + f.path);
        continue;
      }
      details.push({ path: f.path, width: size.width, height: size.height, compressed: f.size, decoded: size.width * size.height * 4 });
    } catch (e) {
      reporter.info('Could not inspect image dimensions: ' + f.path);
    }
  }
  if (details.length > 0) {
    const decodedTotal = details.reduce((s, d) => s + d.decoded, 0);
    reporter.info('All image assets would occupy approximately ' + (decodedTotal / (1024 * 1024)).toFixed(2) + ' MiB if decoded simultaneously.');
    const top = details
      .sort((a, b) => (b.decoded - a.decoded) || (a.path > b.path ? -1 : a.path < b.path ? 1 : 0))
      .slice(0, 10);
    for (const d of top) {
      reporter.info('Image ' + d.width + 'x' + d.height + ', decoded~' + (d.decoded / (1024 * 1024)).toFixed(2) + ' MiB, file=' + d.compressed.toLocaleString() + ' bytes: ' + d.path);
    }
  }
}

module.exports = { readImageSize, checkImagePool };
