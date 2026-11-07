import { useCallback, useEffect, useMemo, useRef, useState, type ButtonHTMLAttributes, type ReactNode } from "react";
import { GameActions, GameBoard, GameOpponent, GameTable } from "./GameBoard";
import PlayerHand from "./PlayerHand";
import PlayingCard from "./PlayingCard";
import {
    classifyHand,
    createRun,
    getPlayError,
    getPowerError,
    powerCost,
    applyAction,
    advanceBot,
    upgradeChoices,
} from "../arcade/engine";
import {
    STAGE_INFO,
    UPGRADE_INFO,
    type ArcadeState,
    type Card,
    type PowerId,
    type UpgradeId,
} from "../arcade/types";
import { clearRun, loadBest, loadRun, recordBest, saveRun } from "../arcade/storage";
import { useKeyboardShortcuts } from "../hooks/useKeyboardShortcuts";
import { sortCards, type SortType } from "../utils/cardSorting";
import "../arcade/arcade.css";

const EMPTY_HAND: Card[] = [];
const normalizeRank = (rank: string) => rank.toUpperCase() === "T" ? "10" : rank.toUpperCase();

function messageForError(error: unknown): string {
    return error instanceof Error ? error.message : "That move could not be made.";
}

function selectedCards(hand: Card[], selected: Set<Card>): Card[] {
    return hand.filter((card) => selected.has(card));
}

function ArcadeButton({
    children,
    className = "",
    ...props
}: ButtonHTMLAttributes<HTMLButtonElement>) {
    return <button className={`arcade-button ${className}`} {...props}>{children}</button>;
}

