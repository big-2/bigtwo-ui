import {
    POWER_COSTS,
    STAGE_INFO,
    type ArcadeAction,
    type ArcadePlayer,
    type ArcadeState,
    type Card,
    type HandRank,
    type PowerId,
    type UpgradeId,
} from './types';

const SUITS = ['D', 'C', 'H', 'S'] as const;
const RANKS = ['3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K', 'A', '2'] as const;
const SUIT_VALUE: Record<string, number> = { D: 0, C: 1, H: 2, S: 3 };
const RANK_VALUE: Record<string, number> = Object.fromEntries(RANKS.map((rank, i) => [rank, i]));
const LOG_LIMIT = 48;
const HUMAN = 0;
const BOT_COUNT = 3;

type ParsedCard = { rank: number; suit: number };

function parseCard(card: Card): ParsedCard | null {
    if (typeof card !== 'string' || (card.length !== 2 && card.length !== 3)) return null;
    if (card !== card.toUpperCase()) return null;
    const rank = RANK_VALUE[card.slice(0, -1)];
    const suit = SUIT_VALUE[card.slice(-1)];
    return rank === undefined || suit === undefined ? null : { rank, suit };
}

function compareCards(a: Card, b: Card): number {
    const pa = parseCard(a);
    const pb = parseCard(b);
    if (!pa || !pb) return a.localeCompare(b);
    return pa.rank - pb.rank || pa.suit - pb.suit;
}

function compareRanks(a: HandRank, b: HandRank): number {
    if (a.size !== b.size) return a.size - b.size;
    if (a.category !== b.category) return a.category - b.category;
    const length = Math.max(a.tiebreak.length, b.tiebreak.length);
    for (let i = 0; i < length; i += 1) {
        const difference = (a.tiebreak[i] ?? -1) - (b.tiebreak[i] ?? -1);
        if (difference !== 0) return difference;
    }
    return 0;
}

function rankCounts(cards: ParsedCard[]): Map<number, number> {
    const counts = new Map<number, number>();
    for (const card of cards) counts.set(card.rank, (counts.get(card.rank) ?? 0) + 1);
    return counts;
}

function straightHigh(ranks: number[]): number | null {
    const sorted = [...ranks].sort((a, b) => a - b);
    if (new Set(sorted).size !== 5) return null;
    // Rust enum order is 3..A,2. A2345 and 23456 are explicit exceptions.
    if (sorted.join(',') === '0,1,2,11,12') return 2;
    if (sorted.join(',') === '0,1,2,3,12') return 3;
    if (sorted.join(',') === '7,8,9,10,11') return 11;
    if (sorted.includes(11) || sorted.includes(12)) return null;
    return sorted.every((rank, index) => index === 0 || rank === sorted[index - 1] + 1)
        ? sorted[4]
        : null;
}

