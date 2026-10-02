# EL-G37 電卓 (personal web app)

A personal, offline-capable web replica of the SHARP EL-G37 学校用電卓, built from the official
取扱説明書 (TINSJA014EHSA) for my own CPA study use. Not affiliated with SHARP.

- Pure static files (HTML/CSS/JS, no build step) — works on GitHub Pages.
- Install on iPhone: open the site in Safari → 共有 → **ホーム画面に追加**. Runs full-screen and offline.
- Haptics: every key and switch fires a haptic tap (iPhone: iOS 18+ with システムの触覚 enabled; Android: vibration).
- Memory, GT memory, switch positions and the last 日数/時間 mode are kept when the app is closed
  (like the built-in battery). 自動節電機能: display turns off after ~7 minutes; press **C (ON)** or **CA**.
- Desktop keyboard (extra, not on the device): digits, `+ - * / = % .`, Enter (=), Backspace (→),
  Delete (CE), Esc (C), `r` (√), `n` (+/−), `g` (GT), `d` (日数/時間), `m` (RM), `p` (M+), `o` (M−), `l` (CM).

## Tests

`tests/engine.test.html` replays every worked example in the manual (counter, constants, %, 割増・割引,
べき, 開平, 逆数, メモリー, GT, アディング, 時間計算, 日数計算, 見取算, 手形割引, 複利, 減価償却, errors ①–⑩).
Serve the folder (`python3 -m http.server`) and open `/tests/engine.test.html`.
`/?segments` lights every LCD segment for a visual check.

## Behaviors inferred (not stated in the manual) — verify on the real calculator

| # | Behavior implemented | Check |
|---|---|---|
| 1 | Negative sign uses the fixed “−” segment in the left column (per the LCD diagram), not a minus next to the digits | ☐ |
| 2 | `a + =` → a; `a − =` → −a (a becomes the constant); `a × =` → a²; `a ÷ =` → 1/a | ✅ confirmed on device |
| 3 | `x %` with no operator → 0 | ✅ confirmed on device |
| 4 | With TAB fixed (e.g. 2), a zero result shows `0.` not `0.00` (from p.27 showing `0.` after GT GT CM) | ☐ |
| 5 | CE right after a result clears the display to 0; CE right after an operator does nothing | ☐ |
| 6 | → only edits a number being entered; it does nothing on a calculated result | ☐ |
| 7 | M+/M− after a bare number adds just that number (no constant applied); with a pending operation it acts as = and sets the constant; M+/M− are not added to GT | ☐ |
| 8 | RM / GT recall counts as one entry in the counter (supported by p.13: C GT GT → 01) | ☐ |
| 9 | A (adding) mode: entry shows as typed (`145.`) and is converted to 1.45 when used by + / − / = / M+ / M−; results show 2 decimals | ☐ |
| 10 | Typing a 13th integer digit shows the 概算 form with E (`1.23456789012`); → drops the 13th digit, CE clears to 0 | ☐ |
| 11 | Non-recoverable errors (①②④⑤⑥⑨, 25+ digit results) show `E 0.`; memory/GT keep their previous value on ④ | ☐ |
| 12 | After clearing a 概算 error with CE and continuing, a result that still has 13–24 integer digits shows E again | ☐ |
| 13 | 時間: typing minutes immediately turns `--` into `00`; minutes/seconds keep the last 2 digits; a decimal number + 日数/時間 converts it to 60進 | ☐ |
| 14 | 時間: a result toggled to 10進 with 日数/時間 shows the floating value (not TAB-rounded); RM/GT recall shows 60進 if the last stored value was 60進 | ☐ |
| 15 | Pressing 日数/時間 in normal mode mid-calculation enters the mode and clears the calculation (memory kept) | ☐ |
| 16 | 日数: 0 days (or 1 day in 両入) → error ⑦; more than 1 year → ⑥; a 期間計算 day count can go into memory/GT | ☐ |
| 17 | `a × b %` then `c %` → a × c % (constant), mirroring the manual’s ÷ example | ☐ |
| 18 | 切り上げ / 四捨五入 work on magnitude (negative numbers round away from zero) | ☐ |
| 19 | Counter wraps from 99 to 00 | ☐ |
| 20 | Two-key rollover: a key pressed while another is held is entered when the first key is released | ☐ |

## Credits

- Layout, functions and display behavior: SHARP EL-G37 取扱説明書.
- Colors and panel details: SHARP’s official EL-G37 product photo (jp.sharp/calc/products/elg37/).
- SHARP wordmark shape: public-domain logo file from Wikimedia Commons. SHARP and ELSI MATE are trademarks of
  SHARP Corporation; this is a non-commercial personal project.
