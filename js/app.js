import { Calculator } from './engine.js';
import { buildLCD, renderLCD } from './lcd.js';

const NS = 'http://www.w3.org/2000/svg';
const STORE = 'elg37-state-v1';
const AUTO_OFF_MS = 7 * 60 * 1000; // 自動節電機能：約7分

// ---------- 状態の保存（内蔵電池によるメモリー保持の再現） ----------
function load() {
  try {
    return JSON.parse(localStorage.getItem(STORE) || 'null');
  } catch (e) {
    return null;
  }
}
function save() {
  try {
    localStorage.setItem(STORE, JSON.stringify(calc.serialize()));
  } catch (e) {
    /* 保存できない環境では何もしない */
  }
}

const calc = new Calculator(load());

// ---------- 触覚フィードバック ----------
// iOS 18以降の Safari は Vibration API 非対応のため、システムスイッチの切替で触覚を発生させる
const haptic = (() => {
  if (typeof navigator.vibrate === 'function') {
    return () => navigator.vibrate(10);
  }
  const label = document.createElement('label');
  label.className = 'haptic';
  label.setAttribute('aria-hidden', 'true');
  const input = document.createElement('input');
  input.type = 'checkbox';
  input.setAttribute('switch', '');
  input.tabIndex = -1;
  label.appendChild(input);
  document.body.appendChild(label);
  return () => label.click();
})();

// ---------- SVG 本体 ----------
function el(tag, attrs = {}, parent, text) {
  const e = document.createElementNS(NS, tag);
  for (const [k, v] of Object.entries(attrs)) e.setAttribute(k, v);
  if (text != null) e.textContent = text;
  if (parent) parent.appendChild(e);
  return e;
}

const W = 1120, H = 1814;
const svg = el('svg', {
  viewBox: `0 0 ${W} ${H}`,
  class: 'calc',
  role: 'application',
  'aria-label': 'SHARP EL-G37',
});
document.getElementById('stage').appendChild(svg);