/** Classifies a Big Two hand using the same five-card ordering as the Rust game. */
export function classifyHand(cards: Card[]): HandRank | null {
    if (!Array.isArray(cards) || cards.length === 0) return null;
    const parsed = cards.map(parseCard);
    if (parsed.some((card) => card === null)) return null;
    const values = parsed as ParsedCard[];
    if (new Set(cards).size !== cards.length) return null;

    if (cards.length === 1) {
        const card = values[0];
        return { size: 1, category: 0, label: 'Single', tiebreak: [card.rank, card.suit] };
    }
    if (cards.length === 2 || cards.length === 3) {
        if (new Set(values.map((card) => card.rank)).size !== 1) return null;
        const high = values.reduce((best, card) => (card.suit > best.suit ? card : best));
        return {
            size: cards.length,
            category: 0,
            label: cards.length === 2 ? 'Pair' : 'Three of a Kind',
            tiebreak: [values[0].rank, high.suit],
        };
    }
    if (cards.length !== 5) return null;

    const counts = [...rankCounts(values).entries()].sort((a, b) => a[0] - b[0]);
    const flush = values.every((card) => card.suit === values[0].suit);
    const high = values.reduce((best, card) =>
        card.rank > best.rank || (card.rank === best.rank && card.suit > best.suit) ? card : best,
    );
    const straight = straightHigh(values.map((card) => card.rank));
    if (straight !== null && flush) {
        // Rust orders straight flushes by suit first, then its straight high card.
        const highCard = values.find((card) => card.rank === straight)!;
        return { size: 5, category: 4, label: 'Straight Flush', tiebreak: [values[0].suit, highCard.rank, highCard.suit] };
    }
    const quad = counts.find(([, count]) => count === 4);
    if (quad) return { size: 5, category: 3, label: 'Four of a Kind', tiebreak: [quad[0]] };
    const triple = counts.find(([, count]) => count === 3);
    if (triple && counts.some(([, count]) => count === 2)) {
        return { size: 5, category: 2, label: 'Full House', tiebreak: [triple[0]] };
    }
    if (flush) return { size: 5, category: 1, label: 'Flush', tiebreak: [values[0].suit, high.rank, high.suit] };
    if (straight !== null) {
        const highCard = values.find((card) => card.rank === straight)!;
        return { size: 5, category: 0, label: 'Straight', tiebreak: [highCard.rank, highCard.suit] };
    }
    return null;
}

export function canBeat(cards: Card[], previous: Card[]): boolean {
    const currentRank = classifyHand(cards);
    const previousRank = classifyHand(previous);
    if (!currentRank || !previousRank || currentRank.size !== previousRank.size) return false;
    return compareRanks(currentRank, previousRank) > 0;
}

function nextRandom(state: number): { value: number; state: number } {
    const next = (state + 0x6d2b79f5) >>> 0;
    let value = next;
    value = Math.imul(value ^ (value >>> 15), value | 1);
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
    value = (value ^ (value >>> 14)) >>> 0;
    return { value: value / 0x100000000, state: next };
}

function shuffle<T>(items: T[], initialState: number): { items: T[]; state: number } {
    const result = [...items];
    let rngState = initialState >>> 0;
    for (let i = result.length - 1; i > 0; i -= 1) {
        const random = nextRandom(rngState);
        rngState = random.state;
        const j = Math.floor(random.value * (i + 1));
        [result[i], result[j]] = [result[j], result[i]];
    }
    return { items: result, state: rngState };
}

function makeDeck(): Card[] {
    return SUITS.flatMap((suit) => RANKS.map((rank) => `${rank}${suit}`));
}

function currentHandSize(stage: number): number {
    return STAGE_INFO[Math.min(stage - 1, STAGE_INFO.length - 1)].handSize;
}

function addLog(state: ArcadeState, message: string): ArcadeState {
    return { ...state, log: [...state.log, message].slice(-LOG_LIMIT) };
}

function playerAfter(state: ArcadeState, playerIndex: number): number {
    return (playerIndex + 1) % state.players.length;
}

function prepareTable(state: ArcadeState, stage = state.stage): ArcadeState {
    const shuffled = shuffle(makeDeck(), state.rngState);
    const handSize = currentHandSize(stage);
    const cards = shuffled.items;
    const players: ArcadePlayer[] = Array.from({ length: 4 }, (_, index) => ({
        name: ['You', 'Mako', 'Vex', stage === 3 ? 'Card Shark' : 'Nova'][index],
        hand: [],
    }));
    // The boss begins with four fewer cards; all other players receive 13.
    // Only the boss table leaves four cards undealt.
    let cursor = 0;
    for (let i = 0; i < handSize; i += 1) {
        for (let player = 0; player < players.length; player += 1) {
            if (stage === 3 && player === 3 && i >= 9) continue;
            players[player].hand.push(cards[cursor++]);
        }
    }
    const threeDiamonds = '3D';
    const reserve = cards.slice(cursor);
    if (!players[HUMAN].hand.includes(threeDiamonds)) {
        const owner = players.findIndex((player) => player.hand.includes(threeDiamonds));
        const humanCard = players[HUMAN].hand[players[HUMAN].hand.length - 1];
        if (owner >= 0) {
            const ownerIndex = players[owner].hand.indexOf(threeDiamonds);
            players[owner].hand[ownerIndex] = humanCard;
        } else {
            const reserveIndex = reserve.indexOf(threeDiamonds);
            reserve[reserveIndex] = humanCard;
        }
        players[HUMAN].hand[players[HUMAN].hand.length - 1] = threeDiamonds;
    }
    for (const player of players) player.hand.sort(compareCards);
    return {
        ...state,
        stage,
        phase: 'playing',
        players,
        turn: HUMAN,
        opening: true,
        lastPlay: null,
        passes: 0,
        reserve,
        discard: [],
        charge: 40,
        combo: 0,
        guardAvailable: state.upgrades.includes('combo_guard'),
        radarTarget: null,
        winner: null,
        rngState: shuffled.state,
    };
}

