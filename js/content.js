let onlyup, dotsInterval, wordsInterval, process, selectedLanguage;
let currentlineHeight = 20
let stopgrowing = false
let i = 0
const userID = localStorage.getItem("user_id") ? Number(localStorage.getItem("user_id")) : 0;
const processText = ["Translating", "Getting data", "Data processing", "Completing"]
const lineInPX = 19.2
const popupWidth = 400
const offset = 10
const headersHeight = 25
const defaultHeight = 55
const fontSize = 16
const popup = document.getElementById('translation_window');
const changeBtn = document.getElementById('change_btn')
const content = document.getElementById('window_content')
const errorImg = document.getElementById('error_img')
const copyLogo = document.getElementById('copy_logo')
const checkmark = document.getElementById('checkmark_logo')
const textBtn = document.getElementById('btn_text')
const dropdown = document.getElementById('language_dropdown')
const div = document.getElementById('hidden_holder');
const divText = document.getElementById('hidden_text_container');

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

function changePopup(height, bottom, top) {
    return new Promise((resolve) => {
        console.log("height = ", height, "bottom = ", bottom, "top = ", top)
        if (height) {popup.style.height = height}
        if (top) {
            if (parseFloat(top) >= 0) {
                popup.style.top = top
            } else {
                popup.style.top = "0px"
            }
        }
        if (bottom) {popup.style.bottom = bottom}

        requestAnimationFrame(() => {
            requestAnimationFrame(() => {
                resolve();
            });
        });
    })
}

function turnOnOverFlow() {
    return new Promise((resolve) => {
        content.style.overflow = "auto"
        content.scrollWidth = "auto"

        requestAnimationFrame(() => {
            requestAnimationFrame(() => {
                resolve();
            });
        });
    })
}

const observer = new ResizeObserver(entries => {
    for (let entry of entries) {
        var top, height, bottom;
        const popupRect = popup.getBoundingClientRect();
        const popupTop = popupRect.top;
        const popupBottom = popupRect.bottom;
        const newHeight = entry.contentRect.height;
        if (!stopgrowing) {
            // if the popup is upper
            if ((currentlineHeight < newHeight) && (onlyup)) {
                if (popupTop <= 0) {
                    if (popupBottom < window.innerHeight) {
                        // grows down
                        console.log("grows down")
                        top = `0px`
                        bottom = `${popupBottom - (newHeight - currentlineHeight)}px`;
                        currentlineHeight = newHeight
                        height = `${headersHeight + defaultHeight + currentlineHeight}px`
                    } else {
                        console.log("stops growing")
                        // starts addiding new text into a container,
                        // but doesn't let grow the popup.
                        height = "100vh";
                        stopgrowing = true
                        currentlineHeight = Infinity
                        turnOnOverFlow().then(() => console.log("overflow is tuned on"))
                    }
                } else {
                    // grows up
                    console.log("grows up")
                    top = `${popupTop - (newHeight - currentlineHeight)}px`
                    currentlineHeight = newHeight
                }
                changePopup(height, bottom, top).then(() => console.log("popup has been changed"))
            // if the popup is under
            } else if ((currentlineHeight < newHeight) && (!onlyup)) {
                console.log("popupBottom = ", popupBottom, "window.innerHeight = ", window.innerHeight, "is popupBottom greater?: ", popupBottom > window.innerHeight)
                if (popupBottom > window.innerHeight) {
                    if (popupTop <= 0) {
                        console.log("stops growing")
                        // starts addiding new text into a container,
                        // but doesn't let grow the popup.
                        height = "100vh"
                        bottom = `${window.innerHeight}px`;
                        top = "0px";
                        stopgrowing = true
                        currentlineHeight = Infinity
                        turnOnOverFlow().then(() => console.log("overflow is tuned on"))
                    } else {
                        // grows up
                        console.log("grows up")
                        bottom = `${window.innerHeight}px`
                        top = `${popupTop - (newHeight - currentlineHeight)}px`;
                        currentlineHeight = newHeight
                        height = `${headersHeight + defaultHeight + currentlineHeight}px`
                    }
                } else {
                    console.log("grows down")
                    currentlineHeight = newHeight
                    height = `${headersHeight + defaultHeight + currentlineHeight}px`
                }
                changePopup(height, bottom, top).then(() => console.log("popup has been changed"))
            }
        }
    }
});

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

