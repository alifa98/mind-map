import { mkdir, readFile, writeFile, copyFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { gzipSync } from 'node:zlib';
import { fileURLToPath } from 'node:url';

const root = resolve(fileURLToPath(new URL('..', import.meta.url)));
const out = resolve(root, 'dist');
await mkdir(out, { recursive: true });
const source = await readFile(resolve(root, 'src/mindmap.js'), 'utf8');
const banner = '/*! chic-mindmap v1.0.0 | MIT | Zero runtime dependencies */\n';
await writeFile(resolve(out, 'chic-mindmap.js'), banner + source);
// The library is native JavaScript: a deterministic wrapper creates the UMD
// entry without a transpiler, bundler, or third-party build dependency.
const umd = `${banner}(function(root,factory){if(typeof module==='object'&&module.exports){module.exports=factory();}else if(typeof define==='function'&&define.amd){define([],factory);}else{root.ChicMindmap=factory();}})(typeof globalThis!=='undefined'?globalThis:this,function(){'use strict';\n${source.replace(/^export /gm, '')}\nreturn {MindMap,ThemeManager,normalizeData,computeLayout};\n});\n`;
await writeFile(resolve(out, 'chic-mindmap.umd.js'), umd);
await writeFile(resolve(out, 'chic-mindmap.umd.cjs'), umd);
await copyFile(resolve(root, 'src/mindmap.d.ts'), resolve(out, 'chic-mindmap.d.ts'));
await copyFile(resolve(root, 'index.html'), resolve(out, 'index.html'));
await copyFile(resolve(root, 'playground.css'), resolve(out, 'playground.css'));
await writeFile(resolve(out, 'playground.js'), (await readFile(resolve(root, 'playground.js'), 'utf8')).replace("'./src/mindmap.js'", "'./chic-mindmap.js'"));
console.log(`Built ESM, UMD, CommonJS, TypeScript declarations, and standalone playground.\nCore: ${(Buffer.byteLength(source) / 1024).toFixed(1)} kB · ${(gzipSync(source).length / 1024).toFixed(1)} kB gzip · 0 dependencies`);