export function createRun(seed?: number): ArcadeState {
    let runSeed = seed;
    if (runSeed === undefined) {
        runSeed = typeof crypto !== 'undefined' && 'getRandomValues' in crypto
            ? crypto.getRandomValues(new Uint32Array(1))[0]
            : Math.floor(Math.random() * 0xffffffff);
    }
    const normalizedSeed = (runSeed >>> 0) || 1;
    const initial: ArcadeState = {
        version: 2,
        seed: normalizedSeed,
        rngState: normalizedSeed,
        stage: 1,
        phase: 'playing',
        players: [],
        turn: HUMAN,
        opening: true,
        lastPlay: null,
        passes: 0,
        reserve: [],
        discard: [],
        lives: 3,
        score: 0,
        charge: 40,
        combo: 0,
        bestCombo: 0,
        upgrades: [],
        guardAvailable: false,
        radarTarget: null,
        winner: null,
        tablesWon: 0,
        log: [],
    };
    return addLog(prepareTable(initial), 'Table 1: Neon Alley. You lead with 3D.');
}

export function powerCost(state: ArcadeState, power: PowerId): number {
    return power === 'radar' && state.upgrades.includes('radar_discount')
        ? Math.max(0, POWER_COSTS.radar - 10)
        : POWER_COSTS[power];
}

function isHumanTurn(state: ArcadeState): boolean {
    return state.phase === 'playing' && state.turn === HUMAN;
}

export function getPlayError(state: ArcadeState, cards: Card[]): string | null {
    if (!isHumanTurn(state)) return 'It is not your turn.';
    if (!Array.isArray(cards) || cards.length === 0) return 'Select cards to play.';
    if (new Set(cards).size !== cards.length) return 'A card can only be played once.';
    const hand = state.players[HUMAN]?.hand ?? [];
    if (cards.some((card) => !hand.includes(card))) return 'You can only play cards in your hand.';
    if (state.opening && !cards.includes('3D')) return 'Your opening play must include 3D.';
    if (!classifyHand(cards)) return 'Those cards do not make a valid Big Two hand.';
    if (state.lastPlay && !canBeat(cards, state.lastPlay.cards)) return 'Your play must beat the current hand.';
    return null;
}

export function getPowerError(
    state: ArcadeState,
    power: PowerId,
    target?: number,
    cards?: Card[],
): string | null {
    if (!isHumanTurn(state)) return 'Powers are only available on your turn.';
    if (state.charge < powerCost(state, power)) return `You need ${powerCost(state, power)} charge.`;
    if (power === 'radar') {
        if (target === undefined || !Number.isInteger(target) || target < 1 || target > BOT_COUNT) {
            return 'Choose a rival to scan.';
        }
        if (state.players[target].hand.length === 0) return 'That rival has no cards to scan.';
        if (state.radarTarget === target) return 'That rival is already being scanned.';
        return null;
    }
    if (!cards || cards.length < 1 || cards.length > 2) return 'Select one or two cards to exchange.';
    if (new Set(cards).size !== cards.length) return 'A card can only be selected once.';
    if (cards.some((card) => !state.players[HUMAN].hand.includes(card))) return 'You can only exchange cards in your hand.';
    if (state.opening && cards.includes('3D')) return '3D is locked until you make your opening play.';
    if (!state.players.slice(1).some((player) => player.hand.length >= cards.length)) {
        return 'No rival has enough cards for that exchange.';
    }
    return null;
}

