
const baseUrl = 'https://api.reddit.com/search?sort=top&t=all&limit=100&q=url:';
// DOM handles
let dom;

$(document).ready(init);

function init() {
	dom = {
		resultsDiv: $('#results'),
		statusDiv: $('#status'),
		urlInput: $('#url'),
		searchBtn: $('#url-submit'),
		ytChoice: $('#yt-choice'),
		ytCheckbox: $('#yt'),
		ytVidId: $('#yt-vid-id'),
		qsChoice: $('#qs-choice'),
		qsCheckbox: $('#ignore-qs'),
	};

	// open links in new tab
	$('body').on('click', 'a', function() {
		chrome.tabs.create({
			url: $(this).attr('href'),
			active: false
		});
		return false;
	});

	// receive updated html from template.html
	window.addEventListener('message', e => {
		if (e.data.html) {
			dom.resultsDiv.html(e.data.html);
		}
	});

	// search when search button pressed
	dom.searchBtn.click(render);

	// search when enter key pressed
	dom.urlInput.keyup(function(e) {
		if (e.keyCode == 13) {
			render();
			e.stopPropagation();
		}
	});

	render();
}

function render() {
	setUIState('SEARCH_BEGIN');
	let urlInput = dom.urlInput.val();
	let searchResults;
	if (urlInput) {
		searchResults = findOnReddit(urlInput, false);
	}
	else {
		searchResults = getCurrentTabUrl(url).then(url => {
			dom.urlInput.val(url);
			return findOnReddit(url);
		});
	}
	searchResults.then(setUIState('SEARCH_END'));
}

function setUIState(state, params = null) {
	switch(state) {
		case 'SEARCH_BEGIN': dom.statusDiv.text('Searching ...'); break;
		case 'SEARCH_END'  : dom.statusDiv.text(''); break;
		case 'AJAX_ERROR': 
			dom.statusDiv.text(`${params.textStatus}, retrying in 3s ...`); break;
		case 'YT_VID': 
			dom.qsChoice.addClass('hidden');
			dom.ytChoice.removeClass('hidden');
			dom.ytVidId.text(`'${params.id}'`);
			break;
		default:
			dom.ytChoice.addClass('hidden');
			dom.qsChoice.removeClass('hidden');
	}
}

function processUrl(url) {
	if (isYoutubeUrl(url)) {
		return processYoutubeUrl(url);
	}
	setUIState('DEFAULT');

	let ignoreQueryString = dom.qsCheckbox.prop('checked');
	let urlToSearch = ignoreQueryString ? removeQueryString(url) : url;
	return urlToSearch;
}

function removeQueryString(url) {
	return url.split(/[?#]/)[0];
}

function findOnReddit(url, useCache = true) {
	let query = encodeURIComponent(processUrl(url));
	return search(query, useCache)
		.then(posts => {
			displayPosts(posts);
			cachePosts(query, posts);
		})
		.catch(onRequestError);
}

function search(query, useCache = true) {
	let requestUrl = `${baseUrl}${query}`;
	if (!useCache) {
		return makeApiRequest(requestUrl);
	}
	return searchCache(query).then(cache => {
	    let data = cache[query];
		if (isCacheValid(data)) {
			return Promise.resolve(data.posts);
		} else {
			return makeApiRequest(requestUrl);
		}
	});
}

function searchCache(query) {
	return new Promise((resolve, reject) => {
		chrome.storage.local.get(query, resolve);
	});
}

function cachePosts(query, posts) {
	let objectToStore = {};
	objectToStore[query] = {
		posts: posts,
		time: Date.now()
	};
	return new Promise((resolve, reject) => {
		// no need to clutter local storage, thus clear()
		chrome.storage.local.clear(() => {
			chrome.storage.local.set(objectToStore, resolve);
		});
	});
}

const CACHE_AGE_LIMIT_MILLIS = 1e3 * 60 * 15; // 15 minutes
function isCacheValid(data) {
	return data && data.time && (Date.now() - data.time) < CACHE_AGE_LIMIT_MILLIS;
}

function makeApiRequest(url) {
	return new Promise((resolve, reject) => {
		$.get(url).done(resolve).fail(reject);
	});
}

const AJAX_RETRY_DELAY = 3e3;
function onRequestError(jqXHR, textStatus, errorThrown) {
	setUIState('AJAX_ERROR', {textStatus: textStatus});
	setTimeout(render, AJAX_RETRY_DELAY);
}

function displayPosts(postList) {
	let posts = postList.data.children;
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
	let msg = {
		// context for Handlebars template
		context: {
			numPosts: posts.length,
			posts: posts
		}
	};
	document.getElementById('tFrame').contentWindow.postMessage(msg, '*');
}

function getCurrentTabUrl() {
	let queryOptions = {
		active: true,
		currentWindow: true
	};
	return new Promise((resolve, reject) => {
		chrome.tabs.query(queryOptions, tabs => resolve(tabs[0].url));
	});
}

/* Youtube video handling */
const YT_REGEX = /https?:\/\/(?:www\.|m\.|)youtu(?:\.be|be\.com)\/(?:embed\/|v\/|watch\?(?:.+&)*v=)?([\w-_]{11})/;

function isYoutubeUrl(url) {
	return YT_REGEX.test(url);
}

function processYoutubeUrl(url) {
	let videoId = getYoutubeVideoId(url);
	setUIState('YT_VID', {id: videoId});
	let useVideoId = dom.ytCheckbox.prop('checked');
	return useVideoId ? videoId : url;
}

function getYoutubeVideoId(url) {
	let match = YT_REGEX.exec(url);
	return match[1];
}

const timeUnits = [
	{factor: 1e3, name: 'seconds', decis: 0 },
	{factor: 60, name: 'minutes', decis: 0 },
	{factor: 60, name: 'hours', decis: 0 },
	{factor: 24, name: 'days', decis: 0 },
	{factor: 30, name: 'months', decis: 0 },
	{factor: 12, name: 'years', decis: 1 }
];
function calcAge(timestampSeconds) {
	let diffMillis = Date.now() - (timestampSeconds * 1e3);
	[n, unit] = timeUnits
		.reduce((acc, u, i) => 
			acc.concat([+(acc[i]/u.factor).toFixed(u.decis)]), [diffMillis])
		.slice(1)
		.map((n, i) => [n, timeUnits[i].name])
		.reverse()
		.find(([n, u]) => n > 1);
	unit = (n === 1) ? unit.slice(0, -1) : unit; // make singular
	return `${n} ${unit}`;
}
