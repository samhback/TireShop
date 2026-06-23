# GameUtil — Regression Test Cases

Manual playtest checklist for the bug fixes applied to
`ServerStorage.Modules.GameUtil`. Each section lists the **fix under test**,
**steps to reproduce the scenario**, the **expected (fixed) result**, and a
**regression guard** — the related behavior that must still work so the fix
didn't break anything adjacent.

Run these in a Studio playtest with at least 2 players (use multiple clients
or bot stand-ins). Watch the server **Output** window for the `print` traces
referenced below, and watch the on-screen scoreboard / play-by-play feed.

---

## #14 — `MovePlayersToPositions` called with `:` instead of `.`

**Scenario A — normal scrimmage play**
1. Start a game, get to any 1st-down snap.
2. Run a play to completion (tackle/incomplete) so `StartNewPlay` fires.

- **Expected:** Players are re-positioned to offense/defense spots each new
  play; no error in Output referencing `MovePlayersToPositions` or `self`.
- **Regression guard:** Offense lines up on the possession team's spots,
  defense on the other team's; spots are randomized per play.

**Scenario B — extra point**
1. Score a touchdown to trigger `ExtraPoint`.
- **Expected:** Players reposition for the XP attempt with no error.

**Scenario C — punt**
1. Reach 4th down in a situation where `ShouldPunt` returns true.
- **Expected:** Players reposition for the punt with no error.

---

## #1 — `EndGame()` no longer hangs on a tie

**Scenario A — tie via player loss (primary fix)**
1. Start a 2-player game (one player per team), score tied (e.g. 0–0).
2. Have one team's only player leave so `handlePlayerRemoved` runs with an
   empty team and no fans to promote → `EndGame()` is reached on a tie.

- **Expected:** Alert shows **"The game has ended in a tie!"**, scoreboard
  resets (0–0, clock/quarter reset, play clock 20), all players moved to
  spectators, `QBVote ClearVote` fires. `StartGame` is invoked but returns
  early because `playerCount < playersRequiredToStart` (no premature restart).
- **Before fix:** Nothing happened — game froze, no reset.

**Scenario B — tie forced from an OT safety**
1. Reach overtime; engineer a safety that ties the score.
2. `SafetyScored` → `CheckForOTEnd(true)` → `EndGame()` on a tie.
- **Expected:** Tie alert, full reset, then `StartGame` (restarts if enough
  players remain).

**Regression guards (must still behave exactly as before):**
- **Home win:** End regulation/OT with home ahead → "The home team has won!",
  reset, restart.
- **Away win:** symmetric → "The away team has won!".
- **4Q ending tied:** must go to **overtime** (`StartOvertime`), NOT `EndGame`.
  Confirm `NewQuarter` for 4Q with equal scores still calls `StartOvertime`.

---

## #5 — Overtime no longer spams `NewQuarter`

**Scenario**
1. Force a tie at the end of 4Q so the game enters overtime.
2. Let the game sit between OT plays (clock stopped, `currentTime == 0`,
   quarter == "OT", `Play` attribute false).

- **Expected:** Output does **NOT** repeatedly print "Should be starting new Q"
  every second. Scoreboard Clock/Quarter are not re-fired on a 1-second loop.
- **Before fix:** `NewQuarter` was called every second during OT downtime.

**Regression guards:**
- **End of 1Q:** clock hits 0 between plays → advances to 2Q exactly once.
- **End of 2Q:** advances to 3Q + halftime kickoff exactly once.
- **End of 3Q:** advances to 4Q exactly once.
- **End of 4Q:** ends game or starts OT exactly once.
- **Quarter-expires-mid-play:** if clock hits 0 while `Play == true`, the
  quarter change waits until the play ends, then fires once.
- **Two-minute warnings** in 2Q and 4Q still trigger once each.

---

## #6 — Endzone-catch touchdown is now announced

**Scenario**
1. QB throws to a receiver; receiver catches the ball and the play resolves
   as a TD via the LOS-position path (ball ends in the away endzone with
   Home possession; `confirmedLandedPlayer` set and `LastThrower` attribute
   present).

- **Expected:** Play-by-play feed shows
  `"<thrower> threw the ball to <receiver> for a <N> touchdown!"`.
  Points are awarded (TouchdownScored), and `confirmedLandedPlayer` is cleared.
