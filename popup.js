import {getOptions, getCurrentTabUrl} from './chrome.js';
import {processUrl, isYoutubeUrl} from './url.js';
import {findOnReddit} from './reddit.js';
import {popupDefaults} from './query.js';

// DOM handles
let DOM;
let state = {
	lastResult: {
		posts: [],
		url: '',
	},
	opts: {
		orderBy: 'score',
		desc: true,
	},
	oldReddit: true
};

$(document).ready(init);

function init() {
	DOM = fetchDomHandles();

	getOptions(popupDefaults)
		.then(opts => {
			registerHandlers(opts.popup);
			setSearchDefaults(opts.search);
			state.opts = opts.popup.results;
			state.oldReddit = opts.oldReddit;
		})
		.then(render)
		.catch(console.log);
}

function registerHandlers(opts) {
	// receive updated html from template.html
	window.addEventListener('message', e => {
		if (e.data.html) {
			DOM.resultsDiv.html(e.data.html);
		}
		$('.sort-options').change(function() {
			state.opts.orderBy = $(this).val();
			displayPosts(state.lastResult.posts, state.lastResult.url);
		});
		$('.sort-order').click(e => {
			e.stopPropagation();
			state.opts.desc = !state.opts.desc;
			displayPosts(state.lastResult.posts, state.lastResult.url);
		});
	});

	// open links in new tab - or not
	$('body').on('click', 'a', function(e) {
		let clickedUrl = $(this).attr('href');
		if (e.metaKey || e.shiftKey || e.altKey) {
			/* cmd/shift/alt + click: 
			do not modify default browser behavior */
		} else if (e.ctrlKey) {
			/* Default open-in-new-tab behavior seems to have changed
			such that the popup gets closed after the click. This overwrites
			that behavior to ensure that:  */
			// (1) a new tab is created in the bg
			chrome.tabs.create({
				url: clickedUrl,
				active: false
			});
			// (2) the popup remains open (== preventDefault & stopPropagation)
			return false;
		} else if (opts.newtab) {
			chrome.tabs.create({
				url: clickedUrl,
				active: !opts.newtabInBg
			});
		} else {
			navigateTo(clickedUrl);
		}
	});

	DOM.opts.ytCheckbox.change(function(e) { 
		if (this.checked) {
			setUiState('YT_VID');
		} else {
			setUiState('DEFAULT');
			DOM.ytChoice.removeClass('hidden');
		}
		render();
	});
	DOM.opts.exactCheckbox.change(render);
	DOM.opts.qsCheckbox.change(render);


	DOM.searchBtn.click(() => render(true));
}

function render(userClicked = false) {
	setUiState('SEARCH_BEGIN');
	let urlPromise = getUrl();
	let params = getSearchParams();
	let useCache = !userClicked;
	let originalUrl;
	let isYt, exactMatch;

	urlPromise
		.then(url => {
			originalUrl = url;
			updateUiBasedOnUrl(url, params);

			isYt = isYoutubeUrl(url) && params.ytHandling;
			exactMatch = params.exactMatch && !isYt;
			let urlToSearch = processUrl(url, params.ignoreQs, isYt);

			return findOnReddit(urlToSearch, useCache, exactMatch);
		})
		.then(posts => {
			state.lastResult.posts = posts;
			state.lastResult.url = originalUrl;
			displayPosts(posts, originalUrl);
			return posts.other;
		})
		.then(otherResults => {
			setUiState('SEARCH_END', {
				name: (!exactMatch ? 'exact' : 'non-exact'),
				num: otherResults
			});
		})
		.catch(e => onRequestError(e, userClicked));
}

function getSearchParams() {
	return {
		ignoreQs: DOM.opts.qsCheckbox.prop('checked'),
		exactMatch: DOM.opts.exactCheckbox.prop('checked'),
		ytHandling: DOM.opts.ytCheckbox.prop('checked')
	};
}

function getUrl() {
	let urlInput = DOM.urlInput.val();
	if (urlInput) {
		return Promise.resolve(urlInput);
	} else {
		let urlPromise = getCurrentTabUrl(url);
		urlPromise.then(url => DOM.urlInput.val(url));
		return urlPromise;
	}
}

const AJAX_RETRY_DELAY_SEC = 5;
let retry_countdown = AJAX_RETRY_DELAY_SEC;
function onRequestError(error, userClicked = false) {
	console.log(error);
	if (retry_countdown == 0) {
		retry_countdown = AJAX_RETRY_DELAY_SEC;
		render(userClicked);
		return;
	}
	retry_countdown -= 1;
	setUiState('AJAX_ERROR', {msg: error.statusText, delay: retry_countdown});
	setTimeout(() => onRequestError(error, userClicked), 1e3);
}

