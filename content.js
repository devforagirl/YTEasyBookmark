
console.log('[YTEB] Content script loaded');

const SELECTORS = {
    videoRenderer: 'ytd-subscribe-button-renderer',
    channelActions: 'yt-flexible-actions-view-model',
    subscribeText: 'Subscribe'
};

const I18N = {
    en: {
        bookmark: 'Bookmark',
        bookmarked: 'Bookmarked'
    },
    zh: {
        bookmark: '收藏',
        bookmarked: '已收藏'
    }
};

let currentLanguage = 'en';

// Helper to get translated text
function getMessage(key) {
    const lang = currentLanguage === 'auto'
        ? (navigator.language.toLowerCase().startsWith('zh') ? 'zh' : 'en')
        : currentLanguage;
    return I18N[lang]?.[key] || I18N.en[key];
}

async function initLanguage() {
    const data = await chrome.storage.local.get(['language']);
    currentLanguage = data.language || 'auto';
}

function getPageInfo() {
    const url = window.location.href;

    if (url.includes('/watch?v=')) {
        const videoId = new URLSearchParams(window.location.search).get('v');
        const titleElem = document.querySelector('ytd-watch-metadata h1, ytd-video-primary-info-renderer h1');
        const title = titleElem ? titleElem.textContent.trim() : document.title;

        // Capture current timestamp
        let timestampedUrl = url;
        const video = document.querySelector('video');
        if (video && video.currentTime > 0) {
            const time = Math.floor(video.currentTime);
            // Clean existing timestamp if any and append new one
            const baseUrl = url.split('&t=')[0].split('?t=')[0];
            timestampedUrl = baseUrl + (baseUrl.includes('?') ? '&' : '?') + `t=${time}`;
        }

        return { type: 'video', id: videoId, title: title, url: timestampedUrl };
    } else if (url.includes('/@') || url.includes('/channel/') || url.includes('/c/')) {
        const pathParts = window.location.pathname.split('/');
        let channelId = pathParts.find(p => p.startsWith('@'));
        if (!channelId) {
            const channelIdx = pathParts.findIndex(p => p === 'channel' || p === 'c');
            if (channelIdx !== -1 && pathParts[channelIdx + 1]) {
                channelId = pathParts[channelIdx + 1];
            }
        }
        channelId = channelId || pathParts[1];
        const titleElem = document.querySelector('h1.dynamicTextViewModelH1') ||
            document.querySelector('.yt-page-header-view-model__page-header-title h1');
        const title = titleElem ? titleElem.textContent.trim() : document.title.replace(' - YouTube', '');
        return { type: 'channel', id: channelId, title: title, url: url };
    }
    return null;
}

async function updateButtonState(btn, info) {
    if (!info) return;
    try {
        chrome.runtime.sendMessage({ action: 'checkState', url: info.url }, (response) => {
            if (chrome.runtime.lastError) {
                console.warn('[YTEB] sendMessage error:', chrome.runtime.lastError.message);
                return;
            }
            if (response && response.isBookmarked) {
                btn.textContent = getMessage('bookmarked');
                btn.classList.add('bookmarked');
            } else {
                btn.textContent = getMessage('bookmark');
                btn.classList.remove('bookmarked');
            }
        });
    } catch (e) {
        console.error('[YTEB] Failed to check button state:', e);
    }
}

async function toggleBookmark(btn) {
    const info = getPageInfo();
    if (!info) return;

    try {
        chrome.runtime.sendMessage({ action: 'toggle', info: info }, (response) => {
            if (chrome.runtime.lastError) {
                console.error('[YTEB] Toggle failed:', chrome.runtime.lastError.message);
                return;
            }
            if (response) {
                updateButtonState(btn, info);
            }
        });
    } catch (e) {
        console.error('[YTEB] toggleBookmark exception:', e);
    }
}

function createButton() {
    const btn = document.createElement('button');
    btn.id = 'yteb-bookmark-btn';
    btn.className = 'yteb-bookmark-btn yt-modern';

    btn.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        toggleBookmark(btn);
    });

    return btn;
}

