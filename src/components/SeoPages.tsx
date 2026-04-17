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
                <p className="text-muted-foreground">A practical walkthrough of setup, turn flow, valid hands, and what wins the round.</p>
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
                <h2 className="text-2xl font-semibold">Valid Hands</h2>
                <ul className="mt-2 list-disc space-y-1 pl-5">
                    <li>Single cards, pairs, and three of a kind.</li>
                    <li>Five-card hands such as straights, flushes, full houses, four of a kind, and straight flushes.</li>
                    <li>You normally need to match the previous hand type and card count to beat it.</li>
                </ul>
            </section>
            <section>
                <h2 className="text-2xl font-semibold">How A Round Resets</h2>
                <p className="mt-2">
                    If three other players pass, the last player to make a legal play takes control and can start a new round with any valid hand.
                    That reset is one of the biggest tactical moments in Big Two because it lets you choose the hand type opponents must answer.
                </p>
            </section>
            <section>
                <h2 className="text-2xl font-semibold">Winning</h2>
                <p className="mt-2">
                    You win by being the first player to empty all 13 cards. In online Big Two, that usually means balancing immediate control with
                    keeping a clean endgame hand for your last few turns.
                </p>
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
                <p className="text-muted-foreground">Reference rules, card order, hand rankings, and comparison logic for standard online play.</p>
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
                <h2 className="text-2xl font-semibold">Five-Card Hand Order</h2>
                <p className="mt-2">
                    In the standard order used by most online Big Two tables, straights rank below flushes, flushes rank below full houses, full houses
                    rank below four of a kind, and straight flushes are the highest five-card hand.
                </p>
            </section>
            <section>
                <h2 className="text-2xl font-semibold">Beating A Hand</h2>
                <p className="mt-2">
                    To beat a play, you normally match the same hand type and card count with a higher-ranking version. Five-card hands are the main exception,
                    because stronger categories can beat weaker ones when table rules allow standard Big Two hierarchy.
                </p>
            </section>
            <section>
                <h2 className="text-2xl font-semibold">Common Rule Variations</h2>
                <p className="mt-2">
                    Big Two is not perfectly standardized. Some groups change suit order, allow bombs to beat 2s, or score leftover cards differently.
                    When you compare guides online, that variation is why details can look inconsistent across sources.
                </p>
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
                <p className="text-muted-foreground">Practical ways to keep control, protect power cards, and convert strong hands into wins.</p>
            </header>
            <section>
                <h2 className="text-2xl font-semibold">Protect High Cards</h2>
                <p className="mt-2">Do not waste 2s and high pairs early unless you gain tempo immediately or stop an opponent from going out.</p>
            </section>
            <section>
                <h2 className="text-2xl font-semibold">Plan Around Five-Card Hands</h2>
                <p className="mt-2">Strong five-card hands can swing control. Keep flexible structures until you know if you need a finisher.</p>
            </section>
            <section>
                <h2 className="text-2xl font-semibold">Lead With Purpose</h2>
                <p className="mt-2">
                    When you win control, choose a lead that strains the table. Sometimes the best opening is not your strongest card, but the hand type
                    that leaves opponents with the fewest clean replies.
                </p>
            </section>
            <section>
                <h2 className="text-2xl font-semibold">Track What Is Gone</h2>
                <p className="mt-2">Counting played 2s, aces, and top suits helps you decide when to push and when to pass.</p>
            </section>
            <section>
                <h2 className="text-2xl font-semibold">Shape Your Endgame Early</h2>
                <p className="mt-2">
                    The last three to five cards matter more than most players think. Try to avoid getting stuck with awkward leftovers that can only be played
                    in one sequence.
                </p>
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
            <section>
                <h2 className="text-2xl font-semibold">Is Big Two the same as Pusoy Dos?</h2>
                <p className="mt-2">
                    They are closely related and often treated as the same family of game, but house rules and naming can vary by country and community.
                </p>
            </section>
            <section>
                <h2 className="text-2xl font-semibold">Can I play Big Two on mobile?</h2>
                <p className="mt-2">Yes. big2.app works in modern mobile browsers as well as desktop browsers.</p>
            </section>
            <section>
                <h2 className="text-2xl font-semibold">Do I need to create an account?</h2>
                <p className="mt-2">No. You can create or join a room without registration.</p>
            </section>
            <RelatedLinks />
        </article>
    </section>
);
