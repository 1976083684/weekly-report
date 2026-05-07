interface PushOptions {
  token: string;
  owner: string;
  repo: string;
  branch: string;
  path: string;
  content: string;
  message: string;
}

export async function pushToGitee(options: PushOptions) {
  const { token, owner, repo, branch, path, content, message } = options;
  const baseUrl = `https://gitee.com/api/v5/repos/${owner}/${repo}`;

  const contentBase64 = Buffer.from(content).toString("base64");

  // Get current file SHA (if exists)
  let sha: string | undefined;
  try {
    const getRes = await fetch(
      `${baseUrl}/contents/${path}?access_token=${token}&ref=${branch}`
    );
    if (getRes.ok) {
      const data = await getRes.json();
      sha = data.sha;
    }
  } catch {
    // File doesn't exist, will be created
  }

  // Create or update file
  const body: Record<string, string> = {
    access_token: token,
    content: contentBase64,
    message,
    branch,
  };
  if (sha) body.sha = sha;

  const putRes = await fetch(`${baseUrl}/contents/${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  if (!putRes.ok) {
    const err = await putRes.json().catch(() => ({ message: putRes.statusText }));
    throw new Error(err.message || `Gitee API error: ${putRes.status}`);
  }

  const result = await putRes.json();
  return { sha: result.content?.sha || "unknown" };
}

export function parseGiteeUrl(url: string): { owner: string; repo: string } | null {
  const match = url.match(/gitee\.com\/([^/]+)\/([^/]+?)(?:\.git)?$/);
  if (!match) return null;
  return { owner: match[1], repo: match[2] };
}
