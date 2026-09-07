import React from "react";
import { ThumbsDown, ThumbsUp, X } from "lucide-react";

import { Button } from "./ui/button";
import { cn } from "../lib/utils";
import { PostGameFeedbackState } from "../hooks/usePostGameFeedback";
import { MAX_COMMENT_LENGTH, NEGATIVE_CHIPS, POSITIVE_CHIPS } from "../types.feedback";

interface PostGameFeedbackProps {
    /** Shared state from usePostGameFeedback, owned by GameScreen. */
    feedback: PostGameFeedbackState;
    /** Renders a tighter layout for the mobile game-over panel. */
    compact?: boolean;
    className?: string;
}

/**
 * Post-game feedback widget.
 *
 * Purely presentational - all state lives in usePostGameFeedback, because
 * GameScreen mounts this in both its desktop and mobile game-over branches and
 * the two must not keep separate state.
 *
 * Rendered below the primary "Back to Lobby" action so it never competes with
 * it. A player who submits never sees it again; a player who dismisses it three
 * times is also left alone permanently.
 */
const PostGameFeedback: React.FC<PostGameFeedbackProps> = ({
    feedback,
    compact = false,
    className,
}) => {
    const {
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
    } = feedback;

    if (stage === "hidden") {
        return null;
    }

    const containerClasses = cn(
        "w-full max-w-md rounded-lg border border-border/60 bg-background/60 text-left",
        compact ? "px-3 py-2" : "px-4 py-3",
        className
    );

    if (stage === "thanks") {
        return (
            <div className={containerClasses} data-testid="post-game-feedback">
                <p className="text-sm text-muted-foreground" data-testid="feedback-thanks">
                    Thanks — noted.
                </p>
            </div>
        );
    }

    const chipOptions = rating === "down" ? NEGATIVE_CHIPS : POSITIVE_CHIPS;

    return (
        <div className={containerClasses} data-testid="post-game-feedback">
            <div className="flex items-center justify-between gap-2">
                <p className="text-sm text-muted-foreground">Enjoying the game?</p>
                <div className="flex items-center gap-1">
                    <Button
                        type="button"
                        variant={rating === "up" ? "default" : "outline"}
                        size="icon"
                        aria-label="Yes, enjoying the game"
                        aria-pressed={rating === "up"}
                        data-testid="feedback-thumbs-up"
                        onClick={() => rate("up")}
                    >
                        <ThumbsUp />
                    </Button>
                    <Button
                        type="button"
                        variant={rating === "down" ? "default" : "outline"}
                        size="icon"
                        aria-label="No, not enjoying the game"
                        aria-pressed={rating === "down"}
                        data-testid="feedback-thumbs-down"
                        onClick={() => rate("down")}
                    >
                        <ThumbsDown />
                    </Button>
                    <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        aria-label="Dismiss feedback prompt"
                        data-testid="feedback-dismiss"
                        onClick={dismiss}
                    >
                        <X />
                    </Button>
                </div>
            </div>

            {stage === "detail" && (
                <div className="mt-3 flex flex-col gap-2" data-testid="feedback-detail">
                    <div className="flex flex-wrap gap-1.5">
                        {chipOptions.map((option) => {
                            const isSelected = selectedChips.includes(option.value);
                            return (
                                <button
                                    key={option.value}
                                    type="button"
                                    aria-pressed={isSelected}
                                    data-testid={`feedback-chip-${option.value}`}
                                    onClick={() => toggleChip(option.value)}
                                    className={cn(
                                        "rounded-full border px-2.5 py-1 text-xs transition-colors",
                                        isSelected
                                            ? "border-primary bg-primary text-primary-foreground"
                                            : "border-border bg-background/60 text-muted-foreground hover:bg-accent/60"
                                    )}
                                >
                                    {option.label}
                                </button>
                            );
                        })}
                    </div>

                    <textarea
                        value={comment}
                        onChange={(event) => setComment(event.target.value)}
                        maxLength={MAX_COMMENT_LENGTH}
                        rows={compact ? 2 : 3}
                        placeholder="Anything else? (optional)"
                        aria-label="Additional feedback"
                        data-testid="feedback-comment"
                        className="w-full resize-none rounded-md border border-input bg-background/70 px-2 py-1.5 text-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                    />

                    {comment.length > 400 && (
                        <p className="text-right text-xs text-muted-foreground">
                            {comment.length}/{MAX_COMMENT_LENGTH}
                        </p>
                    )}

                    {errorMessage && (
                        <p className="text-xs text-destructive" data-testid="feedback-error">
                            {errorMessage}
                        </p>
                    )}

                    <div className="flex justify-end">
                        <Button
                            type="button"
                            size="sm"
                            disabled={isSending}
                            data-testid="feedback-submit"
                            onClick={submit}
                        >
                            {isSending ? "Sending…" : "Send"}
                        </Button>
                    </div>
                </div>
            )}
        </div>
    );
};

export default PostGameFeedback;
