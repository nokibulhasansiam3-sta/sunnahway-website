const path=require('node:path');const crypto=require('node:crypto');
const {createHandler}=require('./_lib/audio-handler.cjs');
module.exports=createHandler({verifyToken:async token=>{
 const key=process.env.APP_MEDIA_KEY?.trim();if(!key || key.length<32)throw Error('Media key not configured');
 const received=Buffer.from(token),expected=Buffer.from(key);
 if(received.length!==expected.length || !crypto.timingSafeEqual(received,expected))throw Error('Invalid key');
 return {uid:'app-media'};
},mediaDirectory:path.join(process.cwd(),'private-media')});

