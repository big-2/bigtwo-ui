export interface PlayerStatsSummary {
    games_played: number;
    wins: number;
    win_rate: number;
    current_win_streak: number;
    best_win_streak: number;
}

export interface PlayerPlayStyle {
    total_passes: number;
    total_single_plays: number;
    total_pair_plays: number;
    total_triple_plays: number;
    total_five_card_plays: number;
}

export interface PlayerSplitSummary {
    games_played: number;
    wins: number;
    win_rate: number;
}

export interface PlayerRecentWindow {
    wins: number;
    win_rate: number;
}

export interface PlayerProfileStatsResponse {
    player_uuid: string;
    display_name: string;
    summary: PlayerStatsSummary;
    play_style: PlayerPlayStyle;
    splits: {
        human_only: PlayerSplitSummary;
        with_bots: PlayerSplitSummary;
    };
    recent_form: {
        last_10: PlayerRecentWindow;
        last_25: PlayerRecentWindow;
    };
}

export interface GameOpponentSummary {
    player_uuid: string;
    display_name?: string | null;
    won: boolean;
    is_bot: boolean;
}

export interface PlayerRecentGameSummary {
    game_id: string;
    completed_at: string;
    winner_uuid: string;
    cards_remaining: number;
    final_score: number;
    had_bots: boolean;
    opponents: GameOpponentSummary[];
}

export interface PlayerRecentGamesResponse {
    games: PlayerRecentGameSummary[];
    next_before?: string | null;
}

export interface MatchCard {
    suit: string;
    rank: string;
}

export interface CompletedGameDetailPlayer {
    player_uuid: string;
    display_name?: string | null;
    won: boolean;
    is_bot: boolean;
    cards_remaining: number;
    raw_score: number;
    final_score: number;
    turns_taken: number;
    passes: number;
    plays: number;
    cards_played: number;
    started_first: boolean;
}

export interface CompletedGameDetailMove {
    sequence: number;
    player_uuid: string;
    display_name?: string | null;
    is_bot: boolean;
    action: "Pass" | "Play" | string;
    cards: MatchCard[];
}

export interface CompletedGameDetailResponse {
    game_id: string;
    room_id: string;
    game_number: number;
    winner_uuid: string;
    started_at: string;
    completed_at: string;
    had_bots: boolean;
    players: CompletedGameDetailPlayer[];
    moves: CompletedGameDetailMove[];
}
