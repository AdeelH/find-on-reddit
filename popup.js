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

	let query = {
		popup: {
			newab: true,
			newtabInBg: true
		}
	};
	getOptions(query)
		.then(opts => registerHandlers(opts.popup))
		.then(render);
}

function registerHandlers(opts) {
	// open links in new tab
	$('body').on('click', 'a', function() {
		let clickedUrl = $(this).attr('href');
		if (opts.newtab) {
			chrome.tabs.create({
				url: clickedUrl,
				active: !opts.newtabInBg
			});
		} else {
			navigateTo(clickedUrl);
		}
	});

	// receive updated html from template.html
	window.addEventListener('message', e => {
		if (e.data.html) {
			dom.resultsDiv.html(e.data.html);
		}
	});

	// search when search button pressed
	dom.searchBtn.click(() => render(true));

	// search when enter key pressed
	dom.urlInput.keyup(function(e) {
		if (e.keyCode == 13) {
			render();
			e.stopPropagation();
		}
	});
}

function render(userClicked = false) {
	setUIState('SEARCH_BEGIN');
	let urlPromise = getUrl();
	let ignoreQueryString = dom.qsCheckbox.prop('checked');

	urlPromise.then(updateUiBasedOnUrl);
	urlPromise
		.then(url => {
			let urlToSearch = processUrl(url, ignoreQueryString);
			return findOnReddit(urlToSearch, !userClicked);
		})
		.then(displayPosts)
		.then(() => setUIState('SEARCH_END'))
		.catch(onRequestError);
}

function getUrl() {
	let urlInput = dom.urlInput.val();
	if (urlInput) {
		return Promise.resolve(urlInput);
	}
	else {
		let urlPromise = getCurrentTabUrl(url);
		urlPromise.then(url => dom.urlInput.val(url));
		return urlPromise;
	}
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

function updateUiBasedOnUrl(url) {
	if (isYoutubeUrl(url)) {
		setUIState('YT_VID', {id: getYoutubeVideoId(url)});
	}
	else {
		setUIState('DEFAULT');
	}
}

const AJAX_RETRY_DELAY = 3e3;
function onRequestError(error) {
	setUIState('AJAX_ERROR', {msg: error.statusText});
	setTimeout(render, AJAX_RETRY_DELAY);
}

function displayPosts(posts) {
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
	let msg = {
		// context for Handlebars template
		context: {
			numPosts: posts.length,
			posts: posts
		}
	};
	document.getElementById('tFrame').contentWindow.postMessage(msg, '*');
}

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
