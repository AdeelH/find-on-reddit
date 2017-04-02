const SEARCH_API = 'https://api.reddit.com/search.json?sort=top&t=all&limit=100&q=url:';
const INFO_API = 'https://reddit.com/api/info.json?url=';

function findOnReddit(url, useCache = true, exact = true) {
	let query = encodeURIComponent(url);
	let results = search(query, useCache, exact);
	results.then(res => cachePosts(query, res)).catch(ignoreRejection);
	results = results.then(res => res.data.children);
	if (exact) {
		return results
			.then(ps => ps.sort((p, q) => q.data.score - p.data.score));
	}
	return results;
}

function search(query, useCache = true, exact = true) {
	let requestUrl = `${exact ? INFO_API : SEARCH_API}${query}`;
	if (!useCache) {
		return makeApiRequest(requestUrl);
	}
	return searchCache(query).then(cache => {
		let data = cache[query];
		return checkCacheValidity(data).then(isValid =>
			isValid ? data.posts : makeApiRequest(requestUrl)
		);
	});
}

function cachePosts(query, posts) {
	let objectToStore = {};
	objectToStore[query] = {
		posts: posts,
		time: Date.now()
	};
	return cache(objectToStore);
}

function makeApiRequest(url) {
	console.log('cache miss');
	return new Promise((resolve, reject) => {
		$.get(url).done(resolve).fail(reject);
	});
}
