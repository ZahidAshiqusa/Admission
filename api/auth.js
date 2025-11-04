const handler = async (req, res) => {
  try{
    const url = new URL(req.url, `http://${req.headers.host}`);
    const password = url.searchParams.get('password');
    if(!password) return res.status(400).json({ success: false, message: 'No password provided' });
    if(password === process.env.ADMIN_PASSWORD) return res.json({ success: true });
    return res.json({ success: false, message: 'Invalid password' });
  }catch(e){ console.error(e); res.status(500).json({ success:false, message:e.message }); }
};
module.exports = handler;