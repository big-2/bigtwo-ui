import { forwardRef, type HTMLAttributes } from "react";
import { cn } from "../lib/utils";
import { useThemeContext } from "../contexts/ThemeContext";
import { getRankDisplay, getSuitColorClass, getSuitSymbol } from "../utils/cardDisplay";

interface PlayingCardProps extends HTMLAttributes<HTMLDivElement> {
    card: string;
    width?: number;
    height?: number;
    rankClassName?: string;
    suitClassName?: string;
}

const PlayingCard = forwardRef<HTMLDivElement, PlayingCardProps>(({
    card,
    width,
    height,
    className,
    rankClassName,
    suitClassName,
    style,
    children,
    title,
    ...props
}, ref) => {
    const { theme } = useThemeContext();
    const suit = card.slice(-1);
    const rank = card.slice(0, -1);

    return (
        <div
            ref={ref}
            className={cn(
                "flex select-none flex-col items-center justify-center rounded-lg border-2 border-border bg-white font-bold shadow-md dark:border-slate-700 dark:bg-slate-900",
                getSuitColorClass(suit, theme),
                className
            )}
            style={{
                width: width ? `${width}px` : undefined,
                height: height ? `${height}px` : undefined,
                minWidth: width ? `${width}px` : undefined,
                ...style,
            }}
            title={title ?? card}
            {...props}
        >
            <span className={cn("leading-tight", rankClassName)}>{getRankDisplay(rank)}</span>
            <span className={cn("leading-tight", suitClassName)}>{getSuitSymbol(suit)}</span>
            {children}
        </div>
    );
});

PlayingCard.displayName = "PlayingCard";

export default PlayingCard;
