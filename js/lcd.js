// 液晶表示部（SVG）
const NS = 'http://www.w3.org/2000/svg';

// 7セグメント（Sharp液晶の字形：7 は f セグメントつき）
const SEGS = {
  0: 'abcdef', 1: 'bc', 2: 'abdeg', 3: 'abcdg', 4: 'bcfg', 5: 'acdfg',
  6: 'acdefg', 7: 'abcf', 8: 'abcdefg', 9: 'abcdfg', '-': 'g', '': '',
};

function el(tag, attrs = {}, parent) {
  const e = document.createElementNS(NS, tag);
  for (const [k, v] of Object.entries(attrs)) e.setAttribute(k, v);
  if (parent) parent.appendChild(e);
  return e;
}

function hseg(x1, x2, y, t) {
  const h = t / 2;
  return `${x1},${y} ${x1 + h},${y - h} ${x2 - h},${y - h} ${x2},${y} ${x2 - h},${y + h} ${x1 + h},${y + h}`;
}
function vseg(x, y1, y2, t) {
  const h = t / 2;
  return `${x},${y1} ${x + h},${y1 + h} ${x + h},${y2 - h} ${x},${y2} ${x - h},${y2 - h} ${x - h},${y1 + h}`;
}

// 1桁分のセグメントを作る
function makeDigit(parent, x, y, w, h, t, opts = {}) {
  const g = el('g', { transform: `translate(${x} ${y}) skewX(-7) translate(${h * 0.06} 0)` }, parent);
  const gp = t * 0.28;
  const L = t / 2, R = w - t / 2, T = t / 2, M = h / 2, B = h - t / 2;
  const pts = {
    a: hseg(L + gp, R - gp, T, t),
    b: vseg(R, T + gp, M - gp, t),
    c: vseg(R, M + gp, B - gp, t),
    d: hseg(L + gp, R - gp, B, t),
    e: vseg(L, M + gp, B - gp, t),
    f: vseg(L, T + gp, M - gp, t),
    g: hseg(L + gp, R - gp, M, t),
  };
  const segs = {};
  for (const [k, p] of Object.entries(pts)) segs[k] = el('polygon', { points: p, class: 'seg' }, g);
  const cell = { segs };
  if (opts.dp) {
    cell.dp = el('rect', { x: w + t * 0.5, y: h - t * 1.25, width: t * 1.25, height: t * 1.25, class: 'seg' }, g);
    // 3桁区切り（上部のコンマ）
    cell.comma = el('path', {
      d: `M${w + t * 0.55} ${-t * 0.2} h${t * 1.15} l${-t * 0.55} ${t * 2.4} h${-t * 0.7} z`,
      class: 'seg',
    }, g);
  }
  return cell;
}

function setDigit(cell, ch) {
  const on = SEGS[ch] ?? '';
  for (const [k, s] of Object.entries(cell.segs)) s.classList.toggle('on', on.includes(k));
}

