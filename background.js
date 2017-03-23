const BADGE_COLORS = {
	error: '#DD1616',
	success: '#717171'
};

(function init() {
	clearCache();
	let query = {
		options: { autorun: true }
	};
		}
	});
	getOptions(query).then(registerHandlers);
})();

function registerHandlers(options) {
	if (options.autorun.updated) {
		chrome.tabs.onUpdated.addListener((tabId, info, tab) => {
			autoFind(tabId, tab.url);
		});
	}

	if (options.autorun.activated) {
		chrome.tabs.onActivated.addListener(activeInfo => {
			let tabId = activeInfo.tabId;
			getTabById(tabId).then(tab => autoFind(tabId, tab.url));
		});
	}
}

function autoFind(tabId, url) {
	if (isAllowed(url)) {
		return findOnReddit(processUrl(url))
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