function enumerateSubsets(cards: Card[], size: number): Card[][] {
    const result: Card[][] = [];
    const chosen: Card[] = [];
    const visit = (start: number): void => {
        if (chosen.length === size) {
            result.push([...chosen]);
            return;
        }
        for (let i = start; i <= cards.length - (size - chosen.length); i += 1) {
            chosen.push(cards[i]);
            visit(i + 1);
            chosen.pop();
        }
    };
    visit(0);
    return result;
}

export function legalMoves(state: ArcadeState, playerIndex = state.turn): Card[][] {
    if (state.phase !== 'playing' || playerIndex < 0 || playerIndex >= state.players.length) return [];
    const player = state.players[playerIndex];
    const moves: Card[][] = [];
    for (const size of [1, 2, 3, 5]) {
        if (player.hand.length < size) continue;
        for (const candidate of enumerateSubsets(player.hand, size)) {
            if (state.opening && !candidate.includes('3D')) continue;
            if (!classifyHand(candidate)) continue;
            if (state.lastPlay && !canBeat(candidate, state.lastPlay.cards)) continue;
            moves.push(candidate);
        }
    }
    return moves.sort((a, b) => {
        const rankDifference = compareRanks(classifyHand(a)!, classifyHand(b)!);
        return rankDifference || a.length - b.length || compareCards(a[0], b[0]);
    });
}

function finishTable(state: ArcadeState, winner: number): ArcadeState {
    let next: ArcadeState = { ...state, winner, radarTarget: null };
    if (winner === HUMAN) {
        const clutch = state.players.slice(1).some((player) => player.hand.length === 1);
        const multiplier = Math.max(1, state.combo + 1);
        const bonus = 100 * state.stage + (clutch ? 75 * state.stage : 0);
        next = {
            ...next,
            phase: state.stage === STAGE_INFO.length ? 'victory' : 'reward',
            tablesWon: state.tablesWon + 1,
            score: state.score + bonus * multiplier,
            charge: Math.min(100, state.charge + 20),
        };
        next = addLog(next, `Table cleared${clutch ? ' with a clutch bonus' : ''}! +${bonus * multiplier} points.`);
    } else {
        const lives = Math.max(0, state.lives - 1);
        next = { ...next, lives, phase: lives > 0 ? 'defeated' : 'gameover', combo: 0 };
        next = addLog(next, `${state.players[winner].name} cleared the table. ${lives} ${lives === 1 ? 'life' : 'lives'} left.`);
    }
    return next;
}

function play(state: ArcadeState, playerIndex: number, cards: Card[]): ArcadeState {
    const error = playerIndex === HUMAN ? getPlayError(state, cards) : null;
    if (error) throw new Error(error);
    const player = state.players[playerIndex];
    if (cards.some((card) => !player.hand.includes(card)) || !classifyHand(cards)) {
        throw new Error('Bot attempted an illegal play.');
    }
    if (state.opening && !cards.includes('3D')) throw new Error('Opening play must include 3D.');
    if (state.lastPlay && !canBeat(cards, state.lastPlay.cards)) throw new Error('Play does not beat the current hand.');
    const hand = player.hand.filter((card) => !cards.includes(card));
    const rank = classifyHand(cards)!;
    let next: ArcadeState = {
        ...state,
        players: state.players.map((entry, index) => index === playerIndex ? { ...entry, hand } : entry),
        lastPlay: { playerIndex, cards: [...cards], label: rank.label },
        passes: 0,
        opening: false,
        turn: playerAfter(state, playerIndex),
        radarTarget: state.radarTarget,
        discard: [...state.discard, ...cards],
    };
    if (playerIndex !== HUMAN && next.turn === HUMAN) next = { ...next, radarTarget: null };
    if (playerIndex === HUMAN) {
        const multiplier = Math.max(1, state.combo + 1);
        const chargeEarned = 8 + (cards.length === 5 ? 12 : 0);
        next = {
            ...next,
            score: state.score + cards.length * 10 * multiplier,
            charge: Math.min(100, state.charge + chargeEarned),
        };
        next = addLog(next, `You played ${rank.label}${cards.length === 1 ? '' : ` (${cards.length})`}.`);
    } else {
        next = addLog(next, `${player.name} played ${rank.label}.`);
    }
    if (hand.length === 0) return finishTable(next, playerIndex);
    return next;
}

