/**
 * Utility functions for displaying playing cards
 */

/**
 * Get the color class for a card suit based on the current theme
 * @param suit - The suit character (H, D, S, C)
 * @param theme - The current theme ('dark' or 'light')
 * @returns Tailwind CSS class for the suit color
 */
export const getSuitColorClass = (suit: string, theme: string): string => {
    switch (suit) {
        case "H":
        case "D":
            return "text-destructive";
        case "S":
        case "C":
            return theme === "dark" ? "text-white" : "text-black";
        default:
            return theme === "dark" ? "text-white" : "text-black";
    }
};

/**
 * Get the Unicode symbol for a card suit
 * @param suit - The suit character (H, D, S, C)
 * @returns Unicode symbol for the suit
 */
export const getSuitSymbol = (suit: string): string => {
    switch (suit) {
        case "H":
            return "♥";
        case "D":
            return "♦";
        case "S":
            return "♠";
        case "C":
            return "♣";
        default:
            return suit;
    }
};

