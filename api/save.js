// api/save.js (debug version)
import { Octokit } from "@octokit/rest";
import formidable from "formidable";
import fs from "fs/promises";

export const config = { api: { bodyParser: false } };

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Only POST allowed" });

  const { GITHUB_TOKEN, GITHUB_REPO } = process.env;
  if (!GITHUB_TOKEN || !GITHUB_REPO) {
    return res.status(500).json({ error: "Missing GitHub configuration" });
  }

  const [owner, repo] = GITHUB_REPO.split("/");
  const octokit = new Octokit({ auth: GITHUB_TOKEN });
  const form = formidable({ multiples: true, keepExtensions: true });

  form.parse(req, async (err, fields, files) => {
    if (err) return res.status(400).json({ error: "Form parse failed" });

    const cnic = fields.cnicNumber?.[0] || fields.cnicNumber;
    if (!cnic) return res.status(400).json({ error: "Missing CNIC" });

    const folderPath = `submissions/${cnic}`;
    const dataFile = `${folderPath}/data.txt`;
    const dataText = JSON.stringify(fields, null, 2);

    try {
      // check if file exists
      let sha;
      try {
        const { data } = await octokit.repos.getContent({ owner, repo, path: dataFile });
        sha = data.sha;
      } catch {
        sha = undefined;
      }

      await octokit.repos.createOrUpdateFileContents({
        owner,
        repo,
        path: dataFile,
        message: `Update submission for CNIC ${cnic}`,
        content: Buffer.from(dataText).toString("base64"),
        sha,
      });

      return res.status(200).json({ success: true });
    } catch (error) {
      console.error("GitHub upload error details:", error);
      const msg = error.response?.data?.message || error.message || "Unknown GitHub error";
      return res.status(500).json({ error: msg });
    }
  });
      }
