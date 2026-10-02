// SHARP EL-G37 計算ロジック（DOM非依存）
// 数値は 10^30 倍した BigInt の固定小数点で保持し、表示（12桁）に合わせて切り捨てる。

const SD = 30;
const S = 10n ** 30n;
const H_LIMIT = 1000000n * S; // 時間計算の上限（時間部分7桁）

const abs = (v) => (v < 0n ? -v : v);
const pow10 = (n) => 10n ** BigInt(n);

// 整数部の桁数（|v|<1 のときは 0）
export function intDigits(v) {
  const i = abs(v) / S;
  return i === 0n ? 0 : i.toString().length;
}

function truncTo(v, dec) {
  const u = pow10(SD - dec);
  return (v / u) * u;
}

function roundTo(v, dec, mode) {
  const u = pow10(SD - dec);
  const a = abs(v);
  let q = a / u;
  const r = a % u;
  if (r !== 0n) {
    if (mode === 'up') q += 1n;
    else if (mode === 'half' && r * 2n >= u) q += 1n;
  }
  const res = q * u;
  return v < 0n ? -res : res;
}

function isqrt(n) {
  if (n < 2n) return n;
  // 必ず真値以上から始めるニュートン法
  let x = 1n << BigInt(Math.ceil(n.toString(2).length / 2) + 1);
  for (;;) {
    const y = (x + n / x) >> 1n;
    if (y >= x) return x;
    x = y;
  }
}

function parseDigits(int, frac) {
  return BigInt(int + (frac || '').padEnd(SD, '0').slice(0, SD));
}

const mul = (a, b) => (a * b) / S;
const div = (a, b) => (a * S) / b;
const HUNDRED = 100n * S;

// 12桁表示に収める。整数部13〜24桁は概算（上位12桁）、25桁以上は計算不能
function fit(v) {
  const ip = intDigits(v);
  if (ip > 24) return { v: 0n, st: 'fatal' };
  if (ip > 12) {
    const u = pow10(SD + ip - 12);
    return { v: (v / u) * u, st: 'approx' };
  }
  return { v: truncTo(v, 12 - Math.max(ip, 1)), st: 'ok' };
}

class CalcError {
  constructor(code) {
    this.code = code;
  }
}
const fail = (code) => {
  throw new CalcError(code);
};

// 日数計算（うるう年なし）
const DIM = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
const CUM = [0, 31, 59, 90, 120, 151, 181, 212, 243, 273, 304, 334];
const toDoy = (m, d) => CUM[m - 1] + d;
function fromDoy(doy) {
  let m = 12;
  while (CUM[m - 1] >= doy) m--;
  return { m, d: doy - CUM[m - 1] };
}

const OPS = ['+', '-', '*', '/'];
const CLEARABLE = new Set([3, 7, 8, 10]);

export class Calculator {
  constructor(saved) {
    this.sw = { gt: false, tab: 'F', round: 'half' };
    this.mem = 0n;
    this.memCount = 0;
    this.memSexa = false;
    this.gt = 0n;
    this.gtCount = 0;
    this.gtSexa = false;
    this.lastMode = 'day';
    this.power = true;
    if (saved) this.restore(saved);
    this.clearCalc();
    this.mode = 'normal';
  }

  // ---- 永続化（電池でバックアップされる内容） ----
  serialize() {
    return {
      sw: { ...this.sw },
      mem: this.mem.toString(),
      memCount: this.memCount,
      memSexa: this.memSexa,
      gt: this.gt.toString(),
      gtCount: this.gtCount,
      gtSexa: this.gtSexa,
      lastMode: this.lastMode,
    };
  }

  restore(s) {
    try {
      if (s.sw) Object.assign(this.sw, s.sw);
      if (s.mem) this.mem = BigInt(s.mem);
      if (s.gt) this.gt = BigInt(s.gt);
      this.memCount = s.memCount | 0;
      this.gtCount = s.gtCount | 0;
      this.memSexa = !!s.memSexa;
      this.gtSexa = !!s.gtSexa;
      if (s.lastMode === 'day' || s.lastMode === 'time') this.lastMode = s.lastMode;
    } catch (e) {
      /* 壊れたデータは無視 */
    }
  }

  setSwitch(name, value) {
    this.sw[name] = value;
  }

