// api/save.js
import { Octokit } from "@octokit/rest";

export const config = {
  api: {
    bodyParser: false, // because we handle multipart manually
  },
};

import formidable from "formidable";
import fs from "fs/promises";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Only POST allowed" });
  }

  const GITHUB_TOKEN = process.env.GITHUB_TOKEN;
  const GITHUB_REPO = process.env.GITHUB_REPO;

  if (!GITHUB_TOKEN || !GITHUB_REPO) {
    return res.status(500).json({
      error: "Missing GitHub configuration. Please set GITHUB_TOKEN and GITHUB_REPO in environment variables.",
    });
  }

  const octokit = new Octokit({ auth: GITHUB_TOKEN });
  const [owner, repo] = GITHUB_REPO.split("/");

  const form = formidable({ multiples: true, keepExtensions: true });

  form.parse(req, async (err, fields, files) => {
    if (err) {
      console.error("Form parse error:", err);
      return res.status(400).json({ error: "Failed to parse form data" });
    }

    const studentName = fields.studentName?.[0] || fields.studentName;
    const fatherName = fields.fatherName?.[0] || fields.fatherName;
    const cnicNumber = fields.cnicNumber?.[0] || fields.cnicNumber;
    const phone = fields.phoneNumber?.[0] || fields.phoneNumber;
    const address = fields.address?.[0] || fields.address;
    const group = fields.group?.[0] || fields.group;
    const category = fields.category?.[0] || fields.category;

    if (!cnicNumber) {
      return res.status(400).json({ error: "Missing CNIC number" });
    }

    const folderPath = `submissions/${cnicNumber}`;
    const dataContent = `Student Name: ${studentName || "-"}\nFather Name: ${fatherName || "-"}\nCNIC: ${cnicNumber}\nPhone: ${phone || "-"}\nAddress: ${address || "-"}\nGroup: ${group || "-"}\nCategory: ${category || "-"}`;

    try {
      // Save data.txt (create or update existing)
      const dataFilePath = `${folderPath}/data.txt`;

      // Try fetching existing file
      let sha;
      try {
        const { data } = await octokit.repos.getContent({ owner, repo, path: dataFilePath });
        sha = data.sha;
      } catch {
        sha = undefined; // File doesn’t exist yet
      }

      await octokit.repos.createOrUpdateFileContents({
        owner,
        repo,
        path: dataFilePath,
        message: `Update admission for CNIC ${cnicNumber}`,
        content: Buffer.from(dataContent).toString("base64"),
        sha,
      });

      // Upload all images if present
      for (const [key, fileObj] of Object.entries(files)) {
        const file = Array.isArray(fileObj) ? fileObj[0] : fileObj;
        if (!file || !file.filepath) continue;
        const buffer = await fs.readFile(file.filepath);
        const uploadPath = `${folderPath}/${file.originalFilename}`;

        try {
          const { data } = await octokit.repos.getContent({ owner, repo, path: uploadPath });
          await octokit.repos.createOrUpdateFileContents({
            owner,
            repo,
            path: uploadPath,
            message: `Update file ${file.originalFilename} for CNIC ${cnicNumber}`,
            content: buffer.toString("base64"),
            sha: data.sha,
          });
        } catch {
          await octokit.repos.createOrUpdateFileContents({
            owner,
            repo,
            path: uploadPath,
            message: `Add file ${file.originalFilename} for CNIC ${cnicNumber}`,
            content: buffer.toString("base64"),
          });
        }
      }

      return res.status(200).json({ success: true, message: "Data saved successfully" });
    } catch (error) {
      console.error("Save error:", error);
      return res.status(500).json({ error: `GitHub save failed: ${error.message}` });
    }
  });
        }
