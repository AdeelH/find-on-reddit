
function findOnReddit(url, useCache = true) {
	let query = encodeURIComponent(processUrl(url));
	return search(query, useCache).then(posts => {
			displayPosts(posts);
			cachePosts(query, posts);
		});
}

function search(query, useCache = true) {
	let requestUrl = `${baseUrl}${query}`;
	if (!useCache) {
		return makeApiRequest(requestUrl);
	}
	return searchCache(query).then(cache => {
	    let data = cache[query];
		if (isCacheValid(data)) {
			return Promise.resolve(data.posts);
		} else {
			return makeApiRequest(requestUrl);
		}
	});
}

function cachePosts(query, posts) {
	let objectToStore = {};
	objectToStore[query] = {
		posts: posts,
		time: Date.now()
	};
	clearCache().then(() => cache(objectToStore));
}

function makeApiRequest(url) {
	return new Promise((resolve, reject) => {
		$.get(url).done(resolve).fail(reject);
	});
}
