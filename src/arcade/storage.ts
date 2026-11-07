import type { ArcadeState, Phase, UpgradeId } from './types';
import { classifyHand } from './engine';

const RUN_KEY = 'big-two-arcade-run-v2';
const LEGACY_RUN_KEY = 'big-two-arcade-run-v1';
const BEST_KEY = 'big-two-arcade-best-v1';
const CARDS = new Set(
    [...'3456789JQKA2'].flatMap(rank => [...'DCHS'].map(suit => `${rank}${suit}`)),
);
for (const suit of 'DCHS') CARDS.add(`10${suit}`);
const PHASES = new Set<Phase>(['playing', 'reward', 'defeated', 'victory', 'gameover']);
const UPGRADES = new Set<UpgradeId>(['radar_discount', 'combo_guard', 'extra_life']);

function storage(): Storage | null {
    try {
        return typeof localStorage === 'undefined' ? null : localStorage;
    } catch {
        return null;
    }
}

function isRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function integer(value: unknown, min: number, max: number): value is number {
    return Number.isSafeInteger(value) && (value as number) >= min && (value as number) <= max;
}

function validCardList(value: unknown): value is string[] {
    return Array.isArray(value) && value.length <= 52 && value.every(card => typeof card === 'string' && CARDS.has(card));
}

/** Reject corrupted saves before callers can observe them. */
export function isValidRun(value: unknown): value is ArcadeState {
    if (!isRecord(value)) return false;
    if (value.version !== 2 || !integer(value.seed, 1, 0xffffffff) || !integer(value.rngState, 0, 0xffffffff)) return false;
    if (!integer(value.stage, 1, 3) || typeof value.phase !== 'string' || !PHASES.has(value.phase as Phase)) return false;
    if (!Array.isArray(value.players) || value.players.length !== 4) return false;
    if (!value.players.every(player => isRecord(player) && typeof player.name === 'string' && player.name.length > 0 && player.name.length <= 40 && validCardList(player.hand) && player.hand.length <= 13)) return false;
    if (!integer(value.turn, 0, 3) || typeof value.opening !== 'boolean' || !integer(value.passes, 0, 2)) return false;
    if (!validCardList(value.reserve) || !validCardList(value.discard)) return false;
    const discard = value.discard;
    if (!integer(value.lives, 0, 4) || !integer(value.score, 0, Number.MAX_SAFE_INTEGER) || !integer(value.charge, 0, 100)) return false;
    if (!integer(value.combo, 0, Number.MAX_SAFE_INTEGER) || !integer(value.bestCombo, 0, Number.MAX_SAFE_INTEGER) || (value.bestCombo as number) < (value.combo as number)) return false;
    if (!Array.isArray(value.upgrades) || !value.upgrades.every(upgrade => typeof upgrade === 'string' && UPGRADES.has(upgrade as UpgradeId)) || new Set(value.upgrades).size !== value.upgrades.length) return false;
    if (typeof value.guardAvailable !== 'boolean') return false;
    if (value.radarTarget !== null && (!integer(value.radarTarget, 1, 3) || value.phase !== 'playing')) return false;
    if (value.winner !== null && !integer(value.winner, 0, 3)) return false;
    if (!integer(value.tablesWon, 0, 3) || !Array.isArray(value.log) || value.log.length > 48 || !value.log.every(line => typeof line === 'string' && line.length <= 200)) return false;

    if (value.lastPlay !== null) {
        const play = value.lastPlay;
        if (!isRecord(play) || !integer(play.playerIndex, 0, 3) || !validCardList(play.cards) || play.cards.length === 0 || play.cards.length > 5 || typeof play.label !== 'string') return false;
        const rank = classifyHand(play.cards);
        if (!rank || rank.label !== play.label || new Set(play.cards).size !== play.cards.length) return false;
        if (!play.cards.every(card => discard.includes(card))) return false;
        if (play.cards.some(card => (value.players as { hand: string[] }[])[play.playerIndex as number].hand.includes(card))) return false;
    }

    // Every physical card must occur in exactly one zone. LastPlay is a reference
    // to cards already in discard and therefore is deliberately excluded here.
    const zones = [
        ...value.players.flatMap(player => (player as { hand: string[] }).hand),
        ...value.reserve,
        ...value.discard,
    ];
    if (zones.length !== 52 || zones.some(card => !CARDS.has(card)) || new Set(zones).size !== 52) return false;
    const players = value.players as { hand: string[] }[];
    if (value.phase === 'playing' && (value.winner !== null || value.lives === 0 || players.some(player => player.hand.length === 0))) return false;
    if (value.phase === 'playing' && value.lastPlay !== null) {
        const lastPlayer = (value.lastPlay as { playerIndex: number }).playerIndex;
        if (value.turn !== (lastPlayer + value.passes + 1) % 4) return false;
    }
    if (value.phase === 'playing' && value.opening && (value.turn !== 0 || !players[0].hand.includes('3D') || value.lastPlay !== null || value.passes !== 0)) return false;
    if (value.reserve.length !== (value.stage === 3 ? 4 : 0)) return false;
    if (value.phase === 'playing' && value.opening) {
        const expectedHands = value.stage === 3 ? [13, 13, 13, 9] : [13, 13, 13, 13];
        if (players.some((player, index) => player.hand.length !== expectedHands[index]) || discard.length !== 0) return false;
    }
    if (value.lastPlay === null && value.passes !== 0) return false;
    if (value.phase === 'reward' && (value.winner !== 0 || value.stage >= 3 || value.lives === 0)) return false;
    if (value.phase === 'victory' && (value.winner !== 0 || value.stage !== 3 || value.lives === 0)) return false;
    if ((value.phase === 'defeated' || value.phase === 'gameover') &&
        (value.winner === null || value.winner === 0 || (value.phase === 'defeated' ? value.lives === 0 : value.lives !== 0))) return false;
    if (value.winner !== null && players[value.winner as number].hand.length !== 0) return false;
    if (value.guardAvailable && !value.upgrades.includes('combo_guard')) return false;
    const expectedTablesWon = value.phase === 'reward' ? value.stage : value.phase === 'victory' ? 3 : value.stage - 1;
    if (value.tablesWon !== expectedTablesWon) return false;
    return true;
}

