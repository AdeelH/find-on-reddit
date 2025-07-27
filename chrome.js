export async function getCurrentTabUrl() {
    const tab = await getCurrentTab();
    return tab.url;
}

export async function getCurrentTabIndex() {
    const tab = await getCurrentTab();
    return tab.index;
}

export async function getCurrentTab() {
    const tabs = await chrome.tabs.query({
        active: true,
        currentWindow: true,
    });
    return tabs[0];
}

export async function getTabById(tabId) {
    const tab = await chrome.tabs.get(parseInt(tabId));
    if (chrome.runtime.lastError) {
        console.log(chrome.runtime.lastError);
        throw Error(chrome.runtime.lastError);
    }
    return tab;
}

export async function navigateTo(url) {
    const tab = await getCurrentTab();
    if (!chrome.runtime.lastError) {
        await chrome.tabs.update(tab.id, { url: url });
    }
}

export async function searchCache(query) {
    return chrome.storage.local.get(query);
}

export async function clearCache() {
    await chrome.storage.local.clear();
}

export async function cache(data) {
    await chrome.storage.local.set(data);
}

export async function updateOptions(data) {
    await chrome.storage.sync.set({ options: data });
}

export async function getOptions(query) {
    const data = await chrome.storage.sync.get({ options: query });
    return data.options;
}

export function ignoreRejection(...args) {
    return Promise.resolve();
}
