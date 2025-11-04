const { Octokit } = require("@octokit/rest");
const JSZip = require("jszip");
module.exports = async (req,res) => {
  try{
    const token = process.env.GITHUB_TOKEN; const repo = process.env.GITHUB_REPO;
    if(!token||!repo) return res.status(500).json({ok:false,message:'Missing GitHub credentials'});
    const { path } = req.query; if(!path) return res.status(400).json({ok:false,message:'Missing path'});
    const octokit = new (require("@octokit/rest")).Octokit({ auth: token });
    const [owner, repoName] = repo.split("/");
    const tree = await octokit.repos.getTree({ owner, repo: repoName, tree_sha: "main", recursive: true });
    const files = tree.data.tree.filter(x => x.path.startsWith(path + "/") && x.type === "blob");
    if(!files.length) return res.status(404).json({ok:false,message:'No files found'});
    const zip = new JSZip();
    for(const f of files){
      const contentResp = await octokit.repos.getContent({ owner, repo: repoName, path: f.path });
      const data = Buffer.from(contentResp.data.content,'base64');
      const fileName = f.path.split('/').pop();
      zip.file(fileName, data);
    }
    const buffer = await zip.generateAsync({ type: "nodebuffer" });
    res.setHeader("Content-Type","application/zip");
    res.setHeader("Content-Disposition", `attachment; filename="${path.replace(/\//g,'_')}.zip"`);
    res.send(buffer);
  }catch(e){ console.error(e); res.status(500).json({ok:false,message:e.message}); }
};