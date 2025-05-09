const typingForm = document.querySelector(".typing-form");
const chatContainer = document.querySelector(".chat-list");
const suggestions = document.querySelectorAll(".suggestion");
const toggleThemeButton = document.querySelector("#theme-toggle-button");
const deleteChatButton = document.querySelector("#delete-chat-button");
const imageUploadButton = document.querySelector("#image-upload-button");
const imageInput = document.querySelector("#image-input");
const languageToggleButton = document.querySelector("#language-toggle-button");
const languageDropdown = document.querySelector("#language-dropdown");
const micButton = document.querySelector("#mic-button");
const typingInput = document.querySelector(".typing-input");

// State variables
let userMessage = null;
let isResponseGenerating = false;
let uploadedFile = null;
let currentLanguage = 'en';
let summaryLength = 'medium'; // 'short', 'medium', or 'long'
let currentSpeechUtterance = null;
let recognition = null;
let isSpeakingAll = false;
let currentSpeakingIndex = -1;
let messagesToSpeak = [];
let isListening = false;

// API configuration
const API_KEY = "AIzaSyA_RUx3elCntUlbKHI0R5HJvgrzBE65TEI"; // Your API key here
const API_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${API_KEY}`;

// Translation languages with voice support information
const LANGUAGES = [
  { code: 'en', name: 'English', flag: '🇬🇧', voice: 'en-US' },
  { code: 'hi', name: 'Hindi', flag: '🇮🇳', voice: 'hi-IN' },
  { code: 'bn', name: 'Bengali', flag: '🇧🇩', voice: 'bn-IN' },
  { code: 'es', name: 'Spanish', flag: '🇪🇸', voice: 'es-ES' },
  { code: 'fr', name: 'French', flag: '🇫🇷', voice: 'fr-FR' },
  { code: 'de', name: 'German', flag: '🇩🇪', voice: 'de-DE' },
  { code: 'ja', name: 'Japanese', flag: '🇯🇵', voice: 'ja-JP' },
  { code: 'ru', name: 'Russian', flag: '🇷🇺', voice: 'ru-RU' },
  { code: 'pt', name: 'Portuguese', flag: '🇵🇹', voice: 'pt-PT' },
  { code: 'ar', name: 'Arabic', flag: '🇸🇦', voice: 'ar-SA' },
  { code: 'pa', name: 'Punjabi', flag: '🇮🇳', voice: 'pa-IN' },
  { code: 'ta', name: 'Tamil', flag: '🇮🇳', voice: 'ta-IN' },
  { code: 'te', name: 'Telugu', flag: '🇮🇳', voice: 'te-IN' },
  { code: 'mr', name: 'Marathi', flag: '🇮🇳', voice: 'mr-IN' },
  { code: 'gu', name: 'Gujarati', flag: '🇮🇳', voice: 'gu-IN' },
  { code: 'kn', name: 'Kannada', flag: '🇮🇳', voice: 'kn-IN' },
  { code: 'ml', name: 'Malayalam', flag: '🇮🇳', voice: 'ml-IN' },
  { code: 'or', name: 'Odia', flag: '🇮🇳', voice: 'or-IN' },
  { code: 'ur', name: 'Urdu', flag: '🇵🇰', voice: 'ur-PK' },
  { code: 'zh', name: 'Chinese', flag: '🇨🇳', voice: 'zh-CN' },
  { code: 'it', name: 'Italian', flag: '🇮🇹', voice: 'it-IT' },
  { code: 'nl', name: 'Dutch', flag: '🇳🇱', voice: 'nl-NL' },
  { code: 'ko', name: 'Korean', flag: '🇰🇷', voice: 'ko-KR' },
  { code: 'tr', name: 'Turkish', flag: '🇹🇷', voice: 'tr-TR' },
  { code: 'pl', name: 'Polish', flag: '🇵🇱', voice: 'pl-PL' },
  { code: 'uk', name: 'Ukrainian', flag: '🇺🇦', voice: 'uk-UA' },
  { code: 'vi', name: 'Vietnamese', flag: '🇻🇳', voice: 'vi-VN' },
  { code: 'th', name: 'Thai', flag: '🇹🇭', voice: 'th-TH' }
];

// Initialize language dropdown
function initLanguageDropdown() {
    languageDropdown.innerHTML = LANGUAGES.map(lang => 
        `<div class="language-option" data-lang="${lang.code}">
            ${lang.flag} ${lang.name}
        </div>`
    ).join('');
    
    document.querySelectorAll('.language-option').forEach(option => {
        option.addEventListener('click', () => {
            currentLanguage = option.dataset.lang;
            const langInfo = LANGUAGES.find(l => l.code === currentLanguage);
            languageToggleButton.textContent = langInfo.flag;
            languageDropdown.classList.remove('show');
            updateUITexts(currentLanguage);
            
            // Update speech recognition language if supported
            if (recognition) {
                recognition.lang = langInfo.voice || currentLanguage;
            }
        });
    });
}

// Update UI texts based on language
function updateUITexts(lang) {
    const typingInput = document.querySelector('.typing-input');
    const disclaimerText = document.querySelector('.disclaimer-text');
    
    if (lang === 'es') {
        typingInput.placeholder = "Introduzca un mensaje aquí";
        disclaimerText.textContent = "Legal Mate puede mostrar información inexacta, así que verifique sus respuestas.";
    } else if (lang === 'hi') {
        typingInput.placeholder = "यहां एक संदेश दर्ज करें";
        disclaimerText.textContent = "लीगल मेट गलत जानकारी प्रदर्शित कर सकता है, इसलिए इसकी प्रतिक्रियाओं को दोबारा जांचें।";
    } else {
        // Default to English
        typingInput.placeholder = "Enter a prompt here";
        disclaimerText.textContent = "Legal Mate may display inaccurate info, so double-check its responses.";
    }
}

// Speech recognition functionality


// Check if browser supports SpeechRecognition
const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;

if (SpeechRecognition) {
    const recognition = new SpeechRecognition();
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.lang = currentLanguage;

    micButton.addEventListener("click", () => {
        recognition.start();
        micButton.innerText = "mic_off"; // show it's listening
    });

    recognition.onresult = (event) => {
        const transcript = event.results[0][0].transcript.trim();
        typingInput.value = transcript;
        typingInput.dispatchEvent(new Event("input")); // Trigger validation
        micButton.innerText = "mic";
        // Optional: auto-send after speech ends
        // handleOutgoingChat(); 
    };

    recognition.onerror = (event) => {
        alert("Speech recognition error: " + event.error);
        micButton.innerText = "mic";
    };

    recognition.onend = () => {
        micButton.innerText = "mic";
    };
} else {
    micButton.style.display = "none"; // Hide if not supported
    console.warn("Speech recognition not supported in this browser.");
}

// Update speech recognition language when language changes
languageToggleButton.addEventListener('click', () => {
    if (window.SpeechRecognition || window.webkitSpeechRecognition) {
        recognition.lang = currentLanguage;
    }
});


// Enhanced text-to-speech function with language detection
function speakText(text, langCode = currentLanguage) {
    stopSpeech(); // Stop any current speech
    
    // Try to detect language if not specified
    if (!langCode) {
        const langDetected = detectLanguage(text) || currentLanguage;
        langCode = langDetected;
    }
    
    const langInfo = LANGUAGES.find(l => l.code === langCode);
    const voiceLang = langInfo?.voice || langCode;
    
    currentSpeechUtterance = new SpeechSynthesisUtterance(text);
    currentSpeechUtterance.lang = voiceLang;
    currentSpeechUtterance.rate = 0.9;
    currentSpeechUtterance.pitch = 1;
    currentSpeechUtterance.volume = 1;
    
    // Find the best available voice for the language
    const voices = window.speechSynthesis.getVoices();
    const preferredVoice = voices.find(voice => 
        voice.lang === voiceLang || 
        voice.lang.startsWith(langCode)
    );
    
    if (preferredVoice) {
        currentSpeechUtterance.voice = preferredVoice;
    } else {
        console.warn(`No voice found for language ${langCode}, using default`);
    }
    
    currentSpeechUtterance.onboundary = (event) => {
        // Optional: highlight words as they're being spoken
        if (event.name === 'word') {
            // Could add visual feedback here
        }
    };
    
    currentSpeechUtterance.onend = () => {
        // Reset all speaker buttons when speech ends
        document.querySelectorAll('.speaker-button').forEach(btn => {
            btn.textContent = "volume_up";
        });
        
        // Continue speaking next message if in "speak all" mode
        if (isSpeakingAll && currentSpeakingIndex < messagesToSpeak.length - 1) {
            currentSpeakingIndex++;
            speakNextMessage();
        } else {
            isSpeakingAll = false;
            currentSpeakingIndex = -1;
            messagesToSpeak = [];
        }
    };
    
    window.speechSynthesis.speak(currentSpeechUtterance);
}

// Simple language detection (can be enhanced)
function detectLanguage(text) {
    // Check for common non-English characters
    if (/[\u0900-\u097F]/.test(text)) return 'hi'; // Hindi
    if (/[\u0980-\u09FF]/.test(text)) return 'bn'; // Bengali
    if (/[\u0A00-\u0A7F]/.test(text)) return 'pa'; // Punjabi
    if (/[\u0B00-\u0B7F]/.test(text)) return 'ta'; // Tamil
    if (/[\u0C00-\u0C7F]/.test(text)) return 'te'; // Telugu
    if (/[\u0D00-\u0D7F]/.test(text)) return 'ml'; // Malayalam
    if (/[\u0600-\u06FF]/.test(text)) return 'ar'; // Arabic
    if (/[\u0400-\u04FF]/.test(text)) return 'ru'; // Russian
    if (/[\u4E00-\u9FFF]/.test(text)) return 'zh'; // Chinese
    if (/[\u3040-\u309F]/.test(text)) return 'ja'; // Japanese
    if (/[\uAC00-\uD7AF]/.test(text)) return 'ko'; // Korean
    
    // For European languages, we'd need a more sophisticated approach
    return currentLanguage;
}

// Stop any current speech
function stopSpeech() {
    if (window.speechSynthesis.speaking) {
        window.speechSynthesis.cancel();
        isSpeakingAll = false;
        currentSpeakingIndex = -1;
        messagesToSpeak = [];
    }
}

// Toggle speech for a message
function toggleMessageSpeech(button) {
    const messageDiv = button.closest('.message');
    const textElement = messageDiv.querySelector('.text');
    const messageText = textElement.textContent;
    
    // Check if this message is currently being spoken
    if (button.textContent === "volume_off") {
        stopSpeech();
        button.textContent = "volume_up";
        return;
    }
    
    // Determine language for speech
    let lang = currentLanguage;
    const translationInfo = messageDiv.querySelector('.translation-info');
    if (translationInfo) {
        lang = translationInfo.dataset.lang;
    }
    
    // Stop any other speech and update all buttons
    stopSpeech();
    document.querySelectorAll('.speaker-button').forEach(btn => {
        btn.textContent = "volume_up";
    });
    
    // Start speaking this message
    button.textContent = "volume_off";
    speakText(messageText, lang);
}

// Speak all messages in the chat
function speakAllMessages() {
    const messages = document.querySelectorAll('.message .text');
    if (messages.length === 0) return;
    
    // Stop any current speech
    stopSpeech();
    
    // Prepare messages to speak
    messagesToSpeak = Array.from(messages).map(messageElement => {
        const messageDiv = messageElement.closest('.message');
        const translationInfo = messageDiv.querySelector('.translation-info');
        const lang = translationInfo ? translationInfo.dataset.lang : currentLanguage;
        
        return {
            text: messageElement.textContent,
            lang: lang,
            element: messageDiv
        };
    });
    
    // Start speaking from the first message
    isSpeakingAll = true;
    currentSpeakingIndex = 0;
    speakNextMessage();
}

// Speak the next message in the queue
function speakNextMessage() {
    if (!isSpeakingAll || currentSpeakingIndex >= messagesToSpeak.length) {
        isSpeakingAll = false;
        return;
    }
    
    const message = messagesToSpeak[currentSpeakingIndex];
    
    // Highlight the current speaking message
    document.querySelectorAll('.message').forEach(msg => {
        msg.classList.remove('speaking');
    });
    message.element.classList.add('speaking');
    
    // Update the speaker button for this message
    const speakerButton = message.element.querySelector('.speaker-button');
    if (speakerButton) {
        speakerButton.textContent = "volume_off";
    }
    
    // Speak the message
    speakText(message.text, message.lang);
}

// Load theme and chat data from local storage
const loadDataFromLocalstorage = () => {
    const savedChats = localStorage.getItem("saved-chats");
    const isLightMode = localStorage.getItem("themeColor") === "light_mode";
    document.body.classList.toggle("light_mode", isLightMode);
    toggleThemeButton.innerText = isLightMode ? "dark_mode" : "light_mode";
    chatContainer.innerHTML = savedChats || "";
    document.body.classList.toggle("hide-header", savedChats);
    chatContainer.scrollTo(0, chatContainer.scrollHeight);
    
    // Reattach event listeners to existing messages
    document.querySelectorAll('.speaker-button').forEach(btn => {
        btn.onclick = () => toggleMessageSpeech(btn);
    });
    
    // Add speak all button if not exists
    if (!document.querySelector('.speak-all-button')) {
        const speakAllBtn = document.createElement('button');
        speakAllBtn.className = 'speak-all-button';
        speakAllBtn.innerHTML = '<span class="material-symbols-rounded">play_circle</span> Speak All';
        speakAllBtn.onclick = speakAllMessages;
        document.querySelector('.chat-container').prepend(speakAllBtn);
    }
};

// Create a new message element
const createMessageElement = (content, ...classes) => {
    const div = document.createElement("div");
    div.classList.add("message", ...classes);
    div.innerHTML = content;
    return div;
};

// Show typing effect
const showTypingEffect = (text, textElement, incomingMessageDiv) => {
    const words = text.split(" ");
    let currentWordIndex = 0;
    const typingInterval = setInterval(() => {
        textElement.textContent += (currentWordIndex === 0 ? "" : " ") + words[currentWordIndex++];
        incomingMessageDiv.querySelector(".icon").classList.add("hide");
        
        if (currentWordIndex === words.length) {
            clearInterval(typingInterval);
            isResponseGenerating = false;
            incomingMessageDiv.querySelector(".icon").classList.remove("hide");
            localStorage.setItem("saved-chats", chatContainer.innerHTML);
            
            // Auto-speak the response if enabled in preferences
            const autoSpeak = localStorage.getItem('autoSpeak') === 'true';
            if (autoSpeak) {
                const speakerButton = incomingMessageDiv.querySelector('.speaker-button');
                if (speakerButton) {
                    setTimeout(() => toggleMessageSpeech(speakerButton), 500);
                }
            }
        }
        chatContainer.scrollTo(0, chatContainer.scrollHeight);
    }, 50);
};

// Convert file to base64
const fileToBase64 = (file) => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = () => resolve(reader.result.split(",")[1]);
        reader.onerror = error => reject(error);
    });
};

// Summarize document
const summarizeDocument = async (file, length = 'medium') => {
    try {
        const fileData = await fileToBase64(file);
        const fileType = file.type;
        
        let lengthInstruction = "";
        if (length === 'short') {
            lengthInstruction = "Provide a very concise summary (2-3 sentences).";
        } else if (length === 'medium') {
            lengthInstruction = "Provide a detailed summary (1 paragraph).";
        } else {
            lengthInstruction = "Provide a comprehensive summary with key points (multiple paragraphs).";
        }
        
        const prompt = `Summarize this document. ${lengthInstruction}
