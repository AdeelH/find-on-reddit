
const REJECT_REASON = {
	chromeUrl: 'chromeUrl',
};
const BADGE_COLORS = {
	error: '#DD1616',
	success: '#717171'
};

(function init() {
	clearCache();
	let query = {
		options: { autorun: true }
	};
	getOptions(query).then(options => {
		if (options.autorun) {
			registerHandlers();
		}
	});
})();

function registerHandlers() {
	chrome.tabs.onCreated.addListener(tab => {
		autoFind(tab.id, tab.url);
	});

	chrome.tabs.onUpdated.addListener((tabId, info, tab) => {
		autoFind(tabId, tab.url);
	});

	chrome.tabs.onActivated.addListener(activeInfo => {
		let tabId = activeInfo.tabId;
		getTabById(tabId)
			.then(tab => autoFind(tab.id, tab.url));
	});
}

function autoFind(tabId, url) {
	checkIfAllowed(url)
		.then(url => findOnReddit(processUrl(url)))
		.then(posts => setResultsBadge(tabId, `${posts.length}`))
		.catch(e => handleError(e, tabId));
}

function checkIfAllowed(url) {
	if (isChromeUrl(url)) {
		return Promise.reject(REJECT_REASON.chromeUrl);
	}
	return Promise.resolve(url);
}

function handleError(e, tabId) {
	switch (e) {
		case REJECT_REASON.chromeUrl: break;
		default: setErrorBadge(tabId);
	}
}

function isChromeUrl(url) {
	return /^chrome/.test(url);
}

function setErrorBadge(tabId) {
	setBadge(tabId, 'X', BADGE_COLORS.error);
}

function setResultsBadge(tabId, text) {
	setBadge(tabId, text, BADGE_COLORS.success);
}

function setBadge(tabId, text, color) {
	let badge = { text: text, tabId: tabId };
	chrome.browserAction.setBadgeText(badge);
	if (color) {
		let bg = { color: color, tabId: tabId };
		chrome.browserAction.setBadgeBackgroundColor(bg);
	}
}
