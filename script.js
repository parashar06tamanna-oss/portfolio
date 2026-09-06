// ---------- Config ----------
const GITHUB_USERNAME = 'parashar06tamanna-oss';
const LEETCODE_USERNAME = 'tamanna_1664525';

const GITHUB_API = 'https://api.github.com';
const CONTRIBUTIONS_FILE = 'contributions.json';

// ---------- Helpers ----------

async function fetchJSON(url) {
    const res = await fetch(url, { headers: { 'Accept': 'application/json' } });
    if (!res.ok) throw new Error('Request failed: ' + res.status);
    return res.json();
}

function el(tag, className, text) {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (text !== undefined) node.textContent = text;
    return node;
}

function formatNum(n) {
    return n.toLocaleString('en-US');
}

// ---------- GitHub contribution map ----------

function renderContributionMap(container, contributions) {
    container.innerHTML = '';

    // Pad the start so weeks align to Sunday
    const firstDate = new Date(contributions[0].date);
    const padStart = firstDate.getDay();
    const pad = new Array(padStart).fill(null);

    const days = [...pad, ...contributions];
    const weeks = [];
    for (let i = 0; i < days.length; i += 7) {
        weeks.push(days.slice(i, i + 7));
    }

    // GitHub-style graph: each WEEK is a COLUMN, so time flows left to right.
    // Build one row per weekday (Sun..Sat) with a cell for every week.
    const weekLength = 7;
    for (let w = 0; w < weekLength; w++) {
        const row = el('div', 'map-row');
        weeks.forEach((week) => {
            const day = week[w];
            if (day === undefined || day === null) {
                // missing day (padding / partial week) — invisible filler keeps columns aligned
                row.appendChild(el('span', 'map-cell is-empty'));
                return;
            }
            const cell = el('span', 'map-cell lvl-' + day.level);
            cell.title = day.date + ': ' + day.count + ' contribution' + (day.count === 1 ? '' : 's');
            row.appendChild(cell);
        });
        container.appendChild(row);
    }
}

async function loadContributionMap() {
    const container = document.getElementById('contribution-map');
    const totalEl = document.getElementById('map-total');

    try {
        const data = await fetchJSON(CONTRIBUTIONS_FILE);
        const total = data.total ? data.total.lastYear : 0;

        totalEl.innerHTML = '<strong>' + formatNum(total) + '</strong> contributions in the last year';

        const oneYearAgo = new Date();
        oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);
        document.querySelector('.map-year').textContent =
            oneYearAgo.getFullYear() + ' – ' + new Date().getFullYear();

        renderContributionMap(container, data.contributions);
    } catch (err) {
        totalEl.textContent = 'Contribution data unavailable';
        container.innerHTML = '';
        container.appendChild(el('p', 'loading-text', 'Could not load the contribution map. Check your connection and try again.'));
    }
}

// ---------- GitHub repositories ----------

async function loadRepos() {
    const grid = document.getElementById('repo-grid');
    grid.innerHTML = '';

    const langColors = {
        JavaScript: '#f1e05a',
        TypeScript: '#3178c6',
        Python: '#3572A5',
        HTML: '#e34c26',
        CSS: '#563d7c',
        Java: '#b07219',
        'C++': '#f34b7d',
        C: '#555555',
        'C#': '#178600',
        Go: '#00ADD8',
        Rust: '#dea584',
        PHP: '#4F5D95',
        Ruby: '#701516',
        Shell: '#89e051',
        Swift: '#F05138',
        Kotlin: '#A97BFF',
        Dart: '#00B4AB',
        Jupyter: '#DA5B0B',
    };

    try {
        const repos = await fetchJSON(GITHUB_API + '/users/' + GITHUB_USERNAME + '/repos?per_page=100&sort=updated');

        if (!repos.length) {
            grid.appendChild(el('p', 'empty-note', 'No public repositories yet — new projects will appear here automatically.'));
            return;
        }

        repos
            .filter(r => !r.fork)
            .forEach((repo) => {
                const card = el('a', 'repo-card');
                card.href = repo.html_url;
                card.target = '_blank';
                card.rel = 'noopener';

                const title = el('h3');
                const icon = el('span', 'repo-icon', '📁');
                title.appendChild(icon);
                title.appendChild(document.createTextNode(repo.name));

                const desc = el('p', '', repo.description || 'No description provided.');

                const meta = el('div', 'repo-meta');
                if (repo.language) {
                    const lang = el('span');
                    const dot = el('span', 'dot');
                    dot.style.background = langColors[repo.language] || '#8b949e';
                    lang.appendChild(dot);
                    lang.appendChild(document.createTextNode(' ' + repo.language));
                    meta.appendChild(lang);
                }
                meta.appendChild(el('span', '', '★ ' + formatNum(repo.stargazers_count)));
                meta.appendChild(el('span', '', '⑂ ' + formatNum(repo.forks_count)));

                card.appendChild(title);
                card.appendChild(desc);
                card.appendChild(meta);
                grid.appendChild(card);
            });
    } catch (err) {
        grid.appendChild(el('p', 'empty-note', 'Could not load repositories. Please try again later.'));
    }
}

// ---------- LeetCode stats + rings ----------

function setRing(ringEl, solved, total) {
    const pct = total > 0 ? Math.round((solved / total) * 100) : 0;
    ringEl.style.setProperty('--p', pct);
    const num = ringEl.querySelector('.stat-num');
    num.textContent = solved;
}

