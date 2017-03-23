function saveOptions() {
	let options = {
		autorun: {
			updated: document.getElementById('autorun-updated').checked,
			activated: document.getElementById('autorun-activated').checked
		},
		cache: { period: document.getElementById('cache-period').value },
		popup: {
			newtab: document.getElementById('popup-newtab').checked,
			newtabInBg: document.getElementById('popup-newtab-bg').checked
		}
	};
	updateOptions(options)
		.then(notifySuccess)
		.then(reloadBackgroundPage)
		.catch(notifyFailure);
}

function notifySuccess() {
	let status = document.getElementById('status');
	status.classList.add('success');
	status.textContent = 'Saved!';
	setTimeout(() => status.textContent = '', 750);
}

function notifyFailure() {
	let status = document.getElementById('status');
	status.classList.add('failure');
	status.textContent = 'Error saving options';
}

function restoreOptions() {
	let query = {
		autorun: {
			updated: true,
			activated: true
		},
		cache: { period: DEFAULT_CACHE_PERIOD_MINS },
		popup: {
			newtab: true,
			newtabInBg: true
		}
	};
	getOptions(query).then(options => {
		document.getElementById('autorun-updated').checked = options.autorun.updated;
		document.getElementById('autorun-activated').checked = options.autorun.activated;
		document.getElementById('cache-period').value = options.cache.period;
	});
}

document.addEventListener('DOMContentLoaded', restoreOptions);
document.getElementById('save').addEventListener('click', saveOptions);
