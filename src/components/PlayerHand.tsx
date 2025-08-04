import React, { useState, useRef } from "react";

interface CardProps {
    card: string;
    isSelected: boolean;
    onClick: (card: string) => void;
    onDragStart: (card: string, index: number) => void;
    onDragOver: (e: React.DragEvent, index: number) => void;
    onDrop: (targetIndex: number) => void;
    onDragLeave: (e: React.DragEvent) => void;
    index: number;
    isDragging: boolean;
    isDropTarget: boolean;
    selectedCards: string[];
}

const Card: React.FC<CardProps> = ({
    card,
    isSelected,
    onClick,
    onDragStart,
    onDragOver,
    onDrop,
    onDragLeave,
    index,
    isDragging,
    isDropTarget,
    selectedCards
}) => {
    const suit = card.slice(-1);
    const rank = card.slice(0, -1);

    const getSuitColor = (suit: string) => {
        switch (suit) {
            case 'H':
            case 'D':
                return '#ff6b6b';
            case 'S':
            case 'C':
                return '#000000';
            default:
                return '#000000';
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

    return (
        <div
            className={`card ${isSelected ? 'selected' : ''} ${isDragging ? 'dragging' : ''} ${isDropTarget ? 'drop-target' : ''}`}
            onClick={() => onClick(card)}
            onDragStart={handleDragStart}
            onDragOver={handleDragOver}
            onDrop={handleDrop}
            onDragLeave={handleDragLeave}
            draggable
            data-suit={suit}
            data-batch-count={isSelected && isDragging ? selectedCards.length : undefined}
            title={card}
            style={{ color: getSuitColor(suit) }}
        >
            <div className="card-content">
                <div className="card-rank">{rank}</div>
                <div className="card-suit">{getSuitSymbol(suit)}</div>
            </div>
            {isDropTarget && <div className="drop-indicator" />}
            {isSelected && isDragging && selectedCards.length > 1 && (
                <div className="batch-indicator">
                    {selectedCards.length}
                </div>
            )}
        </div>
    );
};

interface PlayerHandProps {
    cards: string[];
    selectedCards: string[];
    onCardClick: (card: string) => void;
    onCardsReorder: (newOrder: string[]) => void;
}

const PlayerHand: React.FC<PlayerHandProps> = ({
    cards,
    selectedCards,
    onCardClick,
    onCardsReorder
}) => {
    const [draggedCards, setDraggedCards] = useState<string[]>([]);
    const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
    const [dropTargetIndex, setDropTargetIndex] = useState<number | null>(null);
    const [isDragBatch, setIsDragBatch] = useState<boolean>(false);
    const handRef = useRef<HTMLDivElement>(null);

    // Debounce timer for drag leave
    const dragLeaveTimerRef = useRef<number | null>(null);

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
            className="player-hand"
            ref={handRef}
            onDragOver={handleHandDragOver}
            onDrop={handleHandDrop}
        >
            {cards.map((card, index) => (
                <Card
                    key={`${card}-${index}`}
                    card={card}
                    isSelected={selectedCards.includes(card)}
                    onClick={onCardClick}
                    onDragStart={handleDragStart}
                    onDragOver={handleDragOver}
                    onDrop={handleDrop}
                    onDragLeave={handleDragLeave}
                    index={index}
                    isDragging={draggedCards.includes(card)}
                    isDropTarget={dropTargetIndex === index}
                    selectedCards={selectedCards}
                />
            ))}
            {/* Add a drop target for the rightmost position */}
            {dropTargetIndex === cards.length && (
                <div className="end-drop-target">
                    <div className="drop-indicator"></div>
                </div>
            )}
        </div>
    );
};

export default PlayerHand;
