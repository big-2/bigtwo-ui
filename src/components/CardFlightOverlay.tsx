import { useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import PlayingCard from "./PlayingCard";
import type { CardFlightItem } from "../hooks/useCardFlightLayer";

interface CardFlightOverlayProps {
    items: CardFlightItem[];
    onItemDone: (item: CardFlightItem) => void;
}

const CardFlightOverlay = ({ items, onItemDone }: CardFlightOverlayProps) => {
    const itemRefs = useRef(new Map<string, HTMLDivElement>());
    const startedItemIds = useRef(new Set<string>());

    useEffect(() => {
        items.forEach((item) => {
            const element = itemRefs.current.get(item.id);
            if (!element || startedItemIds.current.has(item.id)) {
                return;
            }

            startedItemIds.current.add(item.id);
            const fromScaleX = item.from.width / item.to.width;
            const fromScaleY = item.from.height / item.to.height;
            const fromX = item.from.left - item.to.left;
            const fromY = item.from.top - item.to.top;
            const lift = Math.min(72, Math.max(28, Math.abs(fromY) * 0.12));

            const animation = element.animate(
                [
                    {
                        opacity: 0.92,
                        filter: "blur(0.5px)",
                        transform: `translate3d(${fromX}px, ${fromY}px, 0) scale(${fromScaleX}, ${fromScaleY}) rotate(${item.rotateFrom}deg)`,
                    },
                    {
                        opacity: 1,
                        filter: "blur(0px)",
                        transform: `translate3d(${fromX * 0.72}px, ${fromY * 0.72 - lift}px, 0) scale(${fromScaleX * 1.04}, ${fromScaleY * 1.04}) rotate(${item.rotateFrom * 0.55}deg)`,
                        offset: 0.22,
                    },
                    {
                        opacity: 1,
                        filter: "blur(0px)",
                        transform: `translate3d(${fromX * 0.2}px, ${fromY * 0.2 - lift * 0.45}px, 0) scale(1.03) rotate(${item.rotateTo * 0.7}deg)`,
                        offset: 0.72,
                    },
                    {
                        opacity: 1,
                        filter: "blur(0px)",
                        transform: `translate3d(0, 0, 0) scale(1) rotate(${item.rotateTo}deg)`,
                    },
                ],
                {
                    delay: item.delay,
                    duration: item.duration,
                    easing: "cubic-bezier(0.16, 1, 0.3, 1)",
                    fill: "both",
                }
            );

            animation.finished
                .catch(() => undefined)
                .finally(() => {
                    startedItemIds.current.delete(item.id);
                    itemRefs.current.delete(item.id);
                    onItemDone(item);
                });
        });
    }, [items, onItemDone]);

    if (items.length === 0) {
        return null;
    }

    return createPortal(
        <div className="pointer-events-none fixed inset-0 z-[70] overflow-hidden" aria-hidden>
            {items.map((item) => (
                <PlayingCard
                    key={item.id}
                    ref={(element) => {
                        if (element) {
                            itemRefs.current.set(item.id, element);
                        } else {
                            itemRefs.current.delete(item.id);
                        }
                    }}
                    card={item.card}
                    width={item.to.width}
                    height={item.to.height}
                    className="absolute rounded-lg border-white/80 shadow-[0_18px_40px_-18px_rgba(15,23,42,0.55)] will-change-transform dark:border-slate-600/90"
                    rankClassName="text-sm md:text-base"
                    suitClassName="text-2xl md:text-[28px]"
                    style={{
                        left: `${item.to.left}px`,
                        top: `${item.to.top}px`,
                        zIndex: 70,
                    }}
                />
            ))}
        </div>,
        document.body
    );
};

export default CardFlightOverlay;
