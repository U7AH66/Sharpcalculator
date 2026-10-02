# EL-G37 電卓 (personal web app)

A personal, offline-capable web replica of the SHARP EL-G37 学校用電卓, built from the official
取扱説明書 (TINSJA014EHSA) for my own CPA study use. Not affiliated with SHARP.

- Pure static files (HTML/CSS/JS, no build step) — works on GitHub Pages.
- Install on iPhone: open the site in Safari → 共有 → **ホーム画面に追加**. Runs full-screen and offline.
- Haptics: every key and switch fires a haptic tap (iPhone: iOS 18+ with システムの触覚 enabled, fires as the finger lifts; Android: vibration on press).
- Memory, GT memory, switch positions and the last 日数/時間 mode are kept when the app is closed
  (like the built-in battery). 自動節電機能: display turns off after ~7 minutes; press **C (ON)** or **CA**.
- Desktop keyboard (extra, not on the device): digits, `+ - * / = % .`, Enter (=), Backspace (→),
  Delete (CE), Esc (C), `r` (√), `n` (+/−), `g` (GT), `d` (日数/時間), `m` (RM), `p` (M+), `o` (M−), `l` (CM).

## Tests

`tests/engine.test.html` replays every worked example in the manual (counter, constants, %, 割増・割引,
べき, 開平, 逆数, メモリー, GT, アディング, 時間計算, 日数計算, 見取算, 手形割引, 複利, 減価償却, errors ①–⑩).
Serve the folder (`python3 -m http.server`) and open `/tests/engine.test.html`.
`/?segments` lights every LCD segment for a visual check.

## Behaviors not stated in the manual — checked against the real calculator

| # | Behavior implemented | Check |
|---|---|---|
| 1 | Negative sign appears directly left of the number (`-5.`); only a full 12-digit number uses the left-column “−” | ✅ confirmed on device |
| 2 | `a + =` → a; `a − =` → −a (a becomes the constant); `a × =` → a²; `a ÷ =` → 1/a | ✅ confirmed on device |
| 3 | `x %` with no operator → 0 | ✅ confirmed on device |
| 4 | With TAB fixed (e.g. 2), a zero result shows `0.00`; recalling an empty GT/memory shows `0.` (p.27) | ✅ confirmed on device (recall case also matches manual p.27) |
| 5 | CE does nothing right after a result or right after an operator (it only clears an entry or a recalled value) | ✅ confirmed on device |
| 6 | → also works on a result, dropping its last digit (`2.5` → `2.`) | ✅ confirmed on device |
| 7 | M+/M− after a plain number adds just that number; M+/M− are not added to GT | ✅ confirmed on device |
| 8 | RM / GT recall counts as one entry in the counter | ✅ confirmed on device |
| 9 | A (adding) mode: entry shows as typed (`145.`) and becomes 1.45 when + is pressed | ✅ confirmed on device |
| 10 | A 13th integer digit is not entered; E shows with the 12 digits; → or CE clears the error | ✅ confirmed on device (CE clearing to 0 is from the manual) |
| 11 | Non-recoverable errors show `E 0.` | ✅ confirmed on device |
| 12 | After clearing a 概算 error, further 概算 results show without E | ✅ confirmed on device |
| 13 | 時間: typing minutes turns `--` into `00`; a decimal number + 日数/時間 converts it to 60進 | ✅ confirmed on device |
| 13b | 時間: 60+ minutes show as typed (`4-75'00.`) even after an operator; they carry over in the result | ✅ display confirmed on device (carry-over from manual) |
| 14 | 時間: a result switched to 10進 with 日数/時間 follows the TAB/round switches (`1.33` with TAB 2); switching back restores the exact 60進 value | ✅ confirmed on device |
| 14b | 時間: RM shows 60進 when a 60進 value was stored | ✅ confirmed on device |
| 15 | 日数/時間 does nothing while an operation is pending (`5 +`); right after a number or after `=` it enters 日数/時間 mode | ✅ confirmed on device |
| 16 | 日数: invalid day count → error; over 1 year → error; a 期間計算 day count can go into memory | ✅ confirmed on device |
| 17 | `a × b %` then `c %` → a × c % | ✅ confirmed on device |
| 18 | 切り上げ / 四捨五入 round negatives away from zero | ✅ confirmed on device |
| 19 | Counter wraps from 99 to 00 | ✅ confirmed on device |
| 20 | Two-key rollover: hold 1, press 2, release 1 → `12` | ✅ confirmed on device |

## Credits

- Layout, functions and display behavior: SHARP EL-G37 取扱説明書.
- Colors and panel details: SHARP’s official EL-G37 product photo (jp.sharp/calc/products/elg37/).
- SHARP wordmark shape: public-domain logo file from Wikimedia Commons. SHARP and ELSI MATE are trademarks of
  SHARP Corporation; this is a non-commercial personal project.
