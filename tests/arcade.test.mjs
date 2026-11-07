import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const built = process.env.ARCADE_BUILD_DIR;
assert.ok(built, 'run tests through npm run test:arcade');
const engine = require(`${built}/arcade/engine.js`);
const storage = require(`${built}/arcade/storage.js`);
const cardSorting = require(`${built}/utils/cardSorting.js`);
const { getMoveError } = require(`${built}/utils/moveValidation.js`);

const allCards = new Set([...`3456789JQKA2`].flatMap(rank => [...`DCHS`].map(suit => `${rank}${suit}`)));
for (const suit of 'DCHS') allCards.add(`10${suit}`);
function assertConserved(state) {
    const zones = [...state.players.flatMap(player => player.hand), ...state.reserve, ...state.discard];
    assert.equal(zones.length, 52, 'every card remains in a physical zone');
    assert.equal(new Set(zones).size, 52, 'no card is duplicated across zones');
    assert.ok(zones.every(card => allCards.has(card)), 'all zones contain valid card IDs');
    if (state.lastPlay) assert.ok(state.lastPlay.cards.every(card => state.discard.includes(card)));
}
function fresh(seed = 17) {
    const state = engine.createRun(seed);
    assertConserved(state);
    return state;
}
function assertStageDeal(state, stage = state.stage) {
    assert.equal(state.players.length, 4);
    assert.deepEqual(state.players.map(player => player.hand.length), stage === 3 ? [13, 13, 13, 9] : [13, 13, 13, 13]);
    assert.equal(state.reserve.length, stage === 3 ? 4 : 0);
    assert.equal(state.version, 2);
}
function withHumanTurn(state, changes = {}) {
    return { ...state, ...changes, turn: 0, phase: 'playing', winner: null };
}
function fixture(seed, stage, hands, changes = {}) {
    const state = fresh(seed);
    const used = new Set(hands.flat());
    assert.equal(used.size, hands.flat().length, 'fixture hands contain no duplicate cards');
    const deck = [...allCards];
    assert.ok([...used].every(card => allCards.has(card)));
    return {
        ...state,
        ...changes,
        stage,
        phase: 'playing',
        players: state.players.map((player, index) => ({ ...player, hand: [...hands[index]] })),
        turn: 0,
        opening: false,
        lastPlay: null,
        passes: 0,
        reserve: deck.filter(card => !used.has(card)),
        discard: [],
        winner: null,
        tablesWon: stage - 1,
    };
}

test('single and pair ranks use Big Two rank then suit tie breaks', () => {
    assert.ok(engine.canBeat(['3C'], ['3D']));
    assert.ok(!engine.canBeat(['3D'], ['3C']));
    assert.ok(engine.canBeat(['4D'], ['3S']));
    assert.ok(engine.canBeat(['3C', '3S'], ['3D', '3H']));
    assert.ok(!engine.canBeat(['3D', '3C'], ['3H', '3S']));
    assert.equal(engine.classifyHand(['3D', '3d']), null, 'case aliases cannot create duplicate physical cards');
});

test('rank lookup treats T and 10 as aliases and returns matching cards in suit order', () => {
    const cards = ['10S', 'TD', '10C', '3H', 'AS'];
    const expected = ['TD', '10C', '10S'];
    assert.deepEqual(cardSorting.findCardsByRank(cards, 'T'), expected);
    assert.deepEqual(cardSorting.findCardsByRank(cards, '10'), expected);
});

test('A2345 and 23456 are valid straights; wraparound sequences are not', () => {
    assert.ok(engine.classifyHand(['AD', '2C', '3H', '4S', '5D']));
    assert.ok(engine.classifyHand(['2D', '3C', '4H', '5S', '6D']));
    assert.equal(engine.classifyHand(['KD', 'AC', '2H', '3S', '4D']), null);
    assert.equal(engine.classifyHand(['QD', 'KC', 'AH', '2S', '3D']), null);
});

