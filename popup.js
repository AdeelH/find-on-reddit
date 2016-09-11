$(document).ready(init);

function init() {
	// open links in new tab
	$('body').on('click', 'a', function(){
		chrome.tabs.create({
			url: $(this).attr('href')
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
	var ignoreQueryString = $('#ignore-qs').prop('checked');
	var url = $('#url').val();

	if (url) {
		url = ignoreQueryString ? getPathFromUrl(url) : url;
		search(url, displayPosts);
	}
	else {
		getCurrentTabUrl(function(url) {
			$('#url').val(url);
			url = ignoreQueryString ? getPathFromUrl(url) : url;
			search(url, displayPosts);
		});
	}
}

function getPathFromUrl(url) {
	return url.split(/[?#]/)[0];
}

function search(url, onSuccess) {
	$.ajax({
		url: 'https://api.reddit.com/search?sort=top&t=all&&type=link&q=url:' + encodeURIComponent(url), 
		success: onSuccess, 
		dataType: 'json'
	});
}

function displayPosts(postList) {
	var posts = postList.data.children;
	var message = {
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
	var queryInfo = {
		active: true,
		currentWindow: true
	};

	chrome.tabs.query(queryInfo, function(tabs) {
		var url = tabs[0].url;
		console.assert(typeof url == 'string', 'tab.url should be a string');
		
		callback(url);
	});
}