export default function ArcadePage() {
    const [savedRun, setSavedRun] = useState<ArcadeState | null>(() => loadRun());
    const [run, setRun] = useState<ArcadeState | null>(null);
    const [bestScore, setBestScore] = useState(() => loadBest());
    const [selected, setSelected] = useState<Set<Card>>(() => new Set());
    const [radarChoice, setRadarChoice] = useState(1);
    const [feedback, setFeedback] = useState("");
    const [saveWarning, setSaveWarning] = useState(false);
    const [rulesOpen, setRulesOpen] = useState(false);
    const [focusedCardIndex, setFocusedCardIndex] = useState<number | null>(null);
    const [handSort, setHandSort] = useState<SortType>("numerical");
    const [handOrder, setHandOrder] = useState<string[]>([]);
    const rankCycleIndex = useRef<Record<string, number>>({});
    const botThinking = Boolean(run && run.phase === "playing" && run.turn !== 0);

    const stage = run ? STAGE_INFO[Math.max(0, Math.min(run.stage - 1, STAGE_INFO.length - 1))] : STAGE_INFO[0];
    const isHumanTurn = Boolean(run && run.phase === "playing" && run.turn === 0);
    const hand = run?.players[0]?.hand ?? EMPTY_HAND;
    const orderedHand = useMemo(() => {
        const currentCards = new Set(hand);
        const retainedOrder = handOrder.filter((card) => currentCards.has(card));
        const missingCards = sortCards(hand.filter((card) => !retainedOrder.includes(card)), handSort);
        return [...retainedOrder, ...missingCards];
    }, [hand, handOrder, handSort]);
    const chosen = useMemo(() => selectedCards(hand, selected), [hand, selected]);
    const handSignature = hand.join(",");

    useEffect(() => {
        setHandOrder(sortCards(handSignature ? handSignature.split(",") : [], handSort));
        setSelected(new Set());
        setFocusedCardIndex(null);
        rankCycleIndex.current = {};
    // A changed dealt hand or sort invalidates focus and rank-key cycling.
    }, [handSignature, handSort]);
    const commit = useCallback((action: Parameters<typeof applyAction>[1]) => {
        setFeedback("");
        setSelected(new Set());
        setFocusedCardIndex(null);
        rankCycleIndex.current = {};
        try {
            if (run) setRun(applyAction(run, action));
        } catch (error) {
            setFeedback(messageForError(error));
        }
    }, [run]);

    const newRun = useCallback(() => {
        clearRun();
        setSavedRun(null);
        setSelected(new Set());
        setFocusedCardIndex(null);
        rankCycleIndex.current = {};
        setFeedback("");
        setSaveWarning(false);
        setHandSort("numerical");
        setHandOrder([]);
        setRun(createRun());
    }, []);

    const resumeRun = () => {
        if (!savedRun) return;
        setRun(savedRun);
        setFeedback("");
        setSelected(new Set());
        setHandOrder(sortCards(savedRun.players[0]?.hand ?? EMPTY_HAND, handSort));
        setFocusedCardIndex(null);
        rankCycleIndex.current = {};
    };

    useEffect(() => {
        if (!run) return;
        if (run.phase === "playing" || run.phase === "reward" || run.phase === "defeated") {
            setSaveWarning(!saveRun(run));
        } else {
            clearRun();
            setSaveWarning(false);
        }
        const updatedBest = recordBest(run.score);
        setBestScore((current) => Math.max(current, updatedBest));
    }, [run]);

    useEffect(() => {
        if (!run || run.phase !== "playing" || run.turn === 0) return;
        const timer = window.setTimeout(() => {
            // Ignore stale timers after a restart, navigation, or another action.
            setRun((current) => current === run ? advanceBot(current) : current);
        }, 680);
        return () => window.clearTimeout(timer);
    }, [run]);

    const playSelected = useCallback(() => {
        if (!run || !isHumanTurn || !chosen.length) return;
        const issue = getPlayError(run, chosen);
        if (issue) {
            setFeedback(issue);
            return;
        }
        commit({ type: "play", cards: chosen });
    }, [run, isHumanTurn, chosen, commit]);

    const handleRankKey = useCallback((rank: string) => {
        const normalizedRank = normalizeRank(rank);
        const matching = orderedHand.filter((card) => normalizeRank(card.slice(0, -1)) === normalizedRank);
        if (!matching.length) return;
        const index = rankCycleIndex.current[normalizedRank] ?? 0;
        if (index >= matching.length) {
            setSelected((current) => {
                const next = new Set(current);
                next.delete(matching[0]);
                return next;
            });
            rankCycleIndex.current[normalizedRank] = 0;
            return;
        }
        const card = matching[index];
        setSelected((current) => new Set(current).add(card));
        setFocusedCardIndex(orderedHand.indexOf(card));
        rankCycleIndex.current[normalizedRank] = index + 1;
    }, [orderedHand]);

    const handleArrowKey = useCallback((direction: "left" | "right", heldRank: string | null) => {
        if (orderedHand.length === 0) return;
        if (heldRank) {
            const normalizedRank = normalizeRank(heldRank);
            const matching = orderedHand.filter((card) => normalizeRank(card.slice(0, -1)) === normalizedRank);
            if (!matching.length) return;
            const currentIndex = rankCycleIndex.current[normalizedRank] ?? 0;
            const nextIndex = direction === "right"
                ? Math.min(currentIndex + 1, matching.length - 1)
                : Math.max(currentIndex - 1, 0);
            rankCycleIndex.current[normalizedRank] = nextIndex;
            const card = matching[nextIndex];
            setSelected((current) => {
                const next = new Set(current);
                matching.forEach((matched) => next.delete(matched));
                next.add(card);
                return next;
            });
            setFocusedCardIndex(orderedHand.indexOf(card));
            return;
        }
        setFocusedCardIndex((current) => current === null
            ? direction === "right" ? 0 : orderedHand.length - 1
            : Math.max(0, Math.min(orderedHand.length - 1, current + (direction === "right" ? 1 : -1))));
    }, [orderedHand]);

    const toggleFocusedCard = useCallback((mode: "toggle" | "select" | "deselect") => {
        if (focusedCardIndex === null || !orderedHand[focusedCardIndex]) return;
        const card = orderedHand[focusedCardIndex];
        setSelected((current) => {
            const next = new Set(current);
            if (mode === "toggle") {
                if (next.has(card)) next.delete(card);
                else next.add(card);
            }
            else if (mode === "select") next.add(card);
            else next.delete(card);
            return next;
        });
    }, [focusedCardIndex, orderedHand]);

    const clearSelection = useCallback(() => {
        setSelected(new Set());
        rankCycleIndex.current = {};
    }, []);

    useKeyboardShortcuts({
        onRankKey: handleRankKey,
        onArrowKey: handleArrowKey,
        onUpArrow: () => toggleFocusedCard("select"),
        onDownArrow: () => toggleFocusedCard("deselect"),
        onSpacebar: () => toggleFocusedCard("toggle"),
        onEnter: playSelected,
        onBackspace: clearSelection,
        onPass: () => run && commit({ type: "pass" }),
        onEscape: () => setFocusedCardIndex(null),
        isEnabled: Boolean(run?.phase === "playing"),
        isCurrentTurn: isHumanTurn,
        gameWon: run?.phase === "victory" || run?.phase === "gameover",
        canPass: Boolean(isHumanTurn && run?.lastPlay),
    });

    const activatePower = (power: PowerId) => {
        if (!run || !isHumanTurn) return;
        const issue = power === "radar"
            ? getPowerError(run, power, radarChoice)
            : getPowerError(run, power, undefined, chosen);
        if (issue) {
            setFeedback(issue);
            return;
        }
        commit(power === "radar"
            ? { type: "power", power, target: radarChoice }
            : { type: "power", power, cards: chosen });
    };

    const toggleCard = (card: Card) => {
        setFeedback("");
        setSelected((current) => {
            const next = new Set(current);
            if (next.has(card)) next.delete(card);
            else next.add(card);
            return next;
        });
    };

    const playError = run && chosen.length ? getPlayError(run, chosen) : "Select cards to play";
    const radarError = run && isHumanTurn ? getPowerError(run, "radar", radarChoice) : "Available on your turn";
    const mulliganError = run && isHumanTurn ? getPowerError(run, "mulligan", undefined, chosen) : "Available on your turn";

    if (!run) {
        return (
            <div className="arcade-shell">
                <div className="arcade-wrap arcade-lobby">
                    <header className="arcade-brand"><span className="arcade-mark">♠</span><span>BIG TWO <b>ARCADE</b></span><span className="arcade-live">SOLO MODE</span></header>
                    <section className="arcade-hero">
                        <div className="arcade-hero-copy">
                            <p className="arcade-kicker">ONE DECK · FOUR PLAYERS · YOUR RUN</p>
                            <h1>Play the table.<br /><em>Own the night.</em></h1>
                            <p className="arcade-lede">Outplay three rivals, build your charge, and carry your streak through three neon tables.</p>
                            <div className="arcade-hero-actions">
                                <ArcadeButton className="arcade-primary" onClick={newRun}>Start a run <span aria-hidden="true">→</span></ArcadeButton>
                                <button className="arcade-text-button" onClick={() => setRulesOpen((open) => !open)} aria-expanded={rulesOpen}>How to play <span>⌄</span></button>
                            </div>
                        </div>
                        <div className="arcade-preview" aria-hidden="true">
                            <div className="arcade-orbit orbit-one" /><div className="arcade-orbit orbit-two" />
                            <div className="preview-card preview-card-back">♣</div>
                            <div className="preview-card preview-card-mid">K<span>♦</span></div>
                            <div className="preview-card preview-card-front">A<span>♠</span></div>
                            <div className="preview-chip">3D<br /><small>LEAD</small></div>
                            <span className="arcade-spark spark-a">✦</span><span className="arcade-spark spark-b">✧</span>
                        </div>
                    </section>
                    {rulesOpen && <RulesPanel />}
                    {savedRun && <button className="arcade-resume-card" onClick={resumeRun}><span className="resume-icon">▶</span><span><b>RESUME YOUR RUN</b><small>{STAGE_INFO[Math.max(0, Math.min(savedRun.stage - 1, STAGE_INFO.length - 1))].name} · {savedRun.score.toLocaleString()} points · {savedRun.lives} lives</small></span><i>→</i></button>}
                    <section className="arcade-lobby-bottom">
                        <div className="arcade-stage-list">
                            {STAGE_INFO.map((item, index) => <div className="arcade-stage-tile" key={item.name}>
                                <span className="stage-index">0{index + 1}</span><div><b>{item.name}</b><small>{item.handSize} cards · {item.description}</small></div>
                            </div>)}
                        </div>
                        <aside className="arcade-best-card"><span className="arcade-kicker">PERSONAL BEST</span><strong>{bestScore.toLocaleString()}</strong><small>points · saved on this browser</small></aside>
                    </section>
                </div>
            </div>
        );
    }

    if (run.phase === "reward") return <RewardScreen run={run} bestScore={bestScore} commit={commit} restart={newRun} />;
    if (run.phase === "victory" || run.phase === "gameover") return <ResultsScreen run={run} bestScore={bestScore} restart={newRun} />;
    if (run.phase === "defeated") return <div className="arcade-shell"><div className="arcade-wrap arcade-state-screen"><span className="arcade-state-icon">♥</span><p className="arcade-kicker">TABLE LOST</p><h1>Take another shot.</h1><p>You have {run.lives} {run.lives === 1 ? "life" : "lives"} left. The table resets with a fresh deal.</p><div className="arcade-state-stats"><b>{stage.name}</b><span>{run.score.toLocaleString()} points</span><span>{run.lives} lives remain</span></div><ArcadeButton className="arcade-primary" onClick={() => commit({ type: "retry" })}>Deal again <span>→</span></ArcadeButton><ArcadeButton className="arcade-quiet" onClick={newRun}>Start a new run</ArcadeButton></div></div>;

    const stageProgress = Math.min(100, (run.stage / STAGE_INFO.length) * 100);
    const validSelected = chosen.length > 0 && !playError;
    const radarPowerError = radarError;
    const mulliganPowerError = mulliganError;
    const scannedPlayer = run.radarTarget === null ? null : run.players[run.radarTarget];
    const sortHand = (sortType: SortType) => {
        setHandSort(sortType);
        setHandOrder(sortCards(hand, sortType));
        setSelected(new Set());
        setFocusedCardIndex(null);
        rankCycleIndex.current = {};
    };
    const handleHandReorder = (newOrder: string[]) => {
        setHandOrder(newOrder);
        setFocusedCardIndex(null);
        rankCycleIndex.current = {};
    };
    const tablePlayerName = run.lastPlay
        ? run.lastPlay.playerIndex === 0
            ? "YOU"
            : run.stage === 3 && run.lastPlay.playerIndex === 3
                ? "CARD SHARK"
                : run.players[run.lastPlay.playerIndex]?.name.toUpperCase() ?? "RIVAL"
        : undefined;
    const powerWidgets = <div className="arcade-power-widgets">
        <div className="power-control">
            <label htmlFor="radar-target">RADAR TARGET <small>reveal until your next turn</small></label>
            <div className="power-action-line"><select id="radar-target" value={radarChoice} onChange={(event) => setRadarChoice(Number(event.target.value))} disabled={!isHumanTurn}>{run.players.slice(1).map((player, i) => <option value={i + 1} key={player.name}>{run.stage === 3 && i === 2 ? "Card Shark" : player.name}</option>)}</select><ArcadeButton className="arcade-power" disabled={!isHumanTurn || Boolean(radarPowerError)} onClick={() => activatePower("radar")} title={radarPowerError || "Reveal a rival's hand"}><span>⌕</span> Radar <b>{powerCost(run, "radar")}⚡</b></ArcadeButton></div>
            <small className="power-hint">{radarPowerError ?? "Scan a rival's current hand."}</small>
        </div>
        <div className="power-control mulligan-control">
            <label>BLIND EXCHANGE <small>random rival · no turn</small></label>
            <ArcadeButton className="arcade-power" disabled={!isHumanTurn || Boolean(mulliganPowerError)} onClick={() => activatePower("mulligan")} title={mulliganPowerError || "Blindly swap selected cards with a rival"}><span>⟳</span> Exchange <b>{powerCost(run, "mulligan")}⚡</b></ArcadeButton>
            <small className="power-hint">{mulliganPowerError ?? "Choose 1–2 cards; a random rival swaps the same number."}</small>
        </div>
    </div>;

    return (
        <>
                <GameBoard
                    mode="arcade"
                    title="ARCADE"
                    subtitle={`${stage.name} · Table ${run.stage} of 3`}
                    status={<><span className="arcade-live">LIVE RUN</span><span className="arcade-stage-progress">{Math.round(stageProgress)}% complete</span></>}
                    headerActions={<><button className="arcade-restart-link" onClick={newRun}>Restart</button><button className="arcade-help-button" onClick={() => setRulesOpen((open) => !open)} aria-expanded={rulesOpen}>? <span>Rules</span></button></>}
                    metrics={<section className="arcade-meters" aria-label="Run status">
                        <Meter label="LIVES" value={<span className="life-dots">{Array.from({ length: 4 }, (_, i) => <i key={i} className={i < run.lives ? "lit" : ""}>♥</i>)}</span>} detail={`${run.lives} remaining`} accent="pink" />
                        <Meter label="RUN SCORE" value={run.score.toLocaleString()} detail={`Best ${bestScore.toLocaleString()}`} accent="lime" />
                        <Meter label="CHARGE" value={<>{run.charge}<small> / 100</small></>} detail="Power reserve" accent="cyan" progress={run.charge} />
                        <Meter label="STREAK" value={<>{run.combo}<small>×</small></>} detail={`Score multiplier ${Math.max(1, run.combo + 1)}× · best ${run.bestCombo}`} accent="amber" />
                    </section>}
                    opponents={run.players.slice(1).map((player, offset) => {
                        const index = offset + 1;
                        const isTurn = run.turn === index && run.phase === "playing";
                        const revealed = run.radarTarget === index;
                        const displayName = run.stage === 3 && index === 3 ? "CARD SHARK" : player.name;
                        return <GameOpponent key={player.name} name={displayName} cardCount={player.hand.length} isActive={isTurn} isRevealed={revealed} kind={run.stage === 3 && index === 3 ? "Boss" : "Rival"} lastCards={run.lastPlay?.playerIndex === index ? run.lastPlay.cards : undefined} />;
                    })}
                    table={<GameTable
                        turnLabel={isHumanTurn ? "Your turn" : botThinking ? "Rivals are playing" : "Waiting for the table"}
                        isCurrentTurn={isHumanTurn}
                        cards={run.lastPlay?.cards ?? []}
                        playedBy={tablePlayerName}
                        handLabel={run.lastPlay?.label}
                        emptyTitle={run.opening ? "Your opening play" : run.turn === 0 ? "Your lead" : "Trick cleared"}
                        emptyHint={run.opening ? "Your play must include 3♦" : run.turn === 0 ? "Lead any legal combination" : "Waiting for the leader"}
                        note={run.lastPlay ? run.lastPlay.playerIndex === 0 ? "You’re holding the trick" : `${run.lastPlay.label} to beat` : undefined}
                        status={run.passes > 0 ? `${run.passes} / 3 passes` : undefined}
                    />}
                    intel={scannedPlayer && <section className="arcade-radar" aria-label={`${scannedPlayer.name.toUpperCase()}'s revealed hand`}>
                        <div className="radar-heading"><b>⌕ RADAR · {scannedPlayer.name.toUpperCase()}</b><small>Visible until your next turn</small></div>
                        <div className="radar-reveal">{scannedPlayer.hand.map((card) => <PlayingCard key={card} card={card} className="radar-card" width={32} height={46} rankClassName="text-[11px]" suitClassName="text-sm" />)}</div>
                    </section>}
                    hand={<PlayerHand
                        cards={orderedHand}
                        selectedCards={[...selected]}
                        focusedCardIndex={focusedCardIndex}
                        onCardClick={(card) => toggleCard(card as Card)}
                        onCardsReorder={handleHandReorder}
                        keyboardScope
                        onCardFocus={setFocusedCardIndex}
                    />}
                    handCount={hand.length}
                    handName="Your hand"
                    handStatus={isHumanTurn ? "Your turn · make a move" : botThinking ? "Rivals are playing" : "Waiting for the table"}
                    handTools={<><button type="button" className={`game-board-tool ${handSort === "numerical" ? "is-active" : ""}`} onClick={() => sortHand("numerical")}>Rank</button><button type="button" className={`game-board-tool ${handSort === "suit" ? "is-active" : ""}`} onClick={() => sortHand("suit")}>Suit</button></>}
                    actions={<div className="arcade-actions-layout"><GameActions selectedCount={chosen.length} onPlay={playSelected} onClear={clearSelection} onPass={() => commit({ type: "pass" })} isPlayDisabled={!isHumanTurn || !validSelected} isClearDisabled={!selected.size} isPassDisabled={!isHumanTurn || !run.lastPlay} passTitle="Pass (P)" /><span className="move-hint">{chosen.length ? playError || `${classifyHand(chosen)?.label ?? "Valid play"} ready` : run.opening ? "Start with 3♦ in your play" : run.lastPlay ? "Beat the current play or pass" : "Lead any legal combination"}</span></div>}
                    feedback={<div className={`arcade-feedback ${feedback ? "has-message" : ""}`} aria-live="polite">{feedback || (run.opening ? "The 3♦ belongs in your opening play." : "")}{saveWarning && <span>Progress could not be saved on this browser.</span>}</div>}
                    extras={<div className="arcade-extras">
                        {rulesOpen && <RulesPanel />}
                        {run.stage === 3 && <div className="arcade-boss-banner"><span className="boss-sigil">♛</span><div><b>BOSS ADVANTAGE · CARD SHARK</b><small>You have 13 cards; the boss starts with nine. Keep the pressure on.</small></div><span className="boss-count">{run.players[3]?.hand.length ?? 0} cards</span></div>}
                        {powerWidgets}
                    </div>}
                    feed={<><section className="arcade-log" aria-label="Recent table activity"><span className="arcade-kicker">TABLE FEED</span>{run.log.slice(-3).reverse().map((entry, index) => <p key={`${run.log.length - index}-${entry}`}>{entry}</p>)}</section><footer className="arcade-footnote"><span>RUN SAVES AUTOMATICALLY ON THIS BROWSER</span><span>STREAK MULTIPLIES TABLE SCORE</span></footer></>}
                />
        </>
    );
}

