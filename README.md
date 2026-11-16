# 🤖 VEX V5 Match Reviewer & Maneuver Tagger

A fast, keyboard-driven web application designed specifically for robotics teams to review VEX V5 match footage frame-by-frame, break matches down into tactical maneuvers, evaluate execution success, record tournament metadata, diagnose autonomous routines, and import/export clean data to CSV.

---

## 🚀 Quick Start

Open your terminal and run:
```bash
cd /Users/micahsievert/.gemini/antigravity/scratch/vex-match-reviewer
./start.sh
```
Or open directly:
```bash
open /Users/micahsievert/.gemini/antigravity/scratch/vex-match-reviewer/index.html
```

---

## 📂 CSV Import & Full State Restoration (New!)

You can upload any previously saved CSV to restore your review, maneuvers, and stats immediately:

### How to Import:
1. **Header Button:** Click **`📂 Import CSV`** in the top navigation bar.
2. **Drag & Drop:** Drag and drop any `.csv` file directly onto the app window or video player deck.
3. **Menu Option:** Click `⋮` ➔ `📂 Import from CSV`.
4. **Settings:** Under `⚙️ Settings` ➔ `💾 Auto-Save & Storage` ➔ `📂 Import / Restore from CSV`.

### What Gets Restored from CSV:
* **All Maneuver Actions:** Start/End timestamps, durations, activity categories, success ratings, notes, and visual colored timeline blocks.
* **Match Metadata:** Match names, outcomes (Win/Loss/Tie), our scores, opponent scores, alliance colors, and partner & opponent stats (Rank, WP, AP, SP, notes).
* **Autonomous Breakdown:** Routine name, coded max points, actual points scored, efficiency %, bonus won, AWP secured, root cause error tags, and diagnosis notes.
* **Auto-Taxonomy Detection:** If the imported CSV contains custom activities or ratings not currently in your settings, the app automatically registers them and assigns color badges so all tables and stats render cleanly.
* **Auto-Saved to Browser:** Once imported, everything is immediately saved to your browser's persistent `localStorage`.

---

## 💾 How Your Scales & Custom Activities Save

### 1. Persistent Browser Storage (`localStorage`)
* **Across Matches:** When you choose or customize a scale or add activity categories, they are saved globally. **Every new match you create immediately uses these settings.**
* **Across Restarts & Reboots:** Your scales and activities persist permanently in `localStorage`. You can close the tab, quit your browser, restart your Mac, and reopen the app weeks from now—**they will never disappear or reset**.
* **Real-Time Visual Indicator:** Watch the `● Auto-saved` badge in the header. It flashes yellow (`Saving...`) and locks green with the exact timestamp.

