/* search queries for retrieving user settings from chrome storage */
export const oldReddit = false;

export const popupUi = {
	newab: true,
	newtabInBg: true,
	results: {
		orderBy: 'score',
		desc: true
	}
};

export const searchParams = {
	exactMatch: true,
	ignoreQs: true,
	ytHandling: true
};

export const popupDefaults = {
	popup: popupUi,
	search: searchParams,
	oldReddit: oldReddit
};

export const autorun = {
	updated: true,
	activated: true,
	retryExact: true,
	retryError: true
};

export const bgOptions = {
	autorun: autorun,
	search: searchParams,
	blacklist: []
};

export const DEFAULT_CACHE_PERIOD_MINS = 30;
export const allOptions = {
	oldReddit: oldReddit,
	autorun: autorun,
	blacklist: bgOptions.blacklist,
	cache: { period: DEFAULT_CACHE_PERIOD_MINS },
	popup: popupUi,
	search: searchParams
};
