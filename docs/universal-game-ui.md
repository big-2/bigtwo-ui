# Shared gameplay board

Classic rooms (including games with friends) and Arcade use `GameBoard`, `GameOpponent`, `GameTable`, `GameActions`, and `PlayerHand`. Both modes keep the same order: opponents, the current table, your hand, and Play/Clear/Pass. There is one responsive render tree rather than separate desktop/mobile tables.

The board provides extension areas without changing its core controls:

- `metrics`: a compact status band for Arcade lives, score, charge and streak.
- `extras`: powers, boss information and rules; a sidebar from 1100px, stacked below the core on smaller screens.
- `intel`: revealed cards in normal document flow between the table and hand. Radar never floats over controls.
- `feed`: optional recent table activity.
- `headerActions` and `handTools`: help/settings and shared hand sorting.

Game rules, room networking, Arcade persistence and power costs remain in their existing controllers. Classic animation source/target refs connect to the shared opponent/table/hand elements. Keyboard selection is available at every viewport width and follows the displayed hand order.

Future Arcade objectives or abilities should use the extension areas rather than introducing another table, card tray or action layout.

## Local checks

Run `npm run build`, `npm run lint` and `npm run test:arcade`. In the browser, compare a room and Arcade at the same width, select repeated ranks, move/toggle the focused card, sort the hand, observe a bot response and card flight in a disposable local room, and reveal a full rival hand. Check a 375px layout for overflow and readable actions. No deployment is part of this change.
