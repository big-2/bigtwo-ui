import React, { useState, useRef } from "react";
import { cn } from "../lib/utils";
import { useThemeContext } from "../contexts/ThemeContext";
import { useIsMobile } from "../hooks/useMediaQuery";

// Card dimension constants for responsive sizing
const CARD_DIMENSIONS = {
  mobile: {
    width: 55,
    height: 77,
    gap: -35, // Negative gap creates overlapping effect to save space
  },
  desktop: {
    width: 90,
    height: 126,
    gap: 12,
  },
} as const;

interface CardProps {
    card: string;
    isSelected: boolean;
    isFocused: boolean;
    onClick: (card: string) => void;
    onDragStart: (card: string, index: number) => void;
    onDragOver: (e: React.DragEvent, index: number) => void;
    onDrop: (targetIndex: number) => void;
    onDragLeave: (e: React.DragEvent) => void;
    index: number;
    isDragging: boolean;
    isDropTarget: boolean;
    selectedCards: string[];
    width: number;
    height: number;
}

const Card: React.FC<CardProps> = ({
    card,
    isSelected,
    isFocused,
    onClick,
    onDragStart,
    onDragOver,
    onDrop,
    onDragLeave,
    index,
    isDragging,
    isDropTarget,
    selectedCards,
    width,
    height
}) => {
    const { theme } = useThemeContext();
    const isDarkMode = theme === "dark";
    const suit = card.slice(-1);
    const rank = card.slice(0, -1);

    const getSuitColor = (suit: string, isDarkMode: boolean) => {
        switch (suit) {
            case 'H':
            case 'D':
                return '#ff6b6b';
            case 'S':
            case 'C':
                return isDarkMode ? '#ffffff' : '#000000';
            default:
                return isDarkMode ? '#ffffff' : '#000000';
        }
    };

    const getSuitSymbol = (suit: string) => {
        switch (suit) {
            case 'H': return '♥';
            case 'D': return '♦';
            case 'S': return '♠';
            case 'C': return '♣';
            default: return suit;
        }
    };

    const handleDragStart = (e: React.DragEvent) => {
        e.dataTransfer.effectAllowed = 'move';

        // If this card is selected, drag all selected cards
        // If not selected, drag just this card
        if (isSelected) {
            e.dataTransfer.setData('text/plain', JSON.stringify(selectedCards));
            e.dataTransfer.setData('dragType', 'batch');
        } else {
            e.dataTransfer.setData('text/plain', card);
            e.dataTransfer.setData('dragType', 'single');
        }

        onDragStart(card, index);
    };

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault();
        onDrop(index);
    };

    const handleDragOver = (e: React.DragEvent) => {
        e.preventDefault();
        onDragOver(e, index);
    };

    const handleDragLeave = (e: React.DragEvent) => {
        onDragLeave(e);
    };

    // Responsive font sizes based on card height
    const rankFontSize = height < 90 ? 'text-sm' : 'text-lg';
    const suitFontSize = height < 90 ? 'text-xl' : 'text-3xl';

    return (
        <div
            className={cn(
                "relative flex cursor-pointer select-none flex-col items-center justify-center rounded-lg border-2 bg-white transition-all duration-200 dark:bg-slate-900",
                isSelected ? "-translate-y-4 border-primary shadow-lg" : "border-slate-200 dark:border-slate-700",
                isFocused && "ring-[3px] ring-amber-500 ring-offset-2 dark:ring-amber-400",
                isDragging && "opacity-80",
                isDropTarget && "ring-2 ring-offset-2 ring-primary/60"
            )}
            style={{
                width: `${width}px`,
                height: `${height}px`,
                minWidth: `${width}px`,
                zIndex: isSelected ? 100 : 10 + index
            }}
            onClick={() => onClick(card)}
            onDragStart={handleDragStart}
            onDragOver={handleDragOver}
            onDrop={handleDrop}
            onDragLeave={handleDragLeave}
            draggable
            data-suit={suit}
            data-batch-count={isSelected && isDragging ? selectedCards.length : undefined}
            title={card}
        >
            <span
                className={cn(rankFontSize, "font-bold")}
                style={{ color: getSuitColor(suit, isDarkMode) }}
            >
                {rank}
            </span>
            <span
                className={suitFontSize}
                style={{ color: getSuitColor(suit, isDarkMode) }}
            >
                {getSuitSymbol(suit)}
            </span>
            {isDropTarget && <div className="absolute inset-x-0 bottom-0 h-1 rounded-b bg-primary" />}
            {isSelected && isDragging && selectedCards.length > 1 && (
                <div className="absolute -top-2 -right-2 flex h-7 w-7 items-center justify-center rounded-full bg-primary text-xs font-semibold text-primary-foreground shadow">
                    {selectedCards.length}
                </div>
            )}
        </div>
    );
};