function errorChanges() {
    return new Promise((resolve) => {
        content.style.animation = "none";
        content.style.background = "none";
        content.style.color = "#0d0d0d";
        errorImg.style.display = "block";
        content.innerText = "Sorry, I currently can't help you.";

        requestAnimationFrame(() => {
            requestAnimationFrame(() => {
                resolve();
            });
        });
    });
}

function turnOffAnimationAndCleanText() {
    return new Promise((resolve) => {
        content.style.animation = "none";
        content.style.background = "none";
        content.style.color = "#0d0d0d";
        content.innerText = "";

        requestAnimationFrame(() => {
            requestAnimationFrame(() => {
                resolve();
            });
        });
    });
}

function regularTextChange(text){
    return new Promise((resolve) => {
        divText.textContent += text;
        content.innerText += text;

        requestAnimationFrame(() => {
            requestAnimationFrame(() => {
                resolve();
            });
        });
    });
}

function clearTheField() {
    return new Promise((resolve) => {
        // divText.textContent = "";

        requestAnimationFrame(() => {
            requestAnimationFrame(() => {
                resolve();
            });
        });
    });
}

async function sendRequest(text) {
    const language = localStorage.getItem("new_language") || navigator.language.slice(0, 2)
    try {
        const response = await fetch("http://localhost:8080/translate", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                user_id: userID,
                lang_code: language,
                text: text,
            })
        });

        if (!response.ok) {
            errorChanges().then(() => {
                stopLoadingAnimation()
                console.log(response.json())
            })
        }

        return response

    } catch(error) {
        errorChanges().then(() => {
            stopLoadingAnimation()
            console.log(error)
        })
        return null
    }
} 

async function responseHandler(reader, decoder) {
    var eventType, data;
    var buffer = "";
    while (true) {
        let { value, done } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const parts = buffer.split("\n\n");
        buffer = parts.pop();

        for (let part of parts) {
            const lines = part.split("\n");
            eventType = "message";
            data = "";

            for (const line of lines) {
                if (line.startsWith("event:")) {
                    eventType = line.slice(6).trim();
                } else if (line.startsWith("data:")) {
                    data += line.slice(5).trim();
                }
            }

            try {
                const parsed = JSON.parse(data);
                
                if (eventType === "data") {
                    if (process) {
                        console.log("got first data from a stream")
                        process = false;
                        localStorage.setItem("user_id", parsed.user_id)
                        turnOffAnimationAndCleanText().then(() => {
                            stopLoadingAnimation();
                            console.log("turned off text animation")
                        });
                    }
                
                    // Check if user is near the bottom before appending
                    // const wasNearBottom = content.scrollTop + content.clientHeight >= content.scrollHeight - 10; // 10px tolerance
                    
                    regularTextChange(parsed.text).then(() => {
                        console.log("changed the text content in two containers")
                        // Auto-scroll only if user was near the bottom
                        // if (wasNearBottom) {
                            // content.scrollTop = content.scrollHeight;
                        // }
                    })

                } else if (eventType === "final_data") {
                    console.log("final data comes")
                    observer.disconnect();
                    currentlineHeight = 20;
                    stopgrowing = false;
                    clearTheField().then(() => {
                        console.log("stream ended OK")
                    })
                }

            } catch (err) {
                console.error("Failed to parse SSE JSON:", err, data);
            }
        }
    }
    console.log("ended getting streaming data")
}

async function streamTranslation(text) {
    console.log("starting streaming")
    const response = await sendRequest(text)
    if (response) {
        const reader = response.body.getReader();
        const decoder = new TextDecoder("utf-8");
        console.log("got acceptable response, starting handling the response")
        await responseHandler(reader, decoder)
        console.log("got handled the response")
        document.getElementById('copy_btn').style.display = "flex";
    }
}

