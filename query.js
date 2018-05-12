/* search queries for retrieving user settings from chrome storage */
const oldReddit = true;

const popupUi = {
	newab: true,
	newtabInBg: true,
	results: {
		orderBy: 'score',
		desc: true
	}
};

const searchParams = {
	exactMatch: true,
	ignoreQs: true,
	ytHandling: true
};

const popupDefaults = {
	popup: popupUi,
	search: searchParams,
	oldReddit: oldReddit
};

const autorun = {
	updated: true,
	activated: true,
	retryExact: true,
	retryError: true
};

const bgOptions = {
	autorun: autorun,
	search: searchParams,
	blacklist: []
};

const DEFAULT_CACHE_PERIOD_MINS = 30;
const allOptions = {
	oldReddit: oldReddit,
	autorun: autorun,
	blacklist: bgOptions.blacklist,
	cache: { period: DEFAULT_CACHE_PERIOD_MINS },
	popup: popupUi,
	search: searchParams
};
