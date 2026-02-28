import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

const distIndexPath = path.resolve("dist/index.html");

const ROUTES = [
    {
        route: "/how-to-play",
        title: "How To Play Big Two Online | big2.app",
        description: "Learn how to play Big Two online: setup, turn order, legal combinations, ranking rules, and how rounds are won.",
    },
    {
        route: "/rules",
        title: "Big Two Rules And Card Rankings | big2.app",
        description: "Detailed Big Two rules: rank order, suit order, valid combinations, and hand comparison rules for online play.",
    },
    {
        route: "/strategy",
        title: "Big Two Strategy Tips For Beginners | big2.app",
        description: "Practical Big Two strategy tips: controlling tempo, saving power cards, and managing hand structure to win more rounds.",
    },
    {
        route: "/faq",
        title: "Big Two FAQ | big2.app",
        description: "Frequently asked questions about Big Two online: player count, free play, card order, and combination rules.",
    },
];

const replaceTag = (html, pattern, replacement) => {
    if (!pattern.test(html)) {
        return html;
    }
    return html.replace(pattern, replacement);
};

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