function drawActivityCalendar(container, submissionCalendar) {
    container.innerHTML = '';

    const map = {};
    if (submissionCalendar && submissionCalendar !== '{}') {
        try {
            Object.entries(JSON.parse(submissionCalendar)).forEach(([ts, count]) => {
                map[ts] = count;
            });
        } catch (e) { /* ignore malformed payload */ }
    }

    const timestamps = Object.keys(map).map(Number).sort((a, b) => a - b);
    if (!timestamps.length) {
        container.appendChild(el('p', 'loading-text', 'No submissions yet this year — every problem you solve will show up here.'));
        return;
    }

    const firstTs = timestamps[0];
    const lastTs = timestamps[timestamps.length - 1];
    const start = new Date(firstTs * 1000);
    start.setHours(0, 0, 0, 0);
    const startDay = start.getDay();
    if (startDay > 0) start.setDate(start.getDate() - startDay); // align to Sunday

    const end = new Date(lastTs * 1000);
    end.setHours(23, 59, 59, 999);

    const days = [];
    const cursor = new Date(start);
    while (cursor <= end) {
        const key = String(Math.floor(cursor.getTime() / 1000));
        days.push({ date: new Date(cursor), count: map[key] || 0 });
        cursor.setDate(cursor.getDate() + 1);
    }

    // Same orientation as the GitHub map: one row per weekday, one column per week.
    const weeks = [];
    for (let i = 0; i < days.length; i += 7) {
        weeks.push(days.slice(i, i + 7));
    }

    for (let w = 0; w < 7; w++) {
        const row = el('div', 'map-row');
        weeks.forEach((week) => {
            const day = week[w];
            if (day === undefined) {
                row.appendChild(el('span', 'map-cell is-empty'));
                return;
            }
            const cell = el('span', 'map-cell' + (day.count ? ' hot' : ''));
            if (day.count) {
                cell.title = day.date.toDateString() + ': ' + day.count + ' submission' + (day.count === 1 ? '' : 's');
            }
            row.appendChild(cell);
        });
        container.appendChild(row);
    }
}

async function loadLeetCode() {
    const totalNum = document.getElementById('lc-total-num');
    const streakEl = document.getElementById('lc-streak');
    const activeEl = document.getElementById('lc-active');
    const rankEl = document.getElementById('lc-rank');

    const calEl = document.getElementById('lc-calendar');

    try {
        const res = await fetch('https://leetcode.com/graphql', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify([
                {
                    query: `query userProblemsSolved($username: String!) {
                        matchedUser(username: $username) {
                            submitStatsGlobal { acSubmissionNum { difficulty count } }
                        }
                    }`,
                    variables: { username: LEETCODE_USERNAME },
                },
                {
                    query: `query userProfileCalendar($username: String!) {
                        matchedUser(username: $username) {
                            userCalendar { activeYears submissionCalendar streak totalActiveDays }
                            profile { ranking }
                        }
                    }`,
                    variables: { username: LEETCODE_USERNAME },
                },
            ]),
        });

        if (!res.ok) throw new Error('Request failed: ' + res.status);
        const results = await res.json();

        // Solved counts per difficulty
        const solved = results[0].data.matchedUser.submitStatsGlobal.acSubmissionNum || [];
        const get = (d) => solved.find((x) => x.difficulty === d) || { count: 0 };
        const easy = get('Easy').count;
        const medium = get('Medium').count;
        const hard = get('Hard').count;
        const all = get('All').count;

        totalNum.textContent = formatNum(all);

        // Totals from the LeetCode problem set
        const EASY_TOTAL = 800;
        const MEDIUM_TOTAL = 1700;
        const HARD_TOTAL = 750;

        setRing(document.getElementById('easy-ring'), easy, EASY_TOTAL);
        setRing(document.getElementById('medium-ring'), medium, MEDIUM_TOTAL);
        setRing(document.getElementById('hard-ring'), hard, HARD_TOTAL);

        document.querySelector('.easy-ring').title = easy + ' / ' + EASY_TOTAL + ' easy problems solved';
        document.querySelector('.medium-ring').title = medium + ' / ' + MEDIUM_TOTAL + ' medium problems solved';
        document.querySelector('.hard-ring').title = hard + ' / ' + HARD_TOTAL + ' hard problems solved';

        // Calendar + streak + rank
        const user = results[1].data.matchedUser;
        const calendar = user.userCalendar;
        streakEl.textContent = calendar.streak || 0;
        activeEl.textContent = calendar.totalActiveDays || 0;

        const rank = user.profile.ranking;
        rankEl.textContent = rank && rank > 0 ? formatNum(rank) : '—';

        drawActivityCalendar(calEl, calendar.submissionCalendar);
    } catch (err) {
        streakEl.textContent = '—';
        activeEl.textContent = '—';
        rankEl.textContent = '—';
        calEl.innerHTML = '';
        calEl.appendChild(el('p', 'loading-text', 'Could not load LeetCode data. Please try again later.'));
    }
}

// ---------- Scroll reveal ----------

function initReveal() {
    const targets = document.querySelectorAll(
        '.sec-head, .sec-body > *, .hero-inner'
    );

    if (!('IntersectionObserver' in window)) {
        targets.forEach((node) => node.classList.add('is-in'));
        return;
    }

    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    const observer = new IntersectionObserver(
        (entries) => {
            entries.forEach((entry) => {
                if (entry.isIntersecting) {
                    entry.target.classList.add('is-in');
                    observer.unobserve(entry.target);
                }
            });
        },
        { threshold: 0.12, rootMargin: '0px 0px -8% 0px' }
    );

    targets.forEach((node) => {
        if (reduced) {
            node.classList.add('is-in');
            return;
        }
        node.classList.add('reveal');
        observer.observe(node);
    });
}

// ---------- Init ----------

document.getElementById('year').textContent = new Date().getFullYear();

loadContributionMap();
loadRepos();
loadLeetCode();
initReveal();
