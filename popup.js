$(document).ready(init);

function init() {
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
			$('#results').html(event.data.html);
		}
	});
	
	// search when 'Go' button pressed
	$('#url-submit').click(render);
	
	// search when enter key pressed
	$('#url').keyup(function(e) {
		if (e.keyCode == 13) {
			render();
			e.stopPropagation();
		}
	});

	render();
}

function render() {
	let url = $('#url').val();

	if (!url) {
		getCurrentTabUrl(url => {
			$('#url').val(url);
			processUrl(url);
		});
	}
	else {
		processUrl(url);
	}
}

function processUrl(url) {
	let ytCheckbox = $('#yt-choice');
	let qsCheckbox = $('#qs-choice');

	if (isYoutubeUrl(url)) {
		qsCheckbox.addClass('hidden');
		ytCheckbox.removeClass('hidden');
		handleYoutubeUrl(url);
		return;
	}
	ytCheckbox.addClass('hidden');
	qsCheckbox.removeClass('hidden');
	let ignoreQueryString = $('#ignore-qs').prop('checked');
	let urlToSearch = ignoreQueryString ? removeQueryString(url) : url;
	searchUrl(urlToSearch);
}

function removeQueryString(url) {
	return url.split(/[?#]/)[0];
}

function searchUrl(url) {
	$.ajax({
		url: `https://api.reddit.com/search?sort=top&t=all&type=link&q=url:${encodeURIComponent(url)}`, 
		success: displayPosts, 
		dataType: 'json'
	});
}

function search(term) {
	$.ajax({
		url: `https://api.reddit.com/search?sort=top&t=all&q=url:${encodeURIComponent(term)}`, 
		success: displayPosts, 
		dataType: 'json'
	});
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
	// Query filter to be passed to chrome.tabs.query
	let queryInfo = {
		active: true,
		currentWindow: true
	};

	chrome.tabs.query(queryInfo, function(tabs) {
		let url = tabs[0].url;
		console.assert(typeof url == 'string', 'tab.url should be a string');

		callback(url);
	});
}

const YT_REGEX = /https?:\/\/(?:(?:(?:www)|(?:m))\.)?(?:youtu\.be|youtube\.com)\/.*?(?:.*&)?v?[=\/]?([\w_-]{11})/;

function isYoutubeUrl(url) {
	return YT_REGEX.test(url);
}

function handleYoutubeUrl(url) {
	let searchVideoId = $('#yt').prop('checked');
	if (searchVideoId) {
		let videoId = getYoutubeVideoId(url);
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
