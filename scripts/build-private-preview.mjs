import {build} from 'vite';
import {cp,mkdir,copyFile} from 'node:fs/promises';
// The compiled test viewer stays outside the public static directory.
await build({base:'/jev-test/',build:{outDir:'test-dist'}});
// Publish the approved JEV UI separately; private assets keep their auth boundary.
await build({base:'/jev/',build:{outDir:'public-dist'}});
await mkdir('dist',{recursive:true});
await cp('public','dist',{recursive:true});
await copyFile('public/maintenance/index.html','dist/index.html');
