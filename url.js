
function processUrl(url, ignoreQueryString = true) {
	if (isYoutubeUrl(url)) {
		return extractSearchableVideoId(url);
	}
	let urlToSearch = ignoreQueryString ? removeQueryString(url) : url;
	urlToSearch = /^(?:https?:\/\/)?(?:www|m)?(.*)/i.exec(urlToSearch)[1];
	return urlToSearch;
}

function removeQueryString(url) {
	return url.split(/[?#]/)[0];
}

/* Youtube video handling */
const YT_REGEX = /https?:\/\/(?:www\.|m\.|)youtu(?:\.be|be\.com)\/(?:embed\/|v\/|watch\?(?:.+&)*v=)?([\w-_]{11})/;

function isYoutubeUrl(url) {
	return YT_REGEX.test(url);
}

function extractSearchableVideoId(ytUrl) {
	let videoId = getYoutubeVideoId(ytUrl);
	let videoIdWithoutLeadingDashes = /^-*(.*)/.exec(videoId)[1];
	return videoIdWithoutLeadingDashes;
}

function getYoutubeVideoId(url) {
	let match = YT_REGEX.exec(url);
	return match[1];
}
