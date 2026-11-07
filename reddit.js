import { getOptions, searchCache, cache } from "./chrome.js";
import { DEFAULT_CACHE_PERIOD_MINS } from "./query.js";

// The logged-out .json API and /api/info are blocked; api.reddit.com/search still
// works with the user's own Reddit session. See https://github.com/AdeelH/find-on-reddit/issues/59
export const SEARCH_API =
    "https://api.reddit.com/search?sort=top&t=all&limit=100&q=url:";
export const DUPLICATES_API = "https://api.reddit.com/duplicates/";

export async function findOnReddit(url, useCache = true, exact = true) {
    const query = encodeURIComponent(url);
    const [key, otherKey] = exact
        ? ["exact", "nonExact"]
        : ["nonExact", "exact"];
    const data = (await searchCache(query))[query] || {};
    if (useCache && (await checkCacheValidity(data, key))) {
        return {
            posts: data[key].posts,
            fromCache: true,
            other: data[otherKey]?.posts.length,
        };
    }
    const results = await searchApi(url);
    try {
        await cachePosts(query, results.exact, true);
        await cachePosts(query, results.nonExact, false);
    } catch (e) {
        console.log(e);
    }
    return {
        posts: results[key],
        fromCache: false,
        other: results[otherKey].length,
    };
}

// One search request serves both modes: exact matches are filtered out of its results.
async function searchApi(url) {
    const query = encodeURIComponent(stripProtocol(url));
    const nonExact = await getPostsViaApi(`${SEARCH_API}${query}`);
    const target = normalizeUrl(url);
    const exact = nonExact.filter(
        (p) => normalizeUrl(p.data.url || "") === target,
    );
    return { exact, nonExact };
}

function stripProtocol(url) {
    return url.replace(/^https?:\/\//i, "");
}

function normalizeUrl(url) {
    return stripProtocol(url).replace(/\/$/, "");
}

export async function getPostsViaApi(requestUrl) {
    const res = await makeApiRequest(requestUrl);
    const posts = res.data.children;
    const posts_extended = add_duplicates(posts);
    return posts_extended;
}

export async function add_duplicates(posts) {
    /**
     * Pick the first post, get its duplicates, if there are any that are not
     * already in the results, add them.
     */
    if (posts.length == 0) {
        return posts;
    }
    let all_ids = new Set(posts.map((p) => p.data.id));
    let id = posts[0].data.id;
    let duplicates = await get_duplicates_for_id(id);
    let newPosts = duplicates.filter((p) => !all_ids.has(p.data.id));
    let expandedPosts = posts.concat(newPosts);
    return expandedPosts;
}

export async function get_duplicates_for_id(post_id) {
    const requestUrl = `${DUPLICATES_API}${post_id}`;
    // the duplicates API endpoint returns an array of 2, the 2nd element of
    // which contains the duplicate posts
    const res = await makeApiRequest(requestUrl);
    const posts = res.length > 1 ? res[1].data.children : [];
    return posts;
}

export async function makeApiRequest(url) {
    // Requests are only accepted with the user's own Reddit session.
    const res = await fetch(url, { credentials: "include" });
    if (!res.ok) {
        throw await buildResponseError(res);
    }
    return res.json();
}

async function buildResponseError(res) {
    const text = await res.text().catch(() => "");
    if (res.status === 403 || /blocked by network security/i.test(text)) {
        const error = new Error(`${res.status} Blocked by Reddit`);
        error.blocked = true;
        error.retryable = false;
        return error;
    }
    // Reddit error bodies look like {"message", "error", "reason"?, "explanation"?}
    let body = {};
    try {
        body = JSON.parse(text) ?? {};
    } catch (e) {
        // non-JSON body
    }
    const summary = body.message || res.statusText;
    const detail = body.explanation || body.reason;
    return new Error(
        [res.status, summary, detail && `(${detail})`]
            .filter(Boolean)
            .join(" "),
    );
}

export async function cachePosts(query, posts, exact) {
    const key = exact ? "exact" : "nonExact";
    const old_cache = await searchCache(query);

    let objectToStore = {};
    let data = old_cache[query] || {};
    data[key] = {
        posts: posts,
        time: Date.now(),
    };
    objectToStore[query] = data;
    await cache(objectToStore);
}

export async function checkCacheValidity(cache, key) {
    if (!cache.hasOwnProperty(key)) {
        return false;
    }
    const data = cache[key];
    if (!(data.time && data.posts)) {
        return false;
    }
    const diff = Date.now() - data.time;
    const query = { cache: { period: DEFAULT_CACHE_PERIOD_MINS } };
    const opts = await getOptions(query);
    const not_expired = diff < +opts.cache.period * 60000;
    return not_expired;
}
