
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
	searchResults
	.then(() => setUIState('SEARCH_END'))
	.catch(onRequestError);
}

function setUIState(state, params = null) {
	switch(state) {
		case 'SEARCH_BEGIN':
			dom.statusDiv.text('Searching ...'); break;
		case 'SEARCH_END':
			dom.statusDiv.text(''); break;
		case 'AJAX_ERROR':
			dom.statusDiv.text(`${params.msg}, retrying in 3s ...`); break;
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

const AJAX_RETRY_DELAY = 3e3;
function onRequestError(error) {
	setUIState('AJAX_ERROR', {msg: error.statusText});
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

/* Youtube video handling */
const YT_REGEX = /https?:\/\/(?:www\.|m\.|)youtu(?:\.be|be\.com)\/(?:embed\/|v\/|watch\?(?:.+&)*v=)?([\w-_]{11})/;

function isYoutubeUrl(url) {
	return YT_REGEX.test(url);
}

function processYoutubeUrl(url) {
	let videoId = getYoutubeVideoId(url);
	let useVideoId = dom.ytCheckbox.prop('checked');
	setUIState('YT_VID', {id: videoId});
	if (!useVideoId) {
		return url;
	}
	let videoIdWithoutLeadingDashes = /^-*(.*)/.exec(videoId)[1];
	return videoIdWithoutLeadingDashes;
}

function getYoutubeVideoId(url) {
	let match = YT_REGEX.exec(url);
	return match[1];
}

const timeUnits = [
	{factor: 1/(1e3), name: 'seconds', decis: 0 },
	{factor: 1/(1e3*60), name: 'minutes', decis: 0 },
	{factor: 1/(1e3*60*60), name: 'hours', decis: 0 },
	{factor: 1/(1e3*60*60*24), name: 'days', decis: 0 },
	{factor: 1/(1e3*60*60*24*30), name: 'months', decis: 0 },
	{factor: 1/(1e3*60*60*24*30*12), name: 'years', decis: 1 }
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
