const sessions = {};

function saveSession(userId, data) {
  sessions[userId] = data;
}

function getSession(userId) {
  return sessions[userId];
}

module.exports = { saveSession, getSession };