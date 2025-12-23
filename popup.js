const i18n = {
    en: {
        title: 'Settings',
        langLabel: 'Language',
        autoOption: 'Auto (Browser)'
    },
    zh: {
        title: '设置',
        langLabel: '语言',
        autoOption: '自动 (浏览器)'
    }
};

async function initSettings() {
    const langSelect = document.getElementById('lang-select');
    const titleEl = document.getElementById('title-settings');
    const labelEl = document.getElementById('label-lang');

    if (!langSelect || !titleEl || !labelEl) return;

    // Load saved language
    const data = await chrome.storage.local.get(['language']);
    const currentLang = data.language || 'auto';
    langSelect.value = currentLang;

    // Apply translation to popup itself
    function applyTranslations(lang) {
        let targetLang = lang;
        if (lang === 'auto') {
            targetLang = navigator.language.toLowerCase().startsWith('zh') ? 'zh' : 'en';
        }

        const text = i18n[targetLang] || i18n.en;
        titleEl.textContent = text.title;
        labelEl.textContent = `${text.langLabel} / 语言`;
        if (langSelect.options[0]) {
            langSelect.options[0].textContent = text.autoOption;
        }
    }

    applyTranslations(currentLang);

    // Save language on change
    langSelect.addEventListener('change', async () => {
        const newLang = langSelect.value;
        await chrome.storage.local.set({ language: newLang });
        applyTranslations(newLang);
    });
}

document.addEventListener('DOMContentLoaded', initSettings);
