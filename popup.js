$(document).ready(init);

function init() {
	$('body').on('click', 'a', function(){
		// open links in new tab
		chrome.tabs.create({
			url: $(this).attr('href')
		});
		return false;
	});
	window.addEventListener('message', function(event) {
		if (event.data.html) {
			console.log('hi', event.data.html);
			$('#results').html(event.data.html);
		}
	});
	$('#url-submit').click(render);
	render();
}

function render() {
	var url = $('#url').val();
	if (url) {
		getSubmissions(url, displayPosts);
	}
	else {
		getCurrentTabUrl(function(url) {
			$('#url').val(url);
			getSubmissions(url, displayPosts);
		});
	}
}

function getSubmissions(url, onSuccess) {
	$.ajax({
		url: 'https://api.reddit.com/search?sort=top&t=all&&type=link&q=url:' + encodeURIComponent(url), 
		success: onSuccess, 
		dataType: 'json'
	});
}

function displayPosts(postList) {
	var posts = postList.data.children;
	var message = {
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
		var tab = tabs[0];
		var url = tab.url;
		console.assert(typeof url == 'string', 'tab.url should be a string');
		
		callback(url);
	});
}
