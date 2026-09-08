const GITHUB_API_URL = "https://api.github.com";
const OWNER = "cyruscook";
const PAGE_SIZE = 100;

interface Repository {
  archived: boolean;
  fork: boolean;
  homepage: string | null;
  owner: { login: string };
  visibility: string;
}

interface GitHubError {
  message?: string;
}

function pageURL(page: number): string {
  const params = new URLSearchParams({
    per_page: String(PAGE_SIZE),
    page: String(page),
    type: "owner",
    sort: "full_name",
    direction: "asc",
  });

  return `${GITHUB_API_URL}/users/${OWNER}/repos?${params}`;
}

function canonicalProjectURL(homepage: string | null): string | null {
  if (!homepage) return null;

  let url: URL;
  try {
    url = new URL(homepage);
  } catch {
    return null;
  }

  if (url.protocol !== "https:" || url.hostname !== `${OWNER}.github.io`) {
    return null;
  }

  const path = url.pathname.replace(/\/+$/, "");
  if (!path || url.search || url.hash) return null;

  return `https://${OWNER}.github.io${path}/`;
}

async function fetchRepositories(page: number): Promise<Repository[]> {
  const headers = new Headers({
    Accept: "application/vnd.github+json",
    "X-GitHub-Api-Version": "2022-11-28",
    "User-Agent": `${OWNER}.github.io-build`,
  });
  const token = process.env.GITHUB_TOKEN;
  if (token) headers.set("Authorization", `Bearer ${token}`);

  const response = await fetch(pageURL(page), { headers });
  if (!response.ok) {
    let message = `${response.status} ${response.statusText}`;
    try {
      const error = (await response.json()) as GitHubError;
      if (error.message) message = `${message}: ${error.message}`;
    } catch {
      // Keep the HTTP status when GitHub does not return JSON.
    }
    throw new Error(`GitHub repository discovery failed: ${message}`);
  }

  return (await response.json()) as Repository[];
}

export async function getProjectURLs(): Promise<string[]> {
  const projectURLs = new Set<string>();

  for (let page = 1; ; page += 1) {
    const repositories = await fetchRepositories(page);
    for (const repository of repositories) {
      if (
        repository.owner.login !== OWNER ||
        repository.visibility !== "public" ||
        repository.fork ||
        repository.archived
      ) {
        continue;
      }

      const projectURL = canonicalProjectURL(repository.homepage);
      if (projectURL) projectURLs.add(projectURL);
    }

    if (repositories.length < PAGE_SIZE) break;
  }

  return [...projectURLs].sort((left, right) => left.localeCompare(right));
}
