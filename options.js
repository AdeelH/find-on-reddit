function saveOptions() {
	let options = {
		autorun: !document.getElementById('autorun').checked
	};
	updateOptions(options)
		.then(notifySuccess)
		.then(reloadBackgroundPage)
		.catch(notifyFailure);
}

function notifySuccess() {
	let status = document.getElementById('status');
	status.textContent = 'Saved!';
	setTimeout(() => status.textContent = '', 750);
}

function notifyFailure() {
	let status = document.getElementById('status');
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
		document.getElementById('autorun').checked = !options.autorun;
	});
}

document.addEventListener('DOMContentLoaded', restoreOptions);
document.getElementById('save').addEventListener('click', saveOptions);
