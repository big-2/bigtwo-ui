import React from "react";
import { Card, CardContent } from "./ui/card";

const GAME_DESCRIPTION = "Big Two (also known as Big 2, Deuces, or Chinese Poker) is a classic multiplayer card game for 2-4 players. Compete with friends in real-time to be the first to play all your cards!";

const HOW_TO_PLAY = [
    "Join a game with 2-4 players in multiplayer mode",
    "Each player starts with 13 cards from a standard deck",
    "Play cards in combinations: singles, pairs, triples, or 5-card hands",
    "Each play must beat the previous combination",
    "Pass if you can't or don't want to play",
    "First player to play all cards wins!"
];

const CARD_RANKINGS = {
    ranks: "3 < 4 < 5 ... < K < A <",
    highestRank: "2",
    suits: "♦ < ♣ < ♥ < ♠",
};

const CALL_TO_ACTION = "Create or join a room to start playing!";

const AboutBigTwo: React.FC = () => {
    return (
        <Card className="w-full lg:w-96">
            <CardContent className="space-y-4 p-6 lg:p-8">
                <header>
                    <h2 className="text-xl font-bold lg:text-2xl">About Big Two</h2>
                </header>
                <article className="space-y-3 text-sm text-muted-foreground">
                    <p>{GAME_DESCRIPTION}</p>
                    <section>
                        <h3 className="mb-1 font-semibold text-foreground">How to Play</h3>
                        <ul className="list-inside list-disc space-y-1">
                            {HOW_TO_PLAY.map((step, index) => (
                                <li key={index}>{step}</li>
                            ))}
                        </ul>
                    </section>
                    <section>
                        <h3 className="mb-1 font-semibold text-foreground">Card Rankings</h3>
                        <p className="mb-1">
                            Ranks: {CARD_RANKINGS.ranks}{" "}
                            <span className="font-bold text-foreground">{CARD_RANKINGS.highestRank}</span>
                        </p>
                        <p>Suits: {CARD_RANKINGS.suits}</p>
                    </section>
                    <p className="text-xs italic">{CALL_TO_ACTION}</p>
                </article>
            </CardContent>
        </Card>
    );
};

export default AboutBigTwo;