- **Before fix:** TD scored but no play-by-play line appeared.

**Regression guards:**
- The TD is only announced **once** (confirm the endzone `Touched` path in
  `turnOnEndzone` doesn't also fire a duplicate line for the same score —
  `scoredTD` guard).
- Points awarded exactly once (6, or 2 on a 2-pt conversion).

---

## #8 — `CheckForPlayerLanded` no longer errors on a nil ball/foot

**Scenario A — ball glitched / despawned**
1. Trigger a catch/landing evaluation for a player who no longer has a
   Football (e.g. ball fell through map / was destroyed, or rig missing
   `RightFootPad`).

- **Expected:** `CheckForPlayerLanded` returns early cleanly; **no** Output
  error like "attempt to index nil with 'Position'". The play continues
  without a server-side error breaking the catch logic.
- **Before fix:** Errored on `RightFootPad.Position` / `FootballHandle.Position`.

**Regression guard (normal catch still works):**
- A normal pass where the receiver genuinely has the ball: the function still
  waits for the player/ball to land, then runs catch / interception /
  air-tackle logic as before. `Caught` attribute set, interceptions detected.

---

## #13 — Kickoff/punt scoreboard double-update guarded

**Scenario A — kickoff return tackled/landed in the field**
1. Kick off; receiving team fields the ball and is tackled/downed in the field
   of play (LOS ends up between the endzones).

- **Expected:** Down resets to **1st & 15** and chains move. The
  `UpdateScoreboardDown` should now fire **once** (from `StartNewPlay`'s
  `downTracker == "Kickoff"` block), not twice. Clock is stopped (kickoff).
- **Before fix:** Board updated twice (harmless but redundant).

**Scenario B — punt fielded/returned and resolved in the field (must still work)**
1. Punt; receiving team's resolution lands the LOS in the field of play.

- **Expected:** Possession flips to the receiving team, down resets to
  **1st & 15**, chains move. Because the punt path pre-sets
  `downTracker = "1st"`, `StartNewPlay` skips its own board update, so the
  guarded `if wasPunt then UpdateScoreboardDown(...)` MUST fire — confirm the
  scoreboard actually shows 1st & 15 (this is the load-bearing call).

**Regression guards:**
- `MoveChains()` runs for **both** kickoff and punt (FD line repositioned).
- Punt clock behavior unchanged vs. before (no new `StopClock` introduced on
  the punt path).
- `kickoffActive` is cleared to false after the return resolves.

---

## #3 — Interception touchback possession attribute fixed

**Scenario A — interception returned into the endzone for a touchback (primary fix)**
1. Team A is on offense. Team B intercepts a pass
   (`CheckForInterception` sets `gameState.possession = Team B`).
2. The interceptor's momentum / a tackle / walking out the back results in a
   touchback (no-arg `Touchback()` path).

- **Expected:** `workspace` attribute **"Possession"** equals **Team B**
  (the intercepting team) — matching the LOS placement and the Output line
  "A touchback has occured, the new possessing team is Team B". Client UI
  shows Team B with the ball.
- **Before fix:** Attribute was set to the stale `receivingTeam` from the last
  kickoff, so clients could show the wrong team on offense.

**Regression guards (kickoff touchbacks share this branch — must be unchanged):**
- **Kickoff ball bounces OOB → touchback:** possession attribute = receiving
  team (in this path `gameState.possession` was set to `receivingTeam` before
  the call, so the value is identical to before).
- **Kickoff returner walks out the back of the endzone → touchback:** same,
  possession attribute = the returning/receiving team.
- **`BallLost` on a kickoff → touchback:** possession attribute correct.
- **`optionalTeam` Touchback path** (Home/Away touchback LOS) still places the
  LOS correctly and is unaffected (it never touched the attribute).

---

## Cross-cutting smoke test (run once after all fixes)

Play a full short game end-to-end and confirm the core down/possession flow,
which the user explicitly cares about, is intact:

1. **Down progression:** 1st-down snap, tackle in field → becomes **2nd down**;
   repeat to 3rd, 4th.
2. **First down earned:** gain past the first-down marker → resets to **1st**.
3. **Turnover on downs:** fail to convert on 4th → possession flips, **1st down**
   for the new team, chains flip direction.
