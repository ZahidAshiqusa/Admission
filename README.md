Ali Institute - Final deploy (GitHub saving)
-------------------------------------------
Files:
- public/index.html  (admission form)
- public/admin.html  (password-protected admin)
- public/style.css
- public/script.js
- api/save.js, api/list.js, api/download.js, api/auth.js

Vercel env vars required:
- GITHUB_TOKEN (personal access token with repo scope)
- GITHUB_REPO  (owner/repo)
- ADMIN_PASSWORD

Deploy to Vercel and set env vars, then visit / for form and /admin.html for admin.
