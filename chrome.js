
function getCurrentTabUrl() {
	let queryOptions = {
		active: true,
		currentWindow: true
	};
	return new Promise((resolve, reject) => {
		chrome.tabs.query(queryOptions, tabs => resolve(tabs[0].url));
	});
}

function getTabById(tabId) {
	return new Promise((resolve, reject) => {
		chrome.tabs.get(tabId, resolve);
	});
}

function searchCache(query) {
	return new Promise((resolve, reject) => {
		chrome.storage.local.get(query, resolve);
	});
}

function clearCache() {
	return new Promise((resolve, reject) => {
		chrome.storage.local.clear(resolve);
	});
}

function cache(data) {
	return new Promise((resolve, reject) => {
		chrome.storage.local.set(data, resolve);
	});
}

const DEFAULT_CACHE_PERIOD_MINS = 30;
function checkCacheValidity(data) {
	if (!(data && data.time)) {
		return Promise.resolve(false);
	}
	let diff = Date.now() - data.time;
	let query = { cache: { period: DEFAULT_CACHE_PERIOD_MINS } };
	return getOptions(query).then(cahce => diff < +(cache.period) * 60e3);
}

function updateOptions(data) {
	return new Promise((resolve, reject) => {
		chrome.storage.sync.set({ options: data }, resolve);
	});
}

function getOptions(query) {
	return new Promise((resolve, reject) => {
		chrome.storage.sync.get({options: query}, data => resolve(data.options));
	});
}

function reloadBackgroundPage() {
	return new Promise((resolve, reject) => {
		chrome.runtime.getBackgroundPage(bgPage => resolve(bgPage.location.reload()));
	});
}

function ignoreRejection(...args) {
	return Promise.resolve();
}
