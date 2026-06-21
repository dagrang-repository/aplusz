const fs=require('fs');
function L(m){console.log(m)}
let w=fs.readFileSync('wrangler.toml','utf8');
if(w.includes('FARES_DB')){L('wrangler : already present')}
else{fs.copyFileSync('wrangler.toml','wrangler.toml.bak');w=w.replace(/\s*$/,'\n')+'\n# Fare-intelligence moat\n[[d1_databases]]\nbinding = "FARES_DB"\ndatabase_name = "aplusz-fares"\ndatabase_id = "37e7f77d-d242-4de3-a6c3-3faed3463518"\n';fs.writeFileSync('wrangler.toml',w);L('wrangler : FARES_DB added')}
let s=fs.readFileSync('index.js','utf8');
const A='const CAP_CENTS = 6200000;';
const M='/* ---- public status (drives cap banner + global unlock) ---- */';
if(s.includes('fareRoutes')){L('index.js : already mounted')}
else if(!s.includes(A)){L('ABORT : import anchor missing - nothing changed')}
else if(!s.includes(M)){L('ABORT : mount anchor missing - nothing changed')}
else{fs.copyFileSync('index.js','index.js.bak');s=s.replace(A,'import { fareRoutes } from "./fare-intelligence/routes.js";\n\n'+A);s=s.replace(M,'{ const fr = await fareRoutes(req, env); if (fr) return fr; }\n\n      '+M);fs.writeFileSync('index.js',s);L('index.js : import + mount inserted')}
