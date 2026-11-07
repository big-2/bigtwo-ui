import { useEffect, useRef } from "react";

interface KeyboardState {
    currentKey: string | null;
    isHolding: boolean;
}

interface UseKeyboardShortcutsOptions {
    onRankKey: (rank: string) => void;
    onArrowKey: (direction: "left" | "right", heldRank: string | null) => void;
    onUpArrow: () => void;
    onDownArrow: () => void;
    onSpacebar: () => void;
    onEnter: () => void;
    onBackspace: () => void;
    onPass: () => void;
    onEscape: () => void;
    isEnabled: boolean; // The caller enables shortcuts for its active game screen
    isCurrentTurn: boolean; // Only allow actions during player's turn
    gameWon: boolean; // Disable when game is won
    canPass: boolean; // Can pass (requires lastPlayedCards.length > 0)
}

// Arrow key repeat timing constants
const ARROW_KEY_REPEAT_INTERVAL = 100; // Repeat every 100ms
const ARROW_KEY_INITIAL_DELAY = 300; // Initial delay of 300ms before repeating

// Map keyboard keys to card ranks
const KEY_TO_RANK: Record<string, string> = {
    "2": "2",
    "3": "3",
    "4": "4",
    "5": "5",
    "6": "6",
    "7": "7",
    "8": "8",
    "9": "9",
    "t": "T", // T for 10
    "j": "J",
    "q": "Q",
    "k": "K",
    "a": "A",
};

