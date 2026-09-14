'use strict';
// Preserve and rerun the upstream suite. Its four exact English-display-name
// assertions apply to retained originalTitle, not the intentionally translated
// title. All inventory, URL, scope, immutability and embedded-catalog tests remain.
const fs=require('node:fs'),path=require('node:path'),Module=require('node:module');
const assert=require('node:assert/strict'),{test}=require('node:test');
const root=path.resolve(__dirname,'..');
const originalPath=path.join(root,'aster/tests/web-apps/catalog.cjs');
let source=fs.readFileSync(originalPath,'utf8');
source=source.replaceAll('assert.equal(app.title, title)','assert.equal(app.originalTitle, title)').replaceAll('assert.equal(app.title,title)','assert.equal(app.originalTitle,title)');
const adapted=new Module(originalPath,module);adapted.filename=originalPath;adapted.paths=Module._nodeModulePaths(path.dirname(originalPath));adapted._compile(source,originalPath);
const catalog=require('../aster/src/web-app-catalog.js');
const mapped=JSON.parse(fs.readFileSync(path.join(root,'app-mapping.json'),'utf8'));
test('All 19 mapped catalog launcher names exactly match the German rename map',()=>{
 for(const item of mapped){const entry=catalog.apps.find(a=>a.repo===item.repo);assert(entry);assert.equal(entry.title,item.title);assert(entry.originalTitle);}
});
test('All other catalog apps retain original names and repository suffix; no app is hidden',()=>{
 const repos=new Set(mapped.map(a=>a.repo));for(const app of catalog.apps){assert(app.originalTitle);assert.match(app.title,/ \([^)]+\)$/);if(!repos.has(app.repo))assert.equal(app.title,app.originalTitle+' ('+app.repo+')');assert(!app.hidden);}
});
test('The Windows-profile Luna preset does not remove any original platform',()=>{
 const src=fs.readFileSync(path.join(root,'aster/src/theme-models.js'),'utf8');
 for(const id of ['luna-korpus','windows-light','windows-dark','macos26-light','macos26-dark','ubuntu-light','ubuntu-dark'])assert(src.includes("preset('"+id+"'"));
});