/* post age calculation */ 
const timeUnits = [
	{factor: 1/(1e3), name: 'seconds', decis: 0},
	{factor: 1/(1e3*60), name: 'minutes', decis: 0},
	{factor: 1/(1e3*60*60), name: 'hours', decis: 0},
	{factor: 1/(1e3*60*60*24), name: 'days', decis: 0},
	{factor: 1/(1e3*60*60*24*30), name: 'months', decis: 0},
	{factor: 1/(1e3*60*60*24*30*12), name: 'years', decis: 1}
];
function calcAge(timestampSeconds) {
	let diffMillis = Date.now() - (timestampSeconds * 1e3);
	let [n, unit] = timeUnits
		.map(t => [+(diffMillis * t.factor).toFixed(t.decis), t.name])
		.reverse()
		.find(([n, u]) => n >= 1);
	unit = (n === 1) ? unit.slice(0, -1) : unit; // singular/plural
	return `${n} ${unit}`;
}

/* UI */
let fieldMappings = Object.freeze({
	score: 'score',
	comments: 'num_comments',
	age: 'created_utc',
	subreddit: 'subreddit'
});

function sortPosts(posts, orderBy = 'score', desc = true) {
	if (orderBy == 'subreddit') {
		return posts.sort((a, b) => 
			a.data.subreddit.localeCompare(b.data.subreddit) * (2 * desc - 1)
		);
	}
	let field = fieldMappings[orderBy];
	let comparator = (a, b) => 
		(a.data[field] - b.data[field]) * (1 - 2 * desc);
	return posts.sort(comparator);
}

function displayPosts(posts, url = '') {
	if (!posts) {
		return;
	}
	if (posts.length) {
		posts.forEach(p => {
			try {
				p.data.age = calcAge(p.data.created_utc);
			}
			catch (e) {
				p.data.age = '?';
			}
		});
	}
	let sortedPosts = sortPosts(posts, state.opts.orderBy, state.opts.desc);
	let msg = {
		// context for Handlebars template
		context: {
			oldReddit: state.oldReddit,
			numPosts: posts.length,
			posts: sortedPosts,
			url: url,
			orderBy: state.opts.orderBy
		}
	};
	messageTemplate(msg);
}

function messageTemplate(msg) {
	if (document.readyState !== "complete") {
		setTimeout(() => messageTemplate(msg), 100);
		return;
	}
	document.getElementById('tFrame').contentWindow.postMessage(msg, '*');
}

function setSearchDefaults(opts) {
	DOM.opts.exactCheckbox.prop('checked', opts.exactMatch);
	DOM.opts.qsCheckbox.prop('checked', opts.ignoreQs);
	DOM.opts.ytCheckbox.prop('checked', opts.ytHandling);
}

function setUiState(state, params = null) {
	switch(state) {
		case 'SEARCH_BEGIN': {
			DOM.statusDiv.text('Searching ...'); break;
		}
		case 'SEARCH_END': {
			DOM.statusDiv.text('');
			if (typeof params.num === 'undefined') {
				DOM.otherResultsDiv.addClass('hidden');
			} else {
				DOM.otherResultsDiv.removeClass('hidden');
			}
			DOM.otherResultsNum.text(`${params.name} matches: ${params.num}`);
			break;
		}
		case 'AJAX_ERROR': {
			params.msg = params.msg || 'error';
			DOM.statusDiv.text(`${params.msg}, retrying in ${params.delay}s ...`);
			break;
		}
		case 'YT_VID': {
			DOM.qsChoice.addClass('hidden');
			DOM.exactChoice.addClass('hidden');
			DOM.ytChoice.removeClass('hidden');
			DOM.opts.qsCheckbox.prop('checked', false);
			if (params && params.id) {
				DOM.ytVidId.text(`'${params.id}'`);
			}
			break;
		}
		case 'YT_VID_HANDLING_OFF': {
			DOM.qsChoice.removeClass('hidden');
			DOM.exactChoice.removeClass('hidden');
			DOM.ytChoice.removeClass('hidden');
			if (params && params.id) {
				DOM.ytVidId.text(`'${params.id}'`);
			}
			break;
		}
		default: {
			DOM.ytChoice.addClass('hidden');
			DOM.exactChoice.removeClass('hidden');
			DOM.qsChoice.removeClass('hidden');
		}
	}
}

function updateUiBasedOnUrl(url, params) {
	if (isYoutubeUrl(url)) {
		let state = params.ytHandling ? 'YT_VID' : 'YT_VID_HANDLING_OFF';
		setUiState(state, { id: getYoutubeVideoId(url) });
	} else {
		setUiState('DEFAULT');
	}
}

function fetchDomHandles() {
	return {
		resultsDiv: $('#results'),
		otherResultsDiv: $('#other-results'),
		otherResultsNum: $('#other-results-num'),
		statusDiv: $('#status'),
		urlInput: $('#url'),
		searchBtn: $('#url-submit'),
		ytChoice: $('#yt-choice'),
		ytVidId: $('#yt-vid-id'),
		qsChoice: $('#qs-choice'),
		exactChoice: $('#exact-choice'),
		opts: {
			exactCheckbox: $('#exact'),
			qsCheckbox: $('#ignore-qs'),
			ytCheckbox: $('#yt'),
		}
	};
}

