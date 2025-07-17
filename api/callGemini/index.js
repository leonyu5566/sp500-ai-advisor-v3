module.exports = async (context, req) => {
  /* CORS 預檢 */
  if (req.method === 'OPTIONS') {
    context.res = { status:204,
      headers:{ 'Access-Control-Allow-Origin':'*',
                'Access-Control-Allow-Methods':'POST, OPTIONS',
                'Access-Control-Allow-Headers':'Content-Type' } };
    return;
  }

  const key = process.env.GEMINI_API_KEY;
  if (!key){ context.res = { status:500, body:'GEMINI_API_KEY missing' }; return; }

  const prompt = req.body?.prompt;
  if (!prompt){ context.res = { status:400, body:'prompt required' }; return; }

  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${key}`;
  try {
    const r = await fetch(url,{
      method:'POST',
      headers:{'Content-Type':'application/json'},
      body:JSON.stringify({ contents:[{ role:'user', parts:[{ text:prompt }] }] })
    });
    if(!r.ok) throw new Error(await r.text());
    context.res = { status:200,
      headers:{'Access-Control-Allow-Origin':'*'},
      body:await r.json() };
  } catch(e) {
    context.res = { status:500,
      headers:{'Access-Control-Allow-Origin':'*'},
      body:`Gemini error: ${e.message}` };
  }
};




