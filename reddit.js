const SEARCH_API = 'https://api.reddit.com/search.json?sort=top&t=all&limit=100&q=url:';
const INFO_API = 'https://reddit.com/api/info.json?url=';

function findOnReddit(url, useCache = true, exact = true) {
	let query = encodeURIComponent(url);
	let results = search(query, useCache, exact);
	results.then(res => cachePosts(query, res, exact)).catch(ignoreRejection);
	return results;
}

function search(query, useCache = true, exact = true) {
	let requestUrl = `${exact ? INFO_API : SEARCH_API}${query}`;
	if (!useCache) {
		return getPostsViaApi(requestUrl);
	}
	return searchCache(query).then(cache => {
		let data = cache[query] || {};
		let key = exact ? 'exact' : 'nonExact';
		let otherResults = data[exact ? 'nonExact' : 'exact'];
		return checkCacheValidity(data, key).then(isValid => {
			if (isValid) {
				posts = data[key].posts;
				if (otherResults) {
					posts.other = otherResults.posts.length;
				}
				return posts;
			} else {
				let res = getPostsViaApi(requestUrl);
				if (otherResults) {
					res.then(posts => {
						posts.other = otherResults.posts.length;
						return posts;
					});
				}
				return res;
			}
		});
	});
}

function getPostsViaApi(requestUrl) {
	let res = makeApiRequest(requestUrl)
	return res.then((res) => res.data.children);
}

function makeApiRequest(url) {
	console.log('cache miss');
	return new Promise((resolve, reject) => {
		$.get(url).done(resolve).fail(reject);
	});
}

function cachePosts(query, posts, exact) {
	let key = exact ? 'exact' : 'nonExact';
	searchCache(query).then(c => {
		let objectToStore = {};
		let data = c[query] || {};
		data[key] = {
			posts: posts,
			time: Date.now()
		};
		objectToStore[query] = data;
		return cache(objectToStore);
	});
}

function checkCacheValidity(cache, key) {
	if (!cache.hasOwnProperty(key)) {
		return Promise.resolve(false);
	}
	let data = cache[key];
	if (!(data.time && data.posts)) {
		return Promise.resolve(false);
	}
	let diff = Date.now() - data.time;
	let query = { cache: { period: DEFAULT_CACHE_PERIOD_MINS } };
	return getOptions(query).then(opts => diff < +(opts.cache.period) * 60e3);
}