  // C 相当：計算内容のクリア（メモリー・GT は保持）
  clearCalc() {
    this.acc = 0n;
    this.accSexa = false;
    this.op = null;
    this.entry = null;
    this.x = 0n;
    this.xSexa = false;
    this.xKind = 'num'; // num | date | days
    this.xDec = null; // 固定小数部桁数（null=浮動）
    this.hasOperand = false;
    this.operandCounted = false;
    this.K = null;
    this.err = null;
    this.entries = 0;
    this.eqCount = 0;
    this.ctrShow = 'entries';
    this.showEq = false;
    this.showDot = false;
    this.lastKey = null;
    this.addOn = null;
    this.pctInfo = null;
    this.dayOp = null;
    this.xDoy = 1;
    this.pendingApprox = false;
    this.fresh = false;
  }

  powerOff() {
    this.power = false;
  }

  tabDec() {
    const t = this.sw.tab;
    if (t === 'F') return null;
    if (t === 'A') return 2;
    return +t;
  }

  // ================= キー入力 =================
  press(key) {
    if (!this.power) {
      if (key === 'C' || key === 'CA') {
        this.power = true;
        this.clearCalc();
        this.mode = 'normal';
        if (key === 'CA') this.clearMemories();
      }
      return;
    }
    if (this.err) {
      if (key === 'C') return this.keyC();
      if (key === 'CA') return this.keyCA();
      if (CLEARABLE.has(this.err.code) && (key === 'CE' || key === 'SHIFT')) {
        return key === 'CE' ? this.clearErrCE() : this.clearErrShift();
      }
      return;
    }
    const wasFresh = this.fresh;
    this.fresh = false;
    this.showDot = false;
    try {
      this.dispatch(key, wasFresh);
    } catch (e) {
      if (e instanceof CalcError) this.setError(e.code);
      else throw e;
    }
  }

  dispatch(key, wasFresh) {
    if (/^[0-9]$/.test(key)) return this.digit(key);
    switch (key) {
      case '00':
        this.digit('0');
        if (!this.err) this.digit('0');
        return;
      case '.':
        return this.point();
      case '+':
      case '-':
      case '*':
      case '/':
        return this.operator(key);
      case '=':
        return this.equals();
      case '%':
        return this.percent();
      case 'SQRT':
        return this.sqrt();
      case 'PM':
        return this.negate();
      case 'SHIFT':
        return this.shift();
      case 'CE':
        return this.keyCE();
      case 'C':
        return this.keyC();
      case 'CA':
        return this.keyCA();
      case 'CM':
        this.mem = 0n;
        this.memCount = 0;
        this.memSexa = false;
        this.lastKey = 'CM';
        return;
      case 'RM':
        return this.recall(this.mem, this.memSexa, 'mem', 'RM');
      case 'M+':
        return this.memKey(1n);
      case 'M-':
        return this.memKey(-1n);
      case 'GT':
        return this.keyGT();
      case 'DT':
        return this.keyDT(wasFresh);
    }
  }

  setError(code) {
    this.err = { code };
    this.showDot = false;
    if (!CLEARABLE.has(code)) {
      this.showEq = false;
    }
  }

  clearMemories() {
    this.mem = 0n;
    this.memCount = 0;
    this.memSexa = false;
    this.gt = 0n;
    this.gtCount = 0;
    this.gtSexa = false;
  }

  keyC() {
    this.clearCalc();
    this.mode = 'normal';
  }

  keyCA() {
    this.keyC();
    this.clearMemories();
  }

  // ---- 置数 ----
  startEntry() {
    if (!this.op && !this.dayOp) {
      // 新しい計算の始まり
      this.entries = 1;
      this.addOn = null;
    } else if (!(this.hasOperand && this.operandCounted)) {
      // 呼び出した数値を置数で置きかえる場合は数えなおさない
      this.entries = (this.entries + 1) % 100;
    }
    this.operandCounted = true;
    this.entry = { kind: 'num', int: '0', frac: null, neg: false };
    this.hasOperand = true;
    this.ctrShow = 'entries';
    this.showEq = false;
    this.xKind = 'num';
    return this.entry;
  }

  // CE 後の「0」置数（カウント対象外）
  blankEntry() {
    if (this.operandCounted) {
      this.entries = (this.entries + 99) % 100;
      this.operandCounted = false;
    }
    this.entry = { kind: 'num', int: '0', frac: null, neg: false, uncounted: true };
    this.hasOperand = true;
    this.xKind = 'num';
  }

