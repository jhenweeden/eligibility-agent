// Vercel serverless function: POST /api/submit
// Appends each eligibility submission as a row in a CSV file stored in
// this GitHub repo, committing the change via the GitHub Contents API.
//
// Required environment variables (set in Vercel project settings):
//   GITHUB_TOKEN     - a GitHub personal access token with "repo" scope
//   GITHUB_REPO      - "owner/repo-name"
//   GITHUB_CSV_PATH  - path to the CSV file in the repo, e.g. "submissions.csv"
//   GITHUB_BRANCH    - branch to commit to, e.g. "main" (optional, defaults to "main")

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  const { email, programArea, answers, determination } = req.body || {};

  if (!email || !programArea || !determination) {
    res.status(400).json({ error: 'Missing required fields' });
    return;
  }

  const token = process.env.GITHUB_TOKEN;
  const repo = process.env.GITHUB_REPO;
  const filePath = process.env.GITHUB_CSV_PATH || 'submissions.csv';
  const branch = process.env.GITHUB_BRANCH || 'main';

  if (!token || !repo) {
    res.status(500).json({ error: 'Server is not configured for logging' });
    return;
  }

  const apiUrl = `https://api.github.com/repos/${repo}/contents/${encodeURIComponent(filePath)}`;
  const headers = {
    Authorization: `Bearer ${token}`,
    Accept: 'application/vnd.github+json'
  };

  try {
    let existingContent = '';
    let sha;

    const getResp = await fetch(`${apiUrl}?ref=${branch}`, { headers });
    if (getResp.ok) {
      const data = await getResp.json();
      sha = data.sha;
      existingContent = Buffer.from(data.content, 'base64').toString('utf-8');
    } else if (getResp.status !== 404) {
      throw new Error(`GitHub read failed: ${getResp.status}`);
    }

    const header = 'timestamp,email,program_area,determination,answers\n';
    const row = [
      new Date().toISOString(),
      csvEscape(email),
      csvEscape(programArea),
      csvEscape(determination),
      csvEscape(JSON.stringify(answers || {}))
    ].join(',') + '\n';

    const newContent = existingContent ? existingContent + row : header + row;

    const putResp = await fetch(apiUrl, {
      method: 'PUT',
      headers,
      body: JSON.stringify({
        message: `Log eligibility submission (${programArea}, ${determination})`,
        content: Buffer.from(newContent, 'utf-8').toString('base64'),
        branch,
        ...(sha ? { sha } : {})
      })
    });

    if (!putResp.ok) {
      const errText = await putResp.text();
      throw new Error(`GitHub write failed: ${putResp.status} ${errText}`);
    }

    res.status(200).json({ ok: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
}

function csvEscape(value) {
  const str = String(value ?? '');
  if (/[",\n]/.test(str)) {
    return '"' + str.replace(/"/g, '""') + '"';
  }
  return str;
}