interface PlayerHandProps {
    cards: string[];
    selectedCards: string[];
    focusedCardIndex?: number | null;
    onCardClick: (card: string) => void;
    onCardsReorder: (newOrder: string[]) => void;
}

const PlayerHand: React.FC<PlayerHandProps> = ({
    cards,
    selectedCards,
    focusedCardIndex = null,
    onCardClick,
    onCardsReorder
}) => {
    const [draggedCards, setDraggedCards] = useState<string[]>([]);
    const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
    const [dropTargetIndex, setDropTargetIndex] = useState<number | null>(null);
    const [isDragBatch, setIsDragBatch] = useState<boolean>(false);
    const handRef = useRef<HTMLDivElement>(null);

    // Use media query hook for mobile detection (aligns with Tailwind's md breakpoint)
    const isMobile = useIsMobile();

    // Debounce timer for drag leave
    const dragLeaveTimerRef = useRef<number | null>(null);

    // Responsive card dimensions based on screen size
    const cardDimensions = isMobile ? CARD_DIMENSIONS.mobile : CARD_DIMENSIONS.desktop;

    const handleDragStart = (card: string, index: number) => {
        setDraggedIndex(index);

        if (selectedCards.includes(card)) {
            // Dragging selected cards as a batch
            setDraggedCards(selectedCards);
            setIsDragBatch(true);
        } else {
            // Dragging single card
            setDraggedCards([card]);
            setIsDragBatch(false);
        }
    };

    const handleDragOver = (e: React.DragEvent, targetIndex: number) => {
        e.preventDefault();

        // Clear any pending drag leave timer
        if (dragLeaveTimerRef.current !== null) {
            window.clearTimeout(dragLeaveTimerRef.current);
            dragLeaveTimerRef.current = null;
        }

        // Set the drop target index
        setDropTargetIndex(targetIndex);
    };

    const handleDragLeave = (e: React.DragEvent) => {
        // Only process drag leave if it's leaving to an element outside our cards
        if (e.currentTarget.contains(e.relatedTarget as Node)) {
            return;
        }

        // Use a debounced timer to prevent flickering
        if (dragLeaveTimerRef.current !== null) {
            window.clearTimeout(dragLeaveTimerRef.current);
        }

        dragLeaveTimerRef.current = window.setTimeout(() => {
            setDropTargetIndex(null);
            dragLeaveTimerRef.current = null;
        }, 50);
    };

    // Handle drag over the entire hand area for rightmost position
    const handleHandDragOver = (e: React.DragEvent) => {
        e.preventDefault();

        // If we're dragging over the hand area but not a specific card,
        // and we're near the right edge, set drop target to after the last card
        const handRect = handRef.current?.getBoundingClientRect();
        if (handRect) {
            const mouseX = e.clientX;
            const handRightEdge = handRect.right - 30; // Give some margin

            if (mouseX > handRightEdge) {
                // Clear any pending drag leave timer
                if (dragLeaveTimerRef.current !== null) {
                    window.clearTimeout(dragLeaveTimerRef.current);
                    dragLeaveTimerRef.current = null;
                }

                // Set drop target to after the last card
                setDropTargetIndex(cards.length);
            }
        }
    };

    // Handle drop on the hand area (for rightmost position)
    const handleHandDrop = (e: React.DragEvent) => {
        e.preventDefault();

        // If we're dropping on the hand area but not a specific card,
        // and we're near the right edge, drop after the last card
        const handRect = handRef.current?.getBoundingClientRect();
        if (handRect) {
            const mouseX = e.clientX;
            const handRightEdge = handRect.right - 30; // Give some margin

            if (mouseX > handRightEdge) {
                handleDrop(cards.length);
            }
        }
    };

    const handleDrop = (targetIndex: number) => {
        if (draggedCards.length === 0 || draggedIndex === null) return;

        const newCards = [...cards];

        if (isDragBatch) {
            // Handle batch drop
            const draggedIndices: number[] = [];

            // Find indices of all dragged cards
            draggedCards.forEach(draggedCard => {
                const cardIndex = newCards.indexOf(draggedCard);
                if (cardIndex !== -1) {
                    draggedIndices.push(cardIndex);
                }
            });

            // Sort indices in descending order to remove from back to front
            draggedIndices.sort((a, b) => b - a);

            // Remove dragged cards
            draggedIndices.forEach(index => {
                newCards.splice(index, 1);
            });

            // Calculate insertion point (adjust for removed cards)
            let insertIndex = targetIndex;
            draggedIndices.forEach(removedIndex => {
                if (removedIndex < targetIndex) {
                    insertIndex--;
                }
            });

            // Insert dragged cards at the target position
            newCards.splice(insertIndex, 0, ...draggedCards);

        } else {
            // Handle single card drop (existing logic)
            if (draggedIndex !== targetIndex) {
                newCards.splice(draggedIndex, 1);
                const insertIndex = targetIndex > draggedIndex ? targetIndex - 1 : targetIndex;
                newCards.splice(insertIndex, 0, draggedCards[0]);
            }
        }

        onCardsReorder(newCards);

        // Reset drag state
        setDraggedCards([]);
        setDraggedIndex(null);
        setDropTargetIndex(null);
        setIsDragBatch(false);
    };

    return (
        <div
            ref={handRef}
            className={cn(
                "flex w-full flex-nowrap overflow-x-auto rounded-xl border border-slate-200/60 bg-white/50 p-3 backdrop-blur dark:border-slate-700/60 dark:bg-slate-900/40",
                isMobile ? "justify-start" : "justify-center"
            )}
            style={{
                gap: `${cardDimensions.gap}px`,
                // On mobile with overlapping, need padding to prevent cut-off
                paddingLeft: isMobile ? '20px' : undefined,
                paddingRight: isMobile ? '20px' : undefined,
                // Maintain minimum height to prevent layout shift when cards are removed
                minHeight: `${cardDimensions.height + 24}px` // card height + padding (3 * 2 = 6, but in rem units ~24px)
            }}
            onDragOver={handleHandDragOver}
            onDrop={handleHandDrop}
        >
            {cards.map((card, index) => {
                const isSelected = selectedCards.includes(card);
                const isFocused = focusedCardIndex === index;
                const isDragging = draggedCards.includes(card);
                const isDropTarget = dropTargetIndex === index;

                return (
                    <Card
                        key={card}
                        card={card}
                        isSelected={isSelected}
                        isFocused={isFocused}
                        onClick={onCardClick}
                        onDragStart={handleDragStart}
                        onDragOver={handleDragOver}
                        onDrop={handleDrop}
                        onDragLeave={handleDragLeave}
                        index={index}
                        isDragging={isDragging}
                        isDropTarget={isDropTarget}
                        selectedCards={selectedCards}
                        width={cardDimensions.width}
                        height={cardDimensions.height}
                    />
                );
            })}

            {dropTargetIndex === cards.length && (
                <div
                    className="flex items-center justify-center rounded-lg border-2 border-dashed border-primary/60 bg-primary/10 text-sm font-semibold text-primary"
                    style={{
                        width: `${cardDimensions.width}px`,
                        height: `${cardDimensions.height}px`,
                        minWidth: `${cardDimensions.width}px`
                    }}
                >
                    Drop here
                </div>
            )}
        </div>
    );
};

export default PlayerHand;