  ensureEntry() {
    let e = this.entry;
    if (!e) e = this.startEntry();
    else if (e.uncounted) {
      e.uncounted = false;
      this.entries = (this.entries + 1) % 100;
      this.operandCounted = true;
    }
    this.ctrShow = 'entries';
    this.showEq = false;
    return e;
  }

  digit(d) {
    this.lastKey = 'digit';
    const e = this.ensureEntry();
    if (e.kind === 'time') {
      e[e.stage] += d;
      return;
    }
    if (e.kind === 'date') {
      e.d += d;
      return;
    }
    if (e.frac === null) {
      e.int = e.int === '0' ? d : e.int + d;
      if (e.int.length > 12) fail(3);
    } else {
      if (e.int.length + e.frac.length >= 12) return;
      e.frac += d;
    }
  }

  point() {
    this.lastKey = 'digit';
    const e = this.ensureEntry();
    if (e.kind !== 'num') return;
    if (e.frac === null && e.int.length < 12) e.frac = '';
  }

  // 置数値を数値化。A（アディング）モードで加減算に使われる場合は下2桁を小数とする
  entryValue(e, consumer) {
    if (e.kind === 'time') {
      const h = BigInt(e.h || '0');
      const m = BigInt((e.m || '').slice(-2) || '0');
      const s = BigInt((e.s || '').slice(-2) || '0');
      let v = h * S + (m * S) / 60n + (s * S) / 3600n;
      v = fit(v).v;
      return { v: e.neg ? -v : v, sexa: true };
    }
    let v = parseDigits(e.int, e.frac);
    if (this.sw.tab === 'A' && e.frac === null && (consumer === '+' || consumer === '-')) {
      v = v / 100n;
    }
    return { v: e.neg ? -v : v, sexa: false };
  }

  takeOperand(consumer) {
    let r;
    if (this.entry) {
      r = this.entryValue(this.entry, consumer);
      this.entry = null;
    } else {
      r = { v: this.x, sexa: this.xSexa };
    }
    this.hasOperand = false;
    return r;
  }

  // 演算（途中結果は浮動・切り捨て）
  apply(a, op, b) {
    switch (op) {
      case '+':
        return a + b;
      case '-':
        return a - b;
      case '*':
        return mul(a, b);
      case '/':
        if (b === 0n) fail(2);
        return div(a, b);
    }
  }

  checkSexa(v) {
    if (abs(v) * 3600n + S / 2n >= H_LIMIT * 3600n) fail(9);
  }

  intermediate(v, sexa) {
    if (sexa && this.mode === 'time') this.checkSexa(v);
    const f = fit(v);
    if (f.st === 'fatal') fail(11);
    if (f.st === 'approx') this.pendingApprox = true;
    return f.v;
  }

  // 結果（＝ ％ M＋ M－）：TABスイッチ・ラウンドスイッチに従う
  result(v, sexa, addon) {
    if (addon && intDigits(v) > 12) fail(5);
    if (sexa && this.mode === 'time') {
      this.checkSexa(v);
      this.xDec = null;
      return fit(v).v;
    }
    const d = this.tabDec();
    this.xDec = null;
    if (d !== null && intDigits(v) <= 12) {
      const dd = Math.min(d, 12 - Math.max(intDigits(v), 1));
      v = roundTo(v, dd, this.sw.round);
      this.xDec = dd;
    }
    const f = fit(v);
    if (f.st === 'fatal') fail(11);
    if (f.st === 'approx') {
      this.pendingApprox = true;
      this.xDec = null;
    }
    return f.v;
  }

  // 概算エラーの確定（値は保持して表示する）
  settle() {
    if (this.pendingApprox) {
      this.pendingApprox = false;
      this.err = { code: 10 };
    }
  }

  sexaOf(op, as, bs) {
    return this.mode === 'time' && (op === '+' || op === '-') && (as || bs);
  }

