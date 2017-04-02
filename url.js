
function processUrl(url, ignoreQueryString = true, isYt = false) {
	if (isYt) {
		return extractSearchableVideoId(url);
	}
	let urlStripped = /^https?:\/\/(?:www\.|m\.|)?(.+)/i.exec(url)[1];
	return ignoreQueryString ? removeQueryString(urlStripped) : urlStripped;
}

function removeQueryString(url) {
	return url.split(/[?#]/i)[0];
}

/* Youtube video handling */
const YT_REGEX = /^https?:\/\/(?:www\.|m\.|)?youtu(?:\.be|be\.com)\/(?:embed\/|v\/|watch\?(?:.+&)*v=)?([\w-_]{11})/i;
const DASHES_REGEX = /^-*(.*)/i;

function isYoutubeUrl(url) {
	return YT_REGEX.test(url);
}

function extractSearchableVideoId(ytUrl) {
	let videoId = getYoutubeVideoId(ytUrl);
	let videoIdWithoutLeadingDashes = DASHES_REGEX.exec(videoId)[1];
	return videoIdWithoutLeadingDashes;
}

function getYoutubeVideoId(url) {
	return YT_REGEX.exec(url)[1];
}