### 2. Baking Directly Into Source Code (Optional)
If you want your custom scale or activities permanently hardcoded into the source code file:
* Open [`app.js`](file:///Users/micahsievert/.gemini/antigravity/scratch/vex-match-reviewer/app.js).
* Near the top, edit `DEFAULT_ACTIVITIES` and `RATING_PRESETS['5-tier']`.
* Your values will be the permanent factory defaults!

---

## 📋 Match Metadata & Tournament Stats (`📋 Match Info`)

Click **`📋 Match Info`** in the header (or click the **Match** / **Teams** pill on the main screen) to track:
* **Outcome & Scoring:**
  * Alliance Color: Red Alliance vs Blue Alliance toggle.
  * Match Result: 🏆 Win / ❌ Loss / 🤝 Tie.
  * Final Score: Our Alliance Score vs. Opponent Score.
  * Autonomous Winner: Our Alliance, Opponents, Tied, or None.
  * Autonomous Win Point (AWP): Toggle checkbox.
* **Alliance Partner & Opponent Stats:**
  * **Alliance Partner Card:** Team #, End of Day Rank, Win Points (WP), Autonomous Points (AP), Strength Points (SP), Driver & reliability notes.
  * **Opponent 1 Card:** Team #, Rank, WP, AP, SP, Scouting notes.
  * **Opponent 2 Card:** Team #, Rank, WP, AP, SP, Scouting notes.
* **General Strategy & Takeaways:** Freeform notes on alliance synergy and game plan adjustments.

---

## 🎯 Autonomous Performance Breakdown (`🎯 Auton Review`)

Click **`🎯 Auton Review`** in the header (or click the **Auton** pill on the main screen) to evaluate autonomous execution:
* **Live Efficiency Meter:**
  * Automatically calculates: `Efficiency % = (Actual Points / Coded Max Points) * 100%`.
  * Visual colored progress bar (Green for ≥80%, Yellow for ≥50%, Red for <50%).
* **Routine Details:**
  * Routine Name / Code Version (e.g. `Left 5-Ring + WinPoint Touch`).
  * Starting Position (Red Left, Red Right, Blue Left, Blue Right, Skills Center).
  * Coded Theoretical Max Points (points if code executes 100% clean).
  * Actual Points Scored in match.
  * Auton Bonus Won (Won, Tied, Lost).
  * AWP Secured toggle.
* **Root Cause & Issue Analysis:** One-click clickable issue chips to pinpoint why points were missed:
  * *Alignment Off at Start*
  * *Tile Friction / Field Drift*
  * *Odometry / Inertial Slip*
  * *Partner Collision / Line Touch*
  * *Opponent Interference / Defense*
  * *Intake / Roller Jam*
  * *Game Element Bounce-out*
  * *Ran Out of Time (Timeout)*
  * *Code / PID Bug*
  * *Mechanism Failure*
* **Detailed Diagnosis Notes:** Large textarea to explain what went wrong, why it failed, and what to tweak in the starting jig or code before the next match.

---

## 📊 Exporting & Importing CSVs

### Export Options (under `📥 Export CSV` and `⋮` More):
1. **`📥 Export CSV` (Active Match):** Exports all maneuvers in the active match, including all match outcome columns, alliance stats, and auton performance.
2. **`📊 Export All 8 Matches Maneuvers CSV`:** Master sheet with every single logged maneuver across all 8 matches, with match scores, partner ranks, and auton data attached to each row.
3. **`📋 Export 8-Match Summary CSV`:** A dedicated tournament overview table (1 row per match) summarizing:
   * Match Name, Outcome, Score, Alliance Color
   * Partner Team, Partner Rank, WP, AP, SP, Partner Notes
   * Opponent 1 & 2 Ranks and Scouting Notes
   * Auton Routine, Coded Max, Actual Scored, Auton Efficiency %, Bonus, AWP
   * Auton Root Causes & Diagnosis Notes
   * Total Maneuvers Logged, Overall Maneuver Success Rate %
   * General Match Takeaways & Source Video Filename

### Re-Importing:
Click **`📂 Import CSV`** or drag any exported CSV into the app window. All matches, maneuvers, auton breakdowns, and stats are restored onto your timeline and dashboard.

---

## ⌨️ Keyboard Shortcuts Reference

| Shortcut | Action |
| :--- | :--- |
| <kbd>Space</kbd> | Play / Pause playback |
| <kbd>←</kbd> / <kbd>,</kbd> | Step **1 frame backward** |
| <kbd>→</kbd> / <kbd>.</kbd> | Step **1 frame forward** |
| <kbd>J</kbd> | Jump **1 second backward** |
| <kbd>L</kbd> | Jump **1 second forward** |
| <kbd>Shift</kbd> + <kbd>←</kbd> / <kbd>→</kbd> | Jump **5 seconds backward / forward** |
| <kbd>[</kbd> or <kbd>I</kbd> | **Set Start Time** (In-point) |
| <kbd>]</kbd> or <kbd>O</kbd> | **Set End Time** (Out-point) |
| <kbd>R</kbd> | **Loop Preview** current interval |
| <kbd>Enter</kbd> | **Save Maneuver** to log |
| <kbd>Esc</kbd> | Close open modals / clear markers |
| <kbd>?</kbd> | Open Shortcuts cheat sheet |