svg.innerHTML = `
<defs>
  <linearGradient id="gBody" x1="0" y1="0" x2="0" y2="1">
    <stop offset="0" stop-color="#2a2e31"/><stop offset=".04" stop-color="#1b1e20"/>
    <stop offset=".35" stop-color="#161819"/><stop offset="1" stop-color="#0e0f10"/>
  </linearGradient>
  <linearGradient id="gGloss" x1="0" y1="0" x2="1" y2="1">
    <stop offset="0" stop-color="#fff" stop-opacity=".07"/><stop offset=".45" stop-color="#fff" stop-opacity=".015"/>
    <stop offset="1" stop-color="#fff" stop-opacity="0"/>
  </linearGradient>
  <linearGradient id="gSilver" x1="0" y1="0" x2="1" y2="1">
    <stop offset="0" stop-color="#e9ebed"/><stop offset=".35" stop-color="#dfe1e3"/>
    <stop offset=".65" stop-color="#e6e8ea"/><stop offset="1" stop-color="#d2d4d6"/>
  </linearGradient>
  <linearGradient id="gSilverTop" x1="0" y1="0" x2="0" y2="1">
    <stop offset="0" stop-color="#000" stop-opacity=".28"/><stop offset="1" stop-color="#000" stop-opacity="0"/>
  </linearGradient>
  <pattern id="pBrush" width="6" height="1120" patternUnits="userSpaceOnUse" patternTransform="rotate(90)">
    <rect width="6" height="1120" fill="none"/>
    <rect width="1" height="1120" fill="#fff" opacity=".12"/>
    <rect x="3" width="1" height="1120" fill="#000" opacity=".025"/>
  </pattern>
  <linearGradient id="gSolar" x1="0" y1="0" x2="0" y2="1">
    <stop offset="0" stop-color="#6e1d22"/><stop offset="1" stop-color="#5a1519"/>
  </linearGradient>
  <linearGradient id="gGlass" x1="0" y1="0" x2="0" y2="1">
    <stop offset="0" stop-color="#d3d6cc"/><stop offset="1" stop-color="#c3c7bc"/>
  </linearGradient>
  <linearGradient id="gShade" x1="0" y1="0" x2="0" y2="1">
    <stop offset="0" stop-color="#000" stop-opacity=".16"/><stop offset=".12" stop-color="#000" stop-opacity="0"/>
    <stop offset=".85" stop-color="#fff" stop-opacity="0"/><stop offset="1" stop-color="#fff" stop-opacity=".12"/>
  </linearGradient>
  <linearGradient id="kBlack" x1="0" y1="0" x2="0" y2="1">
    <stop offset="0" stop-color="#2e3236"/><stop offset=".5" stop-color="#1f2226"/><stop offset="1" stop-color="#16181b"/>
  </linearGradient>
  <linearGradient id="kGray" x1="0" y1="0" x2="0" y2="1">
    <stop offset="0" stop-color="#4c575a"/><stop offset=".5" stop-color="#3d4749"/><stop offset="1" stop-color="#333b3d"/>
  </linearGradient>
  <linearGradient id="kPink" x1="0" y1="0" x2="0" y2="1">
    <stop offset="0" stop-color="#d06d98"/><stop offset=".5" stop-color="#c15a87"/><stop offset="1" stop-color="#a84a74"/>
  </linearGradient>
  <linearGradient id="gKnob" x1="0" y1="0" x2="1" y2="0">
    <stop offset="0" stop-color="#3a3e42"/><stop offset=".45" stop-color="#1c1f22"/><stop offset="1" stop-color="#0d0e10"/>
  </linearGradient>
  <filter id="fShadow" x="-10%" y="-10%" width="120%" height="140%">
    <feDropShadow dx="0" dy="4" stdDeviation="3" flood-color="#000" flood-opacity=".45"/>
  </filter>
</defs>
<rect x="0" y="0" width="${W}" height="${H}" rx="66" fill="url(#gBody)"/>
<rect x="3" y="3" width="${W - 6}" height="${H - 6}" rx="63" fill="none" stroke="#fff" stroke-opacity=".10" stroke-width="3"/>
<path d="M25 633H1095V1742a40 40 0 0 1-40 40H65a40 40 0 0 1-40-40Z" fill="url(#gSilver)"/>
<path d="M25 633H1095V1742a40 40 0 0 1-40 40H65a40 40 0 0 1-40-40Z" fill="url(#pBrush)"/>
<rect x="25" y="633" width="1070" height="14" fill="url(#gSilverTop)"/>
<path d="M8 70a62 62 0 0 1 62-62H1050a62 62 0 0 1 62 62V626H8Z" fill="url(#gGloss)" opacity=".9"/>
<rect x="0" y="626" width="${W}" height="8" fill="#0c0d0e"/>
<g id="logo"></g>
<text x="98" y="177" class="brand-sub">ELSI MATE</text>
<text x="268" y="177" class="brand-sub model">EL-G37</text>
<g id="solar">
  <rect x="521" y="86" width="513" height="122" rx="4" fill="url(#gSolar)"/>
  <path d="M650 88V206M776 88V206M903 88V206" stroke="#b05a5f" stroke-opacity=".7" stroke-width="2.4"/>
  <rect x="521" y="86" width="513" height="122" rx="4" fill="none" stroke="#000" stroke-opacity=".6" stroke-width="3"/>
  <rect x="524" y="89" width="507" height="40" fill="#fff" opacity=".035"/>
</g>
<g id="lcdHost"></g>
<g id="panel"></g>
<g id="keys"></g>
`;