  // ---- 四則演算キー ----
  operator(op) {
    if (this.mode === 'day') return this.dayOperator(op);
    const fromPct = this.lastKey === '%' && this.pctInfo;
    this.pendingApprox = false;
    if (this.hasOperand) {
      const consumer = this.op || op;
      const { v, sexa } = this.takeOperand(consumer);
      if (this.op) {
        const s = this.sexaOf(this.op, this.accSexa, sexa);
        this.acc = this.intermediate(this.apply(this.acc, this.op, v), s);
        this.accSexa = s;
      } else {
        this.acc = v;
        this.accSexa = sexa;
      }
      this.addOn = null;
    } else if (this.op) {
      // 演算キーの押しかえ
    } else {
      this.acc = this.x;
      this.accSexa = this.xSexa;
      this.addOn = fromPct && (op === '+' || op === '-') ? { ...this.pctInfo, op } : null;
    }
    this.op = op;
    this.entry = null;
    this.hasOperand = false;
    this.x = this.acc;
    this.xSexa = this.accSexa;
    this.xKind = 'num';
    this.xDec = null;
    this.showDot = true;
    this.showEq = false;
    this.ctrShow = 'entries';
    this.lastKey = 'op';
    this.settle();
  }

  // ---- ＝ ----
  computeEquals() {
    let r, rs, addon = false;
    if (this.addOn && this.lastKey === 'op' && !this.hasOperand) {
      const a = this.addOn;
      r = a.op === '+' ? a.base + a.pct : a.base - a.pct;
      rs = this.sexaOf(a.op, a.baseSexa, false);
      addon = true;
      this.addOn = null;
      this.op = null;
    } else if (this.op) {
      const op = this.op;
      const noOperand = !this.hasOperand;
      let b, bs;
      if (noOperand) {
        b = this.acc;
        bs = this.accSexa;
      } else ({ v: b, sexa: bs } = this.takeOperand(op));
      if (op === '*') {
        // 被乗数が定数（a × ＝ は2乗）
        this.K = { op, k: this.acc, ks: this.accSexa };
        r = this.apply(this.acc, op, b);
        rs = false;
      } else if (op === '/' && noOperand) {
        // a ÷ ＝ は逆数（a が除数の定数になる）
        this.K = { op, k: b, ks: bs };
        r = this.apply(S, op, b);
        rs = false;
      } else if (noOperand) {
        // a ＋ ＝ → a、a － ＝ → －a（a が加数・減数の定数になる）
        this.K = { op, k: b, ks: bs };
        r = this.apply(0n, op, b);
        rs = this.sexaOf(op, false, bs);
      } else {
        this.K = { op, k: b, ks: bs };
        r = this.apply(this.acc, op, b);
        rs = this.sexaOf(op, this.accSexa, bs);
      }
      this.op = null;
    } else if (this.K) {
      const K = this.K;
      let c, cs;
      if (this.hasOperand) ({ v: c, sexa: cs } = this.takeOperand(K.op));
      else {
        c = this.x;
        cs = this.xSexa;
      }
      if (K.op === '*') {
        r = this.apply(K.k, '*', c);
        rs = false;
      } else {
        r = this.apply(c, K.op, K.k);
        rs = this.sexaOf(K.op, cs, K.ks);
      }
    } else if (this.hasOperand) {
      ({ v: r, sexa: rs } = this.takeOperand('+'));
    } else {
      r = this.x;
      rs = this.xSexa;
    }
    return { r, rs, addon };
  }

  equals() {
    if (this.mode === 'day') return this.dayEquals();
    this.pendingApprox = false;
    const repeat = this.lastKey === '=';
    const { r, rs, addon } = this.computeEquals();
    const v = this.result(r, rs, addon);
    this.addToGT(v, rs);
    this.showResult(v, rs);
    this.eqCount = repeat ? this.eqCount + 1 : 1;
    this.ctrShow = repeat ? 'eq' : 'entries';
    this.lastKey = '=';
    this.settle();
  }

  addToGT(v, sexa) {
    if (!this.sw.gt) return;
    if (this.pendingApprox) return;
    const n = this.gt + v;
    if (intDigits(n) > 12) fail(4);
    this.gt = n;
    this.gtSexa = !!sexa;
    this.gtCount = (this.gtCount + 1) % 100;
  }

  showResult(v, sexa, kind = 'num') {
    this.x = v;
    this.xSexa = !!sexa;
    this.xKind = kind;
    this.entry = null;
    this.hasOperand = false;
    this.op = null;
    this.showEq = true;
    this.showDot = false;
  }

