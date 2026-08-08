'use strict';

const { readText, getLineNumber } = require('./utils');

const ALLOWED_TAGS = ['div', 'canvas', 'stack', 'qrcode', 'list', 'list-item', 'swiper', 'tabs', 'tab-bar', 'tab-content', 'image-animator', 'image', 'img', 'progress', 'text', 'marquee', 'analog-clock', 'clock-hand', 'chart', 'input', 'slider', 'switch', 'picker-view'];
const COMMON_ATTRS = ['id', 'style', 'class', 'ref', 'if', 'elif', 'else', 'for', 'tid', 'show'];
const TAG_ATTRS = {
  qrcode: ['value', 'type'], swiper: ['index', 'loop', 'duration', 'vertical'],
  'tab-bar': ['mode'], 'image-animator': ['images', 'iteration', 'reverse', 'fixedsize', 'duration', 'fillmode'],
  image: ['src'], img: ['src'], progress: ['type', 'percent'], text: ['type', 'value'],
  marquee: ['scrollamount'], 'analog-clock': ['hour', 'min', 'sec'], 'clock-hand': ['type', 'src'],
  chart: ['type', 'datasets', 'options'], input: ['checked', 'type', 'name', 'value', 'placeholder', 'maxlength'],
  slider: ['min', 'max', 'value'], switch: ['checked'], 'picker-view': ['type', 'range', 'selected'],
};
const REQUIRED_ATTRS = { qrcode: ['value'], 'image-animator': ['images', 'duration'] };
const ENUM_ATTRS = {
  'qrcode:type': ['rect', 'circle'], 'swiper:loop': ['true', 'false'], 'swiper:vertical': ['false', 'true'],
  'tab-bar:mode': ['fixed'], 'image-animator:reverse': ['false', 'true'], 'image-animator:fixedsize': ['true', 'false'],
  'image-animator:fillmode': ['none', 'forwards'], 'progress:type': ['horizontal', 'arc'], 'text:type': ['text', 'html'],
  'clock-hand:type': ['hour', 'min', 'sec'], 'chart:type': ['line', 'bar'],
  'input:checked': ['false', 'true'], 'input:type': ['button', 'checkbox', 'password', 'radio', 'text'],
  'switch:checked': ['false', 'true'], 'picker-view:type': ['text', 'time'],
};
const NUMERIC_ATTRS = ['swiper:index', 'swiper:duration', 'progress:percent', 'marquee:scrollamount', 'analog-clock:hour', 'analog-clock:min', 'analog-clock:sec', 'input:maxlength', 'slider:min', 'slider:max', 'slider:value'];
const COMMON_EVENTS = ['click', 'longpress', 'touchstart', 'touchmove', 'touchcancel', 'touchend', 'key', 'swipe'];
const EXTRA_EVENTS = { list: ['scrollend'], swiper: ['change'], tabs: ['change'], 'image-animator': ['stop'], input: ['change'], slider: ['change'], switch: ['change'] };
const ONLY_EVENTS = { qrcode: ['click', 'longpress', 'swipe'], 'picker-view': ['change'] };
const ATOMIC_TAGS = ['qrcode', 'image-animator', 'image', 'img', 'progress', 'text', 'chart', 'input', 'slider', 'switch', 'picker-view'];
const ES6_RE = /=>|`|\?\.|\?\?|\.\.\.|\b(async|await|yield|class|let|const)\b|\bimport\s*\(/;

function parseHmlNodes(text) {
  const root = { tag: '#root', attrs: new Map(), parent: null, children: [], line: 1, file: '', raw: '' };
  const stack = [root];
  const nodes = [];
  const tagPattern = /<!--[\s\S]*?-->|<\/?\s*[A-Za-z](?:"[^"]*"|'[^']*'|[^'">])*>/g;
  const attrPattern = /([@A-Za-z_:][@A-Za-z0-9_:.\-]*)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'=<>]+)))?/g;
  let m;
  while ((m = tagPattern.exec(text)) !== null) {
    const token = m[0];
    if (token.startsWith('<!--')) continue;
    const closing = token.match(/^<\/\s*([A-Za-z][A-Za-z0-9-]*)/);
    if (closing) {
      const name = closing[1].toLowerCase();
      for (let i = stack.length - 1; i > 0; i--) {
        if (stack[i].tag === name) { stack.splice(i); break; }
      }
      continue;
    }
    const opening = token.match(/^<\s*([A-Za-z][A-Za-z0-9-]*)\b/);
    if (!opening) continue;
    const tag = opening[1].toLowerCase();
    const nameEnd = token.indexOf(opening[1]) + opening[1].length;
    const attrText = token.slice(nameEnd, token.length - 1);
    const attrs = new Map();
    let am;
    attrPattern.lastIndex = 0;
    while ((am = attrPattern.exec(attrText)) !== null) {
      const value = am[2] !== undefined ? am[2] : am[3] !== undefined ? am[3] : am[4] !== undefined ? am[4] : '';
      attrs.set(am[1].toLowerCase(), value);
    }
    const parent = stack[stack.length - 1];
    const node = {
      tag, attrs, parent,
      children: [],
      line: getLineNumber(text, m.index),
      file: '', raw: token,
    };
    parent.children.push(node);
    nodes.push(node);
    const selfClosing = /\/>\s*$/.test(token) || ATOMIC_TAGS.includes(tag);
    if (!selfClosing) stack.push(node);
  }
  return nodes;
}

function checkHmlFiles(hmlFiles, targetApi, reporter) {
  const allNodes = [];
  for (const file of hmlFiles) {
    const text = readText(file.path);
    for (const exprMatch of text.matchAll(/\{\{\{?(.*?)}}}?/gs)) {
      const expr = exprMatch[1];
      const code = expr.replace(/"(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*'/g, '');
      if (ES6_RE.test(code)) {
        reporter.warn('ES6 or newer syntax in HML expression at ' + file.path + ':' + getLineNumber(text, exprMatch.index) + ': ' + expr.trim());
      }
    }
    for (const node of parseHmlNodes(text)) {
      node.file = file.path;
      allNodes.push(node);
    }
  }
  for (const node of allNodes) {
    const location = node.file + ':' + node.line;
    if (!ALLOWED_TAGS.includes(node.tag)) {
      reporter.warn('Unknown/non-Lite tag <' + node.tag + '> at ' + location + '; allow only after locating a registered custom component.');
      continue;
    }
    if (node.attrs.has('if') && node.attrs.has('for')) {
      reporter.warn('HML element uses if and for together at ' + location);
    }
    if (node.attrs.has('class') && String(node.attrs.get('class')).includes('{{')) {
      reporter.warn('Lite HML does not support dynamic class binding at ' + location);
    }
    if (node.attrs.has('tid') && String(node.attrs.get('tid')).includes('{{')) {
      reporter.warn('tid does not support expressions at ' + location);
    }
    if (REQUIRED_ATTRS[node.tag]) {
      for (const required of REQUIRED_ATTRS[node.tag]) {
        if (!node.attrs.has(required)) reporter.warn('<' + node.tag + '> requires attribute ' + required + ' at ' + location);
      }
    }
    for (const attr of node.attrs.keys()) {
      let isEvent = false;
      let eventName = '';
      const e1 = attr.match(/^@(.+)$/);
      const e2 = attr.match(/^on:(.+)$/);
      const e3 = attr.match(/^grab:(.+)$/);
      const e4 = attr.match(/^on([a-z].*)$/);
      if (e1) { isEvent = true; eventName = e1[1]; }
      else if (e2) { isEvent = true; eventName = e2[1]; }
      else if (e3) { isEvent = true; eventName = e3[1]; }
      else if (e4) { isEvent = true; eventName = e4[1]; }
      if (isEvent) {
        eventName = eventName.replace(/\.(bubble|capture)$/, '');
        const valid = ONLY_EVENTS[node.tag] ? ONLY_EVENTS[node.tag] : COMMON_EVENTS.concat(EXTRA_EVENTS[node.tag] || []);
        if (!valid.includes(eventName)) reporter.warn('Unsupported event ' + attr + ' on <' + node.tag + '> at ' + location);
        if (targetApi < 5 && (/[:]/.test(attr) || /\.(bubble|capture)$/.test(attr))) {
          reporter.warn('Event bubbling syntax requires API 5+: ' + attr + ' at ' + location);
        }
        continue;
      }
      if (!COMMON_ATTRS.includes(attr) && !(TAG_ATTRS[node.tag] || []).includes(attr) && !/^data-\w+$/.test(attr)) {
        reporter.warn('Attribute ' + attr + ' is outside the Lite whitelist for <' + node.tag + '> at ' + location);
        continue;
      }
      const key = node.tag + ':' + attr;
      const value = String(node.attrs.get(attr));
      if (ENUM_ATTRS[key] && !value.includes('{{') && !ENUM_ATTRS[key].includes(value)) {
        reporter.warn('Invalid ' + attr + ' value "' + value + '" on <' + node.tag + '> at ' + location + '; allowed: ' + ENUM_ATTRS[key].join(', '));
      }
      if (NUMERIC_ATTRS.includes(key) && !value.includes('{{') && !/^-?\d+(\.\d+)?$/.test(value)) {
        reporter.warn('Attribute ' + attr + ' must be numeric on <' + node.tag + '> at ' + location);
      }
    }
    for (const value of node.attrs.values()) {
      const v = String(value);
      if (!v.includes('{{') && ES6_RE.test(v)) {
        reporter.warn('ES6 or newer syntax in HML attribute/expression at ' + location + ': ' + v);
      }
    }
    const parentTag = node.parent.tag;
    if (node.tag === 'list-item' && parentTag !== 'list') reporter.warn('<list-item> must be directly inside <list> at ' + location);
    if (node.tag === 'tab-bar' && parentTag !== 'tabs') reporter.warn('<tab-bar> must be directly inside <tabs> at ' + location);
    if (node.tag === 'tab-content' && parentTag !== 'tabs') reporter.warn('<tab-content> must be directly inside <tabs> at ' + location);
    if (node.tag === 'clock-hand' && parentTag !== 'analog-clock') reporter.warn('<clock-hand> must be directly inside <analog-clock> at ' + location);
    if (parentTag === 'list' && node.tag !== 'list-item') reporter.warn('<list> direct child must be <list-item>; found <' + node.tag + '> at ' + location);
    if (parentTag === 'tabs' && !['tab-bar', 'tab-content'].includes(node.tag)) reporter.warn('<tabs> direct child must be <tab-bar> or <tab-content>; found <' + node.tag + '> at ' + location);
    if (parentTag === 'tab-bar' && node.tag !== 'text') reporter.warn('<tab-bar> direct child must be <text>; found <' + node.tag + '> at ' + location);
    if (parentTag === 'tab-content' && !['div', 'stack'].includes(node.tag)) reporter.warn('<tab-content> direct child must be <div> or <stack>; found <' + node.tag + '> at ' + location);
    if (parentTag === 'swiper' && node.tag === 'list') reporter.warn('<swiper> does not support <list> children at ' + location);
    if (parentTag === '#root' && (node.tag === 'list-item' || node.attrs.has('if') || node.attrs.has('for') || node.attrs.has('else'))) {
      reporter.warn('Lite root restriction violated at ' + location);
    }
    if (node.attrs.has('elif') || node.attrs.has('else')) {
      const siblings = node.parent.children;
      const index = siblings.indexOf(node);
      const prev = siblings[index - 1];
      if (index <= 0 || !(prev && (prev.attrs.has('if') || prev.attrs.has('elif')))) {
        reporter.warn('elif/else must immediately follow an if/elif sibling at ' + location);
      }
    }
  }
}

module.exports = { parseHmlNodes, checkHmlFiles, ALLOWED_TAGS };
