(function(root){
'use strict';
const KEY='xmas-bingo-history-v1';
function normalizeSettings(settings){return {...Bingo.defaults,...settings};}
function load(storage){try{const a=JSON.parse(storage.getItem(KEY)||'[]');return Array.isArray(a)?a.filter(x=>x&&typeof x==='object'&&x.settings&&x.result).slice(0,100).map(x=>({...x,settings:normalizeSettings(x.settings)})):[];}catch{return [];}}
function save(storage,record){const history=[record,...load(storage)].slice(0,100);storage.setItem(KEY,JSON.stringify(history));return history;}
const api={KEY,normalizeSettings,load,save};root.BingoHistory=api;if(typeof module!=='undefined'&&module.exports)module.exports=api;
})(typeof self!=='undefined'?self:globalThis);