// SHARP ロゴ（パブリックドメインのロゴ形状）
svg.querySelector('#logo').innerHTML = `
<svg x="98" y="104" width="251" height="36" viewBox="0 0 1024 145.9" class="logo">
 <g transform="matrix(3.4362416,0,0,3.4362416,-1078.3312,-2174.3932)">
  <path transform="matrix(0,1.5459704,1.5459704,0,415.67057,649.33146)" d="m 0,0 0,-16.982 -9.878,0 0,-8.776 25.835,0 0,8.776 -10.38,0 0,16.982 10.38,0 0,8.775 -25.835,0 L -9.878,0 0,0"/>
  <path transform="matrix(0,1.5459704,1.5459704,0,451.89266,657.95179)" d="M 0,0 -10.032,6.111 0,12.035 0,0 m -15.455,2.707 25.835,-15.739 0,6.709 -5.286,3.219 0,18.145 5.286,3.123 0,10.713 -25.835,-15.735 0,-10.435"/>
  <path transform="matrix(0,1.5459704,1.5459704,0,550.35088,651.36905)" d="m 0,0 c -2.738,2.09 -6.749,1.807 -9.046,-2.207 -2.147,-3.74 -2.937,-10.879 -2.937,-15.34 0,-7.136 0.485,-11.73 1.153,-15.638 l 25.469,0 0,8.773 -21.604,0 c -0.626,3.16 -0.64,6.369 -0.584,7.568 0.154,3.483 0.696,5.444 1.807,7.01 1.155,1.619 3.708,2.059 5.48,-0.041 1.321,-1.574 2.359,-4.765 1.27,-11.902 l 1.655,-1.008 11.976,13.494 0,11.947 L 4.259,-9.347 C 3.885,-6.463 2.732,-2.090 0,0"/>
  <path transform="matrix(0,1.5459704,1.5459704,0,346.11736,647.86124)" d="m 0,0 c -0.985,-5.067 -1.597,-9.373 -3.241,-9.373 -1.82,0 -2.289,3.482 -1.766,8.416 0.494,4.666 1.715,9.066 3.461,13.17 L -6.659,15.33 C -7.922,12.013 -9.54,5.177 -9.724,-1.03 c -0.197,-6.8 0.413,-18.281 7.289,-18.777 6.294,-0.453 7.798,8.516 9.166,14.397 1.335,5.736 1.818,11.113 3.804,11.113 1.396,0 2.486,-1.895 2.11,-6.908 C 12.194,-7.239 10.545,-12.373 8,-17.494 l 5.588,-3.403 c 2.22,5.68 4.003,13.129 4.114,19.84 C 17.835,6.922 16.548,15.931 9.714,16.135 4.011,16.302 2.019,10.394 0,0"/>
  <path transform="matrix(0,1.5459704,1.5459704,0,594.18532,651.0413)" d="m 0,0 c 1.242,-1.516 1.682,-3.731 1.672,-7.227 -0.009,-2.578 -0.483,-5.246 -0.976,-7.420 l -7.449,0 c -0.626,3.158 -0.635,6.424 -0.585,7.623 0.148,3.502 0.741,5.545 1.808,7.063 C -4.421,1.619 -1.759,2.146 0,0 m -8.834,7.67 c -2.115,-3.573 -2.937,-10.262 -2.937,-15.397 0,-7.139 0.485,-11.787 1.152,-15.695 l 25.47,0 0,8.775 -9.331,0 c 0.453,2.713 0.716,6.112 0.694,9.053 C 6.153,1.586 4.466,6.922 1.822,9.351 -1.94,12.812 -6.483,11.65 -8.834,7.67"/>
 </g>
</svg>`;

// ---------- 液晶 ----------
const LCD = buildLCD(svg.querySelector('#lcdHost'), 68, 268, 984, 294);

// ---------- パネル印刷とスイッチ ----------
const panel = svg.querySelector('#panel');
el('text', { x: 336, y: 712, class: 'print', 'text-anchor': 'middle' }, panel, 'GT •');
el('text', { x: 634, y: 712, class: 'print wide', 'text-anchor': 'middle' }, panel, 'F 5 4 3 2 1 0 A');
el('text', { x: 873, y: 675, class: 'print green', 'text-anchor': 'middle' }, panel, '両入');
el('text', { x: 941, y: 675, class: 'print green', 'text-anchor': 'middle' }, panel, '片落');
el('text', { x: 1009, y: 675, class: 'print green', 'text-anchor': 'middle' }, panel, '両落');
el('text', { x: 904, y: 711, class: 'print small', 'text-anchor': 'middle' }, panel, '↑');
el('text', { x: 941, y: 711, class: 'print small', 'text-anchor': 'middle' }, panel, '5/4');
el('text', { x: 978, y: 711, class: 'print small', 'text-anchor': 'middle' }, panel, '↓');
el('text', { x: 942, y: 930, class: 'print small', 'text-anchor': 'middle' }, panel, 'ON');
el('path', { d: 'M742 1083c5-7 10-7 14.5-1.5s9.5 5.5 14.5-1.5', class: 'print-stroke' }, panel);

