const { v4: uuidv4 } = require('uuid');

/**
 * Generate a human-friendly daily key
 * Format: DNX-XXXX-XXXX (uppercase alphanumeric)
 */
function generateDailyKey() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // no I,O,0,1 to avoid confusion
  let part1 = '';
  let part2 = '';
  for (let i = 0; i < 4; i++) {
    part1 += chars.charAt(Math.floor(Math.random() * chars.length));
    part2 += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return `DNX-${part1}-${part2}`;
}

function generateSessionToken() {
  return uuidv4().replace(/-/g, '') + uuidv4().replace(/-/g, '').slice(0, 16);
}

function generateInstallationId() {
  return uuidv4();
}

module.exports = {
  generateDailyKey,
  generateSessionToken,
  generateInstallationId
};
