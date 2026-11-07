/** Browser-only solo arcade contract. Standard multiplayer is not involved. */
export type Card = string;
export type Phase = 'playing' | 'reward' | 'defeated' | 'victory' | 'gameover';
export type UpgradeId = 'radar_discount' | 'combo_guard' | 'extra_life';
export type PowerId = 'radar' | 'mulligan';

export interface ArcadePlayer {
    name: string;
    hand: Card[];
}

export interface HandRank {
    size: number;
    category: number;
    label: string;
    tiebreak: number[];
}

export interface LastPlay {
    playerIndex: number;
    cards: Card[];
    label: string;
}

export interface ArcadeState {
    version: 2;
    seed: number;
    rngState: number;
    stage: number;
    phase: Phase;
    players: ArcadePlayer[];
    turn: number;
    opening: boolean;
    lastPlay: LastPlay | null;
    passes: number;
    reserve: Card[];
    discard: Card[];
    lives: number;
    score: number;
    charge: number;
    combo: number;
    bestCombo: number;
    upgrades: UpgradeId[];
    guardAvailable: boolean;
    radarTarget: number | null;
    winner: number | null;
    tablesWon: number;
    log: string[];
}

export type ArcadeAction =
    | { type: 'play'; cards: Card[] }
    | { type: 'pass' }
    | { type: 'power'; power: PowerId; target?: number; cards?: Card[] }
    | { type: 'upgrade'; upgrade: UpgradeId }
    | { type: 'retry' };

export const POWER_COSTS = { radar: 25, mulligan: 35 } as const;
export const UPGRADE_INFO: Record<UpgradeId, { name: string; description: string }> = {
    radar_discount: { name: 'Scanner Boost', description: 'Radar costs 10 less charge for the rest of this run.' },
    combo_guard: { name: 'Combo Shield', description: 'Your first pass each table preserves your streak.' },
    extra_life: { name: 'Second Wind', description: 'Gain one life, up to a maximum of four.' },
};

export const STAGE_INFO = [
    { name: 'Neon Alley', description: 'Outplay three street hustlers with a full 13-card hand.', handSize: 13 },
    { name: 'Voltage Lounge', description: 'Face sharper rivals with a full 13-card hand.', handSize: 13 },
    { name: 'The Card Shark', description: 'A full 13-card hand faces a boss with nine cards.', handSize: 13 },
] as const;
