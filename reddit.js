const baseUrl = 'https://www.reddit.com/api/info.json?url=';

function findOnReddit(url, useCache = true) {
	let query = encodeURIComponent(url);
	let results = search(query, useCache);
	results.then(res => cachePosts(query, res)).catch(ignoreRejection);
	return results
		.then(res => res.data.children)
		.then(posts => posts.sort((p1, p2) => p2.data.score - p1.data.score));
}

function search(query, useCache = true) {
	let requestUrl = `${baseUrl}${query}`;
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
	return new Promise((resolve, reject) => {
		$.get(url).done(resolve).fail(reject);
	});
}
