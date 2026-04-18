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
    {
        route: "/pusoy-dos",
        title: "Pusoy Dos Online | Modern Big 2 App With Friends And Bots | big2.app",
        description: "Play Pusoy Dos online in a modern browser app. Create private games with friends or practice against bots on big2.app.",
        heading: "Pusoy Dos Online",
        intro: "Play the Big Two style climbing card game in a cleaner, more modern browser app built for quick games with friends and bot practice.",
        sections: [
            {
                title: "What Players Mean By Pusoy Dos",
                paragraphs: [
                    "Pusoy Dos is commonly used as the local name for the same game family many players call Big Two or Big 2. Exact house rules can vary, but if you are looking for Pusoy Dos online, you are usually looking for this same core climbing card game.",
                ],
            },
            {
                title: "Why Play On big2.app",
                list: [
                    "Clean modern browser app built for quick Big 2 games with friends.",
                    "Create a room fast, invite friends, and start a real-time 4-player game without installing anything.",
                    "Practice against bots when you do not have a full table ready.",
                    "Track personal stats and recent match history after your completed games.",
                    "Works on desktop and mobile for quick shared games.",
                ],
            },
            {
                title: "Rules And Variants",
                paragraphs: [
                    "Like many Big Two variants, naming and house rules can shift by country and table. The core loop stays the same: be first to unload all 13 cards by beating the current play with a stronger hand.",
                ],
            },
        ],
        faq: [
            {
                question: "Is Pusoy Dos the same as Big Two?",
                answer: "Often yes in practice. The names usually refer to the same core climbing card game family, though house rules can vary.",
            },
            {
                question: "Can I play Pusoy Dos with friends online?",
                answer: "Yes. On big2.app you can create a room and invite friends into a private browser game.",
            },
            {
                question: "Can I practice Pusoy Dos against bots?",
                answer: "Yes. big2.app supports bot play, which makes it easier to practice when a full table is not available.",
            },
        ],
    },
    {
        route: "/dai-di",
        title: "Dai Di Online | Play Modern Big 2 In Your Browser | big2.app",
        description: "Play Dai Di online with friends or against bots in a modern browser app. Fast private rooms, mobile-friendly play, and no download.",
        heading: "Dai Di Online",
        intro: "If you know the game as Dai Di, this is the same fast multiplayer climbing card game in a more polished web app.",
        sections: [
            {
                title: "What Players Mean By Dai Di",
                paragraphs: [
                    "Dai Di is one of the established names for Big Two. Depending on region and family rules, details may shift slightly, but the main idea is unchanged: shed all your cards first by answering the current hand with a stronger one.",
                ],
            },
            {
                title: "Why Play On big2.app",
                list: [
                    "Clean modern browser app built for quick friend games.",
                    "Real-time private rooms for friend groups.",
                    "Bot games when you want practice or a quick solo session.",
                    "Track personal stats and recent match history after completed games.",
                    "No download required on desktop or mobile.",
                ],
            },
            {
                title: "Rules And Variants",
                paragraphs: [
                    "Regional Dai Di tables can differ on suit order and some five-card comparisons, but the familiar Big Two style flow remains the same throughout the game.",
                ],
            },
        ],
        faq: [
            {
                question: "Is Dai Di different from Big 2?",
                answer: "Usually they refer to the same game family, with some variation in table rules and naming by region.",
            },
            {
                question: "Can I play Dai Di online without installing an app?",
                answer: "Yes. big2.app runs in your browser, so you can start games without a separate download.",
            },
            {
                question: "Does big2.app work on mobile for Dai Di games?",
                answer: "Yes. The site works in modern mobile browsers as well as desktop browsers.",
            },
        ],
    },
    {
        route: "/choh-dai-di",
        title: "Choh Dai Di Online | Big Two With Friends Or Bots | big2.app",
        description: "Play Choh Dai Di online in a modern Big Two web app. Start private rooms with friends or sharpen your game against bots.",
        heading: "Choh Dai Di Online",
        intro: "A modern online home for players who know the game as Choh Dai Di and want a cleaner browser experience.",
        sections: [
            {
                title: "What Players Mean By Choh Dai Di",
                paragraphs: [
                    "Choh Dai Di, Choi Dai Di, and Big Two usually refer to the same card game family. Players searching this term are usually looking for an easy-to-share online version with smooth gameplay, friend rooms, and useful practice options.",
                ],
            },
            {
                title: "Why Play On big2.app",
                list: [
                    "Clean modern browser app designed for quick room creation and sharing.",
                    "Invite friends into a private table without extra install friction.",
                    "Use bots for practice when you do not have four human players available.",
                    "Track personal stats and recent match history after completed games.",
                    "Runs on both desktop and mobile browsers.",
                ],
            },
            {
                title: "Rules And Variants",
                paragraphs: [
                    "Different families and regions may use slightly different Choh Dai Di conventions, but the core game is still the same race to empty your cards first by climbing over the active hand.",
                ],
            },
        ],
        faq: [
            {
                question: "Is Choh Dai Di the same as Big Two?",
                answer: "Usually yes. It is generally another name for the same climbing card game family.",
            },
            {
                question: "Can I use big2.app for private Choh Dai Di games?",
                answer: "Yes. You can create a room and share it with friends for private browser play.",
            },
            {
                question: "Why make a Choh Dai Di page if the game is Big Two?",
                answer: "Because many players search with the regional name first, and a dedicated page helps them find the right game faster.",
            },
        ],
    },
    {
        route: "/capsa-banting",
        title: "Capsa Banting Online | Modern Big 2 Browser Game | big2.app",
        description: "Play Capsa Banting online in a modern browser game. Invite friends to a private table or practice the Big Two style rules against bots.",
        heading: "Capsa Banting Online",
        intro: "If you are searching for Capsa Banting online, big2.app gives you the same core game in a cleaner browser interface.",
        sections: [
            {
                title: "What Players Mean By Capsa Banting",
                paragraphs: [
                    "Capsa Banting is another regional name used for the Big Two family of climbing games. Rule details can vary by table, but players searching this term are generally looking for the same race to empty all 13 cards first.",
                ],
            },
            {
                title: "Why Play On big2.app",
                list: [
                    "Clean modern browser app for quick private games and practice.",
                    "Fast room creation for friend groups.",
                    "Bot support for practice and solo play.",
                    "Track personal stats and recent match history after completed games.",
                    "Browser-based access on mobile and desktop.",
                ],
            },
            {
                title: "Rules And Variants",
                paragraphs: [
                    "As with other names in this game family, Capsa Banting tables can differ slightly on rankings and special cases. The core loop remains the same climbing structure familiar to Big Two players.",
                ],
            },
        ],
        faq: [
            {
                question: "Is Capsa Banting the same as Big Two?",
                answer: "In most search contexts, yes. It refers to the same broader climbing card game family.",
            },
            {
                question: "Can I play Capsa Banting online with friends on big2.app?",
                answer: "Yes. Create a room, share it with friends, and play in the browser.",
            },
            {
                question: "Does big2.app have bots for Capsa Banting style play?",
                answer: "Yes. Bot play helps when you want to practice or fill a table faster.",
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