  // ---- ％ ----
  percent() {
    if (this.mode === 'day') return this.dayOperator('~');
    this.pendingApprox = false;
    let r, rs = false, addon = false;
    this.pctInfo = null;
    if (this.op) {
      const op = this.op;
      const a = this.acc;
      let b;
      if (this.hasOperand) ({ v: b } = this.takeOperand('%'));
      else b = a;
      switch (op) {
        case '*':
          r = div(mul(a, b), HUNDRED);
          this.K = { op: '*', k: a, ks: this.accSexa };
          this.pctInfo = { base: a, baseSexa: this.accSexa };
          break;
        case '/':
          if (b === 0n) fail(2);
          r = mul(div(a, b), HUNDRED);
          this.K = { op: '/', k: b, ks: false };
          break;
        case '+':
        case '-': {
          const p = div(mul(a, b), HUNDRED);
          if (intDigits(p) > 12) fail(5);
          r = op === '+' ? a + p : a - p;
          rs = this.sexaOf(op, this.accSexa, false);
          addon = true;
          break;
        }
      }
      this.op = null;
    } else {
      let c;
      if (this.hasOperand) ({ v: c } = this.takeOperand('%'));
      else c = this.x;
      if (this.K && this.K.op === '*') {
        r = div(mul(this.K.k, c), HUNDRED);
        this.pctInfo = { base: this.K.k, baseSexa: this.K.ks };
      } else if (this.K && this.K.op === '/') {
        if (this.K.k === 0n) fail(2);
        r = mul(div(c, this.K.k), HUNDRED);
      } else {
        // 演算命令のない ％ は 0
        r = 0n;
      }
    }
    const v = this.result(r, rs, addon);
    if (this.pctInfo) this.pctInfo.pct = v;
    this.addToGT(v, rs);
    this.showResult(v, rs);
    this.ctrShow = 'entries';
    this.eqCount = 0;
    this.lastKey = '%';
    this.settle();
  }

  // ---- √ ----
  sqrt() {
    if (this.mode === 'day') return;
    let v;
    if (this.entry) v = this.entryValue(this.entry, 'SQRT').v;
    else v = this.x;
    if (v < 0n) fail(1);
    const r = fit(isqrt(v * S)).v;
    this.entry = null;
    this.x = r;
    this.xSexa = false;
    this.xKind = 'num';
    this.xDec = null;
    this.hasOperand = true;
    this.showEq = false;
    this.lastKey = 'SQRT';
  }

  // ---- ＋/－ ----
  negate() {
    if (this.mode === 'day') return;
    if (this.entry) {
      this.entry.neg = !this.entry.neg;
    } else {
      this.x = -this.x;
      if (this.op) this.hasOperand = true;
    }
    this.showEq = false;
    this.lastKey = 'PM';
  }

  // ---- → ----
  shift() {
    const e = this.entry;
    if (!e || e.uncounted) return;
    this.lastKey = 'digit';
    if (e.kind === 'time') {
      const st = e.stage;
      if (e[st].length) e[st] = e[st].slice(0, -1);
      else if (st === 's') {
        e.stage = 'm';
        e.s = null;
      } else if (st === 'm') {
        e.kind = 'num';
        e.int = e.h || '0';
        e.frac = null;
        delete e.stage;
      }
      return;
    }
    if (e.kind === 'date') {
      if (e.d.length) e.d = e.d.slice(0, -1);
      else {
        e.kind = 'num';
        e.int = e.m || '0';
        e.frac = null;
      }
      return;
    }
    if (e.frac !== null && e.frac.length) e.frac = e.frac.slice(0, -1);
    else {
      e.frac = null;
      e.int = e.int.length > 1 ? e.int.slice(0, -1) : '0';
    }
  }

  clearErrShift() {
    const code = this.err.code;
    this.err = null;
    if (code === 10) return; // 概算値のまま計算を続ける
    const e = this.entry;
    if (!e) return;
    if (code === 3) {
      e.int = e.int.slice(0, 12);
      return;
    }
    if (code === 8) {
      e.int = e.int.slice(0, -1) || '0';
      return;
    }
    if (code === 7) this.shift();
  }

  clearErrCE() {
    const code = this.err.code;
    this.err = null;
    if (code === 10) return;
    this.blankEntry();
  }

  // ---- CE ----
  keyCE() {
    if (this.entry || this.hasOperand) {
      this.blankEntry();
    } else if (!this.op && !this.dayOp) {
      this.x = 0n;
      this.xSexa = false;
      this.xKind = 'num';
      this.xDec = null;
    }
    this.showEq = false;
    this.ctrShow = 'entries';
    this.lastKey = 'CE';
  }

