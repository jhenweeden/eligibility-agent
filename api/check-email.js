// Vercel serverless function: POST /api/check-email
// Looks up whether an email address already has a logged submission in the
// current calendar month, by reading the same submissions.csv used by
// api/submit.js. Used to reject repeat submissions within a month before
// asking the program-area questions.
//
// Required environment variables (same as api/submit.js):
//   GITHUB_TOKEN     - a GitHub personal access token with "repo" scope
//   GITHUB_REPO      - "owner/repo-name"
//   GITHUB_CSV_PATH  - path to the CSV file in the repo, e.g. "submissions.csv"
//   GITHUB_BRANCH    - branch to read from, e.g. "main" (optional, defaults to "main")

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  const { email } = req.body || {};

  if (!email) {
    res.status(400).json({ error: 'Missing required field: email' });
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
    const getResp = await fetch(`${apiUrl}?ref=${branch}`, { headers });

    if (getResp.status === 404) {
      // No log file yet, so nothing could have been logged.
      res.status(200).json({ loggedThisMonth: false });
      return;
    }
    if (!getResp.ok) {
      throw new Error(`GitHub read failed: ${getResp.status}`);
    }

    const data = await getResp.json();
    const content = Buffer.from(data.content, 'base64').toString('utf-8');

    const targetEmail = email.trim().toLowerCase();

    if (targetEmail === 'john@jweeden.com') {
      res.status(200).json({ loggedThisMonth: false });
      return;
    }

    const now = new Date();
    const currentMonthKey = now.getUTCFullYear() + '-' + String(now.getUTCMonth() + 1).padStart(2, '0');

    const lines = content.split('\n').slice(1); // skip header row
    const loggedThisMonth = lines.some(line => {
      if (!line.trim()) return false;
      const [timestamp, rowEmail] = parseCsvLine(line);
      if (!timestamp || !rowEmail) return false;
      if (rowEmail.trim().toLowerCase() !== targetEmail) return false;
      return timestamp.slice(0, 7) === currentMonthKey;
    });

    res.status(200).json({ loggedThisMonth });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
}

function parseCsvLine(line) {
  const fields = [];
  let cur = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (inQuotes) {
      if (c === '"') {
        if (line[i + 1] === '"') { cur += '"'; i++; }
        else { inQuotes = false; }
      } else {
        cur += c;
      }
    } else if (c === '"') {
      inQuotes = true;
    } else if (c === ',') {
      fields.push(cur);
      cur = '';
    } else {
      cur += c;
    }
  }
  fields.push(cur);
  return fields;
}