async function injectButton() {
    const info = getPageInfo();
    if (!info) return;

    // 1. Video Page Injection
    if (info.type === 'video') {
        const owner = document.getElementById('owner');
        const subBtn = document.querySelector('ytd-subscribe-button-renderer:not([hidden])');

        if (owner && subBtn) {
            let btn = owner.querySelector('#yteb-bookmark-btn');
            if (!btn) {
                console.log('[YTEB] Injecting into visible owner container');
                btn = createButton();
                const subContainer = subBtn.closest('#subscribe-button') || subBtn;
                subContainer.parentNode.insertBefore(btn, subContainer.nextSibling);

                owner.style.display = 'flex';
                owner.style.flexDirection = 'row';
                owner.style.alignItems = 'center';
                owner.style.flexWrap = 'wrap';
            }
            updateButtonState(btn, info);
            return;
        }
    }

    // 2. Channel Page Logic
    const channelActions = document.querySelector('yt-flexible-actions-view-model:not([hidden])');
    if (channelActions) {
        let btn = channelActions.querySelector('#yteb-bookmark-btn');
        if (!btn) {
            console.log('[YTEB] Injecting into visible channel actions');
            btn = createButton();
            const wrapper = document.createElement('div');
            wrapper.className = 'ytFlexibleActionsViewModelAction';
            wrapper.style.display = 'inline-block';
            wrapper.style.verticalAlign = 'middle';
            wrapper.style.marginLeft = '8px';
            wrapper.appendChild(btn);
            channelActions.appendChild(wrapper);
        }
        updateButtonState(btn, info);
        return;
    }

    // 3. Fallback
    const allButtons = Array.from(document.querySelectorAll('button:not([hidden])'));
    const subBtn = allButtons.find(b => b.textContent.trim().includes(SELECTORS.subscribeText));

    if (subBtn) {
        const target = subBtn.closest('ytd-subscribe-button-renderer') || subBtn;
        if (target.parentElement) {
            let btn = target.parentElement.querySelector('#yteb-bookmark-btn');
            if (!btn) {
                console.log('[YTEB] Fallback injection into visible container');
                btn = createButton();
                target.parentNode.insertBefore(btn, target.nextSibling);
                target.parentElement.style.width = 'auto';
                target.parentElement.style.display = 'flex';
            }
            updateButtonState(btn, info);
        }
    }
}

// Watch for relevant DOM changes (MutationObserver)
const observer = new MutationObserver((mutations) => {
    // Only trigger if interesting elements were added
    const interestingAdded = mutations.some(m =>
        Array.from(m.addedNodes).some(node =>
            node.nodeType === 1 && (
                node.id === 'owner' ||
                node.tagName === 'YTD-SUBSCRIBE-BUTTON-RENDERER' ||
                node.tagName === 'YT-FLEXIBLE-ACTIONS-VIEW-MODEL' ||
                node.querySelector?.('ytd-subscribe-button-renderer')
            )
        )
    );

    if (interestingAdded) {
        if (window.ytebTimeout) clearTimeout(window.ytebTimeout);
        window.ytebTimeout = setTimeout(() => {
            injectButton();
        }, 500);
    }
});

observer.observe(document.body, { childList: true, subtree: true });

// YT SPA Navigation Listeners
window.addEventListener('yt-navigate-finish', () => {
    console.log('[YTEB] SPA Navigation finished');
    injectButton();
});

window.addEventListener('yt-page-data-updated', () => {
    console.log('[YTEB] Page data updated');
    injectButton();
});

// Listen for settings changes
chrome.storage.onChanged.addListener((changes) => {
    if (changes.language) {
        currentLanguage = changes.language.newValue;
        console.log('[YTEB] Language changed to:', currentLanguage);
        injectButton(); // Force refresh button text
    }
});

// Initial boot
initLanguage().then(() => {
    injectButton();
    setInterval(injectButton, 3000);
});

window.yteb_force_inject = injectButton;
