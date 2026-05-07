interface PushOptions {
  token: string;
  owner: string;
  repo: string;
  branch: string;
  path: string;
  content: string;
  message: string;
}

export async function pushToGitHub(options: PushOptions) {
  const { token, owner, repo, branch, path, content, message } = options;
  const baseUrl = `https://api.github.com/repos/${owner}/${repo}`;

  const normalized = content.replace(/\r\n/g, "\n").replace(/\r/g, "\n");
  const contentBase64 = Buffer.from(normalized, "utf-8").toString("base64");

  // Get current file SHA (if exists)
  let sha: string | undefined;
  try {
    const getRes = await fetch(`${baseUrl}/contents/${path}?ref=${branch}`, {
      headers: {
        Authorization: `token ${token}`,
        Accept: "application/vnd.github.v3+json",
      },
    });
    if (getRes.ok) {
      const data = await getRes.json();
      sha = data.sha;
    }
  } catch {
    // File doesn't exist, will be created
  }

  // Create or update file
  const body: Record<string, string> = {
    message,
    content: contentBase64,
    branch,
  };
  if (sha) body.sha = sha;

  const putRes = await fetch(`${baseUrl}/contents/${path}`, {
    method: "PUT",
    headers: {
      Authorization: `token ${token}`,
      Accept: "application/vnd.github.v3+json",
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  if (!putRes.ok) {
    const err = await putRes.json().catch(() => ({ message: putRes.statusText }));
    throw new Error(err.message || `GitHub API error: ${putRes.status}`);
  }

  const result = await putRes.json();
  return { sha: result.content?.sha || "unknown" };
}

export function parseGitHubUrl(url: string): { owner: string; repo: string } | null {
  const match = url.match(/github\.com\/([^/]+)\/([^/]+?)(?:\.git)?$/);
  if (!match) return null;
  return { owner: match[1], repo: match[2] };
}