  // ---- メモリー呼び出し（RM・GT） ----
  recall(v, sexa, ctr, key) {
    if (!this.op && !this.dayOp) {
      this.entries = 0;
      this.addOn = null;
    }
    this.entries = (this.entries + 1) % 100;
    this.operandCounted = true;
    this.entry = null;
    this.x = v;
    this.xSexa = this.mode === 'time' && sexa;
    this.xKind = 'num';
    this.xDec = this.xSexa ? null : this.tabDec();
    if (this.xDec !== null) {
      const dd = Math.min(this.xDec, 12 - Math.max(intDigits(v), 1));
      this.x = roundTo(v, dd, this.sw.round);
      this.xDec = dd;
    }
    // 空のメモリーを呼び出したときは「0.」（取扱説明書 p.27）
    if (this.x === 0n) this.xDec = null;
    this.hasOperand = true;
    this.showEq = false;
    this.ctrShow = ctr;
    this.lastKey = key;
  }

  keyGT() {
    if (this.lastKey === 'GT') {
      this.gt = 0n;
      this.gtCount = 0;
      this.gtSexa = false;
      this.ctrShow = 'entries';
      this.lastKey = 'GT2';
      return;
    }
    this.recall(this.gt, this.gtSexa, 'gt', 'GT');
  }

  // ---- M＋ M－（＝ の働きをかねる） ----
  memKey(sign) {
    let r, rs;
    this.pendingApprox = false;
    if (this.mode === 'day') {
      if (this.dayOp || (this.entry && this.entry.kind !== 'num')) return;
      if (!this.entry && this.xKind === 'date') return;
      if (this.entry) r = this.takeOperand('+').v;
      else r = this.x;
      rs = false;
    } else if (this.op || (this.addOn && this.lastKey === 'op')) {
      ({ r, rs } = this.computeEquals());
    } else if (this.hasOperand) {
      ({ v: r, sexa: rs } = this.takeOperand('+'));
    } else {
      r = this.x;
      rs = this.xSexa;
    }
    const v = this.mode === 'day' ? fit(r).v : this.result(r, rs, false);
    if (this.pendingApprox) fail(4);
    const n = this.mem + sign * v;
    if (intDigits(n) > 12) fail(4);
    this.mem = n;
    this.memSexa = !!rs;
    this.memCount = (this.memCount + 1) % 100;
    const kind = this.mode === 'day' ? (this.xKind === 'days' ? 'days' : 'num') : 'num';
    this.showResult(v, rs, kind);
    this.ctrShow = 'entries';
    this.lastKey = 'M';
  }

  // ---- 日数/時間 ----
  keyDT(wasFresh) {
    if (this.mode === 'normal') {
      const m = this.lastMode;
      this.clearCalc();
      this.mode = m;
      this.fresh = true;
      return;
    }
    if (wasFresh) {
      this.mode = this.mode === 'day' ? 'time' : 'day';
      this.lastMode = this.mode;
      this.fresh = true;
      return;
    }
    const e = this.entry;
    if (this.mode === 'time') {
      if (e && !e.uncounted) {
        if (e.kind === 'num') {
          if (e.frac !== null) {
            // 10進数 → 60進数 変換
            const { v } = this.entryValue(e, 'DT');
            this.checkSexa(v);
            this.entry = null;
            this.x = v;
            this.xSexa = true;
            this.hasOperand = true;
          } else {
            if (e.int.length > 6) fail(8);
            e.kind = 'time';
            e.h = e.int;
            e.stage = 'm';
            e.m = '';
            e.s = null;
          }
        } else if (e.kind === 'time' && e.stage === 'm') {
          e.stage = 's';
          e.s = '';
        }
        this.lastKey = 'digit';
        return;
      }
      if (this.op && !this.hasOperand) return;
      // 結果表示後：60進数 ⇔ 10進数
      if (!this.xSexa) this.checkSexa(this.x);
      this.xSexa = !this.xSexa;
      this.xDec = null;
      this.lastKey = 'DT';
      return;
    }
    // 日数計算モード：月の入力
    if (e && !e.uncounted && e.kind === 'num') {
      e.kind = 'date';
      e.m = e.int;
      e.mFrac = e.frac;
      e.d = '';
      this.lastKey = 'digit';
    }
  }

