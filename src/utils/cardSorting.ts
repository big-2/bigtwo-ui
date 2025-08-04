// Card sorting utilities for Big Two game
// Big Two ranking: 3 < 4 < 5 < 6 < 7 < 8 < 9 < 10 < J < Q < K < A < 2
// Suit ranking: ♣ < ♦ < ♥ < ♠ (Clubs < Diamonds < Hearts < Spades)

export type SortType = 'numerical' | 'suit';

// Map card ranks to their numerical values for comparison
const RANK_VALUES: Record<string, number> = {
    '3': 1,
    '4': 2,
    '5': 3,
    '6': 4,
    '7': 5,
    '8': 6,
    '9': 7,
    '10': 8,
    'T': 8,  // Backend represents 10 as 'T'
    'J': 9,
    'Q': 10,
    'K': 11,
    'A': 12,
    '2': 13
};

// Map suits to their values for comparison
const SUIT_VALUES: Record<string, number> = {
    'C': 1, // Clubs
    'D': 2, // Diamonds
    'H': 3, // Hearts
    'S': 4  // Spades
};

// Parse a card string into rank and suit
function parseCard(card: string): { rank: string; suit: string } {
    // Special case for "10" which is two characters
    if (card.length === 3 && card.startsWith('10')) {
        return { rank: '10', suit: card.charAt(2) };
    }

    // For all other cards (one character rank)
    return {
        rank: card.slice(0, -1),
        suit: card.slice(-1)
    };
}

// Get numerical value of a card rank
function getRankValue(rank: string): number {
    return RANK_VALUES[rank] || 0;
}

// Get numerical value of a suit
function getSuitValue(suit: string): number {
    return SUIT_VALUES[suit] || 0;
}

// Sort cards numerically (3 smallest, 2 biggest)
export function sortCardsByRank(cards: string[]): string[] {
    return [...cards].sort((a, b) => {
        const cardA = parseCard(a);
        const cardB = parseCard(b);

        const rankValueA = getRankValue(cardA.rank);
        const rankValueB = getRankValue(cardB.rank);

        // First compare by rank
        if (rankValueA !== rankValueB) {
            return rankValueA - rankValueB;
        }

        // If ranks are equal, compare by suit
        return getSuitValue(cardA.suit) - getSuitValue(cardB.suit);
    });
}

// Sort cards by suit first, then by rank within each suit
export function sortCardsBySuit(cards: string[]): string[] {
    return [...cards].sort((a, b) => {
        const cardA = parseCard(a);
        const cardB = parseCard(b);

        const suitValueA = getSuitValue(cardA.suit);
        const suitValueB = getSuitValue(cardB.suit);

        // First compare by suit
        if (suitValueA !== suitValueB) {
            return suitValueA - suitValueB;
        }

        // If suits are equal, compare by rank
        return getRankValue(cardA.rank) - getRankValue(cardB.rank);
    });
}

// Main sorting function
export function sortCards(cards: string[], sortType: SortType): string[] {
    switch (sortType) {
        case 'numerical':
            return sortCardsByRank(cards);
        case 'suit':
            return sortCardsBySuit(cards);
        default:
            return cards;
    }
}

// Sort selected cards within the full hand, maintaining positions of unselected cards
export function sortSelectedCards(
    allCards: string[],
    selectedCards: string[],
    sortType: SortType
): string[] {
    if (selectedCards.length === 0) {
        return sortCards(allCards, sortType);
    }

    // Sort only the selected cards
    const sortedSelected = sortCards(selectedCards, sortType);

    // Reconstruct the hand with sorted selected cards in their original positions
    const result = [...allCards];
    const selectedIndices: number[] = [];

    // Find indices of selected cards
    result.forEach((card, index) => {
        if (selectedCards.includes(card)) {
            selectedIndices.push(index);
        }
    });

    // Replace selected cards with sorted versions
    selectedIndices.forEach((index, i) => {
        result[index] = sortedSelected[i];
    });

    return result;
} 