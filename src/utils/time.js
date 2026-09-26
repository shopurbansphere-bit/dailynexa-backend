/**
 * All time operations forced to Asia/Kolkata
 */

function getKolkataDate() {
  // Returns YYYY-MM-DD in Asia/Kolkata
  const now = new Date();
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Kolkata',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  });
  return formatter.format(now); // already YYYY-MM-DD
}

function getKolkataNow() {
  return new Date(new Date().toLocaleString('en-US', { timeZone: 'Asia/Kolkata' }));
}

/**
 * Returns the expiration Date for a given date string (YYYY-MM-DD)
 * Expiration = next day 00:00:00 Asia/Kolkata
 */
function getExpiresAt(dateStr) {
  // dateStr is YYYY-MM-DD
  const [year, month, day] = dateStr.split('-').map(Number);
  // Create date at 00:00 next day in Kolkata
  // We use a simple approach: midnight of next day in UTC offset +5:30
  const nextDay = new Date(Date.UTC(year, month - 1, day + 1, 0, 0, 0));
  // Adjust for Kolkata offset (UTC+5:30) so that the UTC moment corresponds to 00:00 Kolkata
  // Actually simpler: create the moment that is 00:00 next day Kolkata
  const expires = new Date(`${dateStr}T00:00:00+05:30`);
  expires.setDate(expires.getDate() + 1);
  return expires;
}

function getServerTimeISO() {
  return new Date().toISOString();
}

module.exports = {
  getKolkataDate,
  getKolkataNow,
  getExpiresAt,
  getServerTimeISO
};
