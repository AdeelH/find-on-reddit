
export async function getCurrentTabUrl() {
	const tab = await getCurrentTab();
	return tab.url;
}

export function getCurrentTab() {
	const query = {
		active: true,
		currentWindow: true
	};
	return new Promise((resolve, reject) => {
		chrome.tabs.query(query, tabs => resolve(tabs[0]));
	});
}

export function getTabById(tabId) {
	return new Promise((resolve, reject) => {
		chrome.tabs.get(tabId, resolve);
	});
}

export async function navigateTo(url) {
	const tab = await getCurrentTab();
	if (!chrome.runtime.lastError) {
		chrome.tabs.update(tab.id, { url: url });
	}
}

export function searchCache(query) {
	return new Promise((resolve, reject) => {
		chrome.storage.local.get(query, resolve);
	});
}

export function clearCache() {
	return new Promise((resolve, reject) => {
		chrome.storage.local.clear(resolve);
	});
}

export function cache(data) {
	return new Promise((resolve, reject) => {
		chrome.storage.local.set(data, resolve);
	});
}

export function updateOptions(data) {
	return new Promise((resolve, reject) => {
		chrome.storage.sync.set({ options: data }, resolve);
	});
}

export function getOptions(query) {
	return new Promise((resolve, reject) => {
		chrome.storage.sync.get({ options: query }, data => resolve(data.options));
	});
}

export function ignoreRejection(...args) {
	return Promise.resolve();
}
