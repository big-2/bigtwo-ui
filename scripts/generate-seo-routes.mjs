import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

const distIndexPath = path.resolve("dist/index.html");

const ROUTES = [
    {
        route: "/how-to-play",
        title: "How To Play Big Two Online | big2.app",
        description: "Learn how to play Big Two online: setup, turn order, legal combinations, ranking rules, and how rounds are won.",
        heading: "How To Play Big Two",
        intro: "Learn the flow of a standard Big Two game, from the opening lead to the final winning play.",
        sections: [
            {
                title: "Game Setup",
                list: [
                    "Big Two uses a standard 52-card deck and 4 players.",
                    "Each player receives 13 cards.",
                    "The player holding the 3 of Diamonds opens the first trick.",
                ],
            },
            {
                title: "Turn Flow",
                list: [
                    "On your turn, play a valid hand that beats the current play or pass.",
                    "Players continue clockwise until three players pass.",
                    "The last player to make a legal play starts the next round with any valid hand.",
                ],
            },
            {
                title: "Valid Hands",
                list: [
                    "Single cards, pairs, and three of a kind.",
                    "Five-card hands such as straights, flushes, full houses, four of a kind, and straight flushes.",
                    "You usually need to answer with the same card count and hand type, except where five-card hierarchy applies.",
                ],
            },
            {
                title: "How You Win",
                paragraphs: [
                    "The winner is the first player to empty all 13 cards. Good Big Two play is not only about strong cards, but also about keeping a clean path through your final few turns.",
                ],
            },
        ],
        faq: [
            {
                question: "Who starts in Big Two?",
                answer: "The player with the 3 of Diamonds starts the first trick in standard Big Two.",
            },
            {
                question: "Can you pass and play again later?",
                answer: "Yes. Passing only removes you from the current fight for that trick. When the round resets, you can play again.",
            },
            {
                question: "How do you win a Big Two game?",
                answer: "You win by being the first player to play all 13 cards.",
            },
        ],
    },
    {
        route: "/rules",
        title: "Big Two Rules And Card Rankings | big2.app",
        description: "Detailed Big Two rules: rank order, suit order, valid combinations, and hand comparison rules for online play.",
        heading: "Big Two Rules",
        intro: "Reference card order, suit order, legal combinations, and the comparison rules used in standard online Big Two.",
        sections: [
            {
                title: "Card Rank Order",
                paragraphs: ["From low to high, cards rank 3, 4, 5, 6, 7, 8, 9, 10, J, Q, K, A, 2."],
            },
            {
                title: "Suit Order",
                paragraphs: ["When suits break ties, the common order is Diamonds, Clubs, Hearts, Spades."],
            },
            {
                title: "Valid Combinations",
                list: [
                    "Single card",
                    "Pair",
                    "Three of a kind",
                    "Five-card hands: straight, flush, full house, four of a kind, straight flush",
                ],
            },
            {
                title: "Five-Card Hand Order",
                paragraphs: [
                    "In standard ranking, straights are below flushes, flushes are below full houses, full houses are below four of a kind, and straight flushes are highest.",
                ],
            },
            {
                title: "Rule Variations",
                paragraphs: [
                    "Big Two has regional and house-rule differences. Some groups change suit ranking, allow bombs to beat a single 2, or score leftover cards differently.",
                ],
            },
        ],
        faq: [
            {
                question: "What is the highest card in Big Two?",
                answer: "The highest rank is the 2, and the highest single card is usually the 2 of Spades when suits break ties.",
            },
            {
                question: "Do you always need the same hand type to beat a play?",
                answer: "Usually yes, although five-card hands can follow category hierarchy depending on the table's rules.",
            },
            {
                question: "Why do different Big Two guides disagree on details?",
                answer: "Because Big Two is played with many regional and household variations, especially around suits, scoring, and special overrides.",
            },
        ],
    },
    {
        route: "/strategy",
        title: "Big Two Strategy Tips For Beginners | big2.app",
        description: "Practical Big Two strategy tips: controlling tempo, saving power cards, and managing hand structure to win more rounds.",
        heading: "Big Two Strategy Tips",
        intro: "A few disciplined decisions matter more than fancy plays: control tempo, protect flexible hands, and plan your endgame.",
        sections: [
            {
                title: "Protect Power Cards",
                paragraphs: [
                    "Do not burn 2s and strong pairs too early unless the play wins immediate control or prevents an opponent from finishing.",
                ],
            },
            {
                title: "Plan Around Five-Card Hands",
                paragraphs: [
                    "Strong five-card combinations can swing the whole deal. Preserve them when they help you keep initiative or unload awkward cards efficiently.",
                ],
            },
            {
                title: "Lead With Purpose",
                paragraphs: [
                    "When you regain control, do not automatically throw your biggest card. Lead the hand type that is hardest for the table to answer cleanly.",
                ],
            },
            {
                title: "Track What Is Gone",
                paragraphs: [
                    "Keep count of played 2s, aces, and top suits. That information tells you when a medium-strength hand is actually safe.",
                ],
            },
            {
                title: "Shape Your Endgame Early",
                paragraphs: [
                    "Your last few cards should fit together. Avoid leaving yourself with stranded kickers or a hand that only exits in one fragile sequence.",
                ],
            },
        ],
        faq: [
            {
                question: "Should you save 2s until the end?",
                answer: "Often yes, but not blindly. A 2 is strongest when it either secures control or stops a dangerous opponent.",
            },
            {
                question: "What is the biggest beginner mistake in Big Two?",
                answer: "Many beginners spend strong singles too early and end up without control when the hand gets tight.",
            },
            {
                question: "Why are five-card hands important?",
                answer: "They let you unload multiple cards at once and can reset the tempo of the whole round.",
            },
        ],
    },
    {
        route: "/faq",
        title: "Big Two FAQ | big2.app",
        description: "Frequently asked questions about Big Two online: player count, free play, card order, and combination rules.",
        heading: "Big Two FAQ",
        intro: "Quick answers to the questions players ask most often before joining a table.",
        sections: [
            {
                title: "Is Big Two free to play?",
                paragraphs: ["Yes. You can play Big Two in your browser on big2.app without registration or payment."],
            },
            {
                title: "How many players does Big Two need?",
                paragraphs: ["Standard Big Two uses 4 players, with 13 cards dealt to each player."],
            },
            {
                title: "What is the highest card?",
                paragraphs: ["The 2 is the highest rank. When suits matter, Spades is typically the top suit."],
            },
            {
                title: "Is Big Two the same as Pusoy Dos?",
                paragraphs: ["They belong to the same game family, but the exact rule details can vary by country and table."],
            },
            {
                title: "Can you play on mobile?",
                paragraphs: ["Yes. big2.app works on modern mobile browsers as well as desktop browsers."],
            },
        ],
        faq: [
            {
                question: "Do I need an account to play Big Two online?",
                answer: "No. You can create or join a room without signing up.",
            },
            {
                question: "Can I play Big Two on my phone?",
                answer: "Yes. big2.app supports modern mobile browsers.",
            },
            {
                question: "How many players are in a standard Big Two game?",
                answer: "Four players, each holding 13 cards from a standard deck.",
            },
        ],
    },
];