function makeSwitch({ name, x, y, w, h, positions, values }) {
  const g = el('g', { class: 'switch', 'data-switch': name }, panel);
  el('rect', { x: x - 4, y: y - 4, width: w + 8, height: h + 8, rx: 14, fill: '#9ea2a5', opacity: '.55' }, g);
  el('rect', { x, y, width: w, height: h, rx: 11, fill: '#141618' }, g);
  el('rect', { x: x + 6, y: y + 8, width: w - 12, height: h - 16, rx: 6, fill: '#08090a' }, g);
  const kw = 28;
  const knob = el('g', { class: 'knob' }, g);
  el('rect', { x: -kw / 2, y: y + 6, width: kw, height: h - 12, rx: 7, fill: 'url(#gKnob)', stroke: '#000', 'stroke-width': 2 }, knob);
  el('rect', { x: -kw / 2 + 6, y: y + 14, width: 4, height: h - 28, rx: 2, fill: '#6c7378' }, knob);
  // 当たり判定を広げる
  el('rect', { x: x - 10, y: y - 40, width: w + 20, height: h + 60, fill: 'transparent' }, g);
  const sw = { name, g, knob, positions, values, x, w };
  const place = () => {
    const i = values.indexOf(calc.sw[name]);
    knob.setAttribute('transform', `translate(${positions[i < 0 ? 0 : i]} 0)`);
  };
  sw.place = place;
  place();
  const pick = (clientX) => {
    const pt = svg.createSVGPoint();
    pt.x = clientX;
    pt.y = 0;
    const p = pt.matrixTransform(svg.getScreenCTM().inverse());
    let best = 0;
    positions.forEach((px, i) => {
      if (Math.abs(px - p.x) < Math.abs(positions[best] - p.x)) best = i;
    });
    return values[best];
  };
  let dragging = null;
  const setTo = (v) => {
    if (calc.sw[name] === v) return;
    calc.setSwitch(name, v);
    haptic();
    place();
    save();
  };
  g.addEventListener('pointerdown', (e) => {
    e.preventDefault();
    dragging = e.pointerId;
    g.setPointerCapture(e.pointerId);
    if (values.length === 2) {
      setTo(values[values.indexOf(calc.sw[name]) ^ 1]);
      dragging = null;
    } else setTo(pick(e.clientX));
    wake();
  });
  g.addEventListener('pointermove', (e) => {
    if (dragging === e.pointerId) setTo(pick(e.clientX));
  });
  const end = (e) => {
    if (dragging === e.pointerId) dragging = null;
  };
  g.addEventListener('pointerup', end);
  g.addEventListener('pointercancel', end);
  return sw;
}

const switches = [
  makeSwitch({ name: 'gt', x: 297, y: 730, w: 79, h: 68, positions: [318, 356], values: [true, false] }),
  makeSwitch({
    name: 'tab', x: 501, y: 730, w: 258, h: 68,
    positions: [527, 557.6, 588.1, 618.7, 649.3, 679.9, 710.4, 741],
    values: ['F', '5', '4', '3', '2', '1', '0', 'A'],
  }),
  makeSwitch({ name: 'round', x: 887, y: 730, w: 108, h: 68, positions: [905, 941, 977], values: ['up', 'half', 'down'] }),
];