test('five-card hand categories follow the game ordering and flush is suit-first', () => {
    const straight = engine.classifyHand(['3D', '4C', '5H', '6S', '7D']);
    const flush = engine.classifyHand(['3D', '5D', '7D', '9D', 'JD']);
    const fullHouse = engine.classifyHand(['3D', '3C', '3H', '4D', '4C']);
    const fourKind = engine.classifyHand(['3D', '3C', '3H', '3S', '4D']);
    const straightFlush = engine.classifyHand(['3D', '4D', '5D', '6D', '7D']);
    assert.ok(straight && flush && fullHouse && fourKind && straightFlush);
    assert.ok(straight.category < flush.category);
    assert.ok(flush.category < fullHouse.category);
    assert.ok(fullHouse.category < fourKind.category);
    assert.ok(fourKind.category < straightFlush.category);
    const lowSuit = engine.classifyHand(['3D', '5D', '7D', '9D', 'JD']);
    const highSuit = engine.classifyHand(['3S', '5S', '7S', '9S', 'JS']);
    assert.ok(lowSuit && highSuit);
    assert.ok(highSuit.tiebreak[0] > lowSuit.tiebreak[0], 'flush tie break begins with suit');
    assert.equal(engine.classifyHand(['3D', '3D']), null);
    assert.equal(engine.classifyHand(['7D', '7C', '7S', '10D', 'JH']), null, 'a triple plus two unrelated singles is not a full house');
    assert.equal(engine.canBeat(['7D', '7C', '7S', '10D', 'JH'], ['3D', '3H', '3S', '5C', '5H']), false);
    assert.equal(engine.classifyHand(['3D', '4C', '5H', '6S', '8D']), null);
    assert.equal(engine.classifyHand(['3X']), null);
    assert.equal(engine.classifyHand(['3D', '4D', '5D', '6D', '7D', '8D']), null);
});

test('every stage deals full hands, leaves only the boss reserve, and gives the opening lead to the human', () => {
    for (let seed = 1; seed <= 100; seed += 1) {
        const state = fresh(seed);
        assertConserved(state);
        assertStageDeal(state, 1);
        assert.ok(state.players[0].hand.includes('3D'));
    }
});

test('opening lead belongs to the human and invalid play or trade actions are immutable', () => {
    const state = fresh();
    assert.equal(state.opening, true);
    assert.ok(state.players[0].hand.includes('3D'));
    const before = JSON.stringify(state);
    assert.throws(() => engine.applyAction(state, { type: 'play', cards: [state.players[0].hand.find(card => card !== '3D')] }));
    assert.throws(() => engine.applyAction(state, { type: 'pass' }));
    assert.throws(() => engine.applyAction(state, { type: 'play', cards: [state.players[1].hand[0]] }));
    assert.throws(() => engine.applyAction(state, { type: 'play', cards: [state.players[0].hand[0], state.players[0].hand[0]] }));
    assert.throws(() => engine.applyAction(state, { type: 'power', power: 'mulligan', cards: ['3D'] }));
    assert.equal(JSON.stringify(state), before);
    assert.ok(engine.legalMoves(state, 0).some(cards => cards.includes('3D')));
    const next = engine.applyAction(state, { type: 'play', cards: ['3D'] });
    assert.notEqual(next, state);
    assert.ok(state.players[0].hand.includes('3D'));
    assert.ok(!next.players[0].hand.includes('3D'));
    assertConserved(next);
});

test('cannot pass an open trick, and a completed three-pass trick returns to its owner', () => {
    const initial = fixture(31, 1, [['2D', '2S'], ['3D'], ['3C'], ['3H']]);
    assert.throws(() => engine.applyAction(initial, { type: 'pass' }));
    let state = engine.applyAction(initial, { type: 'play', cards: ['2S'] });
    for (let i = 0; i < 3; i++) {
        assert.equal(state.turn, i + 1);
        state = engine.advanceBot(state);
    }
    assert.equal(state.turn, 0);
    assert.equal(state.lastPlay, null);
    assert.equal(state.passes, 0);
    assert.equal(state.opening, false);
    assert.equal(state.combo, 1);
    assert.ok(state.score > initial.score);
    assertConserved(state);
});