const replaceTag = (html, pattern, replacement) => {
    if (!pattern.test(html)) {
        return html;
    }
    return html.replace(pattern, replacement);
};

const escapeHtml = (value) =>
    value
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#39;");

const renderSection = (section) => {
    const paragraphs = (section.paragraphs ?? [])
        .map((paragraph) => `<p>${escapeHtml(paragraph)}</p>`)
        .join("\n                ");
    const list = section.list
        ? `
                <ul>
${section.list.map((item) => `                    <li>${escapeHtml(item)}</li>`).join("\n")}
                </ul>`
        : "";

    return `
            <section style="margin-top: 2rem;">
                <h2>${escapeHtml(section.title)}</h2>
                ${paragraphs}${paragraphs && list ? "\n                " : ""}${list}
            </section>`;
};

const renderFaqSection = (faq) => `
            <section style="margin-top: 2rem;">
                <h2>Frequently Asked Questions</h2>
${faq
    .map(
        (item) => `                <h3>${escapeHtml(item.question)}</h3>
                <p>${escapeHtml(item.answer)}</p>`,
    )
    .join("\n\n")}
            </section>`;

const renderNoscriptMain = (routeConfig) => `
    <noscript>
        <main style="max-width: 960px; margin: 0 auto; padding: 2rem; font-family: system-ui, -apple-system, sans-serif; line-height: 1.6;">
            <header>
                <h1>${escapeHtml(routeConfig.heading)}</h1>
                <p style="font-size: 1.1rem; color: #555;">${escapeHtml(routeConfig.intro)}</p>
            </header>
${routeConfig.sections.map(renderSection).join("\n")}
${renderFaqSection(routeConfig.faq)}

            <section style="margin-top: 2rem;">
                <h2>Play Big Two Online</h2>
                <p>Ready to practice? Return to big2.app to create a room, invite friends, or jump into an online game.</p>
            </section>
        </main>
    </noscript>`;

