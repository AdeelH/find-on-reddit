import {clearCache, getTabById, getOptions, ignoreRejection} from './chrome.js';
import {processUrl, removeQueryString, isYoutubeUrl} from './url.js';
import {findOnReddit} from './reddit.js';
import {bgOptions} from './query.js';


const BADGE_COLORS = {
	error: '#DD1616',
	success: '#555555'
};

let bgOpts;

// The respective listeneres will noop if these are false. This hack is needed
// because we can no longer restart the background page in v3.
let tabUpdatedListenerActive = false;
let tabActivatedListenerActive = false;

// Throttling mechanism to handle multiple firings of the tabs.onUpdated event
// as the tab goes through different states while loading.
let recentlyQueried = new Set([]);

// this function seems to run only once in v3, which is fine
(function init() {
	// Avoid storage bloat. Ideally, this should happen on browser exit, 
	// but the Chrome API doesn't provide an event for that.
	clearCache();
	chrome.tabs.onUpdated.addListener(tabUpdatedListener);
	chrome.tabs.onActivated.addListener(tabActivatedListener);
	updateListenerFlags();
})();

function updateListenerFlags() {
	getOptions(bgOptions).then(opts => {
		bgOpts = opts;
		tabUpdatedListenerActive = bgOpts.autorun.updated
		tabActivatedListenerActive = bgOpts.autorun.activated;
	});
}

function tabUpdatedListener(tabId, info, tab) {
	updateListenerFlags();
	if (!tabUpdatedListenerActive) {
		return;
	}
	if (recentlyQueried.has(tab.url)) {
		return;
	}
	recentlyQueried.add(tab.url);
	setTimeout(() => recentlyQueried.delete(tab.url), 1e3);
	return removeBadge(tabId).then(() => autoFind(tabId, tab.url));
}

function tabActivatedListener(activeInfo) {
	updateListenerFlags();
	if (!tabActivatedListenerActive) {
		return;
	}
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
				setResultsBadge(tabId, posts);
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
		.then(posts => setResultsBadge(tabId, posts))
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

function numToBadgeText(n) {
	if (n < 1_000) {
		return `${n}`;
	} else if (n < 1_000_000) {
		return `${Math.trunc(n / 1_000)}K`;
	} else if (n < 1_000_000_000) {
		return `${Math.trunc(n / 1_000_000)}M`;
	}
}

function setResultsBadge(tabId, posts) {
	let color = BADGE_COLORS.success;
	if (!posts || posts.length === 0) {
		return setBadge(tabId, '0', color);
	}
	if (bgOpts.autorun.badgeContent === 'num_comments') {
		let numComments = posts.reduce((acc, p) => acc + p.data.num_comments, 0);
		return setBadge(tabId, `${numToBadgeText(numComments)}`, color);
	} else {
		let numPosts = posts.length;
		return setBadge(tabId, `${numToBadgeText(numPosts)}`, color);
	}
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
