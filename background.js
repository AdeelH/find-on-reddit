import { clearCache, getTabById, getOptions, ignoreRejection } from './chrome.js';
import { processUrl, removeQueryString, isYoutubeUrl } from './url.js';
import { findOnReddit } from './reddit.js';
import { bgOptions } from './query.js';


const BADGE_COLORS = {
	error: '#DD1616',
	success: '#555555'
};

let bgOpts;

// The respective listeners will noop if these are false. This hack is needed
// because we can no longer restart the background page in v3.
let tabUpdatedListenerActive = false;
let tabActivatedListenerActive = false;

// Throttling mechanism to handle multiple firings of the tabs.onUpdated event
// as the tab goes through different states while loading.
let recentlyQueried = new Set([]);

// this function seems to run only once in v3, which is fine
// this CANNOT be async because "Top-level await is disallowed in service workers."
(function init() {
	// Avoid storage bloat. Ideally, this should happen on browser exit, 
	// but the Chrome API doesn't provide an event for that.
	clearCache();
	chrome.tabs.onUpdated.addListener(tabUpdatedListener);
	chrome.tabs.onActivated.addListener(tabActivatedListener);
	updateListenerFlags();
})();

async function updateListenerFlags() {
	const opts = await getOptions(bgOptions);
	bgOpts = opts;
	tabUpdatedListenerActive = bgOpts.autorun.updated;
	tabActivatedListenerActive = bgOpts.autorun.activated;
}

async function tabUpdatedListener(tabId, info, tab) {
	updateListenerFlags();
	if (!tabUpdatedListenerActive) {
		return;
	}
	if (recentlyQueried.has(tab.url)) {
		return;
	}
	recentlyQueried.add(tab.url);
	setTimeout(() => recentlyQueried.delete(tab.url), 1e3);
	await removeBadge(tabId);
	return autoSearch(tabId, tab.url);
}

async function tabActivatedListener(activeInfo) {
	updateListenerFlags();
	if (!tabActivatedListenerActive) {
		return;
	}
	const tabId = activeInfo.tabId;
	const tab = await getTabById(tabId);
	return autoSearch(tabId, tab.url);
}


async function autoSearch(tabId, url) {
	if (!isAllowed(removeQueryString(url))) {
		return;
	}
	const isYt = isYoutubeUrl(url) && bgOpts.search.ytHandling;
	const exactMatch = bgOpts.search.exactMatch && !isYt;
	const urlToSearch = processUrl(url, bgOpts.search.ignoreQs, isYt);
	let posts;
	if (exactMatch) {
		posts = await searchExact(tabId, urlToSearch);
	} else {
		posts = await searchNonExact(tabId, urlToSearch);
	}
	return setResultsBadge(tabId, posts);
}

const BG_RETRY_INTERVAL = 5e3;
const MAX_RETRIES = 5;
async function searchExact(tabId, url, retryCount = 0) {
	if (retryCount >= MAX_RETRIES) {
		return;
	}
	try {
		const searchResults = await findOnReddit(url, true, true);
		const posts = searchResults.posts;
		if (bgOpts.autorun.retryExact && posts.length === 0) {
			return searchNonExact(tabId, url);
		}
		return posts;
	} catch (e) {
		if (bgOpts.autorun.retryError) {
			setTimeout(() => searchExact(tabId, url, retryCount + 1), BG_RETRY_INTERVAL);
		}
		await handleError(e, tabId);
	}
}

async function searchNonExact(tabId, url, retryCount = 0) {
	if (retryCount >= MAX_RETRIES) {
		return;
	}
	try {
		const searchResults = await findOnReddit(url, true, false);
		return searchResults.posts;
	} catch (e) {
		if (bgOpts.autorun.retryError) {
			setTimeout(() => searchNonExact(tabId, url, retryCount + 1), BG_RETRY_INTERVAL);
		}
		await handleError(e, tabId);
	}
}

function isAllowed(url) {
	url = url.toLowerCase();
	return (url.length > 0) && !(isChromeUrl(url) || isBlackListed(url));
}

function isBlackListed(url) {
	return bgOpts.blacklist.some(s => url.search(s) > -1);
}

async function handleError(e, tabId) {
	console.log(e);
	return setErrorBadge(tabId);
}

function isChromeUrl(url) {
	return /^chrome/.test(url);
}

async function setErrorBadge(tabId) {
	return setBadge(tabId, 'X', BADGE_COLORS.error);
}

function numToBadgeText(n) {
	if (n < 1_000) {
		return `${n}`;
	} else if (n < 1_000_000) {
		return `${Math.trunc(n / 1_000)}K+`;
	} else if (n < 1_000_000_000) {
		return `${Math.trunc(n / 1_000_000)}M+`;
	}
}

async function setResultsBadge(tabId, posts) {
	const color = BADGE_COLORS.success;
	if (!posts || posts.length === 0) {
		return setBadge(tabId, '0', color);
	}
	if (bgOpts.autorun.badgeContent === 'num_comments') {
		const numComments = posts.reduce((acc, p) => acc + p.data.num_comments, 0);
		return setBadge(tabId, `${numToBadgeText(numComments)}`, color);
	} else {
		const numPosts = posts.length;
		return setBadge(tabId, `${numToBadgeText(numPosts)}`, color);
	}
}

async function removeBadge(tabId) {
	return setBadge(tabId, '', BADGE_COLORS.success);
}

async function setBadge(tabId, text, color) {
	const badge = { text: text, tabId: tabId };
	const bgCol = { color: color, tabId: tabId };
	try {
		if (!chrome.runtime.lastError) {
			chrome.action.setBadgeText(badge);
		}
		if (!chrome.runtime.lastError) {
			chrome.action.setBadgeBackgroundColor(bgCol);
		}
	} catch (args) {
		console.log(args);
		return ignoreRejection(args);
	}
}
