const BADGE_COLORS = {
	error: '#DD1616',
	success: '#717171'
};
let searchOpts;

(function init() {
	// Avoid storage bloat. Ideally, this should happen on browser exit, 
	// but the Chrome API doesn't provide an event for that
	clearCache();
	getOptions(bgOptions).then(opts => {
		searchOpts = opts.search;
		registerHandlers(opts);
	});
})();

function registerHandlers(opts) {
	if (opts.autorun.updated) {
		chrome.tabs.onUpdated.addListener((tabId, info, tab) => {
			autoFind(tabId, tab.url);
		});
	}

	if (opts.autorun.activated) {
		chrome.tabs.onActivated.addListener(activeInfo => {
			let tabId = activeInfo.tabId;
			getTabById(tabId).then(tab => autoFind(tabId, tab.url));
		});
	}
}

function autoFind(tabId, url) {
	if (isAllowed(url)) {
		let urlToSearch = processUrl(url, searchOpts.ignoreQs, searchOpts.ytHandling);
		return findOnReddit(urlToSearch)
			.then(posts => setResultsBadge(tabId, `${posts.length}`))
			.catch(e => handleError(e, tabId));
	}
}

function isAllowed(url) {
	return !isChromeUrl(url);
}

function handleError(e, tabId) {
	return setErrorBadge(tabId);
}

function isChromeUrl(url) {
	return /^chrome/.test(url);
}

function setErrorBadge(tabId) {
	return setBadge(tabId, 'X', BADGE_COLORS.error);
}

function setResultsBadge(tabId, text) {
	return setBadge(tabId, text, BADGE_COLORS.success);
}

function setBadge(tabId, text, color) {
	let badge = { text: text, tabId: tabId };
	let bgCol = { color: color, tabId: tabId };
	return getTabById(tabId).then(tab => {
		if (!chrome.runtime.lastError) {
			chrome.browserAction.setBadgeText(badge);
		}
		if (!chrome.runtime.lastError) {
			chrome.browserAction.setBadgeBackgroundColor(bgCol);
		}
	}).catch(ignoreRejection);
}