test('legal moves, bots, retries, and rewards preserve cards across complete seeded runs', () => {
    Object.defineProperty(globalThis, 'localStorage', { configurable: true, value: new MemoryStorage() });
    let victories = 0;
    let losses = 0;
    for (let seed = 1; seed <= 24; seed++) {
        let state = fresh(seed);
        for (let step = 0; step < 2500 && !['victory', 'gameover'].includes(state.phase); step++) {
            assertConserved(state);
            assert.equal(storage.isValidRun(state), true, `seed ${seed}, step ${step} remains persistable`);
            assert.equal(storage.saveRun(state), true);
            assert.deepEqual(storage.loadRun(), state);
            if (state.phase === 'reward') {
                const choices = engine.upgradeChoices(state);
                assert.ok(choices.length > 0, 'a reward always offers a usable upgrade');
                const upgrade = choices.includes('extra_life') ? 'extra_life' : choices[0];
                state = engine.applyAction(state, { type: 'upgrade', upgrade });
                continue;
            }
            if (state.phase === 'defeated') {
                state = engine.applyAction(state, { type: 'retry' });
                continue;
            }
            assert.equal(state.phase, 'playing');
            if (state.turn !== 0) {
                state = engine.advanceBot(state);
                continue;
            }
            const moves = engine.legalMoves(state, 0).sort((a, b) => b.length - a.length);
            const action = moves[0];
            if (action) state = engine.applyAction(state, { type: 'play', cards: action });
            else if (state.lastPlay) state = engine.applyAction(state, { type: 'pass' });
            else assert.fail('human has no legal lead');
        }
        assert.ok(['victory', 'gameover'].includes(state.phase), `seed ${seed} should finish within the bounded simulation`);
        assertConserved(state);
        assert.equal(storage.isValidRun(state), true, 'finished runs remain valid');
        if (state.phase === 'victory') victories += 1;
        else losses += 1;
    }
    assert.ok(victories > 0, 'simulation exercises the complete three-table win path');
    assert.ok(losses > 0, 'simulation exercises the exhausted-lives path');
});

test('Radar validates charge and targets, and expires on the next human turn', () => {
    let state = withHumanTurn(fresh(45), { charge: 40 });
    assert.ok(engine.getPowerError({ ...state, charge: 24 }, 'radar', 1));
    assert.ok(engine.getPowerError(state, 'radar', 0));
    state = fixture(47, 1, [['2D', '2S'], ['3D'], ['3C'], ['3H']], { charge: 80 });
    assert.equal(engine.getPowerError(state, 'radar', 1), null);
    const scanned = engine.applyAction(state, { type: 'power', power: 'radar', target: 1 });
    assert.equal(scanned.radarTarget, 1);
    assert.ok(scanned.charge < state.charge);
    const replaced = engine.applyAction(scanned, { type: 'power', power: 'radar', target: 2 });
    assert.equal(replaced.radarTarget, 2, 'a new scan replaces the old target');
    assert.ok(replaced.charge < scanned.charge);
    assertConserved(scanned);
    let turn = engine.applyAction(replaced, { type: 'play', cards: ['2S'] });
    for (let count = 0; count < 3 && turn.phase === 'playing' && turn.turn !== 0; count += 1) turn = engine.advanceBot(turn);
    assert.equal(turn.turn, 0);
    assert.equal(turn.radarTarget, null, 'the scan is cleared before the next human turn');

    const playFixture = fixture(48, 1, [['3D', '2D'], ['4D', '5D'], ['6D', '7D'], ['8D', '9D']]);
    let played = engine.applyAction(playFixture, { type: 'power', power: 'radar', target: 3 });
    played = engine.applyAction(played, { type: 'play', cards: ['3D'] });
    for (let count = 0; count < 3; count++) {
        const discarded = played.discard.length;
        played = engine.advanceBot(played);
        assert.ok(played.discard.length > discarded, 'this bot played instead of passing');
    }
    assert.equal(played.turn, 0);
    assert.equal(played.radarTarget, null, 'bot plays also expire Radar before the human turn');
});

