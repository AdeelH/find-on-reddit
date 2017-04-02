/* search queries for retrieving user settings from chrome storage */

const popupUi = {
	newab: true,
	newtabInBg: true
};

const searchParams = {
	exactMatch: true,
	ignoreQs: true,
	ytHandling: true
};

const popupDefaults = {
	popup: popupUi,
	search: searchParams
};

const autorun = {
	updated: true,
	activated: true
};

const bgOptions = {
	autorun: autorun,
	search: searchParams
};

const allOptions = {
	autorun: autorun,
	cache: { period: DEFAULT_CACHE_PERIOD_MINS },
	popup: popupUi,
	search: searchParams
};