  // ---- 日数計算 ----
  dayOperand() {
    const e = this.entry;
    if (e) {
      if (e.kind === 'date') {
        const m = +e.m.slice(-2);
        const d = +e.d.slice(-2);
        if (e.mFrac != null || e.d === '' || !(m >= 1 && m <= 12) || !(d >= 1 && d <= DIM[m - 1])) fail(7);
        return { kind: 'date', doy: toDoy(m, d) };
      }
      return { kind: 'num', v: this.entryValue(e, 'DAY').v };
    }
    if (this.xKind === 'date') return { kind: 'date', doy: this.xDoy };
    return { kind: 'num', v: this.x };
  }

  dayOperator(op) {
    if (op === '*' || op === '/') return; // 期日計算では無効
    if (this.dayOp && !this.hasOperand) {
      this.dayOp.type = op;
      this.showDot = true;
      this.lastKey = 'op';
      return;
    }
    const o = this.dayOperand();
    if (o.kind !== 'date') return;
    this.dayOp = { type: op, start: o.doy };
    this.entry = null;
    this.hasOperand = false;
    this.xKind = 'date';
    this.xDoy = o.doy;
    this.showDot = true;
    this.showEq = false;
    this.ctrShow = 'entries';
    this.lastKey = 'op';
  }

  dayEquals() {
    let calc = this.dayOp;
    if (!calc) {
      if (!this.K || !this.K.day || !this.hasOperand) return;
      calc = this.K;
    }
    if (!this.hasOperand) return;
    const repeat = this.lastKey === '=';
    const o = this.dayOperand();
    const sw = this.sw.round; // ↑=両入 5/4=片落 ↓=両落
    if (calc.type === '~') {
      if (o.kind !== 'date') fail(7);
      let diff = (o.doy - calc.start + 365) % 365;
      if (diff === 0) diff = 365;
      const days = diff + (sw === 'up' ? 1 : sw === 'down' ? -1 : 0);
      const v = BigInt(days) * S;
      this.addToGT(v, false);
      this.showResult(v, false, 'days');
    } else {
      if (o.kind !== 'num') fail(7);
      const v = o.v;
      if (v % S !== 0n || v <= 0n) fail(7);
      const n = Number(v / S);
      const min = sw === 'up' ? 2 : 1;
      const max = sw === 'up' ? 366 : sw === 'down' ? 364 : 365;
      if (n < min) fail(7);
      if (n > max) fail(6);
      const off = n + (sw === 'up' ? -1 : sw === 'down' ? 1 : 0);
      const sign = calc.type === '+' ? 1 : -1;
      const doy = ((((calc.start - 1 + sign * off) % 365) + 365) % 365) + 1;
      this.xDoy = doy;
      this.showResult(0n, false, 'date');
    }
    this.entry = null;
    this.K = { day: true, type: calc.type, start: calc.start };
    this.dayOp = null;
    this.eqCount = repeat ? this.eqCount + 1 : 1;
    this.ctrShow = repeat ? 'eq' : 'entries';
    this.lastKey = '=';
  }

  // ================= 表示 =================
  // cells: 左から12桁 {ch, dp, comma}
  getDisplay() {
    const D = this.rawDisplay();
    // 負号は数値のすぐ左の桁に表示（12桁すべて使うときは左端の記号）
    if (D.minus) {
      const first = D.cells.findIndex((c) => c.ch !== '');
      if (first > 0) {
        D.cells[first - 1].ch = '-';
        D.minus = false;
      }
    }
    return D;
  }

