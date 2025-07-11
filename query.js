/* search queries for retrieving user settings from chrome storage */
export const oldReddit = false;

export const popupUi = {
	newab: true,
	newtabInBg: true,
	newtabInBgAdjacent: false,
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
	retryExact: true,
	alwaysBothExactAndNonExact: false,
	updated: true,
	activated: true,
	retryError: true,
	badgeContent: 'num_posts'
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