function Meter({ label, value, detail, accent, progress }: { label: string; value: ReactNode; detail: string; accent: string; progress?: number }) {
    return <div className={`arcade-meter meter-${accent}`}><span className="meter-label">{label}</span><strong>{value}</strong>{progress !== undefined && <div className="meter-track"><i style={{ width: `${progress}%` }} /></div>}<small>{detail}</small></div>;
}

function RulesPanel() {
    return <section className="arcade-rules"><div><span className="arcade-kicker">QUICK RULES</span><h2>Every card has a counter.</h2></div><ul><li><b>Ranks:</b> 3 through 2. Suits break ties: ♦ ♣ ♥ ♠.</li><li><b>Plays:</b> singles, pairs, triples, and five-card hands. A2345 and 23456 are straights.</li><li><b>Opening:</b> your first play must include 3♦. Play higher or pass; three passes give the trick to the last player.</li><li><b>Charge:</b> valid plays and trick wins refill your powers. Streaks grow when you win a trick.</li><li><b>Radar:</b> reveal a rival until your next turn. <b>Blind exchange:</b> swap one or two selected cards with a random eligible rival for 35 charge; both hand sizes stay the same.</li><li><b>Keyboard:</b> rank keys select; arrows move; ↑/↓ select or deselect; Space toggles; Enter plays; P passes; Backspace clears selection; Esc clears focus.</li></ul></section>;
}

