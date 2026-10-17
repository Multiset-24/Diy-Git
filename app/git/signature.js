// Builds the "Name <email> <unix-seconds> <+hhmm>" line used in commits.
// Uses the same environment variables as git, so tests can produce
// commits with identical hashes in both tools.

function formatOffset(minutesEast) {
  const sign = minutesEast >= 0 ? "+" : "-";
  const abs = Math.abs(minutesEast);
  const hh = String(Math.floor(abs / 60)).padStart(2, "0");
  const mm = String(abs % 60).padStart(2, "0");
  return `${sign}${hh}${mm}`;
}

function signature(role, now = new Date()) {
  const env = process.env;
  const name = env[`GIT_${role}_NAME`] || "DIY Git User";
  const email = env[`GIT_${role}_EMAIL`] || "diy-git@localhost";
  // GIT_*_DATE in git's internal "<seconds> <+hhmm>" form, if set.
  const date = env[`GIT_${role}_DATE`];
  if (date && /^\d+ [+-]\d{4}$/.test(date)) return `${name} <${email}> ${date}`;
  const seconds = Math.floor(now.getTime() / 1000);
  return `${name} <${email}> ${seconds} ${formatOffset(-now.getTimezoneOffset())}`;
}

module.exports = { signature };