test('Mulligan blind-trades one or two selected cards with a seeded eligible rival', () => {
    const original = fresh(145);
    const cards = original.players[0].hand.filter(card => card !== '3D').slice(0, 2);
    const state = withHumanTurn(original, { charge: 80 });
    const before = JSON.stringify(state);
    const traded = engine.applyAction(state, { type: 'power', power: 'mulligan', cards });
    assert.equal(state.players[0].hand.length, 13);
    assert.equal(traded.players[0].hand.length, 13);
    assert.equal(traded.turn, state.turn, 'the trade does not consume the human turn');
    assert.equal(traded.opening, state.opening);
    assert.equal(engine.powerCost(state, 'mulligan'), 35);
    assert.equal(traded.charge, state.charge - 35);
    assert.notEqual(traded.rngState, state.rngState, 'target and replacement selection advance the saved RNG');
    assert.equal(traded.reserve.length, state.reserve.length);
    assert.deepEqual(traded.discard, state.discard, 'traded cards stay out of the discard');
    assertConserved(traded);
    const humanGains = traded.players[0].hand.filter(card => !state.players[0].hand.includes(card));
    assert.equal(humanGains.length, 2);
    const target = traded.players.findIndex((player, index) => index > 0 && player.hand.some(card => cards.includes(card)));
    assert.ok(target > 0, 'one eligible rival receives the selected cards');
    assert.deepEqual(traded.players[target].hand.filter(card => cards.includes(card)).sort(), [...cards].sort());
    assert.deepEqual(traded.players.filter((_, index) => index > 0 && index !== target).map(player => player.hand), state.players.filter((_, index) => index > 0 && index !== target).map(player => player.hand));
    assert.equal(JSON.stringify(state), before, 'the source state remains immutable');
    const repeat = engine.applyAction(withHumanTurn(fresh(145), { charge: 80 }), { type: 'power', power: 'mulligan', cards });
    assert.deepEqual(repeat, traded, 'the same seed and action produce the same blind trade');

    const oneCard = engine.applyAction(state, { type: 'power', power: 'mulligan', cards: [cards[0]] });
    assert.equal(oneCard.players[0].hand.length, 13);
    assert.equal(oneCard.players[0].hand.filter(card => !state.players[0].hand.includes(card)).length, 1);
    assertConserved(oneCard);
    const chosenTargets = new Set();
    for (let seed = 1; seed <= 12; seed += 1) {
        const seeded = withHumanTurn(fresh(seed), { charge: 80 });
        const selection = seeded.players[0].hand.find(card => card !== '3D');
        const result = engine.applyAction(seeded, { type: 'power', power: 'mulligan', cards: [selection] });
        chosenTargets.add(result.players.findIndex((player, index) => index > 0 && player.hand.includes(selection)));
    }
    assert.ok(chosenTargets.size > 1, 'seeded trades select among eligible rivals');

    for (const invalid of [cards.slice(0, 1).concat(['NOT_A_CARD']), [cards[0], cards[0]], ['3D']]) {
        const snapshot = JSON.stringify(state);
        assert.throws(() => engine.applyAction(state, { type: 'power', power: 'mulligan', cards: invalid }));
        assert.equal(JSON.stringify(state), snapshot);
    }
    assert.ok(engine.getPowerError({ ...state, charge: 34 }, 'mulligan', undefined, cards));
    assert.ok(engine.getPowerError(state, 'mulligan', undefined, []));
    assert.ok(engine.getPowerError(state, 'mulligan', undefined, state.players[1].hand.slice(0, 1)));

    const noEligible = { ...state, players: state.players.map((player, index) => ({ ...player, hand: index === 0 ? player.hand : player.hand.slice(0, 1) })) };
    assert.ok(engine.getPowerError(noEligible, 'mulligan', undefined, cards));
    const snapshot = JSON.stringify(noEligible);
    assert.throws(() => engine.applyAction(noEligible, { type: 'power', power: 'mulligan', cards }));
    assert.equal(JSON.stringify(noEligible), snapshot, 'a trade with no eligible rival is rejected immutably');
});

