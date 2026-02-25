const axios = require('axios');
const { execSync } = require('child_process');
const path = require('path');

async function fetchTranscript(videoId) {
  try {
    // Determine path to yt-dlp.exe based on project root
    const ytdlpPath = path.join(__dirname, '..', '..', 'yt-dlp.exe');

    // Execute yt-dlp to get JSON dump
    const stdout = execSync(`"${ytdlpPath}" -J "https://www.youtube.com/watch?v=${videoId}"`, { maxBuffer: 1024 * 1024 * 50 });
    const info = JSON.parse(stdout.toString());

    // Subtitles or automatic captions
    const subs = info.subtitles || {};
    const autoSubs = info.automatic_captions || {};

    let targetSubsList = subs['en'] || autoSubs['en'];

    // Try en-US or en-GB if simple 'en' is not available
    if (!targetSubsList) targetSubsList = subs['en-US'] || autoSubs['en-US'];
    if (!targetSubsList) targetSubsList = subs['en-GB'] || autoSubs['en-GB'];

    if (!targetSubsList) {
      // fallback to first available language
      const firstLang = Object.keys(subs)[0] || Object.keys(autoSubs)[0];
      if (firstLang) {
        targetSubsList = subs[firstLang] || autoSubs[firstLang];
      } else {
        throw new Error("Transcript is disabled or unavailable for this video");
      }
    }

    // find json3 format
    const json3Subtitle = targetSubsList.find(s => s.ext === 'json3');
    if (!json3Subtitle || !json3Subtitle.url) {
      throw new Error("Could not find a json3 transcript format for this video.");
    }

    // Fetch the transcript content
    const res = await axios.get(json3Subtitle.url);
    const events = res.data.events;
    if (!events) {
      throw new Error("Transcript format is invalid or empty.");
    }

    const text = events
      .filter(e => e.segs)
      .map(e => e.segs.map(s => s.utf8).join(''))
      .join(' ')
      .replace(/\n/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();

    return text;
  } catch (err) {
    console.error("Transcript error:", err.message);
    throw err;
  }
}

function extractVideoId(url) {
  const regExp = /(?:youtube\.com\/(?:.*v=|.*\/)|youtu\.be\/)([^"&?\/\s]{11})/;
  const match = url.match(regExp);
  return match ? match[1] : null;
}

module.exports = { fetchTranscript, extractVideoId };