// ---------- キー ----------
const C1 = 93, C2 = 276, C3 = 462, C4 = 676, C5 = 862, KW = 161;
const R1 = 827, R2 = 937, R3 = 1091, R4 = 1249, R5 = 1403, R6 = 1560;
const KEYS = [
  { k: 'DT', x: C1, y: 712, h: 86, face: 'black', label: '日数/時間', size: 30, jp: true },
  { k: 'GT', x: C1, y: R1, h: 82, face: 'gray', label: 'GT', size: 52, teal: true },
  { k: 'PM', x: C2, y: R1, h: 82, face: 'gray', label: '+/−', size: 44, pm: true },
  { k: 'SQRT', x: C3, y: R1, h: 82, face: 'gray', label: '√', size: 50, sqrt: true },
  { k: 'SHIFT', x: C4, y: R1, h: 82, face: 'gray', label: '→', size: 52 },
  { k: 'CA', x: C5, y: R1, h: 82, face: 'gray', label: 'CA', size: 54 },
  { k: 'CM', x: C1, y: R2, h: 129, face: 'gray', label: 'CM', size: 54, teal: true },
  { k: 'RM', x: C2, y: R2, h: 129, face: 'gray', label: 'RM', size: 54, teal: true },
  { k: 'M-', x: C3, y: R2, h: 129, face: 'gray', label: 'M−', size: 54, teal: true },
  { k: 'M+', x: C4, y: R2, h: 129, face: 'gray', label: 'M+', size: 54, teal: true },
  { k: 'C', x: C5, y: R2, h: 129, face: 'pink', label: 'C', size: 60 },
  { k: '7', x: C1, y: R3, h: 130, face: 'black', label: '7' },
  { k: '8', x: C2, y: R3, h: 130, face: 'black', label: '8' },
  { k: '9', x: C3, y: R3, h: 130, face: 'black', label: '9' },
  { k: '%', x: C4, y: R3, h: 130, face: 'gray', label: '%', size: 54 },
  { k: 'CE', x: C5, y: R3, h: 130, face: 'gray', label: 'CE', size: 50 },
  { k: '4', x: C1, y: R4, h: 130, face: 'black', label: '4' },
  { k: '5', x: C2, y: R4, h: 130, face: 'black', label: '5' },
  { k: '6', x: C3, y: R4, h: 130, face: 'black', label: '6' },
  { k: '*', x: C4, y: R4, h: 130, face: 'gray', label: '×', size: 70 },
  { k: '/', x: C5, y: R4, h: 130, face: 'gray', label: '÷', size: 70 },
  { k: '1', x: C1, y: R5, h: 132, face: 'black', label: '1' },
  { k: '2', x: C2, y: R5, h: 132, face: 'black', label: '2' },
  { k: '3', x: C3, y: R5, h: 132, face: 'black', label: '3' },
  { k: '+', x: C4, y: R5, h: 287, face: 'gray', label: '+', size: 72 },
  { k: '-', x: C5, y: R5, h: 132, face: 'gray', label: '−', size: 72 },
  { k: '0', x: C1, y: R6, h: 132, face: 'black', label: '0' },
  { k: '00', x: C2, y: R6, h: 132, face: 'black', label: '00', size: 68 },
  { k: '.', x: C3, y: R6, h: 132, face: 'black', label: '・', dot: true },
  { k: '=', x: C5, y: R6, h: 132, face: 'gray', label: '=', size: 72 },
];

const keyLayer = svg.querySelector('#keys');
const keyEls = new Map();
for (const def of KEYS) {
  const { k, x, y, h, face } = def;
  const w = KW;
  const g = el('g', { class: `key ${face}`, 'data-key': k, role: 'button', 'aria-label': def.label }, keyLayer);
  // 台座（影）
  el('rect', { x: x - 2, y: y + 2, width: w + 4, height: h + 6, rx: 18, class: 'key-base' }, g);
  const top = el('g', { class: 'key-top' }, g);
  el('rect', { x, y, width: w, height: h, rx: 16, class: 'key-edge' }, top);
  el('rect', { x: x + 5, y: y + 4, width: w - 10, height: h - 12, rx: 12, fill: `url(#k${face[0].toUpperCase() + face.slice(1)})` }, top);
  el('rect', { x: x + 12, y: y + 6, width: w - 24, height: 3, rx: 1.5, class: 'key-hi' }, top);
  const cx = x + w / 2;
  const cy = y + (h - 8) / 2;
  const cls = `klabel${def.teal ? ' teal' : ''}${def.jp ? ' jp' : ''}`;
  if (def.sqrt) {
    // √ と上線
    el('path', { d: `M${cx - 24} ${cy + 2}l8 -3 9 20 13 -40h26`, class: 'kstroke' }, top);
  } else if (def.dot) {
    el('rect', { x: cx - 6, y: cy - 6, width: 12, height: 12, class: 'kfill' }, top);
  } else if (def.pm) {
    el('text', { x: cx - 6, y: cy + 15, 'font-size': 44, class: cls, 'text-anchor': 'middle' }, top, '+/');
    el('rect', { x: cx + 12, y: cy + 14, width: 20, height: 4, class: 'kfill' }, top);
  } else {
    const size = def.size || 82;
    const t = el('text', {
      x: cx,
      y: cy + size * 0.35,
      'font-size': size,
      class: cls,
      'text-anchor': 'middle',
    }, top, def.label);
    if (def.jp) t.setAttribute('textLength', 128);
  }
  keyEls.set(k, g);
}

