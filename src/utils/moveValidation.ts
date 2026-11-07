import { canBeat, classifyHand } from "../arcade/engine";

// Room cards write ten as "T"; the shared hand rules use "10".
const toEngineCard = (card: string) => card.replace(/^T/, "10");

const HAND_SIZE_NAMES: Record<number, string> = {
    1: "a single card",
    2: "a pair",
    3: "three of a kind",
    5: "a five-card hand",
};

const HIGHER_HAND_NAMES: Record<number, string> = {
    1: "card",
    2: "pair",
    3: "three of a kind",
    5: "five-card hand",
};

const FIRST_PLAY_CARD = "3D";

/**
 * Explains why a selection cannot be played, or returns null when it looks legal.
 * The server still has the final say.
 */
export function getMoveError(selectedCards: string[], tableCards: string[], isOpeningPlay: boolean): string | null {
    const cards = selectedCards.map(toEngineCard);
    const hand = classifyHand(cards);

    if (!hand) {
        if (cards.length === 2 || cards.length === 3) {
            return "Pairs and triples need matching ranks.";
        }
        if (cards.length === 5) {
            return "Those 5 cards don't make a valid hand.";
        }
        return "Play 1, 2, 3 or 5 cards.";
    }

    if (isOpeningPlay && !selectedCards.includes(FIRST_PLAY_CARD)) {
        return "The first play must include the 3♦.";
    }

    const table = tableCards.map(toEngineCard);
    const tableHand = classifyHand(table);
    if (!tableHand) {
        return null;
    }

    if (hand.size !== tableHand.size) {
        return `The table needs ${HAND_SIZE_NAMES[tableHand.size]}.`;
    }

    if (!canBeat(cards, table)) {
        return `Not high enough. Play a higher ${HIGHER_HAND_NAMES[tableHand.size]}.`;
    }

    return null;
}
