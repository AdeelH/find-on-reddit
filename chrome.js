
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
