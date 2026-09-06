// Fetches LeetCode stats from the official GraphQL endpoint (server-side, no CORS) and
// writes leetcode.json. Run by the GitHub Action workflow.

import { writeFileSync } from 'node:fs';

const USERNAME = process.env.LEETCODE_USERNAME || 'tamanna_1664525';
const OUT_FILE = new URL('../leetcode.json', import.meta.url);

const graphql = async (query, variables) => {
  const res = await fetch('https://leetcode.com/graphql', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ query, variables }),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
};

const [solvedRes, profileRes, calRes] = await Promise.all([
  graphql(
    `query userProblemsSolved($username: String!) {
      matchedUser(username: $username) {
        submitStatsGlobal { acSubmissionNum { difficulty count } }
      }
    }`,
    { username: USERNAME }
  ),
  graphql(
    `query userProfileCalendar($username: String!) {
      matchedUser(username: $username) {
        profile { ranking }
        userCalendar { activeYears submissionCalendar streak totalActiveDays }
      }
    }`,
    { username: USERNAME }
  ),
]);

const data = {
  profile: profileRes.data.matchedUser.profile,
  calendar: profileRes.data.matchedUser.userCalendar,
  solved: solvedRes.data.matchedUser.submitStatsGlobal.acSubmissionNum,
};

writeFileSync(OUT_FILE, JSON.stringify(data, null, 2));
console.log(`Wrote leetcode.json for ${USERNAME}.`);