function pass(state: ArcadeState, playerIndex: number): ArcadeState {
    if (!state.lastPlay || state.lastPlay.playerIndex === playerIndex) throw new Error('You cannot pass on a free lead.');
    let next: ArcadeState = {
        ...state,
        passes: state.passes + 1,
        turn: playerAfter(state, playerIndex),
        radarTarget: state.radarTarget,
    };
    if (playerIndex === HUMAN) {
        if (state.guardAvailable) next = { ...next, guardAvailable: false };
        else next = { ...next, combo: 0 };
        next = addLog(next, state.guardAvailable ? 'You passed; Combo Shield preserved your streak.' : 'You passed.');
    } else {
        next = addLog(next, `${state.players[playerIndex].name} passed.`);
    }
    if (next.passes >= state.players.length - 1) {
        const leader = state.lastPlay.playerIndex;
        const wonByHuman = leader === HUMAN;
        next = {
            ...next,
            turn: leader,
            passes: 0,
            lastPlay: null,
            combo: wonByHuman ? state.combo + 1 : 0,
            bestCombo: wonByHuman ? Math.max(state.bestCombo, state.combo + 1) : state.bestCombo,
            score: wonByHuman ? state.score + 25 * Math.max(1, state.combo + 1) : state.score,
            charge: wonByHuman ? Math.min(100, state.charge + 15) : state.charge,
        };
        next = addLog(next, wonByHuman ? `You won the trick! Streak ${next.combo}.` : `${state.players[leader].name} won the trick.`);
    }
    if (next.turn === HUMAN) next = { ...next, radarTarget: null };
    return next;
}

function applyPower(state: ArcadeState, power: PowerId, target?: number, cards?: Card[]): ArcadeState {
    const error = getPowerError(state, power, target, cards);
    if (error) throw new Error(error);
    const cost = powerCost(state, power);
    if (power === 'radar') {
        return addLog({ ...state, charge: state.charge - cost, radarTarget: target! }, `Radar revealed ${state.players[target!].name}'s hand.`);
    }
    const selected = cards!;
    const eligibleBots = state.players.slice(1)
        .map((player, offset) => ({ index: offset + 1, hand: player.hand }))
        .filter((player) => player.hand.length >= selected.length);
    let rngState = state.rngState;
    const botPick = nextRandom(rngState);
    rngState = botPick.state;
    const selectedBot = eligibleBots[Math.floor(botPick.value * eligibleBots.length)];
    const botHand = [...selectedBot.hand];
    const replacements: Card[] = [];
    for (let i = 0; i < selected.length; i += 1) {
        const pick = nextRandom(rngState);
        rngState = pick.state;
        const index = Math.floor(pick.value * botHand.length);
        replacements.push(botHand.splice(index, 1)[0]);
    }
    const hand = state.players[HUMAN].hand.filter((card) => !selected.includes(card)).concat(replacements).sort(compareCards);
    const rivalHand = botHand.concat(selected).sort(compareCards);
    return addLog({
        ...state,
        charge: state.charge - cost,
        rngState,
        players: state.players.map((player, index) => index === HUMAN
            ? { ...player, hand }
            : index === selectedBot.index ? { ...player, hand: rivalHand } : player),
    }, `Blind exchange: swapped ${selected.length} card${selected.length === 1 ? '' : 's'} with ${state.players[selectedBot.index].name}.`);
}

