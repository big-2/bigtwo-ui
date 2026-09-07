// Hand-written to match bigtwo-svc's feedback endpoints.
//
// These are not generated: `npm run gen` points at `../backend/openapi.json`,
// a path that does not exist in this workspace, and the backend does not
// currently emit an OpenAPI spec.

export type FeedbackRating = "up" | "down";

export type FeedbackChip =
    | "fun"
    | "good_bots"
    | "smooth"
    | "bots_too_easy"
    | "bots_too_hard"
    | "bug"
    | "slow"
    | "confusing_ui"
    | "not_fun";

export type FeedbackBotDifficulty = "easy" | "medium" | "hard" | "ai" | "expert";

export interface SubmitFeedbackRequest {
    rating: FeedbackRating;
    chips?: FeedbackChip[];
    comment?: string;
    room_id?: string;
    won?: boolean;
    bot_difficulty?: FeedbackBotDifficulty;
    had_bots?: boolean;
    app_version?: string;
    client?: string;
}

export interface SubmitFeedbackResponse {
    submitted: boolean;
}

export interface FeedbackStatusResponse {
    submitted: boolean;
}

/** Chip options offered after a thumbs up. */
export const POSITIVE_CHIPS: Array<{ value: FeedbackChip; label: string }> = [
    { value: "fun", label: "Fun match" },
    { value: "good_bots", label: "Bots felt right" },
    { value: "smooth", label: "Ran smoothly" },
    { value: "bots_too_easy", label: "Bots too easy" },
];

/** Chip options offered after a thumbs down. */
export const NEGATIVE_CHIPS: Array<{ value: FeedbackChip; label: string }> = [
    { value: "bots_too_hard", label: "Bots too strong" },
    { value: "bots_too_easy", label: "Bots too easy" },
    { value: "bug", label: "Something broke" },
    { value: "slow", label: "Slow or laggy" },
    { value: "confusing_ui", label: "Confusing interface" },
    { value: "not_fun", label: "Just not fun" },
];

/** Mirrors MAX_CHIPS in bigtwo-svc/src/feedback/models.rs. */
export const MAX_CHIPS = 5;

/** Mirrors MAX_COMMENT_LEN in bigtwo-svc/src/feedback/models.rs. */
export const MAX_COMMENT_LENGTH = 500;
