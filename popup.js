// DOM handles
let DOM;

$(document).ready(init);

function init() {
	DOM = fetchDomHandles();

	getOptions(popupDefaults)
		.then(opts => {
			registerHandlers(opts.popup);
			setSearchDefaults(opts.search);
		})
		.then(render);
}

function registerHandlers(opts) {
	// receive updated html from template.html
	window.addEventListener('message', e => {
		if (e.data.html) {
			DOM.resultsDiv.html(e.data.html);
		}
	});

	// open links in new tab - or not
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

	DOM.opts.ytCheckbox.change(function(e) { 
		if (this.checked) {
			setUiState('YT_VID');
		} else {
			setUiState('DEFAULT');
			DOM.ytChoice.removeClass('hidden');
		}
		render();
	});
	DOM.opts.exactCheckbox.change(() => render());
	DOM.opts.qsCheckbox.change(() => render());

	DOM.searchBtn.click(() => render(true));
}

function render(userClicked = false) {
	setUiState('SEARCH_BEGIN');
	let urlPromise = getUrl();
	let params = getSearchParams();
	let useCache = !userClicked;
	let originalUrl;

	urlPromise.then(url => {
		originalUrl = url;
		updateUiBasedOnUrl(url, params);
	});
	urlPromise
		.then(url => {
			let isYt = isYoutubeUrl(url) && params.ytHandling;
			let exactMatch = params.exactMatch && !isYt;
			let urlToSearch = processUrl(url, params.ignoreQs, isYt);

			return findOnReddit(urlToSearch, useCache, exactMatch);
		})
		.then(posts=> displayPosts(posts, originalUrl))
		.then(() => setUiState('SEARCH_END'))
		.catch(onRequestError);
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
	}
	else {
		let urlPromise = getCurrentTabUrl(url);
		urlPromise.then(url => DOM.urlInput.val(url));
		return urlPromise;
	}
}

const AJAX_RETRY_DELAY = 3e3;
function onRequestError(error) {
	setUiState('AJAX_ERROR', {msg: error.statusText});
	setTimeout(render, AJAX_RETRY_DELAY);
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
	let msg = {
		// context for Handlebars template
		context: {
			numPosts: posts.length,
			posts: posts,
			url: url
		}
	};
	document.getElementById('tFrame').contentWindow.postMessage(msg, '*');
}

function setSearchDefaults(opts) {
	DOM.opts.exactCheckbox.prop('checked', opts.exactMatch);
	DOM.opts.qsCheckbox.prop('checked', opts.ignoreQs);
	DOM.opts.ytCheckbox.prop('checked', opts.ytHandling);
}

function setUiState(state, params = null) {
	switch(state) {
		case 'SEARCH_BEGIN':
			DOM.statusDiv.text('Searching ...'); break;
		case 'SEARCH_END':
			DOM.statusDiv.text(''); break;
		case 'AJAX_ERROR':
			DOM.statusDiv.text(`${params.msg}, retrying in 3s ...`); break;
		case 'YT_VID': 
			DOM.qsChoice.addClass('hidden');
			DOM.exactChoice.addClass('hidden');
			DOM.ytChoice.removeClass('hidden');
			DOM.opts.qsCheckbox.prop('checked', false);
			if (params && params.id) {
				DOM.ytVidId.text(`'${params.id}'`);
			}
			break;
		default:
			DOM.ytChoice.addClass('hidden');
			DOM.exactChoice.removeClass('hidden');
			DOM.qsChoice.removeClass('hidden');
	}
}

function updateUiBasedOnUrl(url, params) {
	if (isYoutubeUrl(url)) {
		if (params.ytHandling) {
			setUiState('YT_VID', {id: getYoutubeVideoId(url)});
		}
	}
	else {
		setUiState('DEFAULT');
	}
}

function fetchDomHandles() {
	return {
		resultsDiv: $('#results'),
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