export function upgradeChoices(state: ArcadeState): UpgradeId[] {
    if (state.phase !== 'reward') return [];
    return (['radar_discount', 'combo_guard', 'extra_life'] as UpgradeId[]).filter((upgrade) => {
        if (state.upgrades.includes(upgrade)) return false;
        return upgrade !== 'extra_life' || state.lives < 4;
    });
}

export function applyAction(state: ArcadeState, action: ArcadeAction): ArcadeState {
    if (action.type === 'retry') {
        if (state.phase !== 'defeated') throw new Error('Retry is only available after losing a table.');
        const next = prepareTable(state);
        return addLog(next, `Retrying table ${state.stage} with a fresh deal.`);
    }
    if (action.type === 'upgrade') {
        if (state.phase !== 'reward') throw new Error('Upgrades are only available between tables.');
        if (!upgradeChoices(state).includes(action.upgrade)) throw new Error('That upgrade is unavailable.');
        const upgraded = {
            ...state,
            upgrades: [...state.upgrades, action.upgrade],
            lives: action.upgrade === 'extra_life' ? Math.min(4, state.lives + 1) : state.lives,
            stage: state.stage + 1,
        };
        const next = prepareTable(upgraded);
        return addLog(next, `Table ${next.stage}: ${STAGE_INFO[next.stage - 1].name}. You lead with 3D.`);
    }
    if (action.type === 'power') return applyPower(state, action.power, action.target, action.cards);
    if (!isHumanTurn(state)) throw new Error('It is not your turn.');
    if (action.type === 'play') return play(state, HUMAN, action.cards);
    if (action.type === 'pass') return pass(state, HUMAN);
    throw new Error('Unknown action.');
}

function chooseBotMove(state: ArcadeState, playerIndex: number, moves: Card[][]): Card[] {
    if (moves.length === 0) throw new Error('No legal bot move exists.');
    const hand = state.players[playerIndex].hand;
    // Early rival prefers shedding weak singles. Later rivals preserve low combinations,
    // cover threatening opponents and dump a winning hand when possible.
    if (state.stage === 1 && !state.lastPlay) {
        return moves.find((move) => move.length === 1) ?? moves[0];
    }
    if (state.stage >= 2 && !state.lastPlay) {
        const finish = moves.find((move) => move.length === hand.length);
        if (finish) return finish;
        const combinations = moves.filter((move) => move.length > 1);
        if (combinations.length > 0) {
            return combinations.sort((a, b) => b.length - a.length || compareRanks(classifyHand(a)!, classifyHand(b)!))[0];
        }
    }
    const opponentThreat = state.players.some((player, index) => index !== playerIndex && player.hand.length <= 2);
    const ranked = [...moves].sort((a, b) => {
        const finishA = a.length === hand.length ? -10000 : 0;
        const finishB = b.length === hand.length ? -10000 : 0;
        const valueA = finishA + (state.stage >= 2 && opponentThreat ? -a.length * 30 : 0) + compareCards(a[a.length - 1], hand[hand.length - 1]);
        const valueB = finishB + (state.stage >= 2 && opponentThreat ? -b.length * 30 : 0) + compareCards(b[b.length - 1], hand[hand.length - 1]);
        return valueA - valueB;
    });
    return ranked[0];
}

/** Advances exactly one bot action; human turns and finished phases are left untouched. */
export function advanceBot(state: ArcadeState): ArcadeState {
    if (state.phase !== 'playing' || state.turn === HUMAN) return state;
    const playerIndex = state.turn;
    const moves = legalMoves(state, playerIndex);
    if (moves.length === 0) {
        if (!state.lastPlay || state.lastPlay.playerIndex === playerIndex) {
            // A free lead always has at least one move; this protects callers from malformed saves.
            return state;
        }
        let next = pass(state, playerIndex);
        if (next.turn === HUMAN) next = { ...next, radarTarget: null };
        return next;
    }
    return play(state, playerIndex, chooseBotMove(state, playerIndex, moves));
}
