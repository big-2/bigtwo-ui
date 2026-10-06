import axios from "axios";

import { getNormalizedApiUrl } from "../utils/config";
import {
    FeedbackStatusResponse,
    SubmitFeedbackRequest,
    SubmitFeedbackResponse,
} from "../types.feedback";

// The shared axios instance configured in services/api.ts already attaches the
// Authorization header and handles 401 by clearing the session, so importing it
// here is enough to inherit both behaviours.
import "./api";

const API_URL = getNormalizedApiUrl();

const SUBMITTED_KEY = "bigtwo_feedback_submitted";
const DISMISS_COUNT_KEY = "bigtwo_feedback_dismiss_count";
const GAMES_SEEN_KEY = "bigtwo_feedback_games_seen";

/**
 * Games (counted from the player's first game-over screen) on which the prompt
 * is shown, provided they have neither submitted nor dismissed it away.
 */
const PROMPT_SCHEDULE = [1, 3, 8];

/** After this many dismissals the prompt is retired permanently. */
const MAX_DISMISSALS = 3;

const readNumber = (key: string): number => {
    try {
        const raw = window.localStorage.getItem(key);
        const parsed = raw === null ? 0 : Number.parseInt(raw, 10);
        return Number.isFinite(parsed) && parsed > 0 ? parsed : 0;
    } catch {
        // Private browsing or a blocked storage partition. Treat as "nothing
        // recorded" rather than breaking the game-over screen.
        return 0;
    }
};

const writeValue = (key: string, value: string): void => {
    try {
        window.localStorage.setItem(key, value);
    } catch {
        // Ignore: suppression is a UX nicety, and the server still enforces
        // one submission per player.
    }
};

/** True once this browser has recorded a submission (or a final dismissal). */
export const hasSubmittedLocally = (): boolean => {
    try {
        return window.localStorage.getItem(SUBMITTED_KEY) === "1";
    } catch {
        return false;
    }
};

export const markSubmittedLocally = (): void => {
    writeValue(SUBMITTED_KEY, "1");
};

/** Records a game-over screen and returns the running total. */
export const recordGameSeen = (): number => {
    const next = readNumber(GAMES_SEEN_KEY) + 1;
    writeValue(GAMES_SEEN_KEY, String(next));
    return next;
};

/**
 * Records a dismissal. After MAX_DISMISSALS the prompt is retired for good -
 * repeatedly asking someone who keeps closing it just trains them to ignore it.
 */
export const recordDismissal = (): void => {
    const next = readNumber(DISMISS_COUNT_KEY) + 1;
    writeValue(DISMISS_COUNT_KEY, String(next));
    if (next >= MAX_DISMISSALS) {
        markSubmittedLocally();
    }
};

/** Whether the given game number is one the prompt is scheduled for. */
export const isPromptScheduled = (gamesSeen: number): boolean =>
    PROMPT_SCHEDULE.includes(gamesSeen);

export const getFeedbackStatus = async (): Promise<FeedbackStatusResponse | null> => {
    try {
        const response = await axios.get<FeedbackStatusResponse>(`${API_URL}/feedback/status`);
        return response.data;
    } catch (error) {
        console.error("Error fetching feedback status:", error);
        return null;
    }
};

export type SubmitFeedbackResult =
    | { outcome: "submitted" }
    /** Server already has a row for this player; treat exactly like success. */
    | { outcome: "already_submitted" }
    | { outcome: "error"; message: string };

export const submitFeedback = async (
    request: SubmitFeedbackRequest
): Promise<SubmitFeedbackResult> => {
    try {
        await axios.post<SubmitFeedbackResponse>(`${API_URL}/feedback`, request);
        markSubmittedLocally();
        return { outcome: "submitted" };
    } catch (error) {
        if (axios.isAxiosError(error) && error.response?.status === 409) {
            // Another tab got there first. Bring local state in line so the
            // widget stops appearing here too.
            markSubmittedLocally();
            return { outcome: "already_submitted" };
        }

        console.error("Error submitting feedback:", error);
        return { outcome: "error", message: "Could not send feedback. Please try again." };
    }
};

/** Exported for tests and for clearing state during manual verification. */
export const FEEDBACK_STORAGE_KEYS = {
    submitted: SUBMITTED_KEY,
    dismissCount: DISMISS_COUNT_KEY,
    gamesSeen: GAMES_SEEN_KEY,
} as const;
