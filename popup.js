
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
	$('body').on('click', 'a', function(){
		chrome.tabs.create({
			url: $(this).attr('href'),
			active: false
		});
		return false;
	});

	// receive updated html from template.html
	window.addEventListener('message', function(event) {
		if (event.data.html) {
			dom.resultsDiv.html(event.data.html);
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
	let url = dom.urlInput.val();
	if (url) {
		search(processUrl(url), showSearchEnd, false);
	}
	else {
		getCurrentTabUrl(url => {
			dom.urlInput.val(url);
			search(processUrl(url), showSearchEnd);
		});
	}
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

function showSearchEnd() {
	setUIState('SEARCH_END');
}

function processUrl(url) {
	if (isYoutubeUrl(url)) {
		setUIState('YT_VID');
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

function search(term, callback, useCache = true) {
	let query = encodeURIComponent(term);
	let requestUrl = `${baseUrl}${query}`;
	if (!useCache) {
		makeApiRequest(requestUrl, posts => {
			displayPosts(posts);
			callback();
		});
		return;
	}
	chrome.storage.local.get(query, cache => {
	    let data = cache[query];
		if (isCacheValid(data)) {
			displayPosts(data.posts);
			callback();
		} else {
			makeApiRequest(`${baseUrl}${query}`, posts => {
				displayPosts(posts);
				callback();
				cachePosts(query, posts);
			});
		}
	});
}

function cachePosts(query, posts) {
	let objectToStore = {};
	objectToStore[query] = {
		posts: posts,
		time: Date.now()
	};
	// no need to clutter local storage, thus clear()
	chrome.storage.local.clear(() => {
		chrome.storage.local.set(objectToStore);
	});
}

const CACHE_AGE_LIMIT_MILLIS = 1e3 * 60 * 15; // 15 minutes
function isCacheValid(data) {
	return data && data.time && (Date.now() - data.time) < CACHE_AGE_LIMIT_MILLIS;
}

function makeApiRequest(url, onSuccess, onError = onRequestError) {
	$.ajax({
		url: url,
		success: onSuccess,
		error: onError,
		dataType: 'json'
	});
}

function onRequestError(jqXHR, textStatus, errorThrown) {
	setUIState('AJAX_ERROR', {textStatus: textStatus});
	setTimeout(render, 3e3);
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
	let message = {
		// context for Handlebars template
		context: {
			numPosts: posts.length,
			posts: posts
		}
	};
	document.getElementById('tFrame').contentWindow.postMessage(message, '*');
}

function getCurrentTabUrl(callback) {
	let queryOptions = {
		active: true,
		currentWindow: true
	};

	chrome.tabs.query(queryOptions, tabs => {
		let url = tabs[0].url;
		console.assert(typeof url == 'string', 'tab.url should be a string');
		callback(url);
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
