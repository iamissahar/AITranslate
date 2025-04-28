let selectedLanguage;

const dropdown = document.getElementById('language_dropdown')
const changeBtn = document.getElementById('change_btn')
const allLanguages = [
    { code: 'af', name: 'Afrikaans' },
    { code: 'sq', name: 'Shqip' },
    { code: 'ar', name: 'العربية' },
    { code: 'hy', name: 'Հայերեն' },
    { code: 'bn', name: 'বাংলা' },
    { code: 'bs', name: 'Bosanski' },
    { code: 'bg', name: 'Български' },
    { code: 'ca', name: 'Català' },
    { code: 'hr', name: 'Hrvatski' },
    { code: 'cs', name: 'Čeština' },
    { code: 'da', name: 'Dansk' },
    { code: 'nl', name: 'Nederlands' },
    { code: 'en', name: 'English' },
    { code: 'eo', name: 'Esperanto' },
    { code: 'et', name: 'Eesti' },
    { code: 'tl', name: 'Filipino' },
    { code: 'fi', name: 'Suomi' },
    { code: 'fr', name: 'Français' },
    { code: 'de', name: 'Deutsch' },
    { code: 'el', name: 'Ελληνικά' },
    { code: 'gu', name: 'ગુજરાતી' },
    { code: 'hi', name: 'हिन्दी' },
    { code: 'hu', name: 'Magyar' },
    { code: 'is', name: 'Íslenska' },
    { code: 'id', name: 'Bahasa Indonesia' },
    { code: 'it', name: 'Italiano' },
    { code: 'ja', name: '日本語' },
    { code: 'jw', name: 'Basa Jawa' },
    { code: 'ko', name: '한국어' },
    { code: 'la', name: 'Latina' },
    { code: 'lv', name: 'Latviešu' },
    { code: 'lt', name: 'Lietuvių' },
    { code: 'ml', name: 'മലയാളം' },
    { code: 'mr', name: 'मराठी' },
    { code: 'no', name: 'Norsk' },
    { code: 'pl', name: 'Polski' },
    { code: 'pt', name: 'Português' },
    { code: 'pa', name: 'ਪੰਜਾਬੀ' },
    { code: 'ro', name: 'Română' },
    { code: 'ru', name: 'Русский' },
    { code: 'sr', name: 'Српски' },
    { code: 'sk', name: 'Slovenčina' },
    { code: 'sl', name: 'Slovenščina' },
    { code: 'es', name: 'Español' },
    { code: 'sw', name: 'Kiswahili' },
    { code: 'sv', name: 'Svenska' },
    { code: 'ta', name: 'தமிழ்' },
    { code: 'te', name: 'తెలుగు' },
    { code: 'th', name: 'ไทย' },
    { code: 'tr', name: 'Türkçe' },
    { code: 'uk', name: 'Українська' },
    { code: 'ur', name: 'اردو' },
    { code: 'vi', name: 'Tiếng Việt' },
    { code: 'cy', name: 'Cymraeg' },
    { code: 'he', name: 'עברית' },
    { code: 'mk', name: 'Македонски' },
];


async function sendRequest2(status) {
    const userID = await new Promise((resolve) => {
        chrome.storage.local.get(["user_id"], function(result) {
            resolve(Number(result.user_id) || 0)
        })
    })
    const port = chrome.runtime.connect({ name: "change_language" })
    port.postMessage({
        user_id: userID,
        lang_code: selectedLanguage,
    })

    port.onMessage.addListener((msg) => {
        console.log(msg)
        if (msg.ok) {
            status.innerText = "Success!"
            const body = msg.data
            console.log(body)
            chrome.storage.local.set({
                new_language: selectedLanguage,
                user_id: body.user_id
            })
            port.disconnect();
        } else {
            status.innerText = "Oops! Something went wrong!";
            console.error(msg.error);
            port.disconnect();
        }
    })
}


async function changeLanguage() {
    const status = document.getElementById('status_change')
    await sendRequest2(status)
    status.classList.add('visible')

    setTimeout(() => {
        status.classList.remove('visible')
    }, 1500);

    setTimeout(() => {
        changeBtn.classList.remove('visible');
    }, 3000)
}


async function populateLanguageDropdown() {
    const result = await new Promise((resolve) => {
        chrome.storage.local.get(["new_language"], function(result) {
            resolve(result.new_language || navigator.language.slice(0, 2))
        })
    })
    const defaultLanguage = result
    const selectedLan = allLanguages.find(lang => lang.code === defaultLanguage);
    
    allLanguages.forEach(lang => {
        const option = document.createElement('option');
        option.value = lang.code;
        option.textContent = lang.name;
        dropdown.appendChild(option);
    });

    if (selectedLan) {
        dropdown.value = selectedLan.code;
    }
}

document.addEventListener("DOMContentLoaded", function() {
    populateLanguageDropdown();

    if (changeBtn) {
        changeBtn.addEventListener('click', function() {
            changeLanguage();
        });
    }

    dropdown.addEventListener('change', function() {
        selectedLanguage = this.value;
        changeBtn.classList.add('visible');
    })
})