4. **Touchdown → extra point → kickoff** sequence completes and play resumes.
5. **Safety / touchback** rulings (note: safety edge cases #9/#10 are still
   OPEN and not fixed — verify only that the fixes above didn't change them).
6. **End of game** declares the correct winner and resets cleanly.

---

# New punt-style kickoff system

These cover the new `KickoffNew` path. **It is gated behind `USE_NEW_KICKOFF`
in GameUtil (currently `false`).** Flip it to `true` in Studio to test, and set
it back to `false` to fall back to the legacy auto-toss kickoff at any time.

Assets/identifiers involved: `ServerStorage.KickoffPuntBall` (bouncing ball,
cloned from PuntFootball), runtime `workspace.KickoffMidfieldWall` (the 50-yd
wall), and the kicking-side `FootballSpawn` pickup.

## Toggle / regression of legacy
- **Flag off (`false`):** kickoffs behave exactly as before (auto-toss
  `ReplicatedStorage.KickoffBall`). Confirm game start, post-score, halftime,
  and OT kickoffs are unchanged.
- **Flag on (`true`):** the new system runs. The dispatcher falls back to legacy
  if `KickoffNew` is somehow absent — confirm no errors on either setting.

## Setup phase
1. Trigger a kickoff with the flag on.
- **Expected:** 3..1 countdown; then LOSWALL stays **solid** (kicking team can
  walk but not cross it); a midfield wall blocks the **receiving** team at the
  50 (they can roam their own half); a `FootballSpawn` pickup appears on the
  kicking side. A kick timer counts down on the play-clock display.
- **Regression guard:** receiving players cannot walk past midfield; kicking
  players cannot cross the LOSWALL; both walls drop the instant the ball is
  kicked.

## Becoming the kicker
1. A **kicking-team** player walks into the pickup.
- **Expected:** they receive the bouncing ball (KickoffPuntBall), it is
  auto-equipped, and they are **frozen in place** (cannot walk) until they kick.
  Click/hold to charge power and release/click to kick (same control as a punt).
- **Guard:** a **receiving-team** player touching the pickup does NOT get it.
- **Throw fix (1):** the ball is force-equipped server-side (`Humanoid:EquipTool`)
  so clicking actually throws — the client click handler only binds on Equipped,
  and the server throw requires the Handle to be a descendant of the character.
- **Throw fix (2):** the LOSWALL `onTouch` block (which clears `CanThrow` for a
  QB crossing the LOS) was **removed from the kickoff ball** — the kicker stands
  on the solid LOSWALL, so that block was wiping `CanThrow` and killing the kick.
  Confirm clicking charges the power bar and kicks while the wall is still solid.
- The kicker un-freezes automatically the instant the kick fires (the ball's
  `throw()` calls `Utility:AllowPlayerToWalk`).

## Kick outcomes (flag on)
| Test | Setup | Expected |
|---|---|---|
| Normal return | Kick inbounds; receiving player fields it | Live return; tackle/score/OOB resolve via existing kickoff logic; clock starts |
| Illegal — sideline, no bounce | Kick that sails OOB over the sideline | Receiving team 1st & 15 at **own 40**; play-by-play "illegal kick" |
| Illegal — field bounce then sideline | Kick bounces inbounds, rolls out sideline | Receiving team at **own 40** |
| Illegal — out the back, in the air | Kick flies out the back of the endzone without bouncing | Receiving team at **own 40** (NOT a touchback) |
| Touchback — bounce in endzone | Kick bounces in the receiving endzone, then out the back | **Touchback** (receiving team at their touchback LOS) |
| Illegal — backward / own endzone | Kick goes backward / out the kicker's own end | Receiving team at **own 40** |
| Downed by kicking team | A kicking-team player recovers the live ball | Dead ball; receiving team takes over **at that spot** (no possession to kicker) |
| Kick timer expires | Kicker never kicks | "Delay of kickoff!"; receiving team at **own 40** |

## Walls / cleanup guards
- The moment of the kick: `ChangeLOSWall(false)` **and** `KickoffMidfieldWall`
  is destroyed (verify no lingering wall after the kick).
- After any outcome, `kickoffActive` is false (except during a live return).
- `ResetGameValuesToDefaults` (end of game) destroys any stray midfield wall and
  clears `kickoffKicked` / `kickoffOOBHandled`.
- Own-40 spot: Home receiving → X≈30; Away receiving → X≈−30 (3 studs/yard from
  the goal line; matches Home/AwayOOBPosition markers).

## Notes for live testing (could not be auto-verified)
- The midfield wall uses `CollisionGroup = "Default"` (same as LOSWALL). Confirm
  it actually blocks players in-game; if your player collision group differs,
  the wall may need that group instead.
- "Bounced" = the ball touched `FieldOfPlay`, which underlies the whole field
  including endzones — so endzone-vs-air is decided by the OOB exit (endzone
  back wall) + exit X side, not by a separate endzone-floor touch.

---

# Coin toss → Kick/Receive choice UI

The toss winner now chooses **kick or receive** from a centered UI
(`PlayerGui.TeamCaptain.KickReceive`, cloned from the `CoinToss` frame) instead
of auto-receiving. Server: `GameUtil:DoCoinToss` waits on `coinTossWinner`, then
`GameUtil:PromptKickOrReceive(winner)` sets `receivingTeam` and
`firstHalfRec = receivingTeam`. Client: `TeamCaptainEvents` shows the frame on a
`"KickReceive"` message and fires `"KickReceiveChoice","Kick"/"Receive"`.

| Test | Setup | Expected |
|---|---|---|
| Away guesses right | Away captain picks the correct face | **Away** captain sees centered Kick/Receive UI |
| Choose Receive | Winner clicks Receive | Winner receives; other team kicks the opener |
| Choose Kick | Winner clicks Kick | Other team receives; winner kicks the opener |
| Away guesses wrong | Away picks the wrong face | **Home** captain gets the UI |
| Heads/tails timeout | Away never picks | Home wins the toss → Home captain gets the UI |
| Kick/Receive timeout | Winner ignores the UI | **Defaults to Kick** (winner kicks) |
| Halftime flip | After the opening | Opening **kicker** receives at halftime (possession flips); `firstHalfRec` = opening receiver |
| Overtime | Game tied after 4Q | A **fresh** coin toss runs and shows the Kick/Receive UI |

Guards:
- Only the **winning team's captain** (`teamCaptain1` Home / `teamCaptain2` Away)
  sees and can answer the UI (`kickReceiveDecider` gates the server handler).
- `ResetGameValuesToDefaults` clears `coinTossWinner` / `kickReceiveDecider` /
  `kickReceiveChoice`.
- Legacy Heads/Tails flow and the away-captain coin-toss UI are unchanged.

---

# Overtime (college-style rounds, kickoff-driven)

Tied at the end of regulation → `StartOvertime` (fresh coin toss + kick/receive
UI). OT is round-based: `OTPossessionTurns` = teams that have received this round
(0–2). Two helpers drive it: `GameUtil:KickoffTo(receiver)` and
`GameUtil:AdvanceOTAfterPossession(lastReceiver)`. `CheckForOTEnd` was removed.
**Every OT hook is guarded by `string.find(gameState.quarter, "OT", …)`, so
regulation is unaffected.**

Possession-end routing:
- Offensive TD → `AdvanceOTAfterPossession(scorer)` (after the XP).
- Turnover on downs → `TOD()` returns true in OT and routes to the resolver;
  callers skip `StartNewPlay`.
- Non-scoring interception → resolver, via the `turnoverHappened` branch of
  `DetermineActionFromLosPosition` and the top of `Touchback`.
- **Pick-six** (TD with `turnoverHappened`) → **walk-off**, defense wins (no XP).
- **Safety** in OT → **walk-off**, defense wins.

| Test | Expected |
|---|---|
| Receiver order (all teams score TDs) | **A → B → B → A → A → …** (2nd possessor of a round receives first next round); never ends while tied |
| 2nd possessor scores to take the lead (e.g. 8–7 via XP) | Round complete, untied → game ends, that team wins |
| 2nd possessor ties | Continues; that team receives again to open the next round |
| 1st possessor turnover-on-downs (tied) | Other team gets its possession; if they score → they win; if they also fail → new round |
| 2nd possessor turns it over while losing | Round complete, untied → game over, leader wins |
| Non-scoring interception | Same as turnover on downs for the offense |
| Pick-six | Game ends immediately, defense wins, no extra point |
| Safety in OT | Game ends immediately, defense wins |

Guards:
- OT never ends tied (`EndGame`'s tie message is only a non-OT safety net).
- `StartNewPlay` no longer ends OT (removed `CheckForOTEnd`); OT ends only via the
  resolver or a walk-off.
- Works with both the legacy and new kickoff systems (`OTPossessionTurns` is
  appended in both; resets handled by `StartOvertime` + the resolver).
- Out of scope (documented earlier): non-INT in-possession fumbles aren't a game
  mechanic, so they aren't handled.

## Score at 0:00 / end-of-quarter extra point (clock-vs-XP race)

Bug fixed: a TD scored exactly as the quarter clock hit `0:00` let the clock loop
fire `NewQuarter()` → `HalftimeKickoff()` while the XP was still pending — two
balls on the field and a skipped extra point. New `scoreSequenceActive` flag is
set in `TouchdownScored` (right after `scoredTD = true`) and cleared when the
score fully resolves (and in `ResetGameValuesToDefaults` as a safety net). The
clock loop's two `NewQuarter()` triggers are now gated on `not scoreSequenceActive`,
so the quarter transition is deferred until the XP is done; `TouchdownScored` then
drives the transition itself via `EndQuarterAfterScore` when `currentTime == 0`.

Cases:
- **TD at 0:00 end of 2Q (the reported bug):** XP is kicked first (one ball), then
  halftime kickoff runs (`NewQuarter` 2Q → `HalftimeKickoff`, other-of-`firstHalfRec`
  receives). No double ball, XP not skipped.
- **Missed XP at 0:00 end of 2Q:** XP attempt resolves (incomplete / touchback /
  play-clock), then halftime kickoff — same single-ball transition.
- **TD at 0:00 end of 1Q or 3Q:** XP kicked, quarter flips cosmetically, then the
  normal post-TD kickoff to the other team (NOT continue-the-drive `StartNewPlay`).
- **TD/XP at 0:00 end of 4Q:** after the XP, `EndQuarterAfterScore` → `NewQuarter`
  4Q → `EndGame` if untied, else `StartOvertime`.
- **No score at 0:00:** `scoreSequenceActive` stays false, so the clock loop
  advances the quarter exactly as before (regression-safe).
- **OT:** unaffected — the OT branch is checked before the `currentTime == 0`
  branch, and OT quarters aren't in the clock-loop's `1Q..4Q` transition list.

## Kickoff returner tackled in the endzone (touchback not executed)

Bug fixed: on the new kickoff, downing the returner inside their own endzone
**announced** "touchback" but then fell through `CommenceTackle`'s common tail
(`MoveLOS(tacklePos)`), spotting the LOS *inside the endzone* instead of doing a
touchback. The `elseif kickoffActive then` endzone branch now resolves the play
itself and `return`s before the generic tail:
- **Downed in own endzone, never left it (`not playerHasLeftEndzone`):** touchback
  → `GameUtil:KickoffResultFirstDown(tbX)` where `tbX` is the receiving team's
  `Home/AwayTouchbackLOS.X` (clears `kickoffActive`, sets possession, 1st down,
  moves chains, starts the play). LOS lands at the touchback spot, not the endzone.
- **Left the endzone then tackled back inside (`playerHasLeftEndzone`):** safety →
  `GameUtil:SafetyScored(gameState.possession)` (same announce-but-don't-execute
  bug; now actually awards the safety + ensuing free kick).
- **Tackled in the field (gain):** unchanged — still falls through to
  `MoveLOS(tacklePos)`.
- Matches the other kickoff-touchback paths (OOB bounce-out, kicking-team recovery)
  which already used `KickoffResultFirstDown`.

Central backstop (the real fix): `KickoffResultFirstDown(xTarget)` now corrects any
numeric `xTarget` at/behind the receiving team's goal line to the touchback LOS:
- Home receiving: `xTarget >= EndzonePlaneHome.X (150)` -> `HomeTouchbackLOS.X (90)`.
- Away receiving: `xTarget <= EndzonePlaneAway.X (-150)` -> `AwayTouchbackLOS.X (-90)`.
This catches the **kicking-team-recovery-in-the-endzone** case (the else-branch of
`KickoffBallCaught` passes the recovery `spotX`, which is in the endzone) — the most
likely cause of "1st & 15 with the ball still in the endzone" — and acts as a
backstop so no single kickoff path can ever leave the ball spotted in the endzone.
A return tackled at the 1 (X just inside the field, e.g. 148 for Home) is NOT
caught by the guard, so legitimate deep spots are preserved.
