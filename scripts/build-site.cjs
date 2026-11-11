const fs=require('node:fs');const path=require('node:path');
const root=process.cwd(), out=path.join(root,'public-site');
if(fs.existsSync(out))fs.rmSync(out,{recursive:true,force:true});fs.mkdirSync(out,{recursive:true});
const excluded=new Set(['api','scripts','test','private-media','public-site','node_modules','.git','.vercel']);
const hiddenFiles=new Set(['package.json','package-lock.json','vercel.json']);
const allowed=/\.(html?|css|js|json|png|jpe?g|webp|gif|svg|ico|mp4|m4a|apk|zip|txt|xml)$/i;
function copy(dir,relative='') {for(const item of fs.readdirSync(dir,{withFileTypes:true})){
 if(item.name.startsWith('.') || excluded.has(item.name) || hiddenFiles.has(item.name) || item.isSymbolicLink())continue;
 const rel=path.join(relative,item.name),source=path.join(dir,item.name),dest=path.join(out,rel);
 if(item.isDirectory()){copy(source,rel);}else if(allowed.test(item.name)){fs.mkdirSync(path.dirname(dest),{recursive:true});fs.copyFileSync(source,dest);}
}}
copy(root);
if(fs.existsSync(path.join(out,'private-media')) || fs.existsSync(path.join(out,'api')))throw Error('Private source exposed');
console.log('Static site built; private media excluded.');