test('guarded passes preserve streak, upgrades advance stages, and wins and losses reach final phases', () => {
    const guardState = fresh(83);
    const guardCard = guardState.players[3].hand[0];
    guardState.players[3].hand = guardState.players[3].hand.filter(card => card !== guardCard);
    Object.assign(guardState, {
        combo: 2,
        bestCombo: 2,
        upgrades: ['combo_guard'],
        guardAvailable: true,
        turn: 0,
        opening: false,
        lastPlay: { playerIndex: 3, cards: [guardCard], label: 'Single' },
        discard: [guardCard],
    });
    assert.equal(storage.isValidRun(guardState), true);
    const passed = engine.applyAction(guardState, { type: 'pass' });
    assert.equal(passed.combo, 2);
    assert.equal(passed.guardAvailable, false);
    const unprotected = engine.applyAction({ ...guardState, guardAvailable: false }, { type: 'pass' });
    assert.equal(unprotected.combo, 0);

    let state = fresh(84);
    const playedAfterOpen = state.players[0].hand.filter(card => card !== '3D');
    state.players[0].hand = ['3D'];
    state.discard = [...playedAfterOpen];
    state.opening = false;
    state = engine.applyAction(state, { type: 'power', power: 'radar', target: 1 });
    state = engine.applyAction(state, { type: 'play', cards: ['3D'] });
    assert.equal(state.phase, 'reward');
    assert.equal(state.winner, 0);
    assert.equal(state.tablesWon, 1);
    assert.equal(state.radarTarget, null, 'Radar ends when the table finishes');
    assert.equal(storage.isValidRun(state), true);
    const choices = engine.upgradeChoices(state);
    assert.ok(choices.includes('radar_discount'));
    assert.ok(!choices.includes('radar_discount') || !state.upgrades.includes('radar_discount'));
    const nextTable = engine.applyAction(state, { type: 'upgrade', upgrade: 'radar_discount' });
    assert.equal(nextTable.stage, 2);
    assert.equal(nextTable.tablesWon, 1);
    assert.equal(engine.powerCost(nextTable, 'radar'), 15);
    assertConserved(nextTable);
    assertStageDeal(nextTable, 2);
    assert.equal(storage.isValidRun(nextTable), true);
    const malformedDeal = structuredClone(nextTable);
    malformedDeal.reserve.push(malformedDeal.players[1].hand.pop());
    assertConserved(malformedDeal);
    assert.equal(storage.isValidRun(malformedDeal), false, 'persistence rejects an incomplete non-boss hand even when all cards remain conserved');

    let stageTwoWin = fixture(841, 2, [['2S'], ['3D'], ['3C'], ['3H']], { tablesWon: 1 });
    stageTwoWin = engine.applyAction(stageTwoWin, { type: 'play', cards: ['2S'] });
    assert.equal(stageTwoWin.phase, 'reward');
    const stageThree = engine.applyAction(stageTwoWin, { type: 'upgrade', upgrade: 'combo_guard' });
    assertStageDeal(stageThree, 3);
    assert.ok(stageThree.players[3].name.toLowerCase().includes('shark'));
    assertConserved(stageThree);
    assert.equal(storage.isValidRun(stageThree), true);
    const malformedBossDeal = structuredClone(stageThree);
    malformedBossDeal.reserve.push(malformedBossDeal.players[3].hand.pop());
    assertConserved(malformedBossDeal);
    assert.equal(storage.isValidRun(malformedBossDeal), false, 'persistence requires the boss deal and four-card reserve');

    let final = fresh(85);
    final.stage = 3;
    final.tablesWon = 2;
    final.reserve = final.players[3].hand.splice(-4);
    final.discard = final.players[0].hand.filter(card => card !== '3D');
    final.players[0].hand = ['3D'];
    final.opening = false;
    final = engine.applyAction(final, { type: 'play', cards: ['3D'] });
    assert.equal(final.phase, 'victory');
    assert.equal(final.winner, 0);
    assert.equal(final.tablesWon, 3);
    assert.equal(storage.isValidRun(final), true);

    const losing = fresh(86);
    losing.stage = 2;
    losing.tablesWon = 1;
    const winningBotCards = [...losing.players[1].hand];
    losing.players[1].hand = [winningBotCards[0]];
    losing.discard = winningBotCards.slice(1);
    losing.turn = 1;
    losing.opening = false;
    losing.lives = 2;
    const defeated = engine.advanceBot(losing);
    assert.equal(defeated.phase, 'defeated');
    assert.equal(defeated.winner, 1);
    assert.equal(defeated.lives, 1);
    assert.equal(storage.isValidRun(defeated), true);
    const retried = engine.applyAction(defeated, { type: 'retry' });
    assert.equal(retried.stage, 2);
    assert.equal(retried.lives, 1);
    assert.equal(retried.winner, null);
    assert.equal(retried.turn, 0);
    assertConserved(retried);

    const finalLoss = engine.advanceBot({ ...losing, lives: 1 });
    assert.equal(finalLoss.phase, 'gameover');
    assert.equal(finalLoss.lives, 0);
    assert.equal(storage.isValidRun(finalLoss), true);
});

