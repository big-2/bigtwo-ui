import { forwardRef, type ReactNode, type Ref } from "react";
import PlayingCard from "./PlayingCard";
import "../styles/game-board.css";

interface GameBoardProps {
    mode: "classic" | "arcade";
    title?: string;
    subtitle?: string;
    status?: ReactNode;
    headerActions?: ReactNode;
    metrics?: ReactNode;
    opponents: ReactNode;
    table: ReactNode;
    intel?: ReactNode;
    hand: ReactNode;
    handCount: number;
    handName?: string;
    handStatus?: ReactNode;
    handTools?: ReactNode;
    actions: ReactNode;
    feedback?: ReactNode;
    extras?: ReactNode;
    feed?: ReactNode;
}

/** Both game controllers supply content to the same board and extension areas. */
export function GameBoard({ mode, title, subtitle, status, headerActions, metrics, opponents, table, intel, hand, handCount, handName = "Your hand", handStatus, handTools, actions, feedback, extras, feed }: GameBoardProps) {
    return <div className={`game-board-shell game-board-${mode}`}>
        <div className="game-board">
            <header className="game-board-header">
                <div className="game-board-brand"><span aria-hidden="true">♠</span><div><b>BIG TWO</b><small>{title ?? (mode === "arcade" ? "ARCADE" : "CLASSIC")}</small></div></div>
                {subtitle && <p className="game-board-subtitle">{subtitle}</p>}
                <div className="game-board-header-tools"><span className="game-board-status">{status}</span>{headerActions}</div>
            </header>
            {metrics && <section className="game-board-metrics" aria-label="Run status">{metrics}</section>}
            <div className={`game-board-layout ${extras ? "has-extras" : ""}`}>
                <div className="game-board-core">
                    <section className="game-board-opponents" aria-label="Opponents">{opponents}</section>
                    {table}
                    {intel && <section className="game-board-intel" aria-label="Revealed cards">{intel}</section>}
                    <section className="game-board-hand" aria-label="Your hand">
                        <div className="game-board-hand-heading"><div><b>{handName}</b><span>{handCount} cards</span></div><span className="game-board-hand-status">{handStatus}</span><div className="game-inline-tools">{handTools}</div></div>
                        {hand}
                        {actions}
                        {feedback && <div className="game-board-feedback" aria-live="polite">{feedback}</div>}
                    </section>
                    {feed && <section className="game-board-feed" aria-label="Table activity">{feed}</section>}
                </div>
                {extras && <aside className="game-board-extras" aria-label="Arcade extras">{extras}</aside>}
            </div>
        </div>
    </div>;
}

interface GameOpponentProps {
    name: string;
    cardCount: number;
    isActive?: boolean;
    isRevealed?: boolean;
    kind?: string;
    hasPassed?: boolean;
    lastCards?: string[];
    lastCardsHidden?: boolean;
}

export const GameOpponent = forwardRef<HTMLDivElement, GameOpponentProps>(({ name, cardCount, isActive, isRevealed, kind, hasPassed, lastCards, lastCardsHidden }, ref) => (
    <div ref={ref} className={`game-opponent ${isActive ? "is-active" : ""} ${isRevealed ? "is-revealed" : ""}`} aria-label={`${name}, ${cardCount} cards${isActive ? ", current turn" : ""}`}>
        <div className="game-opponent-heading"><span className="game-opponent-avatar" aria-hidden="true">{name.slice(0, 1).toUpperCase()}</span><div className="game-opponent-name"><b title={name}>{name}</b><small>{isRevealed ? "RADAR LOCKED" : kind ?? "PLAYER"}</small></div><span className="game-opponent-count">{cardCount}</span></div>
        <div className="game-opponent-play">
            {hasPassed ? <span className="game-opponent-pass">PASS</span> : lastCards?.length ? <div className={lastCardsHidden ? "game-cards-hidden" : ""}>{lastCards.map(card => <PlayingCard key={card} card={card} width={24} height={34} rankClassName="text-[9px]" suitClassName="text-xs" />)}</div> : <span className="game-opponent-wait">{isActive ? "PLAYING…" : "READY"}</span>}
        </div>
    </div>
));
GameOpponent.displayName = "GameOpponent";

interface GameTableProps {
    turnLabel: string;
    isCurrentTurn?: boolean;
    cards?: string[];
    playedBy?: ReactNode;
    handLabel?: ReactNode;
    emptyTitle?: string;
    emptyHint?: string;
    note?: ReactNode;
    cardsHidden?: boolean;
    tableRef?: Ref<HTMLDivElement>;
    cardLaneRef?: Ref<HTMLDivElement>;
    children?: ReactNode;
    status?: ReactNode;
}

export function GameTable({ turnLabel, isCurrentTurn, cards = [], playedBy, handLabel, emptyTitle = "Open table", emptyHint = "Lead any legal combination", note, cardsHidden, tableRef, cardLaneRef, children, status }: GameTableProps) {
    return <section className="game-table" aria-label="Game table">
        <div className="game-table-heading"><span className={`game-turn ${isCurrentTurn ? "is-yours" : ""}`}>{turnLabel}</span>{status && <div className="game-table-status">{status}</div>}</div>
        <div className="game-table-felt" ref={tableRef}>
            <span className="game-table-stamp" aria-hidden="true">BIG TWO · THE TABLE</span>
            <div className="game-table-play" ref={cardLaneRef}>
                {children ?? (cards.length ? <><div className={`game-table-cards ${cardsHidden ? "game-cards-hidden" : ""}`}>{cards.map(card => <PlayingCard key={card} card={card} className="game-table-card" width={52} height={74} rankClassName="text-base" suitClassName="text-2xl" />)}</div><div className="game-table-caption"><b>{playedBy}</b>{handLabel && <span>{handLabel}</span>}</div></> : <div className="game-table-empty"><span aria-hidden="true">✦</span><b>{emptyTitle}</b><small>{emptyHint}</small></div>)}
            </div>
            {note && <div className="game-table-note">{note}</div>}
        </div>
    </section>;
}

interface GameActionsProps {
    selectedCount: number;
    onPlay: () => void;
    onClear: () => void;
    onPass: () => void;
    isPlayDisabled: boolean;
    isClearDisabled: boolean;
    isPassDisabled: boolean;
    passTitle?: string;
}

export function GameActions({ selectedCount, onPlay, onClear, onPass, isPlayDisabled, isClearDisabled, isPassDisabled, passTitle }: GameActionsProps) {
    return <div className="game-actions">
        <button type="button" className="game-action game-action-primary" onClick={onPlay} disabled={isPlayDisabled}>Play{selectedCount > 0 && ` (${selectedCount})`}<kbd aria-hidden="true">Enter</kbd></button>
        <button type="button" className="game-action" onClick={onClear} disabled={isClearDisabled}>Clear<kbd aria-hidden="true">⌫</kbd></button>
        <button type="button" className="game-action" onClick={onPass} disabled={isPassDisabled} title={passTitle}>Pass<kbd aria-hidden="true">P</kbd></button>
    </div>;
}
