const GITHUB_API = 'https://api.github.com';
const token = process.env.GITHUB_TOKEN;

function headers() {
  const h = { Accept: 'application/vnd.github.v3+json' };
  if (token) h.Authorization = `Bearer ${token}`;
  return h;
}

/**
 * Parse GitHub issue URL to { owner, repo, issue_number }.
 * Supports: https://github.com/owner/repo/issues/42
 */
export function parseIssueUrl(url) {
  if (!url || typeof url !== 'string') return null;
  const trimmed = url.trim();
  const match = trimmed.match(/github\.com[/]([^/]+)[/]([^/]+)[/]issues[/](\d+)/i);
  if (!match) return null;
  return {
    owner: match[1],
    repo: match[2],
    issue_number: parseInt(match[3], 10),
  };
}

/**
 * Fetch issue from GitHub API. Returns { title, state, ... } or null if not found.
 */
export async function fetchIssue(owner, repo, issueNumber) {
  const res = await fetch(
    `${GITHUB_API}/repos/${owner}/${repo}/issues/${issueNumber}`,
    { headers: headers() }
  );
  if (res.status === 404) return null;
  if (!res.ok) throw new Error(`GitHub API: ${res.status}`);
  return res.json();
}

/**
 * Validate issue URL and fetch issue. Returns { owner, repo, issue_number, issue_url, issue_title } or throws.
 */
export async function validateIssueUrl(issueUrl) {
  const parsed = parseIssueUrl(issueUrl);
  if (!parsed) throw new Error('Invalid GitHub issue URL. Use format: https://github.com/owner/repo/issues/N');
  const issue = await fetchIssue(parsed.owner, parsed.repo, parsed.issue_number);
  if (!issue) throw new Error('Issue not found on GitHub');
  if (issue.pull_request) throw new Error('URL must be an issue, not a pull request');
  const issue_url = `https://github.com/${parsed.owner}/${parsed.repo}/issues/${parsed.issue_number}`;
  return {
    owner: parsed.owner,
    repo: parsed.repo,
    issue_number: parsed.issue_number,
    issue_url,
    issue_title: issue.title || null,
  };
}
