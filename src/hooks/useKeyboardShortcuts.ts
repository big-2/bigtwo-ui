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
    isEnabled: boolean; // Only enable on desktop
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

            // Ignore if typing in an input field
            if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
                return;
            }

            const key = e.key.toLowerCase();

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
                                    latestOnArrowKey(direction, heldRankKeyRef.current);
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

        window.addEventListener("keydown", handleKeyDown);
        window.addEventListener("keyup", handleKeyUp);

        return () => {
            window.removeEventListener("keydown", handleKeyDown);
            window.removeEventListener("keyup", handleKeyUp);
            // Cleanup arrow repeat timers
            if (arrowRepeatIntervalRef.current) {
                clearInterval(arrowRepeatIntervalRef.current);
            }
            if (arrowRepeatTimeoutRef.current) {
                clearTimeout(arrowRepeatTimeoutRef.current);
            }
        };
    }, [isEnabled, gameWon]);
}
