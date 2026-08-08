'use strict';

const LEVELS = { PASS: '[PASS] ', WARN: '[WARN] ', INFO: '[INFO] ' };

function createReporter() {
  const lines = [];
  return {
    pass(msg) { lines.push(LEVELS.PASS + msg); },
    warn(msg) { lines.push(LEVELS.WARN + msg); },
    info(msg) { lines.push(LEVELS.INFO + msg); },
    raw(msg) { lines.push(msg); },
    section(title) { lines.push('--- ' + title + ' ---'); },
    getLines() { return lines.slice(); },
  };
}

module.exports = { createReporter };
