const { Octokit } = require("@octokit/rest");
const formidable = require("formidable");
const fs = require("fs");
const path = require("path");
function sanitize(s){ return s.toString().replace(/[^a-z0-9_\-]/gi,"_").slice(0,80); }
module.exports = async (req, res) => {
  if(req.method!=='POST') return res.status(405).json({ok:false,message:'Method not allowed'});
  const form = new formidable.IncomingForm();
  form.parse(req, async (err, fields, files) => {
    if(err) return res.status(500).json({ok:false,message:err.message});
    const token = process.env.GITHUB_TOKEN;
    const repo = process.env.GITHUB_REPO;
    if(!token||!repo) return res.status(500).json({ok:false,message:'Missing GITHUB_TOKEN or GITHUB_REPO'});
    const octokit = new Octokit({ auth: token });
    const [owner, repoName] = repo.split("/");
    try{
      const cnicRaw = fields.cnic || 'unknown_cnic';
      const cnic = sanitize(cnicRaw);
      const folder = `submissions/${cnic}`;
      // read existing data.txt if present
      let existing = {};
      try{
        const resp = await octokit.repos.getContent({ owner, repo: repoName, path: folder + '/data.txt' });
        const dec = Buffer.from(resp.data.content,'base64').toString('utf8');
        dec.split('\\n').forEach(line=>{ const i=line.indexOf(':'); if(i>0) existing[line.slice(0,i).trim()]=line.slice(i+1).trim(); });
      }catch(e){}
      // merge fields
      const merged = Object.assign({}, existing, fields);
      const lines = [];
      for(const k of Object.keys(merged)){ if(Array.isArray(merged[k])) lines.push(`${k}: ${merged[k].join(' | ')}`); else lines.push(`${k}: ${merged[k]}`); }
      const content = Buffer.from(lines.join('\\n')).toString('base64');
      // helper to put file
      async function putFile(p, b64, msg){ let sha=null; try{ const info = await octokit.repos.getContent({ owner, repo: repoName, path: p }); sha = info.data.sha; }catch(e){} await octokit.repos.createOrUpdateFileContents({ owner, repo: repoName, path: p, message: msg, content: b64, ...(sha?{sha}:{}) }); }
      await putFile(`${folder}/data.txt`, content, `Update data for CNIC ${cnicRaw}`);
      // upload known files
      async function handle(field, nameFn){
        const f = files[field];
        if(!f) return;
        const arr = Array.isArray(f)? f: [f];
        for(const item of arr){
          const data = fs.readFileSync(item.path);
          const b64 = data.toString('base64');
          const fname = nameFn? nameFn(item.name): item.name;
          await putFile(`${folder}/${fname}`, b64, `Add file ${fname} for ${cnicRaw}`);
        }
      }
      await handle('cnicPic', n=> 'cnic'+path.extname(n));
      await handle('fatherCnicPic', n=> 'father_cnic'+path.extname(n));
      await handle('domicilePic', n=> 'domicile'+path.extname(n));
      await handle('candidatePic', n=> 'candidate'+path.extname(n));
      // education files
      const efiles = files['educationFiles[]']? (Array.isArray(files['educationFiles[]'])? files['educationFiles[]']:[files['educationFiles[]']]) : [];
      const enames = fields['educationNames[]']? (Array.isArray(fields['educationNames[]'])? fields['educationNames[]']:[fields['educationNames[]']]) : [];
      for(let i=0;i<efiles.length;i++){
        const ef = efiles[i];
        const nm = enames[i]? sanitize(enames[i]): 'education_'+i;
        const data = fs.readFileSync(ef.path);
        const b64 = data.toString('base64');
        await putFile(`${folder}/${nm}${path.extname(ef.name)}`, b64, `Add education file ${nm} for ${cnicRaw}`);
      }
      return res.json({ok:true,message:`Saved under CNIC ${cnicRaw}`});
    }catch(e){ console.error(e); res.status(500).json({ok:false,message:e.message}); }
  });
};