export function buildLCD(svgParent, X, Y, W, H) {
  const root = el('g', { transform: `translate(${X} ${Y})`, class: 'lcd' }, svgParent);
  const fx = (f) => f * W;

  // 枠とガラス
  el('rect', { x: -10, y: -10, width: W + 20, height: H + 20, rx: 10, class: 'lcd-frame' }, root);
  el('rect', { x: 0, y: 0, width: W, height: H, rx: 4, class: 'lcd-glass' }, root);
  el('rect', { x: 0, y: 0, width: W, height: H, rx: 4, class: 'lcd-shade' }, root);

  const R = {};
  const txt = (s, x, y, size, cls = '') => {
    const t = el('text', { x, y, 'font-size': size, class: `sym ${cls}` }, root);
    t.textContent = s;
    return t;
  };

  // カウンター（左上 88）
  R.ctr = [makeDigit(root, 22, 30, 21, 46, 5), makeDigit(root, 50, 30, 21, 46, 5)];

  // 上段シンボル
  const eqBox = el('g', { class: 'sym' }, root);
  el('rect', { x: fx(0.093), y: 16, width: fx(0.08), height: 30, class: 'symbox-line' }, eqBox);
  const eqT = el('text', { x: fx(0.093) + 4, y: 40, 'font-size': 23, class: 'sym-in' }, eqBox);
  eqT.textContent = '=回数';
  R.eqSym = eqBox;
  R.M = txt('M', fx(0.197), 44, 33, 'b');
  R.G = txt('G', fx(0.242), 44, 33, 'b');
  R.E = txt('E', fx(0.29), 44, 33, 'b');
  R.jikan = txt('時間', fx(0.357), 43, 28, 'jp');
  R.nissu = txt('日数', fx(0.454), 43, 28, 'jp');
  R.tsuki = txt('月', fx(0.546), 43, 28, 'jp');

  // 右上：÷ 日 ～ ＋ － ×（反転表示）
  const box = (x, glyph, outline = false) => {
    const g = el('g', { class: 'sym' }, root);
    const bw = fx(0.034), by = 16, bh = 30;
    el('rect', { x, y: by, width: bw, height: bh, rx: 2, class: outline ? 'symbox-line' : 'symbox' }, g);
    const cx = x + bw / 2, cy = by + bh / 2, s = 9;
    if (glyph === '+') {
      el('path', { d: `M${cx - s} ${cy}H${cx + s}M${cx} ${cy - s}V${cy + s}`, class: 'glyph' }, g);
    } else if (glyph === '-') {
      el('path', { d: `M${cx - s - 2} ${cy}H${cx + s + 2}`, class: 'glyph' }, g);
    } else if (glyph === '*') {
      el('path', { d: `M${cx - s + 1} ${cy - s + 1}L${cx + s - 1} ${cy + s - 1}M${cx + s - 1} ${cy - s + 1}L${cx - s + 1} ${cy + s - 1}`, class: 'glyph' }, g);
    } else if (glyph === '/') {
      el('path', { d: `M${cx - s} ${cy}H${cx + s}`, class: 'glyph' }, g);
      el('circle', { cx, cy: cy - 7.5, r: 3, class: 'glyph-dot' }, g);
      el('circle', { cx, cy: cy + 7.5, r: 3, class: 'glyph-dot' }, g);
    } else if (glyph === '~') {
      el('path', { d: `M${cx - 11} ${cy + 3}c4 -10 8 -10 11 -3s7 7 11 -3`, class: 'glyph' }, g);
    } else if (glyph === '日') {
      const t = el('text', { x: cx, y: cy + 10, 'font-size': 26, 'text-anchor': 'middle', class: 'sym-in jp' }, g);
      t.textContent = '日';
    }
    return g;
  };
  R.div = box(fx(0.714), '/');
  R.hi = box(fx(0.758), '日', true);
  R.kara = box(fx(0.795), '~');
  R.plus = box(fx(0.844), '+');
  R.minusOp = box(fx(0.888), '-');
  R.times = box(fx(0.937), '*');

  // 左列：● ━（負数） ＝
  R.dot = el('circle', { cx: 52, cy: 132, r: 7, class: 'sym' }, root);
  R.minus = el('rect', { x: 30, y: 156, width: 42, height: 10, class: 'sym' }, root);
  R.eq = el('path', { d: 'M30 232h40v8h-40zM30 250h40v8h-40z', class: 'sym' }, root);

  // 主表示 12桁
  R.cells = [];
  const x0 = 118, pitch = 70.2, dw = 44, dh = 172, dy = 76;
  for (let i = 0; i < 12; i++) {
    const gap = i >= 10 ? 8 : 0; // 10桁目と11桁目の間の区切り位置
    R.cells.push(makeDigit(root, x0 + i * pitch + gap, dy, dw, dh, 9.5, { dp: true }));
  }
  return R;
}

export function renderLCD(R, D) {
  const show = (node, on) => node.classList.toggle('on', !!on);
  const blank = !D.on;
  // カウンター
  const c = blank ? '  ' : D.counter;
  setDigit(R.ctr[0], c[0] === ' ' ? '' : c[0]);
  setDigit(R.ctr[1], c[1] === ' ' ? '' : c[1]);
  show(R.eqSym, D.eqSym);
  show(R.M, D.M);
  show(R.G, D.G);
  show(R.E, D.E);
  show(R.jikan, D.jikan);
  show(R.nissu, D.nissu);
  show(R.tsuki, D.tsuki);
  show(R.div, D.op === '/');
  show(R.hi, D.hi);
  show(R.kara, D.kara);
  show(R.plus, D.op === '+');
  show(R.minusOp, D.op === '-');
  show(R.times, D.op === '*');
  show(R.dot, D.dot);
  show(R.minus, D.minus);
  show(R.eq, D.eq);
  D.cells.forEach((cell, i) => {
    const r = R.cells[i];
    setDigit(r, cell.ch);
    r.dp.classList.toggle('on', cell.dp);
    r.comma.classList.toggle('on', cell.comma);
  });
}
