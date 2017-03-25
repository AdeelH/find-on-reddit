const baseUrl = 'https://api.reddit.com/search.json?sort=top&t=all&limit=100&q=url:';

function findOnReddit(url, useCache = true) {
	let query = encodeURIComponent(url);
	let results = search(query, useCache);
	results.then(res => cachePosts(query, res)).catch(ignoreRejection);
	return results.then(res => res.data.children);
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
	console.log('cache miss');
	return new Promise((resolve, reject) => {
		$.get(url).done(resolve).fail(reject);
	});
}