Include the following:
1. Main purpose of the document
2. Key points
3. Important details
4. Any critical information

Also provide a bullet-point list of the most important points.`;
        
        const response = await fetch(API_URL, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                contents: [{
                    parts: [
                        { text: prompt },
                        { inline_data: { mime_type: fileType, data: fileData } }
                    ]
                }]
            })
        });
        
        const data = await response.json();
        if (!response.ok) throw new Error(data.error.message);
        return data.candidates[0].content.parts[0].text;
    } catch (error) {
        console.error("Document summarization error:", error);
        return `Document summarization failed: ${error.message}`;
    }
};

// Show document summary
const showDocumentSummary = (summaryText, messageDiv) => {
    const summaryParts = summaryText.split('\n\n');
    let mainSummary = summaryParts[0];
    let keyPoints = summaryParts.slice(1).join('\n\n');
    
    const summaryDiv = document.createElement('div');
    summaryDiv.className = 'summary-container';
    
    summaryDiv.innerHTML = `
        <div class="summary-header">
            <div class="summary-title">Document Summary</div>
            <div class="summary-length-selector">
                <button class="summary-length-button ${summaryLength === 'short' ? 'active' : ''}" 
                        onclick="updateSummaryLength(this, 'short')">Short</button>
                <button class="summary-length-button ${summaryLength === 'medium' ? 'active' : ''}" 
                        onclick="updateSummaryLength(this, 'medium')">Medium</button>
                <button class="summary-length-button ${summaryLength === 'long' ? 'active' : ''}" 
                        onclick="updateSummaryLength(this, 'long')">Long</button>
            </div>
        </div>
        <div class="summary-content">${mainSummary}</div>
        <div class="summary-actions">
            <span class="icon material-symbols-rounded" onclick="speakSummary(this)">volume_up</span>
            <span class="icon material-symbols-rounded" onclick="stopSpeech()">stop</span>
            <span class="icon material-symbols-rounded" onclick="speakAllMessages()">play_circle</span>
        </div>
    `;
    
    if (keyPoints.trim()) {
        const keyPointsDiv = document.createElement('div');
        keyPointsDiv.className = 'summary-key-points';
        keyPointsDiv.innerHTML = `<strong>Key Points:</strong>${keyPoints}`;
        summaryDiv.appendChild(keyPointsDiv);
    }
    
    messageDiv.appendChild(summaryDiv);
};

// Speak summary content
const speakSummary = (button) => {
    const summaryContainer = button.closest('.summary-container');
    const summaryContent = summaryContainer.querySelector('.summary-content').textContent;
    const keyPoints = summaryContainer.querySelector('.summary-key-points')?.textContent || '';
    const fullText = `${summaryContent}. ${keyPoints}`;
    
    stopSpeech();
    
    if (button.textContent === "volume_up") {
        currentSpeechUtterance = new SpeechSynthesisUtterance(fullText);
        currentSpeechUtterance.lang = currentLanguage;
        currentSpeechUtterance.rate = 0.9;
        
        button.textContent = 'volume_off';
        
        currentSpeechUtterance.onend = () => {
            button.textContent = 'volume_up';
        };
        
        window.speechSynthesis.speak(currentSpeechUtterance);
    } else {
        button.textContent = 'volume_up';
        stopSpeech();
    }
};

// Update summary length
const updateSummaryLength = async (button, length) => {
    summaryLength = length;
    
    document.querySelectorAll('.summary-length-button').forEach(btn => {
        btn.classList.remove('active');
    });
    button.classList.add('active');
    
    const messageDiv = button.closest('.message');
    const textElement = messageDiv.querySelector('.text');
    const originalText = textElement.textContent;
    
    textElement.textContent = "Generating new summary...";
    
    try {
        const newSummary = await summarizeDocument(uploadedFile, length);
        const oldSummary = messageDiv.querySelector('.summary-container');
        if (oldSummary) oldSummary.remove();
        
        textElement.textContent = originalText;
        showDocumentSummary(newSummary, messageDiv);
    } catch (error) {
        textElement.textContent = originalText;
        alert(`Failed to update summary: ${error.message}`);
    }
};

// Generate API response
const generateAPIResponse = async (incomingMessageDiv) => {
    const textElement = incomingMessageDiv.querySelector(".text");
    try {
        const contents = [{ role: "user", parts: [] }];
        
        if (userMessage) {
            contents[0].parts.push({ text: userMessage });
        }
        
        if (uploadedFile) {
            if (uploadedFile.type.includes('pdf') || 
                uploadedFile.name.toLowerCase().endsWith('.doc') || 
                uploadedFile.name.toLowerCase().endsWith('.docx') || 
                uploadedFile.name.toLowerCase().endsWith('.txt')) {
                
                textElement.textContent = "Summarizing document...";
                const summary = await summarizeDocument(uploadedFile, summaryLength);
                showDocumentSummary(summary, incomingMessageDiv);
                
                if (!userMessage || userMessage.trim() === "") {
                    isResponseGenerating = false;
                    incomingMessageDiv.classList.remove("loading");
                    uploadedFile = null;
                    return;
                }
                
                textElement.textContent = "";
            }
            
            contents[0].parts.push({
                inline_data: {
                    mime_type: uploadedFile.type,
                    data: await fileToBase64(uploadedFile)
                }
            });
        }
        
        if (contents[0].parts.length === 0) {
            isResponseGenerating = false;
            incomingMessageDiv.classList.remove("loading");
            uploadedFile = null;
            return;
        }
        
        const response = await fetch(API_URL, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ contents })
        });
        
        const data = await response.json();
        if (!response.ok) throw new Error(data.error.message);
        
        const apiResponse = data.candidates[0].content.parts[0].text.replace(/\*\*(.*?)\*\*/g, "$1");
        showTypingEffect(apiResponse, textElement, incomingMessageDiv);
    } catch (error) {
        isResponseGenerating = false;
        textElement.textContent = error.message;
        textElement.parentElement.classList.add("error");
    } finally {
        incomingMessageDiv.classList.remove("loading");
        uploadedFile = null;
    }
};

// Translate text
const translateText = async (text, targetLang) => {
    try {
        const langName = LANGUAGES.find(l => l.code === targetLang)?.name || targetLang;
        const prompt = `Translate the following text to ${langName}:\n\n"${text}"`;
        
        const response = await fetch(API_URL, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                contents: [{ parts: [{ text: prompt }] }]
            })
        });
        
        const data = await response.json();
        if (!response.ok) throw new Error(data.error.message);
        return data.candidates[0].content.parts[0].text;
    } catch (error) {
        console.error("Translation error:", error);
        return `Translation failed: ${error.message}`;
    }
};

// Show loading animation
const showLoadingAnimation = () => {
    const html = `<div class="message-content">
      <img class="avatar" src="1234logo.png" alt="Gemini avatar">
      <p class="text"></p>
      
      <div class="translation-button">
        <span class="icon material-symbols-rounded" onclick="showTranslationOptions(this)">translate</span>
        <div class="translation-dropdown">
          ${LANGUAGES.map(lang => 
            `<div class="translation-option" onclick="handleTranslation(this, '${lang.code}', '${lang.name}')">
                ${lang.flag} ${lang.name}
            </div>`
          ).join('')}
        </div>
      </div>
    </div>
    <span onclick="copyMessage(this)" class="icon material-symbols-rounded">content_copy</span>
    <span onclick="toggleMessageSpeech(this)" class="icon material-symbols-rounded speaker-button">volume_up</span>`;
    
    const incomingMessageDiv = createMessageElement(html, "incoming", "loading");
    chatContainer.appendChild(incomingMessageDiv);
    chatContainer.scrollTo(0, chatContainer.scrollHeight);
    generateAPIResponse(incomingMessageDiv);
};

// Show translation options
const showTranslationOptions = (button) => {
    const dropdown = button.parentElement.querySelector('.translation-dropdown');
    dropdown.classList.toggle('show');
    
    document.addEventListener('click', function closeDropdown(e) {
        if (!button.parentElement.contains(e.target)) {
            dropdown.classList.remove('show');
            document.removeEventListener('click', closeDropdown);
        }
    });
};

// Handle translation
const handleTranslation = async (option, langCode, langName) => {
    const messageDiv = option.closest('.message');
    const textElement = messageDiv.querySelector('.text');
    const originalText = textElement.textContent;
    
    textElement.textContent = `Translating to ${langName}...`;
    
    try {
        const translatedText = await translateText(originalText, langCode);
        textElement.textContent = translatedText;
        
        // Add translation info and revert button
        const translationInfo = document.createElement('div');
        translationInfo.className = 'translation-info';
        translationInfo.dataset.lang = langCode;
        translationInfo.innerHTML = `
            
            <span class="icon material-symbols-rounded" onclick="revertTranslation(this)">undo</span>
        `;
        textElement.after(translationInfo);
    } catch (error) {
        textElement.textContent = originalText;
        alert(`Translation failed: ${error.message}`);
    }
    
    option.closest('.translation-dropdown').classList.remove('show');
};

// Revert translation
const revertTranslation = (button) => {
    const translationInfo = button.closest('.translation-info');
    const messageDiv = translationInfo.closest('.message');
    const textElement = messageDiv.querySelector('.text');
    
    // Find the original message (before translation)
    const originalText = messageDiv.dataset.originalText || textElement.textContent;
    textElement.textContent = originalText;
    translationInfo.remove();
};

// Copy message
const copyMessage = (copyButton) => {
    const messageText = copyButton.parentElement.querySelector(".text").textContent;
    navigator.clipboard.writeText(messageText);
    copyButton.textContent = "done";
    setTimeout(() => copyButton.textContent = "content_copy", 1000);
};

// Handle outgoing chat
const handleOutgoingChat = () => {
    userMessage = typingForm.querySelector(".typing-input").value.trim() || userMessage;
    if ((!userMessage && !uploadedFile) || isResponseGenerating) return;
    
    isResponseGenerating = true;
    
    let html = `<div class="message-content">
      <img class="avatar" src="1234logo.png" alt="User avatar">
      <p class="text"></p>`;
    
    if (uploadedFile) {
        if (uploadedFile.type.startsWith('image/')) {
            const imageUrl = URL.createObjectURL(uploadedFile);
            html += `<img src="${imageUrl}" class="uploaded-image" alt="Uploaded image">`;
        } else {
            html += `<div style="margin-top: 10px; display: flex; align-items: center; gap: 10px;">
                <span class="material-symbols-rounded">description</span>
                <span>${uploadedFile.name}</span>
            </div>`;
        }
    }
    
    html += `</div>`;
    
    const outgoingMessageDiv = createMessageElement(html, "outgoing");
    
    if (userMessage) {
        outgoingMessageDiv.querySelector(".text").textContent = userMessage;
    } else if (uploadedFile) {
        outgoingMessageDiv.querySelector(".text").textContent = uploadedFile.type.startsWith('image/') 
            ? "Tell me about this image" 
            : "Summarize this document";
    }
    
    chatContainer.appendChild(outgoingMessageDiv);
    typingForm.reset();
    document.body.classList.add("hide-header");
    chatContainer.scrollTo(0, chatContainer.scrollHeight);
    setTimeout(showLoadingAnimation, 500);
};

// Initialize the app
function init() {
    loadDataFromLocalstorage();
    initLanguageDropdown();
    initSpeechRecognition();
    
    // Load voices when they become available
    if (speechSynthesis.onvoiceschanged !== undefined) {
        speechSynthesis.onvoiceschanged = () => {
            console.log("Voices loaded:", speechSynthesis.getVoices());
        };
    }
    
    // Try to load voices immediately
    const voices = speechSynthesis.getVoices();
    if (voices.length === 0) {
        speechSynthesis.addEventListener('voiceschanged', () => {
            console.log("Voices loaded after event:", speechSynthesis.getVoices());
        });
    } else {
        console.log("Voices already loaded:", voices);
    }
}

// Event listeners
toggleThemeButton.addEventListener("click", () => {
    const isLightMode = document.body.classList.toggle("light_mode");
    localStorage.setItem("themeColor", isLightMode ? "light_mode" : "dark_mode");
    toggleThemeButton.textContent = isLightMode ? "dark_mode" : "light_mode";
});

deleteChatButton.addEventListener("click", () => {
    if (confirm("Do you want to start a new chat?")) {
        localStorage.removeItem("saved-chats");
        loadDataFromLocalstorage();
    }
});

suggestions.forEach((suggestion) => {
    suggestion.addEventListener("click", () => {
        userMessage = suggestion.querySelector(".text").textContent;
        handleOutgoingChat();
    });
});

imageUploadButton.addEventListener("click", () => imageInput.click());

imageInput.addEventListener("change", (e) => {
    if (e.target.files.length > 0) {
        uploadedFile = e.target.files[0];
        if (!typingForm.querySelector(".typing-input").value.trim()) {
            handleOutgoingChat();
        }
    }
});

typingForm.addEventListener("submit", (e) => {
    e.preventDefault();
    handleOutgoingChat();
});

languageToggleButton.addEventListener('click', (e) => {
    e.stopPropagation();
    languageDropdown.classList.toggle('show');
});

document.addEventListener('click', () => {
    languageDropdown.classList.remove('show');
});

// Initialize when window loads
window.addEventListener('load', () => {
    init();
});

// Expose functions to global scope for HTML event handlers
window.toggleMessageSpeech = toggleMessageSpeech;
window.copyMessage = copyMessage;
window.showTranslationOptions = showTranslationOptions;
window.handleTranslation = handleTranslation;
window.revertTranslation = revertTranslation;
window.speakSummary = speakSummary;
window.updateSummaryLength = updateSummaryLength;
window.stopSpeech = stopSpeech;
window.speakAllMessages = speakAllMessages;


