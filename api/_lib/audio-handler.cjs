const fs=require('node:fs');const path=require('node:path');
function parseRange(header,size){
 if(!header)return {start:0,end:size-1,partial:false};
 const match=/^bytes=(\d*)-(\d*)$/.exec(header);
 if(!match || (!match[1]&&!match[2]))return null;
 let start,end;
 if(!match[1]){const suffix=Number(match[2]);if(!Number.isSafeInteger(suffix)||suffix<=0)return null;start=Math.max(0,size-suffix);end=size-1;}
 else{start=Number(match[1]);end=match[2]?Number(match[2]):size-1;}
 if(!Number.isSafeInteger(start)||!Number.isSafeInteger(end)||start<0||start>=size||end<start)return null;
 return {start,end:Math.min(end,size-1),partial:true};
}
function createHandler({verifyToken,mediaDirectory}){
 return async function(req,res){
  res.setHeader('Cache-Control','private, no-store');res.setHeader('X-Robots-Tag','noindex, nofollow, noarchive');
  res.setHeader('X-Content-Type-Options','nosniff');res.setHeader('Access-Control-Allow-Origin','*');
  res.setHeader('Access-Control-Allow-Methods','GET, HEAD, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers','Authorization, Range');
  res.setHeader('Access-Control-Expose-Headers','Content-Length, Content-Range, Accept-Ranges');
  if(req.method==='OPTIONS'){res.statusCode=204;return res.end();}
  if(!['GET','HEAD'].includes(req.method)){res.setHeader('Allow','GET, HEAD, OPTIONS');res.statusCode=405;return res.end();}
  const authorization=req.headers.authorization || '';
  const match=/^Bearer ([^\s]+)$/.exec(authorization);
  if(!match){res.statusCode=401;return res.end('Authentication required');}
  try{const user=await verifyToken(match[1]);if(!user?.uid)throw Error('No user');}
  catch(_){res.statusCode=401;return res.end('Invalid or expired authentication');}
  const url=new URL(req.url,'https://sunnahway-official.vercel.app');
  if(url.searchParams.get('track')!=='rain'){res.statusCode=404;return res.end('Not found');}
  const file=path.join(mediaDirectory,'Rainy.mp3');let stat;
  try{stat=fs.statSync(file);}catch(_){res.statusCode=503;return res.end('Media unavailable');}
  // Vercel's function payload ceiling is 4.5 MB; this recording is 3.48 MB.
  if(stat.size>4*1024*1024){res.statusCode=413;return res.end('Use object storage for large recordings');}
  const range=parseRange(req.headers.range,stat.size);
  if(!range){res.setHeader('Content-Range',`bytes */${stat.size}`);res.statusCode=416;return res.end();}
  res.statusCode=range.partial?206:200;res.setHeader('Content-Type','audio/mpeg');res.setHeader('Accept-Ranges','bytes');
  res.setHeader('Content-Length',range.end-range.start+1);
  if(range.partial)res.setHeader('Content-Range',`bytes ${range.start}-${range.end}/${stat.size}`);
  if(req.method==='HEAD')return res.end();
  const stream=fs.createReadStream(file,{start:range.start,end:range.end});
  stream.on('error',()=>res.destroy());res.on('close',()=>stream.destroy());stream.pipe(res);
 };
}
module.exports={createHandler,parseRange};
