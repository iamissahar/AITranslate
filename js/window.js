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
    { code: 'km', name: 'ភាសាខ្មែរ' },
    { code: 'ko', name: '한국어' },
    { code: 'la', name: 'Latina' },
    { code: 'lv', name: 'Latviešu' },
    { code: 'lt', name: 'Lietuvių' },
    { code: 'ml', name: 'മലയാളം' },
    { code: 'mr', name: 'मराठी' },
    { code: 'my', name: 'မြန်မာ' },
    { code: 'ne', name: 'नेपाली' },
    { code: 'no', name: 'Norsk' },
    { code: 'pl', name: 'Polski' },
    { code: 'pt', name: 'Português' },
    { code: 'pa', name: 'ਪੰਜਾਬੀ' },
    { code: 'ro', name: 'Română' },
    { code: 'ru', name: 'Русский' },
    { code: 'sr', name: 'Српски' },
    { code: 'si', name: 'සිංහල' },
    { code: 'sk', name: 'Slovenčina' },
    { code: 'sl', name: 'Slovenščina' },
    { code: 'es', name: 'Español' },
    { code: 'su', name: 'Basa Sunda' },
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
    { code: 'xh', name: 'IsiXhosa' },
    { code: 'yi', name: 'ייִדיש' },
    { code: 'zu', name: 'IsiZulu' },
    { code: 'am', name: 'አማርኛ' },
    { code: 'az', name: 'Azərbaycanca' },
    { code: 'be', name: 'Беларуская' },
    { code: 'eu', name: 'Euskara' },
    { code: 'gl', name: 'Galego' },
    { code: 'ha', name: 'Hausa' },
    { code: 'ht', name: 'Kreyòl Ayisyen' },
    { code: 'ka', name: 'ქართული' },
    { code: 'kn', name: 'ಕನ್ನಡ' },
    { code: 'mg', name: 'Malagasy' },
    { code: 'ps', name: 'پښتو' },
    { code: 'qu', name: 'Qhichwa' },
    { code: 'oc', name: 'Occitan' },
    { code: 'ga', name: 'Gaeilge' },
    { code: 'he', name: 'עברית' },
    { code: 'mk', name: 'Македонски' }
];

async function sendRequest2(status) {
    try {
        const response = await fetch("http://localhost:8080/change_language", { 
            method: "PATCH", 
            headers: {"Content-Type": "application/json"},
            body: JSON.stringify({
                user_id: userID,
                lang_code: selectedLanguage,
            })});

        if (response.ok) {
            status.innerText = "Success!"
            const body = await response.json()
            localStorage.setItem("new_language", selectedLanguage);
            localStorage.setItem("user_id", body.user_id)
        } else {
            status.innerText = "Oops! Something went wrong!";
        }
    
        return response

    } catch (error) {
        status.innerText = "Request failed!";
        console.error(error);
        return null
    }
}

async function changeLanguage() {
    const status = document.getElementById('status_change')
    const response = await sendRequest2(status)
    if (response) {
        status.classList.add('visible')

        setTimeout(() => {
            status.classList.remove('visible')
        }, 1500);

        setTimeout(() => {
            changeBtn.classList.remove('visible');
        }, 3000)
    }
}


function populateLanguageDropdown() {
    const defaultLanguage = localStorage.getItem("new_language") || navigator.language.slice(0, 2)
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
  
dropdown.addEventListener('change', function() {
    selectedLanguage = this.value;
    changeBtn.classList.add('visible');
});


populateLanguageDropdown();