const renderFaqJsonLd = (routeConfig) => `    {
      "@context": "https://schema.org",
      "@type": "FAQPage",
      "mainEntity": [
${routeConfig.faq
    .map(
        (item) => `        {
          "@type": "Question",
          "name": ${JSON.stringify(item.question)},
          "acceptedAnswer": {
            "@type": "Answer",
            "text": ${JSON.stringify(item.answer)}
          }
        }`,
    )
    .join(",\n")}
      ]
    }`;

const updateRouteMeta = (html, routeConfig) => {
    const canonicalUrl = `https://big2.app${routeConfig.route}`;
    let updated = html;

    updated = replaceTag(updated, /<title>[\s\S]*?<\/title>/i, `<title>${routeConfig.title}</title>`);
    updated = replaceTag(updated, /<meta name="title" content="[^"]*"\s*\/?>/i, `<meta name="title" content="${routeConfig.title}" />`);
    updated = replaceTag(updated, /<meta name="description" content="[^"]*"\s*\/?>/i, `<meta name="description" content="${routeConfig.description}" />`);
    updated = replaceTag(updated, /<meta property="og:title" content="[^"]*"\s*\/?>/i, `<meta property="og:title" content="${routeConfig.title}" />`);
    updated = replaceTag(updated, /<meta property="og:description" content="[^"]*"\s*\/?>/i, `<meta property="og:description" content="${routeConfig.description}" />`);
    updated = replaceTag(updated, /<meta property="og:url" content="[^"]*"\s*\/?>/i, `<meta property="og:url" content="${canonicalUrl}" />`);
    updated = replaceTag(updated, /<meta property="twitter:title" content="[^"]*"\s*\/?>/i, `<meta property="twitter:title" content="${routeConfig.title}" />`);
    updated = replaceTag(updated, /<meta property="twitter:description" content="[^"]*"\s*\/?>/i, `<meta property="twitter:description" content="${routeConfig.description}" />`);
    updated = replaceTag(updated, /<meta property="twitter:url" content="[^"]*"\s*\/?>/i, `<meta property="twitter:url" content="${canonicalUrl}" />`);
    updated = replaceTag(updated, /<link rel="canonical" href="[^"]*"\s*\/?>/i, `<link rel="canonical" href="${canonicalUrl}" />`);
    updated = replaceTag(
        updated,
        /<!-- FAQ Schema for Rich Search Results -->[\s\S]*?<\/script>/i,
        `<!-- FAQ Schema for Rich Search Results -->\n    <script type="application/ld+json">\n${renderFaqJsonLd(routeConfig)}\n    </script>`,
    );
    updated = replaceTag(updated, /<noscript>[\s\S]*?<\/noscript>/i, renderNoscriptMain(routeConfig));

    return updated;
};

const main = async () => {
    const indexHtml = await readFile(distIndexPath, "utf8");

    for (const routeConfig of ROUTES) {
        const routeHtml = updateRouteMeta(indexHtml, routeConfig);
        const routeDir = path.resolve("dist", routeConfig.route.slice(1));
        const routeIndexPath = path.join(routeDir, "index.html");
        await mkdir(routeDir, { recursive: true });
        await writeFile(routeIndexPath, routeHtml, "utf8");
    }

    console.log(`Generated SEO route files for ${ROUTES.length} routes.`);
};

main().catch((error) => {
    console.error("Failed to generate SEO route files:", error);
    process.exitCode = 1;
});