export function loadRun(): ArcadeState | null {
    try {
        const store = storage();
        const raw = store?.getItem(RUN_KEY);
        if (raw) {
            const parsed: unknown = JSON.parse(raw);
            if (isRecord(parsed) && parsed.version === 2 && parsed.state === null && Object.keys(parsed).length === 2) {
                return null;
            }
            if (!isRecord(parsed) || parsed.version !== 2 || !isValidRun(parsed.state)) {
                clearRun();
                return null;
            }
            return parsed.state;
        }

        // Intermission states can safely resume: their next action creates a fresh
        // 13-card deal. Leave the legacy value intact for recovery.
        const legacyRaw = store?.getItem(LEGACY_RUN_KEY);
        if (!legacyRaw) return null;
        const legacy: unknown = JSON.parse(legacyRaw);
        if (!isRecord(legacy) || legacy.version !== 1 || !isRecord(legacy.state)) return null;
        const oldState = legacy.state;
        if ((oldState.phase !== 'reward' && oldState.phase !== 'defeated') || oldState.version !== 1 || !validCardList(oldState.reserve) || !validCardList(oldState.discard)) return null;
        const expectedReserve = oldState.stage === 3 ? 4 : 0;
        const reserve = oldState.reserve.slice(0, expectedReserve);
        const unusedLegacyReserve = oldState.reserve.slice(expectedReserve);
        const migrated = {
            ...oldState,
            version: 2,
            reserve,
            discard: [...oldState.discard, ...unusedLegacyReserve],
        };
        if (!isValidRun(migrated)) return null;
        try {
            store?.setItem(RUN_KEY, JSON.stringify({ version: 2, state: migrated }));
        } catch {
            // Keep the validated intermission state available for this session.
        }
        return migrated;
    } catch {
        clearRun();
        return null;
    }
}

export function saveRun(state: ArcadeState): boolean {
    if (!isValidRun(state)) return false;
    try {
        const store = storage();
        if (!store) return false;
        store.setItem(RUN_KEY, JSON.stringify({ version: 2, state }));
        return true;
    } catch {
        return false;
    }
}

export function clearRun(): void {
    try {
        storage()?.setItem(RUN_KEY, JSON.stringify({ version: 2, state: null }));
    } catch {
        // Persistence is best-effort; the game remains playable in memory.
    }
}

export function loadBest(): number {
    try {
        const value = Number(storage()?.getItem(BEST_KEY));
        return Number.isSafeInteger(value) && value >= 0 ? value : 0;
    } catch {
        return 0;
    }
}

export function recordBest(score: number): number {
    const best = Math.max(loadBest(), Number.isSafeInteger(score) && score >= 0 ? score : 0);
    try {
        storage()?.setItem(BEST_KEY, String(best));
    } catch {
        // Return the in-memory result even when quota or browser policy blocks writes.
    }
    return best;
}
