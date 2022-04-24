import {clearCache, getTabById, getOptions, ignoreRejection} from './chrome.js';
import {processUrl, removeQueryString, isYoutubeUrl} from './url.js';
import {findOnReddit} from './reddit.js';
import {bgOptions} from './query.js';

const BADGE_COLORS = {
	error: '#DD1616',
	success: '#555555'
};
let bgOpts;

(function init() {
	// Avoid storage bloat. Ideally, this should happen on browser exit, 
	// but the Chrome API doesn't provide an event for that
	clearCache();
	getOptions(bgOptions).then(opts => {
		bgOpts = opts;
		registerHandlers();
	});
})();

function registerHandlers() {
	if (bgOpts.autorun.updated) {
		if (!chrome.tabs.onUpdated.hasListener(tabUpdatedListener)) {
			chrome.tabs.onUpdated.addListener(tabUpdatedListener);
		}
	} else {
		if (chrome.tabs.onUpdated.hasListener(tabUpdatedListener)) {
			chrome.tabs.onUpdated.removeListener(tabUpdatedListener);
		}
	}
	if (bgOpts.autorun.activated) {
		if (!chrome.tabs.onActivated.hasListener(tabActivatedListener)) {
			chrome.tabs.onActivated.addListener(tabActivatedListener);
		}
	} else {
		if (chrome.tabs.onActivated.hasListener(tabActivatedListener)) {
			chrome.tabs.onActivated.removeListener(tabActivatedListener);
		}
	}
}

function tabUpdatedListener(tabId, info, tab) {
	return removeBadge(tabId).then(() => autoFind(tabId, tab.url));
}

function tabActivatedListener(activeInfo) {
	let tabId = activeInfo.tabId;
	return getTabById(tabId).then(tab => autoFind(tabId, tab.url));
}


function autoFind(tabId, url) {
	if (!isAllowed(removeQueryString(url))) {
		return;
	}
	let isYt = isYoutubeUrl(url) && bgOpts.search.ytHandling;
	let exactMatch = bgOpts.search.exactMatch && !isYt;
	let urlToSearch = processUrl(url, bgOpts.search.ignoreQs, isYt);

	if (exactMatch) {
		searchExact(tabId, urlToSearch);
	} else {
		searchNonExact(tabId, urlToSearch);
	}
}

const BG_RETRY_INTERVAL = 5e3;
const MAX_RETRIES = 5;
function searchExact(tabId, url, retryCount = 0) {
	if (retryCount >= MAX_RETRIES) {
		return;
	}
	findOnReddit(url, true, true)
		.then(posts => {
			if (bgOpts.autorun.retryExact && posts.length === 0) {
				searchNonExact(tabId, url);
			} else {
				setResultsBadge(tabId, `${posts.length}`);
			}
		})
		.catch(e => {
			if (bgOpts.autorun.retryError) {
				setTimeout(() => searchExact(tabId, url, retryCount + 1), BG_RETRY_INTERVAL);
			}
			handleError(e, tabId);
		});
}

function searchNonExact(tabId, url, retryCount = 0) {
	if (retryCount >= MAX_RETRIES) {
		return;
	}
	findOnReddit(url, true, false)
		.then(posts => setResultsBadge(tabId, `${posts.length}`))
		.catch(e => {
			if (bgOpts.autorun.retryError) {
				setTimeout(() => searchNonExact(tabId, url, retryCount + 1), BG_RETRY_INTERVAL);
			}
			handleError(e, tabId);
		});
}

function isAllowed(url) {
	url = url.toLowerCase();
	return !(isChromeUrl(url) || isBlackListed(url));
}

function isBlackListed(url) {
	return bgOpts.blacklist.some(s => url.search(s) > -1);
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

function removeBadge(tabId) {
	return setResultsBadge(tabId, '');
}

function setBadge(tabId, text, color) {
	let badge = { text: text, tabId: tabId };
	let bgCol = { color: color, tabId: tabId };
	return getTabById(tabId).then(tab => {
		if (!chrome.runtime.lastError) {
			chrome.action.setBadgeText(badge);
		}
		if (!chrome.runtime.lastError) {
			chrome.action.setBadgeBackgroundColor(bgCol);
		}
	}).catch(ignoreRejection);
}
