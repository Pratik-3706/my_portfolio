// Fills the open source section of index.html with my merged pull requests.
// Keeps public, licensed repos that belong to someone else. Run it with:
//   node scripts/open-source.mjs
import { readFile, writeFile } from 'node:fs/promises';
import { pathToFileURL } from 'node:url';

const ME = 'Pratik-3706';
const API = 'https://api.github.com';
const START = '<!-- open-source:start -->';
const END = '<!-- open-source:end -->';

const esc = s => String(s).replace(/[&<>"']/g, c => `&#${c.charCodeAt(0)};`);
const month = iso => new Date(iso).toLocaleDateString('en-US', { month: 'short', year: 'numeric', timeZone: 'Asia/Kolkata' });
const merged = pr => pr.pull_request && pr.pull_request.merged_at;

async function get(url, tries = 3) {
  const headers = { accept: 'application/vnd.github+json', 'user-agent': 'node' };
  if (process.env.GITHUB_TOKEN) headers.authorization = `Bearer ${process.env.GITHUB_TOKEN}`;
  for (let n = 1; ; n++) {
    let why;
    try {
      const res = await fetch(url, { headers });
      if (res.ok) return await res.json();
      why = `${res.status} ${res.statusText}`;
    } catch (e) { why = e.message; }
    if (n === tries) throw new Error(`${url}: ${why}`);
    await new Promise(r => setTimeout(r, 2000 * n));
  }
}

export function isOpenSource(repo) {
  return !repo.private && repo.visibility !== 'internal' && Boolean(repo.license) &&
    repo.owner.login.toLowerCase() !== ME.toLowerCase();
}

async function pulls() {
  const q = encodeURIComponent(`is:pr is:merged is:public author:${ME} -user:${ME}`);
  const all = [];
  for (let page = 1; ; page++) {
    const r = await get(`${API}/search/issues?q=${q}&per_page=100&page=${page}`);
    if (r.incomplete_results) throw new Error('GitHub returned a partial search');
    all.push(...r.items);
    if (!r.items.length || all.length >= r.total_count) return all;
  }
}

// [{ repo, prs }], the repo with the newest merge first
export function group(prs, repos) {
  const by = new Map();
  for (const pr of prs) {
    const repo = repos.get(pr.repository_url);
    if (!repo || !isOpenSource(repo) || !merged(pr)) continue;
    if (!by.has(repo.full_name)) by.set(repo.full_name, { repo, prs: [] });
    by.get(repo.full_name).prs.push(pr);
  }
  const groups = [...by.values()];
  for (const g of groups) g.prs.sort((a, b) => merged(b).localeCompare(merged(a)));
  return groups.sort((a, b) => merged(b.prs[0]).localeCompare(merged(a.prs[0])));
}

export function render(groups, names = {}) {
  const lines = [];
  for (const { repo, prs } of groups) {
    lines.push(
      '<li>',
      '  <div class="row">',
      `    <h3><a href="${esc(repo.html_url)}" target="_blank" rel="noopener">${esc(names[repo.full_name] || repo.name)}</a></h3>`,
      '    <ul class="body pulls">');
    for (const pr of prs) {
      lines.push(
        '      <li>',
        `        <a class="pull" href="${esc(pr.html_url)}" target="_blank" rel="noopener">${esc(pr.title.replace(/`/g, ''))}</a>`,
        `        <span class="stack"><b>merged</b> ${month(merged(pr))}, #${pr.number}</span>`,
        '      </li>');
    }
    lines.push('    </ul>');
    lines.push('  </div>', '</li>');
  }
  return lines;
}

export function splice(html, lines) {
  const a = html.indexOf(START), b = html.indexOf(END);
  if (a < 0 || b < a) throw new Error('open-source markers are missing from index.html');
  const nl = html.includes('\r\n') ? '\r\n' : '\n';
  const pad = html.slice(html.lastIndexOf('\n', a) + 1, a);
  return html.slice(0, a + START.length) + nl + lines.map(l => pad + l + nl).join('') + pad + html.slice(b);
}

async function main() {
  const page = new URL('../index.html', import.meta.url);
  const names = JSON.parse(await readFile(new URL('./repo-names.json', import.meta.url), 'utf8'));
  const prs = await pulls();
  const repos = new Map();
  for (const url of new Set(prs.map(p => p.repository_url))) repos.set(url, await get(url));
  const groups = group(prs, repos);
  // an empty answer is far more likely a bad response than every merge vanishing
  if (!groups.length) throw new Error('no merged pull requests came back, leaving the page alone');
  await writeFile(page, splice(await readFile(page, 'utf8'), render(groups, names)));
  for (const g of groups) console.log(`${g.repo.full_name}: ${g.prs.length}`);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) await main();