export function useKeyboardShortcuts(options: UseKeyboardShortcutsOptions) {
    const {
        isEnabled,
        gameWon,
    } = options;

    const keyboardStateRef = useRef<KeyboardState>({
        currentKey: null,
        isHolding: false,
    });
    const arrowRepeatIntervalRef = useRef<NodeJS.Timeout | null>(null);
    const arrowRepeatTimeoutRef = useRef<NodeJS.Timeout | null>(null);
    const heldArrowKeyRef = useRef<"left" | "right" | null>(null);
    const heldRankKeyRef = useRef<string | null>(null);
    const optionsRef = useRef(options);
    const focusedByPointerRef = useRef(false);

    // Keep refs in sync with latest options
    useEffect(() => {
        optionsRef.current = options;
    }, [options]);

    useEffect(() => {
        if (!isEnabled || gameWon) {
            return;
        }

        const handleKeyDown = (e: KeyboardEvent) => {
            const {
                onRankKey: latestOnRankKey,
                onArrowKey: latestOnArrowKey,
                onUpArrow: latestOnUpArrow,
                onDownArrow: latestOnDownArrow,
                onSpacebar: latestOnSpacebar,
                onEnter: latestOnEnter,
                onBackspace: latestOnBackspace,
                onPass: latestOnPass,
                onEscape: latestOnEscape,
                isCurrentTurn: latestIsCurrentTurn,
                canPass: latestCanPass,
            } = optionsRef.current;

            // Let forms, dialogs, and modified browser shortcuts keep their native behavior.
            const target = e.target instanceof HTMLElement ? e.target : null;
            if (e.altKey || e.ctrlKey || e.metaKey || target?.isContentEditable ||
                target?.closest('input, textarea, select, [role="dialog"], [data-shortcuts-disabled]')) {
                return;
            }

            const key = e.key.toLowerCase();
            if (key === "tab") {
                focusedByPointerRef.current = false;
            }
            if ((key === "enter" || key === " ") && target?.closest('button, a') &&
                !target.closest('.arcade-card-button, [data-game-card]')) {
                // A keyboard user tabbed here and means to press this control.
                if (!focusedByPointerRef.current) return;
                // A mouse click only left focus behind; don't let Enter or Space press it again.
                e.preventDefault();
                target.blur();
            }

            // Handle rank keys (card selection)
            if (KEY_TO_RANK[key]) {
                e.preventDefault();
                const rank = KEY_TO_RANK[key];

                // If not already holding this key, it's a new press
                if (keyboardStateRef.current.currentKey !== rank) {
                    keyboardStateRef.current = {
                        currentKey: rank,
                        isHolding: true,
                    };
                    latestOnRankKey(rank);
                }
            }

            // Handle left/right arrow keys (navigation)
            if (key === "arrowleft" || key === "arrowright") {
                e.preventDefault();
                const direction = key === "arrowleft" ? "left" : "right";

                // Pass the currently held rank (or null if none)
                const heldRank = keyboardStateRef.current.currentKey && KEY_TO_RANK[keyboardStateRef.current.currentKey.toLowerCase()]
                    ? keyboardStateRef.current.currentKey
                    : null;

                // If not already holding this arrow key, start repeat
                if (heldArrowKeyRef.current !== direction) {
                    heldArrowKeyRef.current = direction;
                    heldRankKeyRef.current = heldRank;

                    // Immediate first move
                    latestOnArrowKey(direction, heldRank);

                    // Clear any existing timers
                    if (arrowRepeatIntervalRef.current) {
                        clearInterval(arrowRepeatIntervalRef.current);
                        arrowRepeatIntervalRef.current = null;
                    }
                    if (arrowRepeatTimeoutRef.current) {
                        clearTimeout(arrowRepeatTimeoutRef.current);
                        arrowRepeatTimeoutRef.current = null;
                    }

                    // Start repeating after short delay
                    arrowRepeatTimeoutRef.current = setTimeout(() => {
                        if (heldArrowKeyRef.current === direction) {
                            arrowRepeatIntervalRef.current = setInterval(() => {
                                if (heldArrowKeyRef.current === direction) {
                                    optionsRef.current.onArrowKey(direction, heldRankKeyRef.current);
                                }
                            }, ARROW_KEY_REPEAT_INTERVAL);
                        }
                    }, ARROW_KEY_INITIAL_DELAY);
                }
            }

            // Handle up arrow (select focused card)
            if (key === "arrowup") {
                e.preventDefault();
                latestOnUpArrow();
            }

            // Handle down arrow (deselect focused card)
            if (key === "arrowdown") {
                e.preventDefault();
                latestOnDownArrow();
            }

            // Handle Spacebar (select/deselect focused card)
            if (key === " ") {
                e.preventDefault();
                latestOnSpacebar();
            }

            // Handle Enter (play cards)
            if (key === "enter" && latestIsCurrentTurn) {
                e.preventDefault();
                latestOnEnter();
            }

            // Handle Backspace (clear selection)
            if (key === "backspace") {
                e.preventDefault();
                latestOnBackspace();
            }

            // Handle P key (pass)
            if (key === "p" && latestIsCurrentTurn && latestCanPass) {
                e.preventDefault();
                latestOnPass();
            }

            // Handle Escape (clear focus)
            if (key === "escape") {
                e.preventDefault();
                latestOnEscape();
            }
        };

        const handleKeyUp = (e: KeyboardEvent) => {
            const key = e.key.toLowerCase();

            // Release rank key
            if (KEY_TO_RANK[key] && keyboardStateRef.current.currentKey === KEY_TO_RANK[key]) {
                keyboardStateRef.current = {
                    currentKey: null,
                    isHolding: false,
                };
            }

            // Stop arrow key repeat
            if (key === "arrowleft" || key === "arrowright") {
                const direction = key === "arrowleft" ? "left" : "right";
                if (heldArrowKeyRef.current === direction) {
                    heldArrowKeyRef.current = null;
                    heldRankKeyRef.current = null;
                    if (arrowRepeatIntervalRef.current) {
                        clearInterval(arrowRepeatIntervalRef.current);
                        arrowRepeatIntervalRef.current = null;
                    }
                    if (arrowRepeatTimeoutRef.current) {
                        clearTimeout(arrowRepeatTimeoutRef.current);
                        arrowRepeatTimeoutRef.current = null;
                    }
                }
            }
        };

        const handlePointerDown = () => {
            focusedByPointerRef.current = true;
        };

        const resetHeldKeys = () => {
            keyboardStateRef.current = { currentKey: null, isHolding: false };
            heldArrowKeyRef.current = null;
            heldRankKeyRef.current = null;
            if (arrowRepeatIntervalRef.current) clearInterval(arrowRepeatIntervalRef.current);
            if (arrowRepeatTimeoutRef.current) clearTimeout(arrowRepeatTimeoutRef.current);
            arrowRepeatIntervalRef.current = null;
            arrowRepeatTimeoutRef.current = null;
        };

        window.addEventListener("keydown", handleKeyDown);
        window.addEventListener("keyup", handleKeyUp);
        window.addEventListener("blur", resetHeldKeys);
        window.addEventListener("pointerdown", handlePointerDown, true);

        return () => {
            window.removeEventListener("pointerdown", handlePointerDown, true);
            window.removeEventListener("keydown", handleKeyDown);
            window.removeEventListener("keyup", handleKeyUp);
            window.removeEventListener("blur", resetHeldKeys);
            resetHeldKeys();
        };
    }, [isEnabled, gameWon]);
}