  rawDisplay() {
    const D = {
      on: this.power,
      counter: '',
      eqSym: false,
      M: false,
      G: false,
      E: false,
      jikan: false,
      nissu: false,
      tsuki: false,
      hi: false,
      kara: false,
      op: null,
      dot: false,
      minus: false,
      eq: false,
      cells: Array.from({ length: 12 }, () => ({ ch: '', dp: false, comma: false })),
    };
    if (!this.power) return D;
    D.M = this.mem !== 0n;
    D.G = this.gt !== 0n;
    D.E = !!this.err;
    D.jikan = this.mode === 'time';
    D.nissu = this.mode === 'day';
    D.dot = this.showDot;
    D.eq = this.showEq;
    if (this.mode === 'day') {
      if (this.dayOp) {
        if (this.dayOp.type === '~') D.kara = true;
        else D.op = this.dayOp.type;
      }
    } else if (this.op) D.op = this.op;

    let ctr = this.entries;
    if (this.ctrShow === 'eq') ctr = this.eqCount;
    else if (this.ctrShow === 'mem') ctr = this.memCount;
    else if (this.ctrShow === 'gt') ctr = this.gtCount;
    D.eqSym = this.ctrShow !== 'entries';
    D.counter = String(ctr % 100).padStart(2, '0');

    const code = this.err && this.err.code;
    if (this.err && ![3, 7, 8, 10].includes(code)) {
      placeNumber(D, '0', '');
      return D;
    }
    const e = this.entry;
    if (e) {
      if (e.kind === 'num') {
        if (code === 3) placeApprox(D, BigInt(e.int) * S, e.neg);
        else {
          placeNumber(D, e.int, e.frac || '');
          D.minus = e.neg;
        }
      } else if (e.kind === 'time') {
        const mm = e.m === '' && e.stage === 'm' ? '00' : (e.m || '').slice(-2).padStart(2, '0');
        let ss = '--';
        if (e.stage === 's' || (e.m && e.m.length)) ss = (e.s || '').slice(-2).padStart(2, '0');
        placeTime(D, e.h.replace(/^0+(?=\d)/, ''), mm, ss);
        D.minus = e.neg;
      } else if (e.kind === 'date') {
        placeDate(D, e.m.replace(/^0+(?=\d)/, ''), e.d === '' ? '' : e.d.slice(-2).replace(/^0(?=\d)/, ''));
      }
      return D;
    }
    if (this.xKind === 'date') {
      const { m, d } = fromDoy(this.xDoy);
      placeDate(D, String(m), String(d));
      return D;
    }
    if (this.xKind === 'days') {
      placeNumber(D, (this.x / S).toString(), '', false);
      D.hi = true;
      return D;
    }
    if (this.xSexa && this.mode === 'time') {
      const tot = (abs(this.x) * 3600n + S / 2n) / S;
      const h = tot / 3600n;
      const m = (tot % 3600n) / 60n;
      const s = tot % 60n;
      placeTime(D, h.toString(), String(m).padStart(2, '0'), String(s).padStart(2, '0'));
      D.minus = this.x < 0n && tot !== 0n;
      return D;
    }
    if (intDigits(this.x) > 12) {
      placeApprox(D, this.x, this.x < 0n);
      return D;
    }
    const a = abs(this.x);
    const ip = intDigits(a);
    const maxDec = 12 - Math.max(ip, 1);
    let int = (a / S).toString();
    let frac = (a % S).toString().padStart(SD, '0').slice(0, maxDec);
    if (this.xDec !== null) frac = frac.slice(0, this.xDec);
    else frac = frac.replace(/0+$/, '');
    placeNumber(D, int, frac);
    D.minus = this.x < 0n;
    return D;
  }
}

// ---- 表示セルへの配置 ----
function placeNumber(D, int, frac, dp = true) {
  const s = int + frac;
  const start = 12 - s.length;
  for (let i = 0; i < s.length; i++) {
    const c = D.cells[start + i];
    c.ch = s[i];
    const fromRight = int.length - 1 - i;
    if (i < int.length - 1 && fromRight % 3 === 0) c.comma = true;
    if (dp && i === int.length - 1) c.dp = true;
  }
}

function placeApprox(D, v, neg) {
  const a = abs(v);
  const ip = intDigits(a);
  const digits = (a / pow10(SD + ip - 12)).toString();
  const intLen = ip - 12;
  let int = digits.slice(0, intLen);
  let frac = digits.slice(intLen).replace(/0+$/, '');
  placeNumber(D, int, frac);
  D.minus = neg;
}

function placeTime(D, h, mm, ss) {
  // 時（～7桁目）- 分（9・10桁目）' 秒（11・12桁目）
  for (let i = 0; i < h.length; i++) D.cells[7 - h.length + i].ch = h[i];
  D.cells[7].ch = '-';
  D.cells[8].ch = mm[0];
  D.cells[9].ch = mm[1];
  D.cells[9].comma = true;
  D.cells[10].ch = ss[0];
  D.cells[11].ch = ss[1];
  D.cells[11].dp = true;
}

function placeDate(D, m, d) {
  // 月（8・9桁目）　日（11・12桁目）
  for (let i = 0; i < m.length && i < 2; i++) D.cells[9 - Math.min(m.length, 2) + i].ch = m.slice(-2)[i];
  for (let i = 0; i < d.length; i++) D.cells[12 - d.length + i].ch = d[i];
  D.tsuki = true;
  D.hi = true;
}
