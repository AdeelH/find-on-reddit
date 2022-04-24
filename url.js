
export function processUrl(url, ignoreQueryString = true, isYt = false) {
	if (isYt) {
		return extractSearchableVideoId(url);
	}
	return ignoreQueryString ? removeQueryString(url) : url;
}

export function removeQueryString(url) {
	return url.split(/[?#]/i)[0];
}

/* Youtube video handling */
export const YT_REGEX = /^https?:\/\/(?:www\.|m\.|)?youtu(?:\.be|be\.com)\/(?:embed\/|v\/|watch\?(?:.+&)*v=)?([\w-_]{11})/i;
export const DASHES_REGEX = /^-*(.*)/i;

export function isYoutubeUrl(url) {
	return YT_REGEX.test(url);
}

export function extractSearchableVideoId(ytUrl) {
	let videoId = getYoutubeVideoId(ytUrl);
	let videoIdWithoutLeadingDashes = DASHES_REGEX.exec(videoId)[1];
	return videoIdWithoutLeadingDashes;
}

export function getYoutubeVideoId(url) {
	return YT_REGEX.exec(url)[1];
}
