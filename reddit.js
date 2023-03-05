import { getOptions, searchCache, cache, ignoreRejection } from './chrome.js';
import { DEFAULT_CACHE_PERIOD_MINS } from './query.js';

export const SEARCH_API = 'https://api.reddit.com/search.json?sort=top&t=all&limit=100&q=url:';
export const INFO_API = 'https://reddit.com/api/info.json?url=';
export const DUPLICATES_API = 'https://api.reddit.com/duplicates/';

export async function findOnReddit(url, useCache = true, exact = true) {
	if (!exact) {
		url = url.replace(/^https?\:\/\//i, "");
	}
	const query = encodeURIComponent(url);
	const posts = await search(query, useCache, exact);
	try {
		cachePosts(query, posts, exact);
	} catch (e) {
		ignoreRejection(e);
	}
	return posts;
}

export async function search(query, useCache = true, exact = true) {
	const requestUrl = `${exact ? INFO_API : SEARCH_API}${query}`;
	if (!useCache) {
		return getPostsViaApi(requestUrl);
	}
	const cache = await searchCache(query);
	const data = cache[query] || {};
	const key = exact ? 'exact' : 'nonExact';
	const otherResults = data[exact ? 'nonExact' : 'exact'];
	const isValid = await checkCacheValidity(data, key);
	if (isValid) {
		let posts = data[key].posts;
		if (otherResults) {
			posts.other = otherResults.posts.length;
		}
		return posts;
	} else {
		let posts = await getPostsViaApi(requestUrl);
		if (otherResults) {
			posts.other = otherResults.posts.length;
		}
		return posts;
	}
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
	let newPosts = duplicates.filter(p => !all_ids.has(p.data.id));
	let expandedPosts = posts.concat(newPosts);
	return expandedPosts;
}

export async function get_duplicates_for_id(post_id) {
	const requestUrl = `${DUPLICATES_API}${post_id}`;
	// the duplicates API endpoint returns an array of 2, the 2nd element of
	// which contains the duplicate posts
	const res = await makeApiRequest(requestUrl);
	const posts = (res.length > 1) ? res[1].data.children : [];
	return posts;
}

export async function makeApiRequest(url) {
	const res = await fetch(url);
	return res.json();
}

export async function cachePosts(query, posts, exact) {
	const key = exact ? 'exact' : 'nonExact';
	const old_cache = await searchCache(query);

	let objectToStore = {};
	let data = old_cache[query] || {};
	data[key] = {
		posts: posts,
		time: Date.now()
	};
	objectToStore[query] = data;
	return cache(objectToStore);
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
	const not_expired = diff < +(opts.cache.period) * 60000;
	return not_expired;
}
