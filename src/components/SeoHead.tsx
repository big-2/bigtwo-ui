import { useEffect } from "react";

interface SeoHeadProps {
    title: string;
    description: string;
    canonicalPath: string;
    robots?: string;
}

const upsertMeta = (selector: string, attrName: "name" | "property", attrValue: string, content: string) => {
    let tag = document.querySelector(selector) as HTMLMetaElement | null;
    if (!tag) {
        tag = document.createElement("meta");
        tag.setAttribute(attrName, attrValue);
        document.head.appendChild(tag);
    }
    tag.setAttribute("content", content);
};

const upsertCanonical = (href: string) => {
    let link = document.querySelector('link[rel="canonical"]') as HTMLLinkElement | null;
    if (!link) {
        link = document.createElement("link");
        link.setAttribute("rel", "canonical");
        document.head.appendChild(link);
    }
    link.setAttribute("href", href);
};

const SeoHead = ({ title, description, canonicalPath, robots = "index, follow" }: SeoHeadProps) => {
    useEffect(() => {
        const origin = "https://big2.app";
        const canonicalUrl = `${origin}${canonicalPath}`;
        const socialImageUrl = `${origin}/bigtwo.png`;

        document.title = title;
        upsertMeta('meta[name="description"]', "name", "description", description);
        upsertMeta('meta[name="robots"]', "name", "robots", robots);
        upsertMeta('meta[property="og:title"]', "property", "og:title", title);
        upsertMeta('meta[property="og:description"]', "property", "og:description", description);
        upsertMeta('meta[property="og:url"]', "property", "og:url", canonicalUrl);
        upsertMeta('meta[property="og:type"]', "property", "og:type", "website");
        upsertMeta('meta[property="og:image"]', "property", "og:image", socialImageUrl);
        upsertMeta('meta[name="twitter:card"]', "name", "twitter:card", "summary_large_image");
        upsertMeta('meta[name="twitter:title"]', "name", "twitter:title", title);
        upsertMeta('meta[name="twitter:description"]', "name", "twitter:description", description);
        upsertMeta('meta[name="twitter:url"]', "name", "twitter:url", canonicalUrl);
        upsertMeta('meta[name="twitter:image"]', "name", "twitter:image", socialImageUrl);
        upsertCanonical(canonicalUrl);
    }, [title, description, canonicalPath, robots]);

    return null;
};

export default SeoHead;
