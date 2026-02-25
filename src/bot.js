require("dotenv").config();
const TelegramBot = require("node-telegram-bot-api");

const { fetchTranscript, extractVideoId } = require("./services/transcriptService");
const { generateSummary } = require("./services/summaryService");
const { answerQuestion } = require("./services/qaService");
const { saveSession, getSession } = require("./session/sessionManager");
const { detectLanguageFromText } = require("./utils/languageUtils");

const bot = new TelegramBot(process.env.BOT_TOKEN, { polling: true });

console.log("🤖 Telegram YouTube Bot is running...");

// Helper function to split long messages and clean formatting
async function sendLongMessage(bot, chatId, text) {
    const maxLength = 4000; // Telegram limit is 4096

    // Clean up any stray markdown asterisks/bolding that the LLM might have ignored instructions for
    const cleanedText = text.replace(/\*/g, '');

    for (let i = 0; i < cleanedText.length; i += maxLength) {
        await bot.sendMessage(chatId, cleanedText.substring(i, i + maxLength));
    }
}

// Handle /start command
bot.onText(/\/start/, (msg) => {
    const chatId = msg.chat.id;
    bot.sendMessage(chatId, "👋 Welcome! Send me a YouTube URL to get started. Once parsed, you can ask me questions about it or type /summaryenglish or /summaryhindi.");
});

bot.on("message", async (msg) => {
    const chatId = msg.chat.id;
    const text = msg.text;

    if (!text) return;

    // Ignore specific commands handled by onText (like /start, /deepdive, /actionpoints) but allow others to fall through
    if (text === '/start' || text.startsWith('/deepdive') || text.startsWith('/actionpoints')) return;

    // If YouTube link
    if (text.includes("youtube.com") || text.includes("youtu.be")) {
        const videoId = extractVideoId(text);
        if (!videoId) {
            return bot.sendMessage(chatId, "❌ Invalid YouTube URL format.");
        }

        bot.sendMessage(chatId, "⏳ Fetching transcript...");
        let transcript;
        try {
            transcript = await fetchTranscript(videoId);
        } catch (err) {
            if (err.message.includes("Transcript is disabled")) {
                return bot.sendMessage(chatId, "⚠️ This video does not provide captions.\nPlease try a video with subtitles enabled.");
            } else if (err.message.includes("Cannot access transcript") || err.message.includes("private") || err.message.includes("restricted")) {
                return bot.sendMessage(chatId, "⚠️ Cannot access transcript (video may be private or restricted).");
            } else {
                return bot.sendMessage(chatId, "❌ Failed to fetch transcript... try another video.");
            }
        }

        saveSession(chatId, { transcript, videoId });
        bot.sendMessage(chatId, "✅ Transcript loaded! You can now ask questions or type '/summary' to get a breakdown.");
        return;
    }

    // General Q&A
    const session = getSession(chatId);
    if (!session) {
        return bot.sendMessage(chatId, "⚠️ Please send a YouTube link first.");
    }

    const language = detectLanguageFromText(text);

    // Handle direct commands
    if (text.toLowerCase() === '/summaryhindi') {
        bot.sendMessage(chatId, `⏳ Generating summary in Hindi...`);
        const summary = await generateSummary(session.transcript, "Hindi");
        if (!summary) return bot.sendMessage(chatId, "❌ Failed to generate summary. The response was empty.");
        return await sendLongMessage(bot, chatId, summary);
    }
    if (text.toLowerCase() === '/summaryenglish' || text.toLowerCase() === '/summary') {
        bot.sendMessage(chatId, `⏳ Generating summary in English...`);
        const summary = await generateSummary(session.transcript, "English");
        if (!summary) return bot.sendMessage(chatId, "❌ Failed to generate summary. The response was empty.");
        return await sendLongMessage(bot, chatId, summary);
    }

    bot.sendMessage(chatId, `⏳ Thinking...`);
    const answer = await answerQuestion(session.transcript, text, language);
    if (!answer) return bot.sendMessage(chatId, "❌ Failed to generate answer. The response was empty.");
    await sendLongMessage(bot, chatId, answer);
});

// Bonus Commands


bot.onText(/\/deepdive(.*)/, async (msg, match) => {
    const chatId = msg.chat.id;
    const session = getSession(chatId);
    if (!session) {
        return bot.sendMessage(chatId, "⚠️ Please send a YouTube link first.");
    }

    const args = match[1] || "";
    const language = detectLanguageFromText(args);

    bot.sendMessage(chatId, "🕵️‍♂️ Generating a deep dive analysis. This might take a moment...");
    const prompt = `Give a comprehensive deep dive analysis of the core themes in the transcript. Group insights by themes and explain them in ${language}.`;

    const answer = await answerQuestion(session.transcript, prompt, language);
    if (!answer) return bot.sendMessage(chatId, "❌ Failed to generate deep dive. The response was empty.");
    await sendLongMessage(bot, chatId, answer);
});

bot.onText(/\/actionpoints(.*)/, async (msg, match) => {
    const chatId = msg.chat.id;
    const session = getSession(chatId);
    if (!session) {
        return bot.sendMessage(chatId, "⚠️ Please send a YouTube link first.");
    }

    const args = match[1] || "";
    const language = detectLanguageFromText(args);

    bot.sendMessage(chatId, "📝 Extracting action points. This might take a moment...");
    const prompt = `Extract all actionable items, tasks, and key takeaways from the transcript. Format them as a clear, bulleted list in ${language}.`;

    const answer = await answerQuestion(session.transcript, prompt, language);
    if (!answer) return bot.sendMessage(chatId, "❌ Failed to extract action points. The response was empty.");
    await sendLongMessage(bot, chatId, answer);
});
