import { useCallback, useEffect, useState } from "react";

import {
    getFeedbackStatus,
    hasSubmittedLocally,
    isPromptScheduled,
    recordDismissal,
    recordGameSeen,
    submitFeedback,
} from "../services/feedback";
import { FeedbackBotDifficulty, FeedbackChip, FeedbackRating, MAX_CHIPS } from "../types.feedback";

export type PostGameFeedbackStage = "hidden" | "prompt" | "detail" | "thanks";

interface UsePostGameFeedbackOptions {
    /**
     * True once the game-over panel is showing. The prompt is only ever
     * considered while this is true.
     */
    active: boolean;
    roomId?: string;
    won?: boolean;
    botDifficulty?: FeedbackBotDifficulty;
    hadBots?: boolean;
}

export interface PostGameFeedbackState {
    stage: PostGameFeedbackStage;
    rating: FeedbackRating | null;
    selectedChips: FeedbackChip[];
    comment: string;
    isSending: boolean;
    errorMessage: string | null;
    setComment: (value: string) => void;
    rate: (value: FeedbackRating) => void;
    toggleChip: (chip: FeedbackChip) => void;
    dismiss: () => void;
    submit: () => void;
}

/**
 * Owns all post-game feedback state.
 *
 * Lives in a hook rather than in the component because GameScreen renders the
 * game-over panel twice - a desktop branch and a mobile branch, one of which is
 * hidden with CSS but still mounted. Both branches render the same widget, so
 * the state (and the single `recordGameSeen` / status fetch) must be owned once,
 * above them.
 */
export const usePostGameFeedback = ({
    active,
    roomId,
    won,
    botDifficulty,
    hadBots,
}: UsePostGameFeedbackOptions): PostGameFeedbackState => {
    const [stage, setStage] = useState<PostGameFeedbackStage>("hidden");
    const [rating, setRating] = useState<FeedbackRating | null>(null);
    const [selectedChips, setSelectedChips] = useState<FeedbackChip[]>([]);
    const [comment, setComment] = useState("");
    const [isSending, setIsSending] = useState(false);
    const [errorMessage, setErrorMessage] = useState<string | null>(null);

    useEffect(() => {
        if (!active) {
            return;
        }

        let cancelled = false;

        const decideVisibility = async () => {
            // Fast path: someone who already submitted costs us no network call.
            if (hasSubmittedLocally()) {
                return;
            }

            const gamesSeen = recordGameSeen();
            if (!isPromptScheduled(gamesSeen)) {
                return;
            }

            // Backstop for a restored session, or a client whose local flag was
            // lost: the server is the authority on whether feedback exists.
            const status = await getFeedbackStatus();
            if (cancelled || status?.submitted) {
                return;
            }

            setStage("prompt");
        };

        void decideVisibility();

        return () => {
            cancelled = true;
        };
    }, [active]);

    const dismiss = useCallback(() => {
        recordDismissal();
        setStage("hidden");
    }, []);

    const rate = useCallback((value: FeedbackRating) => {
        setRating(value);
        setSelectedChips([]);
        setStage("detail");
    }, []);

    const toggleChip = useCallback((chip: FeedbackChip) => {
        setSelectedChips((current) => {
            if (current.includes(chip)) {
                return current.filter((value) => value !== chip);
            }
            if (current.length >= MAX_CHIPS) {
                return current;
            }
            return [...current, chip];
        });
    }, []);

    const submit = useCallback(() => {
        if (!rating || isSending) {
            return;
        }

        setIsSending(true);
        setErrorMessage(null);

        const trimmedComment = comment.trim();

        void submitFeedback({
            rating,
            chips: selectedChips.length > 0 ? selectedChips : undefined,
            comment: trimmedComment.length > 0 ? trimmedComment : undefined,
            room_id: roomId,
            won,
            bot_difficulty: botDifficulty,
            had_bots: hadBots,
            client: "web",
        }).then((result) => {
            setIsSending(false);

            if (result.outcome === "error") {
                setErrorMessage(result.message);
                return;
            }

            // "submitted" and "already_submitted" mean the same thing here: the
            // server has a row for this player, so stop asking.
            setStage("thanks");
        });
    }, [botDifficulty, comment, hadBots, isSending, rating, roomId, selectedChips, won]);

    // Collapse the thank-you note rather than leaving it on screen.
    useEffect(() => {
        if (stage !== "thanks") {
            return;
        }

        const timer = window.setTimeout(() => setStage("hidden"), 3000);
        return () => window.clearTimeout(timer);
    }, [stage]);

    return {
        stage,
        rating,
        selectedChips,
        comment,
        isSending,
        errorMessage,
        setComment,
        rate,
        toggleChip,
        dismiss,
        submit,
    };
};
