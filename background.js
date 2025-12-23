const FOLDER_NAME = "Elderly Friendly Bookmarks for Youtube";

let cachedFolderId = null;
let isCreatingFolder = false;

async function getBookmarkFolder() {
    if (cachedFolderId) {
        try {
            const folder = await chrome.bookmarks.get(cachedFolderId);
            if (folder && folder.length > 0) return folder[0];
        } catch (e) {
            cachedFolderId = null;
        }
    }

    const nodes = await chrome.bookmarks.search({ title: FOLDER_NAME });
    const folder = nodes.find(n => !n.url);
    if (folder) {
        cachedFolderId = folder.id;
        return folder;
    }

    if (isCreatingFolder) {
        await new Promise(r => setTimeout(r, 500));
        return getBookmarkFolder();
    }

    isCreatingFolder = true;
    try {
        const newFolder = await chrome.bookmarks.create({
            title: FOLDER_NAME,
            parentId: '1'
        });
        cachedFolderId = newFolder.id;
        return newFolder;
    } finally {
        isCreatingFolder = false;
    }
}

// Utility to strip YouTube timestamp for comparison
function normalizeUrl(url) {
    try {
        const u = new URL(url);
        u.searchParams.delete('t');
        return u.toString();
    } catch (e) {
        return url;
    }
}

async function findBookmark(url) {
    const folder = await getBookmarkFolder();
    const children = await chrome.bookmarks.getChildren(folder.id);
    const targetUrl = normalizeUrl(url);
    return children.find(b => normalizeUrl(b.url) === targetUrl);
}

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === 'checkState') {
        findBookmark(request.url)
            .then(bookmark => {
                sendResponse({ isBookmarked: !!bookmark });
            })
            .catch(err => {
                console.error('[YTEB] Error checking state:', err);
                sendResponse({ isBookmarked: false, error: err.message });
            });
        return true;
    }

    if (request.action === 'toggle') {
        handleToggle(request.info)
            .then(result => {
                sendResponse(result);
            })
            .catch(err => {
                console.error('[YTEB] Error toggling bookmark:', err);
                sendResponse({ error: err.message });
            });
        return true;
    }

    if (request.action === 'getBookmarks') {
        getBookmarksList()
            .then(list => {
                sendResponse(list);
            })
            .catch(err => {
                console.error('[YTEB] Error getting bookmarks list:', err);
                sendResponse({ error: err.message, list: [] });
            });
        return true;
    }
});

async function handleToggle(info) {
    try {
        const bookmark = await findBookmark(info.url);
        if (bookmark) {
            await chrome.bookmarks.remove(bookmark.id);
            return { state: 'unbookmarked' };
        } else {
            const folder = await getBookmarkFolder();
            await chrome.bookmarks.create({
                parentId: folder.id,
                title: info.title,
                url: info.url
            });
            return { state: 'bookmarked' };
        }
    } catch (err) {
        console.error('[YTEB] handleToggle failed:', err);
        throw err;
    }
}

async function getBookmarksList() {
    const folder = await getBookmarkFolder();
    return await chrome.bookmarks.getChildren(folder.id);
}
