$(document).ready(init);

let DOM;

function init() {
	DOM = fetchDomHandles();
	restoreOptions();
	DOM.saveButton.click(saveOptions);
}

const CACHE_MAX = 60 * 24;
function saveOptions() {
	let cachePeriodInput = DOM.opts.cachePeriod.val();
	let cachePeriod = Math.max(0, Math.min(CACHE_MAX, cachePeriodInput));

	let options = {
		search: {
			exactMatch: DOM.opts.exactMatch.prop('checked'),
			ignoreQs: DOM.opts.ignoreQs.prop('checked'),
			ytHandling: DOM.opts.ytHandling.prop('checked')
		},
		autorun: {
			updated: DOM.opts.updated.prop('checked'),
			activated: DOM.opts.activated.prop('checked')
		},
		popup: {
			newtab: DOM.opts.newtab.prop('checked'),
			newtabInBg: DOM.opts.newtabInBg.prop('checked')
		},
		cache: { period: cachePeriod }
	};
	updateOptions(options)
		.then(notifySuccess)
		.then(reloadBackgroundPage)
		.then(restoreOptions)
		.catch(notifyFailure);
}

const NOTIFICATION_TIMEOUT = 750;
function notifySuccess() {
	DOM.status.addClass('success');
	DOM.status.text('Saved!');
	setTimeout(() => $('#status').text(''), NOTIFICATION_TIMEOUT);
}

function notifyFailure() {
	DOM.status.addClass('failure');
	DOM.status.text('Error saving options');
}

function restoreOptions() {
	getOptions(allOptions).then(opts => {
		DOM.opts.exactMatch.prop('checked', opts.search.exactMatch);
		DOM.opts.ignoreQs.prop('checked', opts.search.ignoreQs);
		DOM.opts.ytHandling.prop('checked', opts.search.ytHandling);
		DOM.opts.updated.prop('checked', opts.autorun.updated);
		DOM.opts.activated.prop('checked', opts.autorun.activated);
		DOM.opts.newtab.prop('checked', opts.popup.newtab);
		DOM.opts.newtabInBg.prop('checked', opts.popup.newtabInBg);
		DOM.opts.cachePeriod.val(opts.cache.period);
	});
}

function fetchDomHandles() {
	return {
		saveButton: $('#save'),
		status: $('#status'),
		opts: {
			exactMatch: $('#exact'),
			ignoreQs: $('#ignore-qs'),
			ytHandling: $('#yt'),
			updated: $('#autorun-updated'),
			activated: $('#autorun-activated'),
			newtab: $('#popup-newtab'),
			newtabInBg: $('#popup-newtab-bg'),
			cachePeriod: $('#cache-period')
		}
	};
}
