
const baseUrl = 'https://api.reddit.com/search?sort=top&t=all&limit=100';
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
	let url = dom.urlInput.val();

	if (!url) {
		getCurrentTabUrl(url => {
			dom.urlInput.val(url);
			processUrl(url);
		});
	}
	else {
		processUrl(url);
	}
}

function processUrl(url) {
	if (isYoutubeUrl(url)) {
		dom.qsChoice.addClass('hidden');
		dom.ytChoice.removeClass('hidden');
		handleYoutubeUrl(url);
		return;
	}
	dom.ytChoice.addClass('hidden');
	dom.qsChoice.removeClass('hidden');

	let ignoreQueryString = dom.qsCheckbox.prop('checked');
	let urlToSearch = ignoreQueryString ? removeQueryString(url) : url;
	searchUrl(urlToSearch);
}

function removeQueryString(url) {
	return url.split(/[?#]/)[0];
}

function searchUrl(url) {
	let requestUrl = `${baseUrl}&type=link&q=url:${encodeURIComponent(url)}`;
	makeApiRequest(requestUrl, displayPosts);
}

function search(term) {
	let requestUrl = `${baseUrl}&q=url:${encodeURIComponent(term)}`;
	makeApiRequest(requestUrl, displayPosts);
}

function makeApiRequest(url, onSuccess, onError = onRequestError) {
	dom.statusDiv.text('Searching ...');
	$.ajax({
		url: url,
		success: [onSuccess, () => dom.statusDiv.text('')],
		error: onError,
		dataType: 'json'
	});
}

function onRequestError(jqXHR, textStatus, errorThrown) {
	dom.statusDiv.text(`${textStatus}, retrying in 3s ...`);
	setTimeout(render, 3e3);
}

function displayPosts(postList) {
	let posts = postList.data.children;
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

function handleYoutubeUrl(url) {
	let searchVideoId = dom.ytCheckbox.prop('checked');
	if (searchVideoId) {
		let videoId = getYoutubeVideoId(url);
		dom.ytVidId.text(`'${videoId}'`);
		search(videoId);
	}
	else {
		searchUrl(url);
	}
}

function getYoutubeVideoId(url) {
	let match = YT_REGEX.exec(url);
	return match[1];
}
