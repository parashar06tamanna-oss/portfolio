// Fetches contribution data from the GitHub GraphQL API and writes contributions.json.
// Run by the GitHub Action workflow; the token is stored as a repo secret (not exposed to browsers).

import { writeFileSync } from 'node:fs';

const USERNAME = process.env.GITHUB_ACTOR || '';
const TOKEN = process.env.GH_CONTRIB_TOKEN;
const OUT_FILE = new URL('../contributions.json', import.meta.url);

if (!USERNAME) {
  throw new Error('GITHUB_ACTOR is empty. Set the workflow to run on the correct repository.');
}
if (!TOKEN) {
  throw new Error('GH_CONTRIB_TOKEN secret is not set.');
}

// We build dates in UTC to stay consistent with GitHub's calendar window.
const now = new Date();
const oneYearAgo = new Date(now);
oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);

const toDateStr = (d) => d.toISOString().slice(0, 10);

// GitHub's GraphQL contribution calendar wants a YYYY-MM-DD string.
// Use the first day of the week containing oneYearAgo so the window covers a full year.
const start = new Date(oneYearAgo);
start.setDate(start.getDate() - start.getDay()); // align to Sunday
const end = new Date(now);

const query = `
query($login: String!, $from: DateTime!, $to: DateTime!) {
  user(login: $login) {
    contributionsCollection(from: $from, to: $to) {
      contributionCalendar {
        totalContributions
        weeks {
          contributionDays {
            date
            contributionCount
            contributionLevel
          }
        }
      }
    }
  }
}
`;

const res = await fetch('https://api.github.com/graphql', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${TOKEN}`,
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    query,
    variables: {
      login: USERNAME,
      from: toDateStr(start),
      to: toDateStr(end),
    },
  }),
});

const json = await res.json();
if (!res.ok || json.errors) {
  const message = json.errors ? json.errors.map((e) => e.message).join('; ') : res.statusText;
  throw new Error('GitHub GraphQL request failed: ' + message);
}

const calendar = json.data.user.contributionsCollection.contributionCalendar;

const contributions = [];
for (const week of calendar.weeks) {
  for (const day of week.contributionDays) {
    // Normalise levels to 0-4 like the old API, for the existing renderer.
    contributions.push({
      date: day.date,
      count: day.contributionCount,
      level: levelToOldScale(day.contributionLevel),
    });
  }
}

writeFileSync(OUT_FILE, JSON.stringify({
  total: { lastYear: calendar.totalContributions },
  contributions,
}, null, 2));

console.log(
  `Wrote contributions.json with ${calendar.totalContributions} contributions (last year).`
);

function levelToOldScale(level) {
  // contributionLevel is one of: NONE, FIRST_QUARTILE, SECOND_QUARTILE, THIRD_QUARTILE, FOURTH_QUARTILE
  const map = {
    NONE: 0,
    FIRST_QUARTILE: 1,
    SECOND_QUARTILE: 2,
    THIRD_QUARTILE: 3,
    FOURTH_QUARTILE: 4,
  };
  return map[level] ?? 0;
}