class MemoryStorage {
    values = new Map();
    getItem(key) { return this.values.get(key) ?? null; }
    setItem(key, value) { this.values.set(key, String(value)); }
    removeItem(key) { this.values.delete(key); }
}

test('version 2 run storage preserves old version 1 data and keeps the best-score key stable', () => {
    const memory = new MemoryStorage();
    Object.defineProperty(globalThis, 'localStorage', { configurable: true, value: memory });
    storage.clearRun();
    const state = fresh(99);
    assert.equal(storage.saveRun(state), true);
    assert.deepEqual(storage.loadRun(), state);
    const duplicate = structuredClone(state);
    duplicate.players[0].hand[0] = duplicate.players[1].hand[0];
    assert.equal(storage.saveRun(duplicate), false);
    for (const change of [{ stage: 0 }, { radarTarget: 0 }, { phase: 'victory' }, { passes: 3 }, { charge: 101 }]) {
        assert.equal(storage.saveRun({ ...state, ...change }), false, `reject corrupt fields ${JSON.stringify(change)}`);
    }
    const oldRun = JSON.stringify({ version: 1, state });
    memory.setItem('big-two-arcade-run-v1', oldRun);
    storage.clearRun();
    assert.equal(storage.loadRun(), null, 'a v1 run is not resumed by the v2 schema');
    assert.equal(memory.getItem('big-two-arcade-run-v1'), oldRun, 'the previous run remains available in its original key');
    assert.equal(storage.saveRun(state), true);
    assert.ok(memory.getItem('big-two-arcade-run-v2'));
    assert.equal(memory.getItem('big-two-arcade-run-v1'), oldRun, 'saving v2 never overwrites the old run');
    memory.setItem('big-two-arcade-run-v2', JSON.stringify({ version: 2, state: { ...state, players: [{ name: 'x', hand: ['NOT_A_CARD'] }, ...state.players.slice(1)] } }));
    assert.equal(storage.loadRun(), null);
    const clearedV2 = JSON.stringify({ version: 2, state: null });
    assert.equal(memory.getItem('big-two-arcade-run-v2'), clearedV2, 'invalid v2 save is replaced by a no-run marker');
    assert.equal(memory.getItem('big-two-arcade-run-v1'), oldRun, 'corrupt v2 cleanup leaves the v1 run alone');
    assert.equal(storage.loadRun(), null, 'a corrupt v2 save cannot fall through to legacy data on the next load');

    const legacyReward = structuredClone(state);
    legacyReward.version = 1;
    legacyReward.phase = 'reward';
    legacyReward.winner = 0;
    legacyReward.tablesWon = 1;
    legacyReward.opening = false;
    legacyReward.discard.push(...legacyReward.players[0].hand);
    legacyReward.players[0].hand = [];
    memory.setItem('big-two-arcade-run-v1', JSON.stringify({ version: 1, state: legacyReward }));
    memory.removeItem('big-two-arcade-run-v2');
    const migratedReward = storage.loadRun();
    assert.equal(migratedReward?.version, 2, 'a safe v1 reward state migrates to schema v2');
    assert.equal(migratedReward?.phase, 'reward');
    assert.equal(memory.getItem('big-two-arcade-run-v1'), JSON.stringify({ version: 1, state: legacyReward }), 'migration keeps the original legacy run');
    const resumedReward = engine.applyAction(migratedReward, { type: 'upgrade', upgrade: 'radar_discount' });
    assertStageDeal(resumedReward, 2);

    storage.clearRun();
    assert.equal(memory.getItem('big-two-arcade-run-v2'), clearedV2, 'clearing a migrated run writes a tombstone');
    assert.equal(storage.loadRun(), null);
    assert.equal(storage.loadRun(), null, 'repeated loads never resurrect the retained reward run');
    assert.equal(memory.getItem('big-two-arcade-run-v1'), JSON.stringify({ version: 1, state: legacyReward }));

    // Even a corrupt v2 envelope blocks legacy fallback after it is cleared.
    memory.removeItem('big-two-arcade-run-v2');
    memory.setItem('big-two-arcade-run-v2', JSON.stringify({ version: 2, state: { ...legacyReward, version: 2, players: [] } }));
    assert.equal(storage.loadRun(), null);
    assert.equal(memory.getItem('big-two-arcade-run-v2'), clearedV2);
    assert.equal(storage.loadRun(), null, 'a malformed v2 run cannot repeatedly resurrect legacy reward data');

    memory.removeItem('big-two-arcade-run-v2');
    const legacyDefeated = structuredClone(state);
    legacyDefeated.version = 1;
    legacyDefeated.phase = 'defeated';
    legacyDefeated.winner = 1;
    legacyDefeated.lives = 2;
    legacyDefeated.opening = false;
    legacyDefeated.players[1].hand = [];
    legacyDefeated.discard.push(...state.players[1].hand);
    memory.setItem('big-two-arcade-run-v1', JSON.stringify({ version: 1, state: legacyDefeated }));
    const migratedDefeat = storage.loadRun();
    assert.equal(migratedDefeat?.version, 2, 'a safe v1 defeated state migrates to schema v2');
    assert.equal(migratedDefeat?.phase, 'defeated');
    const resumedDefeat = engine.applyAction(migratedDefeat, { type: 'retry' });
    assertStageDeal(resumedDefeat, 1);
    storage.clearRun();
    assert.equal(storage.loadRun(), null, 'clearing a migrated defeat also blocks legacy resurrection');
    assert.equal(storage.recordBest(37), 37);
    assert.equal(storage.recordBest(12), 37);
    assert.equal(storage.loadBest(), 37);
    assert.equal(memory.getItem('big-two-arcade-best-v1'), '37', 'the best score keeps its v1 storage key');
    Object.defineProperty(globalThis, 'localStorage', { configurable: true, value: { getItem() { throw Error('blocked'); }, setItem() { throw Error('quota'); }, removeItem() { throw Error('blocked'); } } });
    assert.equal(storage.loadRun(), null);
    assert.equal(storage.saveRun(state), false);
    storage.clearRun();
    assert.equal(storage.recordBest(42), 42);
});

test('room move validation explains illegal selections and allows legal ones', () => {
    assert.equal(getMoveError(['4D'], ['3S'], false), null);
    assert.equal(getMoveError(['TC'], ['9S'], false), null, 'room cards write ten as T');
    assert.equal(getMoveError(['TC', 'TH'], ['9S', '9H'], false), null);
    assert.equal(getMoveError(['7C'], [], false), null, 'a clear table takes any hand');
    assert.match(getMoveError(['3C'], ['3S'], false), /Not high enough/);
    assert.match(getMoveError(['3C', '3H'], ['3S'], false), /needs a single card/);
    assert.match(getMoveError(['3C', '4H'], ['3S'], false), /matching ranks/);
    assert.match(getMoveError(['3C', '3H', '4H', '4S'], [], false), /1, 2, 3 or 5/);
    assert.match(getMoveError(['3C', '5H', '7D', '9S', 'JC'], [], false), /valid hand/);
    assert.match(getMoveError(['3C'], [], true), /3♦/);
    assert.equal(getMoveError(['3D'], [], true), null);
});
