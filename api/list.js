const { Octokit } = require("@octokit/rest");
module.exports = async (req,res) => {
  try{
    const token = process.env.GITHUB_TOKEN; const repo = process.env.GITHUB_REPO;
    if(!token||!repo) return res.status(500).json({ok:false,message:'Missing GitHub credentials'});
    const octokit = new (require("@octokit/rest")).Octokit({ auth: token });
    const [owner, repoName] = repo.split("/");
    const tree = await octokit.repos.getTree({ owner, repo: repoName, tree_sha: "main", recursive: true });
    const set = new Set();
    for(const it of tree.data.tree){ if(it.path.startsWith("submissions/") && it.type==='blob'){ const p = it.path.split("/"); if(p.length>=2) set.add(p[1]); } }
    const list = Array.from(set).map(c => ({ cnic: c, path: `submissions/${c}` }));
    return res.json({ok:true, submissions: list});
  }catch(e){ console.error(e); res.status(500).json({ok:false,message:e.message}); }
};