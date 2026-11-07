# Big Two Arcade: local playable release

## Scope

Add a complete solo arcade loop at `/arcade` in the existing React app. The browser owns the solo game engine and bot decisions; this mode does not use multiplayer rooms, remote inference, or server statistics. Runs and personal bests are stored on this browser only. No deployment is requested or performed.

## Gameplay

- Three tables with thirteen cards per player. Three initial lives; losing spends one life and allows a fresh deal at the same table. The final boss starts with nine cards.
- The first two tables deal all 52 cards; the boss table leaves its four missing cards undealt. All cards remain unique. Player receives 3D and leads; opening play must include it. Opening 3D cannot be swapped away.
- Standard Big Two ranks, suits, and combinations match the Rust rules, including A2345 and 23456 straights and suit-first flush comparisons.
- Begin each table with 40 charge. Legal human plays earn charge, with extra charge for five-card hands and trick wins. Cap charge at 100.
- Radar costs 25 charge, reveals one selected bot's current hand, and expires when the next human turn starts. Repeated Radar use replaces the target; spending charge must have a meaningful effect.
- Mulligan costs 35 charge and blindly swaps one or two selected cards with random cards from one eligible bot. Hand counts stay unchanged and no cards enter discard. Does not consume a turn. Powers are usable only during an active human turn.
- Three consecutive passes award the trick to the last player who played and clear the table. Human trick wins increase streak and score multiplier; a human pass or an opponent's trick win resets streak. Score and charge also reward valid plays; winning awards a table bonus plus a clutch bonus when an opponent has one card.
- Between tables choose Scanner Boost (Radar discount), Combo Shield (protect first pass per table), or Second Wind (extra life, capped at four). Do not offer useless duplicate upgrades.
- Final victory and exhausted lives show score, highest streak, tables won, personal best, and a restart action.

## Work split

1. Engine agent: immutable game transitions, rule validation, legal move enumeration, progressively stronger bots, powers, scoring, upgrades, and run progression.
2. UI agent: responsive arcade lobby/table/results screens, animated meters, selectable cards, actionable power controls, clear rule feedback, bot pacing with cleanup, and keyboard/accessibility support where appropriate.
3. Test/persistence agent: versioned local save validation, best-score handling, and meaningful rule/state tests using Node's test runner without a new dependency.
4. Parent: route and entry integration, final code review, build/lint/test gates, local startup, and browser interaction checks on desktop and mobile.

## Acceptance

Start, make legal moves, observe bots, use both powers, win/lose a table, choose an upgrade, retry, finish/restart a run, and resume after refresh. Invalid moves and powers do not mutate state. Card conservation, trick ownership, scoring, and phase transitions are tested. Production build passes. Lint findings are separated into pre-existing versus introduced issues. Local URL is opened for the user; nothing is deployed.

## Follow-up: standard gameplay consistency

Restore the complete existing keyboard scheme in Arcade using the shared keyboard hook: rank keys, rank cycling, arrow focus, up/down selection, Space toggle, Enter play, P pass, Backspace clear selection, and Escape clear focus. Match the standard multiplayer table to the Arcade visual design while preserving its game rules, realtime events, animations, sorting, feedback, and reconnect flow. New full-deal runs use save schema v2; older v1 saves remain recoverable and personal bests are preserved. No deployment.