function RewardScreen({ run, bestScore, commit, restart }: { run: ArcadeState; bestScore: number; commit: (action: Parameters<typeof applyAction>[1]) => void; restart: () => void }) {
    const choices = upgradeChoices(run);
    return <div className="arcade-shell"><div className="arcade-wrap arcade-state-screen arcade-reward-screen"><span className="arcade-state-icon reward-icon">✦</span><p className="arcade-kicker">TABLE {run.stage} CLEARED</p><h1>Bank the win.<br /><em>Pick your edge.</em></h1><p>You took the table. Choose one upgrade for the next hand.</p><div className="reward-score"><span>RUN SCORE</span><b>{run.score.toLocaleString()}</b><small>Personal best {bestScore.toLocaleString()}</small></div><div className="upgrade-grid">{choices.map((upgrade: UpgradeId) => <button className="upgrade-card" key={upgrade} onClick={() => commit({ type: "upgrade", upgrade })}><span className="upgrade-icon">{upgrade === "radar_discount" ? "⌕" : upgrade === "combo_guard" ? "◈" : "♥"}</span><b>{UPGRADE_INFO[upgrade].name}</b><small>{UPGRADE_INFO[upgrade].description}</small><span className="upgrade-choose">CHOOSE <i>→</i></span></button>)}</div><button className="arcade-restart-link" onClick={restart}>Restart this run</button></div></div>;
}

