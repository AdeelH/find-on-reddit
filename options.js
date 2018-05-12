$(document).ready(init);

let DOM;

function init() {
	DOM = fetchDomHandles();
	restoreOptions();
	DOM.saveButton.click(saveOptions);
}

const CACHE_MAX = 60 * 24;
function saveOptions() {
	let options = {
		oldReddit: DOM.opts.oldReddit.prop('checked'),
		search: {
			exactMatch: DOM.opts.exactMatch.prop('checked'),
			ignoreQs: DOM.opts.ignoreQs.prop('checked'),
			ytHandling: DOM.opts.ytHandling.prop('checked')
		},
		autorun: {
			updated: DOM.opts.updated.prop('checked'),
			activated: DOM.opts.activated.prop('checked'),
			retryExact: DOM.opts.retryExact.prop('checked'),
			retryError: DOM.opts.retryError.prop('checked')
		},
		popup: {
			newtab: DOM.opts.newtab.prop('checked'),
			newtabInBg: DOM.opts.newtabInBg.prop('checked'),
			results: {
				orderBy: DOM.opts.orderBy.val(),
				desc: DOM.opts.orderDesc.prop('checked')
			}
		},
		cache: { period: getCachePeriod() },
		blacklist: getBlacklist()
	};
	updateOptions(options)
		.then(notifySuccess)
		.then(reloadBackgroundPage)
		.then(restoreOptions)
		.catch(notifyFailure);
}

function restoreOptions() {
	getOptions(allOptions).then(opts => {

		DOM.opts.oldReddit.prop('checked', opts.oldReddit);
		
		DOM.opts.exactMatch.prop('checked', opts.search.exactMatch);
		DOM.opts.ignoreQs.prop('checked', opts.search.ignoreQs);
		DOM.opts.ytHandling.prop('checked', opts.search.ytHandling);

		DOM.opts.updated.prop('checked', opts.autorun.updated);
		DOM.opts.activated.prop('checked', opts.autorun.activated);
		DOM.opts.retryExact.prop('checked', opts.autorun.retryExact);
		DOM.opts.retryError.prop('checked', opts.autorun.retryError);

		DOM.opts.newtab.prop('checked', opts.popup.newtab);
		DOM.opts.newtabInBg.prop('checked', opts.popup.newtabInBg);

		DOM.opts.cachePeriod.val(opts.cache.period);
		DOM.opts.blacklist.val(opts.blacklist.join('\n'));

		DOM.opts.orderBy.val(opts.popup.results.orderBy);
		DOM.opts.orderDesc.prop('checked', opts.popup.results.desc);
	});
}

function getBlacklist() {
	return DOM.opts.blacklist.val().toLowerCase()
		.split('\n')
		.map(s => s.trim())
		.filter(s => s.length > 0);
}

function getCachePeriod() {
	let cachePeriodInput = DOM.opts.cachePeriod.val();
	return Math.max(0, Math.min(CACHE_MAX, cachePeriodInput));
}

function fetchDomHandles() {
	return {
		saveButton: $('#save'),
		status: $('#status'),
		opts: {
			oldReddit: $('#old-reddit'),
			exactMatch: $('#exact'),
			ignoreQs: $('#ignore-qs'),
			ytHandling: $('#yt'),
			updated: $('#autorun-updated'),
			activated: $('#autorun-activated'),
			retryExact: $('#auto-retry-error'),
			retryError: $('#auto-retry-exact'),
			newtab: $('#popup-newtab'),
			newtabInBg: $('#popup-newtab-bg'),
			cachePeriod: $('#cache-period'),
			blacklist: $('#blacklist'),
			orderBy: $('#order-by'),
			orderDesc: $('#order-desc')
		}
	};
}

const NOTIFICATION_TIMEOUT = 750;
function notifySuccess() {
	DOM.status.addClass('success');
	DOM.status.text('Saved!');
	setTimeout(() => $('#status').text(''), NOTIFICATION_TIMEOUT);
}

function notifyFailure(msg = 'Error saving options') {
	DOM.status.addClass('failure');
	DOM.status.text(msg);
}
