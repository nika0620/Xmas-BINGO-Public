(function(){
'use strict';
const $=id=>document.getElementById(id),T=BingoTheory;
let last=null;
function node(tag,text){const n=document.createElement(tag);if(text!==undefined)n.textContent=text;return n;}
function mode(theory){$('simulator').hidden=theory;$('theory').hidden=!theory;$('modeSimulation').setAttribute('aria-pressed',String(!theory));$('modeTheory').setAttribute('aria-pressed',String(theory));}
$('modeSimulation').onclick=()=>mode(false);$('modeTheory').onclick=()=>mode(true);
function render(){
 try{
  const participants=Number($('theoryParticipants').value),ns=T.parseBallCounts($('theoryBalls').value),start=Number($('theoryStart').value),end=Number($('theoryEnd').value);
  if(!$('theoryStart').value||!$('theoryEnd').value)throw new Error('開始回数と終了回数を入力してください。');
  const rows=T.table(participants,ns,start,end);
  $('theoryErrors').textContent='';const table=node('table'),thead=node('thead'),header=node('tr');
  const corner=node('th','抽選回数 m');corner.scope='col';header.append(corner);
  ns.forEach(n=>{const th=node('th',`n=${n}`);th.scope='col';header.append(th);});thead.append(header);table.append(thead);
  const body=node('tbody');for(const row of rows){const tr=node('tr'),th=node('th',`${row.draws}回`);th.scope='row';tr.append(th);row.values.forEach((v,i)=>{const td=node('td',`${v.toFixed(1)}人`);td.title=`${v.toFixed(6)}人${row.draws>ns[i]?`（${ns[i]}球で抽選終了）`:''}`;tr.append(td);});body.append(tr);}table.append(body);
  $('theoryTable').replaceChildren(table);$('theoryResult').textContent=`${participants}人参加・${start}〜${end}回目：1列以上ビンゴした人数の期待値（小数第1位表示）。`;
  $('theoryStatus').textContent='理論値を計算しました。乱数による試行誤差はありません。';$('theoryCsv').disabled=false;
  last={participants,ns,rows};
 }catch(e){$('theoryErrors').textContent=e.message;$('theoryResult').textContent='';$('theoryTable').replaceChildren();$('theoryStatus').textContent='入力内容を確認してください。';$('theoryCsv').disabled=true;last=null;}
}
$('theoryForm').onsubmit=e=>{e.preventDefault();render();};
$('theoryForm').oninput=()=>{$('theoryCsv').disabled=true;$('theoryStatus').textContent='設定を変更しました。「理論値を計算」で更新してください。';last=null;};
$('theoryCsv').onclick=()=>{if(!last)return;const lines=[['参加人数',last.participants],['抽選回数 m',...last.ns.map(n=>`n=${n}`)],...last.rows.map(row=>[row.draws,...row.values.map(v=>v.toFixed(6))])];const blob=new Blob(['\uFEFF'+lines.map(row=>row.join(',')).join('\r\n')],{type:'text/csv;charset=utf-8'}),url=URL.createObjectURL(blob),a=node('a');a.href=url;a.download='bingo-theory.csv';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);};
render();
})();
