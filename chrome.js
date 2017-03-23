
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

const CACHE_AGE_LIMIT_MILLIS = 1e3 * 60 * 15; // 15 minutes
function isCacheValid(data) {
	return data && data.time && (Date.now() - data.time) < CACHE_AGE_LIMIT_MILLIS;
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
