const supportedLanguages = [
    "english", "hindi", "spanish", "french", "german", "kannada",
    "tamil", "telugu", "malayalam", "marathi", "bengali", "gujarati",
    "punjabi", "urdu", "chinese", "japanese", "korean", "arabic",
    "russian", "portuguese", "italian", "dutch", "swedish", "turkish"
];

function detectLanguageFromText(text) {
    if (!text) return "English";
    const lowerText = text.toLowerCase();
    for (const lang of supportedLanguages) {
        if (lowerText.includes(lang)) {
            // Return capitalized language name
            return lang.charAt(0).toUpperCase() + lang.slice(1);
        }
    }
    return "English"; // Default fallback
}

module.exports = { detectLanguageFromText };
