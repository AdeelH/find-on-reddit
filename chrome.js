
function getCurrentTabUrl() {
	return getCurrentTab().then(tab => tab.url);
}

function getCurrentTab() {
	let query = {
		active: true,
		currentWindow: true
	};
	return new Promise((resolve, reject) => {
		chrome.tabs.query(query, tabs => resolve(tabs[0]));
	});
}

function getTabById(tabId) {
	return new Promise((resolve, reject) => {
		chrome.tabs.get(tabId, resolve);
	});
}

function navigateTo(url) {
	return getCurrentTab().then(tab => {
		if (!chrome.runtime.lastError) {
			chrome.tabs.update(tab.id, {url: url});
		}
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
	if (!(data && data.time && data.posts)) {
		return Promise.resolve(false);
	}
	let diff = Date.now() - data.time;
	let query = { options: { cache: { period: DEFAULT_CACHE_PERIOD_MINS } } };
	return getOptions(query).then(opts => diff < +(opts.cache.period) * 60e3);
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
