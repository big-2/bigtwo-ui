# Play Big Two Arcade locally

Open `http://localhost:5173/arcade` while the Vite dev server is running. Home and the header also link to Arcade.

```sh
cd bigtwo-ui
npm run dev
```

Arcade runs locally in the browser and does not require the Rust backend or the inference service. The ordinary app can still use its existing local backend. No deployment or hosted environment changes are needed.

## Play loop

Start with three lives and 40 charge. Each table deals thirteen cards per player. Clear Neon Alley, Voltage Lounge, and the boss table. On the boss table, the Card Shark starts with nine cards. A lost table costs a life; Deal again gives a fresh deal at that table.

Select a legal combination and click Play. Opening play must contain 3♦. Beat the occupied table with the same number of cards, or pass. Three consecutive passes clear the trick and return the lead to its winner. Ranks run from 3 through 2; suits rank ♦ < ♣ < ♥ < ♠. Five-card combinations use the existing app's rules, including A2345 and 23456 straights and suit-first flush comparisons.

- **Radar:** Choose a rival, spend 25 charge, and reveal that hand until your next turn. Scanner Boost lowers its cost to 15.
- **Mulligan:** Select one or two cards and spend 35 charge to blindly exchange them with random cards from one eligible bot. It does not consume your turn or change hand counts. Opening 3♦ cannot be exchanged. At least one rival must hold enough cards to exchange.
- **Streak:** Win tricks consecutively to increase your score multiplier. Passing or an opponent winning a trick resets it. Combo Shield protects your first pass each table.
- **Charge:** Each legal play earns 8 charge; a five-card hand earns 12 extra; a trick win earns 15. The meter caps at 100 and resets to 40 for each table.
- **Upgrades:** After the first two table wins, choose a persistent Radar discount, Combo Shield, or one extra life (maximum four). Previously chosen upgrades do not appear again.

Desktop controls match standard gameplay: 2–9/T/J/Q/K/A select cards by rank; press repeatedly to stack cards of that rank. Left/right moves the cursor; hold a rank while using arrows to cycle suits. Up selects, down deselects, Space toggles the focused card, Enter plays, P passes, Backspace clears selection, and Escape clears focus. Focused action buttons, dialogs, and form controls retain their native keyboard behavior.

New full-deal runs use save schema v2. Older v1 saves at an upgrade or retry screen migrate safely, preserving score and lives before the next full deal. Active v1 hands are retained for recovery but are not resumed under the new rules; personal bests are kept. Active runs save after every action. Refresh or revisit Arcade and choose Resume. Personal bests stay on this browser; there is no server leaderboard or multiplayer-stat update. Restart replaces the active run. If browser storage is blocked, gameplay still works and the table displays a save warning.

## Validation

```sh
npm run test:arcade
npm run build
npm run lint
```

The test runner uses the installed TypeScript compiler and Node's built-in test runner, with no added dependencies. Tests cover canonical cards and rule comparisons, invalid actions, card conservation, trick ownership, powers and expiry, upgrades, all run phases, seeded complete-run simulations, and versioned save recovery.

Browser checks cover start/resume, legal and invalid selections, timed bot responses, both powers, charge changes, desktop layout, and a 375px mobile viewport. The mode is intended for local playtesting; balance and pacing can be tuned after feedback.