function ResultsScreen({ run, bestScore, restart }: { run: ArcadeState; bestScore: number; restart: () => void }) {
    const victory = run.phase === "victory";
    return <div className="arcade-shell"><div className="arcade-wrap arcade-state-screen arcade-results"><span className={`arcade-state-icon ${victory ? "reward-icon" : "defeat-icon"}`}>{victory ? "♛" : "♥"}</span><p className="arcade-kicker">{victory ? "RUN COMPLETE" : "RUN OVER"}</p><h1>{victory ? <>You own the <em>night.</em></> : <>The table takes<br /><em>its toll.</em></>}</h1><p>{victory ? "Three tables cleared. Your best run is saved on this browser." : "Every hand is another chance to come back stronger."}</p><div className="results-grid"><div><span>FINAL SCORE</span><b>{run.score.toLocaleString()}</b></div><div><span>BEST STREAK</span><b>{run.bestCombo}<small>×</small></b></div><div><span>TABLES WON</span><b>{run.tablesWon}<small> / 3</small></b></div><div><span>PERSONAL BEST</span><b>{bestScore.toLocaleString()}</b></div></div><ArcadeButton className="arcade-primary" onClick={restart}>Play again <span>↗</span></ArcadeButton><p className="results-note">Your best is saved on this browser.</p></div></div>;
}
