function saveOptions() {
	let options = {
		autorun: {
			updated: document.getElementById('autorun-updated').checked,
			activated: document.getElementById('autorun-activated').checked
		},
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
	};
	getOptions(query).then(options => {
		document.getElementById('autorun-updated').checked = options.autorun.updated;
		document.getElementById('autorun-activated').checked = options.autorun.activated;
	});
}

document.addEventListener('DOMContentLoaded', restoreOptions);
document.getElementById('save').addEventListener('click', saveOptions);