function startLoadingAnimation() {
    let dotCount = 0;
    process = true;
    wordsInterval = setInterval(() => {if (i + 1 > processText.length-1) {i = 0} else {i++}}, 4000)
    dotsInterval = setInterval(() => {
        dotCount = (dotCount + 1) % 4;
        content.innerText = `${processText[i]}${'.'.repeat(dotCount)}`;
    }, 300);
}

function setUpPopup(top, left) {
    return new Promise((resolve) => {
        popup.style.top = top;
        popup.style.left = left;
        popup.style.display = "flex";

        requestAnimationFrame(() => {
            requestAnimationFrame(() => {
                resolve();
            });
        });
    });
}

function showTranslationPopup(selection, text) {
    let left, top, res;
    const range = selection.getRangeAt(0);
    const rect = range.getBoundingClientRect();

    if (window.innerWidth < rect.left + popupWidth) {
        left = `${window.innerWidth - popupWidth}px`;
    } else {
        left = `${rect.left}px`
    }

    if (rect.top > window.innerHeight - rect.bottom) {
      
        console.log("popup is upper")
        res = rect.top - offset - defaultHeight - headersHeight
        if (res > 0) {
            top = `${res}px`;
            onlyup = true
        } else {
            top = "0px";
        }
    } else {
        // the popup is under
        console.log("popup is under")
        top = `${rect.bottom + offset}px`
        onlyup = false
    }

    console.log("at the moment of appearens: top = ", top, "left = ", left)
    setUpPopup(top, left).then(() => {
        startLoadingAnimation(text);
    })
}

function stopLoadingAnimation() {
    clearInterval(dotsInterval);
    clearInterval(wordsInterval);
    dotsInterval = null;
    wordsInterval = null;
    i = 0
}

function copyText() {
    return new Promise((resolve) => {
        copyLogo.style.display = "none";
        checkmark.style.display = "block";
        textBtn.textContent = "Copied";

        navigator.clipboard.writeText(content.textContent).catch(err => {
            console.error("Failed to copy text: ", err);
            alert("Failed to copy text.");
        });

        setTimeout(() => {
            return new Promise((resolve) => {
                copyLogo.style.display = "block";
                checkmark.style.display = "none";
                textBtn.textContent = "Copy";
                requestAnimationFrame(() => {
                    requestAnimationFrame(() => {
                        resolve();
                    });
                });
            })
        }, 3000);

        requestAnimationFrame(() => {
            requestAnimationFrame(() => {
                resolve();
            });
        });
    });
}

function canShow(selection) {
    if (!selection.rangeCount) return false;

    if (window.innerWidth < popupWidth) {
        alert("Your display isn't suitable")
        return false
    }

    return true
}

document.addEventListener('keydown', function(event) {
    if ((event.ctrlKey || event.metaKey) && event.key === 'c') {
        console.log("got called from shortcut")
        const selectedText = window.getSelection().toString();
        console.log("got selected text", selectedText)
        if (selectedText) {
            createTextHolder(selectedText).then((height) => {
                const selection = window.getSelection();
                console.log("got height and selection")
                if (canShow(selection)) {
                    showTranslationPopup(selection, processText);
                    console.log("showed popup")
                    streamTranslation(selectedText);
                }
            })
        }
    }
});

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
  
// dropdown.addEventListener('change', function() {
//     selectedLanguage = this.value;
//     changeBtn.classList.add('visible');
// });


// populateLanguageDropdown();


function createTextHolder(text) {
    return new Promise((resolve) => {
        divText.textContent = text;

        requestAnimationFrame(() => {
            const height = div.offsetHeight;
            divText.textContent = "";
            observer.observe(divText);
            resolve(height);
        });
    });
}


// const childObject = document.querySelector('.child-object');

// const text = "Это пример текста, который будет постепенно добавляться в дочерний объект. ";

// const interval = setInterval(() => {
//         childObject.innerText += text;
// }, 100);