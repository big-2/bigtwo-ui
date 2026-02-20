import React from "react";
import { Link } from "react-router-dom";
import SeoHead from "./SeoHead";

const PAGE_CONTAINER = "mx-auto w-full max-w-4xl px-4 py-8 sm:px-6";

const RelatedLinks: React.FC = () => (
    <nav aria-label="Related pages" className="mt-8 border-t pt-6">
        <h2 className="text-xl font-semibold">Related Big Two Guides</h2>
        <ul className="mt-3 list-disc space-y-1 pl-5">
            <li><Link className="text-primary underline" to="/how-to-play">How to Play Big Two</Link></li>
            <li><Link className="text-primary underline" to="/rules">Official-Style Rules</Link></li>
            <li><Link className="text-primary underline" to="/strategy">Strategy Tips</Link></li>
            <li><Link className="text-primary underline" to="/faq">Big Two FAQ</Link></li>
            <li><Link className="text-primary underline" to="/">Play Big Two Online</Link></li>
        </ul>
    </nav>
);

export const HowToPlayPage: React.FC = () => (
    <section className={PAGE_CONTAINER}>
        <SeoHead
            title="How To Play Big Two Online | big2.app"
            description="Learn how to play Big Two online: setup, turn order, legal combinations, ranking rules, and how rounds are won."
            canonicalPath="/how-to-play"
        />
        <article className="space-y-6">
            <header className="space-y-2">
                <h1 className="text-3xl font-bold">How To Play Big Two</h1>
                <p className="text-muted-foreground">A fast walkthrough of Big Two basics for new players.</p>
            </header>
            <section>
                <h2 className="text-2xl font-semibold">Game Setup</h2>
                <ul className="mt-2 list-disc space-y-1 pl-5">
                    <li>Big Two is played by 4 players using a standard 52-card deck.</li>
                    <li>Each player gets 13 cards.</li>
                    <li>The player with the 3 of Diamonds starts the first trick.</li>
                </ul>
            </section>
            <section>
                <h2 className="text-2xl font-semibold">Turn Flow</h2>
                <ul className="mt-2 list-disc space-y-1 pl-5">
                    <li>Play a valid combination that beats the previous play.</li>
                    <li>Pass if you cannot or do not want to beat it.</li>
                    <li>After 3 passes, control returns to the last player who played a hand.</li>
                </ul>
            </section>
            <section>
                <h2 className="text-2xl font-semibold">Winning</h2>
                <p className="mt-2">You win the round by being the first player to play all 13 cards.</p>
            </section>
            <RelatedLinks />
        </article>
    </section>
);

export const RulesPage: React.FC = () => (
    <section className={PAGE_CONTAINER}>
        <SeoHead
            title="Big Two Rules And Card Rankings | big2.app"
            description="Detailed Big Two rules: rank order, suit order, valid combinations, and hand comparison rules for online play."
            canonicalPath="/rules"
        />
        <article className="space-y-6">
            <header className="space-y-2">
                <h1 className="text-3xl font-bold">Big Two Rules</h1>
                <p className="text-muted-foreground">Reference rules and rankings used in Big Two online games.</p>
            </header>
            <section>
                <h2 className="text-2xl font-semibold">Card Rank Order</h2>
                <p className="mt-2">From low to high: 3, 4, 5, 6, 7, 8, 9, 10, J, Q, K, A, 2.</p>
            </section>
            <section>
                <h2 className="text-2xl font-semibold">Suit Order</h2>
                <p className="mt-2">From low to high: Diamonds, Clubs, Hearts, Spades.</p>
            </section>
            <section>
                <h2 className="text-2xl font-semibold">Valid Combinations</h2>
                <ul className="mt-2 list-disc space-y-1 pl-5">
                    <li>Single card</li>
                    <li>Pair</li>
                    <li>Three of a kind</li>
                    <li>Five-card hands: straight, flush, full house, four of a kind, straight flush</li>
                </ul>
            </section>
            <section>
                <h2 className="text-2xl font-semibold">Beating A Hand</h2>
                <p className="mt-2">To beat a play, you must play the same hand type and card count, except where local table rules allow five-card hierarchy overrides.</p>
            </section>
            <RelatedLinks />
        </article>
    </section>
);

export const StrategyPage: React.FC = () => (
    <section className={PAGE_CONTAINER}>
        <SeoHead
            title="Big Two Strategy Tips For Beginners | big2.app"
            description="Practical Big Two strategy tips: controlling tempo, saving power cards, and managing hand structure to win more rounds."
            canonicalPath="/strategy"
        />
        <article className="space-y-6">
            <header className="space-y-2">
                <h1 className="text-3xl font-bold">Big Two Strategy Tips</h1>
                <p className="text-muted-foreground">Simple decisions that improve win rate over time.</p>
            </header>
            <section>
                <h2 className="text-2xl font-semibold">Protect High Cards</h2>
                <p className="mt-2">Do not waste 2s and high pairs early unless you gain clear tempo or reduce risk immediately.</p>
            </section>
            <section>
                <h2 className="text-2xl font-semibold">Plan Around Five-Card Hands</h2>
                <p className="mt-2">Strong five-card hands can swing control. Keep flexible structures until you know if you need a finisher.</p>
            </section>
            <section>
                <h2 className="text-2xl font-semibold">Track What Is Gone</h2>
                <p className="mt-2">Counting played 2s, aces, and top suits helps you decide when to push and when to pass.</p>
            </section>
            <RelatedLinks />
        </article>
    </section>
);

export const FaqPage: React.FC = () => (
    <section className={PAGE_CONTAINER}>
        <SeoHead
            title="Big Two FAQ | big2.app"
            description="Frequently asked questions about Big Two online: player count, free play, card order, and combination rules."
            canonicalPath="/faq"
        />
        <article className="space-y-6">
            <header className="space-y-2">
                <h1 className="text-3xl font-bold">Big Two FAQ</h1>
                <p className="text-muted-foreground">Common questions from new and returning players.</p>
            </header>
            <section>
                <h2 className="text-2xl font-semibold">Is Big Two free to play?</h2>
                <p className="mt-2">Yes. You can play directly in your browser at no cost.</p>
            </section>
            <section>
                <h2 className="text-2xl font-semibold">How many players are needed?</h2>
                <p className="mt-2">Standard Big Two uses 4 players, each with 13 cards.</p>
            </section>
            <section>
                <h2 className="text-2xl font-semibold">What is the highest card?</h2>
                <p className="mt-2">The 2 is the highest rank. Suit order then breaks ties, with Spades highest.</p>
            </section>
            <RelatedLinks />
        </article>
    </section>
);
