import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import CardFlightOverlay from "../components/CardFlightOverlay";

interface CardFlightRect {
    left: number;
    top: number;
    width: number;
    height: number;
}

export interface CardFlightItem {
    id: string;
    flightId: string;
    card: string;
    from: CardFlightRect;
    to: CardFlightRect;
    delay: number;
    duration: number;
    rotateFrom: number;
    rotateTo: number;
}

interface CardFlightRequest {
    cards: string[];
    sourceRects: CardFlightRect[];
    targetRect: CardFlightRect;
    sourceKind: "self" | "opponent";
}

interface UseCardFlightLayerOptions {
    enabled: boolean;
    speedMultiplier: number;
}

interface FlightCompletion {
    remaining: number;
    resolve: (animated: boolean) => void;
}

export const rectFromElement = (element: Element): CardFlightRect => {
    const rect = element.getBoundingClientRect();
    return {
        left: rect.left,
        top: rect.top,
        width: rect.width,
        height: rect.height,
    };
};

const hasUsableRect = (rect: CardFlightRect | undefined): rect is CardFlightRect => (
    Boolean(rect && rect.width > 0 && rect.height > 0)
);

const getTargetCardSize = (targetRect: CardFlightRect, cardCount: number): { width: number; height: number; advance: number } => {
    const viewportWidth = window.innerWidth;
    const baseWidth = viewportWidth < 768 ? 44 : 52;
    const width = Math.min(baseWidth, Math.max(34, targetRect.width / Math.max(cardCount * 0.82, 1.8)));
    return {
        width,
        height: width * 1.4,
        advance: width * 0.72,
    };
};

const getTargetRects = (cards: string[], targetRect: CardFlightRect): CardFlightRect[] => {
    const { width, height, advance } = getTargetCardSize(targetRect, cards.length);
    const totalWidth = width + Math.max(cards.length - 1, 0) * advance;
    const startLeft = targetRect.left + (targetRect.width - totalWidth) / 2;
    const top = targetRect.top + (targetRect.height - height) / 2;

    return cards.map((_, index) => ({
        left: startLeft + index * advance,
        top,
        width,
        height,
    }));
};

const getOpponentSourceRect = (
    sourceRect: CardFlightRect,
    targetRect: CardFlightRect,
    index: number,
    cardCount: number
): CardFlightRect => {
    const sourceWidth = Math.min(targetRect.width * 0.12, 34);
    const width = Math.max(24, sourceWidth);
    const height = width * 1.4;
    const centerOffset = index - (cardCount - 1) / 2;

    return {
        left: sourceRect.left + sourceRect.width / 2 - width / 2 + centerOffset * 3,
        top: sourceRect.top + sourceRect.height / 2 - height / 2,
        width,
        height,
    };
};

const usePrefersReducedMotion = (): boolean => {
    const [prefersReducedMotion, setPrefersReducedMotion] = useState(() => (
        window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ?? false
    ));

    useEffect(() => {
        const query = window.matchMedia?.("(prefers-reduced-motion: reduce)");
        if (!query) {
            return;
        }

        const handleChange = () => setPrefersReducedMotion(query.matches);
        query.addEventListener("change", handleChange);
        return () => query.removeEventListener("change", handleChange);
    }, []);

    return prefersReducedMotion;
};

let nextFlightId = 1;
const BASE_CARD_FLIGHT_DURATION_MS = 460;
const CARD_FLIGHT_STAGGER_MS = 34;
const CARD_FLIGHT_PER_CARD_DURATION_MS = 18;

export const getFullCardFlightAnimationDurationMs = (speedMultiplier: number, cardCount = 5) => {
    const durationScale = Math.min(2, Math.max(0.55, speedMultiplier));
    const lastCardIndex = Math.max(0, cardCount - 1);
    const cappedDurationIndex = Math.min(lastCardIndex, 4);

    return Math.round(
        (lastCardIndex * CARD_FLIGHT_STAGGER_MS + BASE_CARD_FLIGHT_DURATION_MS + cappedDurationIndex * CARD_FLIGHT_PER_CARD_DURATION_MS) *
        durationScale
    );
};

export const useCardFlightLayer = ({ enabled, speedMultiplier }: UseCardFlightLayerOptions) => {
    const [items, setItems] = useState<CardFlightItem[]>([]);
    const completions = useRef(new Map<string, FlightCompletion>());
    const prefersReducedMotion = usePrefersReducedMotion();
    const canAnimateCardFlights = enabled && !prefersReducedMotion;

    const handleItemDone = useCallback((item: CardFlightItem) => {
        setItems(prevItems => prevItems.filter(prevItem => prevItem.id !== item.id));

        const completion = completions.current.get(item.flightId);
        if (!completion) {
            return;
        }

        completion.remaining -= 1;
        if (completion.remaining <= 0) {
            completions.current.delete(item.flightId);
            requestAnimationFrame(() => {
                requestAnimationFrame(() => completion.resolve(true));
            });
        }
    }, []);

    const overlay = useMemo(() => (
        <CardFlightOverlay items={items} onItemDone={handleItemDone} />
    ), [handleItemDone, items]);

    const queueCardFlight = useCallback((request: CardFlightRequest): Promise<boolean> => {
        if (
            !canAnimateCardFlights ||
            request.cards.length === 0 ||
            !hasUsableRect(request.targetRect) ||
            request.sourceRects.every(sourceRect => !hasUsableRect(sourceRect))
        ) {
            return Promise.resolve(false);
        }

        const flightId = `card-flight-${nextFlightId++}`;
        const durationScale = Math.min(2, Math.max(0.55, speedMultiplier));
        const targetRects = getTargetRects(request.cards, request.targetRect);
        const flightItems = request.cards.map((card, index) => {
            const fallbackSource = request.sourceRects.find(hasUsableRect) ?? request.targetRect;
            const sourceRect = request.sourceRects[index] ?? fallbackSource;
            const from = request.sourceKind === "opponent"
                ? getOpponentSourceRect(sourceRect, targetRects[index], index, request.cards.length)
                : sourceRect;
            const centerOffset = index - (request.cards.length - 1) / 2;

            return {
                id: `${flightId}-${index}`,
                flightId,
                card,
                from,
                to: targetRects[index],
                delay: Math.round(index * CARD_FLIGHT_STAGGER_MS * durationScale),
                duration: Math.round((BASE_CARD_FLIGHT_DURATION_MS + Math.min(index, 4) * CARD_FLIGHT_PER_CARD_DURATION_MS) * durationScale),
                rotateFrom: request.sourceKind === "opponent" ? centerOffset * 6 : centerOffset * 2,
                rotateTo: centerOffset * 2.4,
            };
        });

        return new Promise<boolean>((resolve) => {
            completions.current.set(flightId, {
                remaining: flightItems.length,
                resolve,
            });
            setItems(prevItems => [...prevItems, ...flightItems]);
        });
    }, [canAnimateCardFlights, speedMultiplier]);

    return {
        canAnimateCardFlights,
        overlay,
        queueCardFlight,
    };
};