// ---------- 入力処理（2キーロールオーバー） ----------
let render;
const active = { id: null };
const queue = []; // 押されたまま待っているキー
const held = new Map(); // pointerId -> key

function fire(key) {
  calc.press(key);
  save();
  render();
}

function down(g) {
  g.classList.add('down');
}
function up(g) {
  g.classList.remove('down');
}

keyLayer.addEventListener('pointerdown', (e) => {
  const g = e.target.closest('.key');
  if (!g) return;
  e.preventDefault();
  try {
    g.setPointerCapture(e.pointerId);
  } catch (err) {
    /* 一部ブラウザでは不要 */
  }
  wake();
  const key = g.dataset.key;
  down(g);
  haptic();
  held.set(e.pointerId, key);
  if (active.id === null) {
    active.id = e.pointerId;
    fire(key);
  } else {
    // 別のキーを押している間に押したキーは、先のキーを離したときに入力される
    queue.push({ id: e.pointerId, key });
  }
});

function release(e) {
  const key = held.get(e.pointerId);
  if (key === undefined) return;
  held.delete(e.pointerId);
  const g = keyEls.get(key);
  if (g && ![...held.values()].includes(key)) up(g);
  if (active.id === e.pointerId) {
    active.id = null;
    while (queue.length) {
      const next = queue.shift();
      fire(next.key);
      if (held.has(next.id)) {
        active.id = next.id;
        break;
      }
    }
  }
}
keyLayer.addEventListener('pointerup', release);
keyLayer.addEventListener('pointercancel', release);
keyLayer.addEventListener('lostpointercapture', release);

// ハードウェアキーボード（PCで使うとき用）
const KB = {
  Enter: '=', '=': '=', '+': '+', '-': '-', '*': '*', x: '*', '/': '/', '%': '%', '.': '.',
  Backspace: 'SHIFT', Delete: 'CE', Escape: 'C', r: 'SQRT', n: 'PM', g: 'GT', d: 'DT',
  m: 'RM', p: 'M+', o: 'M-', l: 'CM',
};
window.addEventListener('keydown', (e) => {
  if (e.metaKey || e.ctrlKey || e.altKey) return;
  const key = /^[0-9]$/.test(e.key) ? e.key : KB[e.key];
  if (!key) return;
  e.preventDefault();
  wake();
  const g = keyEls.get(key);
  if (g) {
    down(g);
    setTimeout(() => up(g), 90);
  }
  fire(key);
});

// ---------- 自動節電機能 ----------
let lastAct = Date.now();
function wake() {
  lastAct = Date.now();
}
setInterval(() => {
  if (calc.power && Date.now() - lastAct >= AUTO_OFF_MS) {
    calc.powerOff();
    render();
  }
}, 5000);
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'visible' && calc.power && Date.now() - lastAct >= AUTO_OFF_MS) {
    calc.powerOff();
    render();
  }
});

render = () => renderLCD(LCD, calc.getDisplay());
render();

// ?segments で全セグメント点灯（表示確認用）
if (new URLSearchParams(location.search).has('segments')) {
  const D = calc.getDisplay();
  Object.assign(D, { counter: '88', eqSym: true, M: true, G: true, E: true, jikan: true, nissu: true, tsuki: true,
    hi: true, kara: true, dot: true, minus: true, eq: true });
  D.cells.forEach((c) => Object.assign(c, { ch: '8', dp: true, comma: true }));
  renderLCD(LCD, D);
  for (const k of ['div', 'plus', 'minusOp', 'times']) LCD[k].classList.add('on');
}

// iOS のピンチ・ダブルタップ拡大を防ぐ
document.addEventListener('gesturestart', (e) => e.preventDefault());
document.addEventListener('dblclick', (e) => e.preventDefault(), { passive: false });

// オフライン対応
if ('serviceWorker' in navigator && location.protocol === 'https:') {
  navigator.serviceWorker.register('./sw.js').catch(() => {});
}
