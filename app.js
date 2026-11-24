'use strict';
const $=id=>document.getElementById(id);
const form=$('settings');
let worker=null,timer=null,trial=null,activeSettings=null,paused=false,runId=0,detailId=null,busy=false;
let history=BingoHistory.load(localStorage),selected=new Set();
const labels={ballCount:'抽選球数',columnRanges:'列ごとの数字範囲指定',estimatePrizes:'景品数の上限なし見積もり',rankPrizes:'上位者への配布',topWinners:'上位人数（名）',topPrizeCount:'上位者1人の景品数（個）',participants:'参加人数',trials:'試行回数（大会の開催回数）',duration:'1回の制限時間（分）',drawInterval:'1球の抽選間隔（秒）',awardSeconds:'ビンゴから景品受取まで（秒）',requiredLines:'当選に必要なビンゴ数（成立列数）',prizes:'ビンゴ用景品数（参加賞を除く）',maxWins:'1人の景品獲得上限'};
function el(tag,text,className){const n=document.createElement(tag);if(text!==undefined)n.textContent=text;if(className)n.className=className;return n;}
function settings(){const s={};for(const key of Object.keys(Bingo.defaults))s[key]=typeof Bingo.defaults[key]==='boolean'?$(key).checked:Number(form.elements[key].value);return s;}
function setSettings(s){s=BingoHistory.normalizeSettings(s);for(const key of Object.keys(Bingo.defaults)){if(typeof Bingo.defaults[key]==='boolean')$(key).checked=s[key];else form.elements[key].value=s[key];}updateRules();}
function renderCard(target,a,drawn=new Set()){target.replaceChildren();for(const c of 'BINGO')target.append(el('div',c,'cell head'));a.forEach(v=>target.append(el('div',v===null?'FREE':String(v),'cell'+(v===null||drawn.has(v)?' marked':'')+(v===null?' free':''))));}
function updateRules(){const s=settings();form.elements.prizes.disabled=s.estimatePrizes;
 $('prizesField').classList.toggle('inactive-field',s.estimatePrizes);$('prizesInactive').hidden=!s.estimatePrizes;
 $('prizesHelp').textContent=s.estimatePrizes?'上限なしで見積もるため、この入力値は使いません。必要個数は結果に表示します。':'用意するビンゴ用景品の総個数です。参加賞は別に用意します。';
 form.elements.maxWins.disabled=s.rankPrizes;$('maxWinsField').classList.toggle('inactive-field',s.rankPrizes);
 $('maxWinsHelp').textContent=s.rankPrizes?'上位配布ONのため無効。1人1回の受取で、上位者は指定個数、それ以外は1個です。':'';
 $('rankFields').classList.toggle('inactive-field',!s.rankPrizes);form.elements.topWinners.disabled=!s.rankPrizes;form.elements.topPrizeCount.disabled=!s.rankPrizes;
 $('rankRule').textContent=s.rankPrizes?`上位${s.topWinners}名に1人${s.topPrizeCount}個、それ以降は1個。1人1回の受取です。同時ビンゴの順序はランダムで、複数個は1回でまとめて渡します。景品が不足して指定個数を渡せない場合は、その時点でビンゴ景品の配布を止めます。`:'OFF：従来どおり必要ビンゴ数ごとに1個を渡し、1人の景品獲得上限を適用します。';
$('preset').value=[75,90].includes(s.ballCount)?String(s.ballCount):'custom';const errors=Bingo.validate(s);$('errors').textContent=errors.join('\n');$('fast').disabled=busy||!!errors.length;$('animate').disabled=busy||!!errors.length;
 $('rule').textContent=s.columnRanges?'各列の範囲から重複なしで選びます。B・I・G・O列は5個、N列は4個。中央は抽選前からFREEです。':'1〜設定球数から24個を重複なしで選び、列の制限なく配置します。中央は抽選前からFREEです。';
 $('ranges').replaceChildren();if(s.columnRanges&&Number.isSafeInteger(s.ballCount)&&s.ballCount>=24&&s.ballCount<=100000)for(const r of Bingo.ranges(s.ballCount)){const n=el('span');n.append(el('b',r.label),document.createTextNode(`${r.start}〜${r.end}`));$('ranges').append(n);}
 $('preview').replaceChildren();if(!errors.length)renderCard($('preview'),Bingo.card(s));
}
function setBusy(value){busy=value;$('fields').disabled=value;$('cancel').hidden=!value;updateRules();}
function stop(){runId++;if(worker){worker.terminate();worker=null;}clearTimeout(timer);timer=null;paused=false;$('pause').textContent='一時停止';setBusy(false);$('progress').hidden=true;}
function metrics(target,r,config=activeSettings){
 target.replaceChildren();const format=n=>n.toLocaleString('ja-JP',{maximumFractionDigits:2});
 if(r.version===2){
  target.append(el('p',`1大会あたりの平均：ビンゴ景品を受け取る人 ${format(r.winners.mean)}人、参加賞を用意する人 ${format(r.participationRecipients.mean)}人。`,'result-summary'));
  target.append(el('p',`時間内のビンゴ達成人数は平均 ${format(r.bingoAchievers.mean)}人です。ビンゴしても景品切れ・受取時間切れの人は、参加賞側に含めます。`,'muted'));
 }else target.append(el('p','旧バージョンの結果です。ビンゴ達成人数・参加賞人数・全景品数は未集計のため、設定を読み込んで再実行してください。','muted'));
 const box=el('div',undefined,'metrics');
 for(const [k,label,unit]of [['bingoAchievers','時間内にビンゴ達成','人'],['winners','ビンゴ景品の受取人数','人'],['participationRecipients','参加賞を用意する人数','人'],['minimumGifts','全員に配る景品の必要数','個'],['awards','ビンゴ用景品の獲得数','個'],['winEvents','景品受取回数','回'],['drawCount','抽選球数','球']]){
  if(!r[k])continue;const n=el('div',undefined,'metric');n.append(el('strong',format(r[k].mean)+unit),el('span',`${label}の平均（最小${r[k].min} / 最大${r[k].max}）`));box.append(n);
 }
 target.append(box,el('p',`${r.trials}大会の集計。各大会の人数・個数を合計し、試行回数で割った平均です。`,'muted'));
 if(config){const n=config.participants;target.append(el('p',config.rankPrizes?`配布ルール：上位${config.topWinners}名に${config.topPrizeCount}個、それ以降は1個。全員1個の基本分は${n}個、上位枠全員が受け取る場合の総必要数は${n+config.topWinners*(config.topPrizeCount-1)}個です。実際の平均必要数は上の結果に表示します。`:`配り方を検討する目安：全員1個なら${n}個。上位配布をONにすると、上位人数と1人あたり個数を指定して必要数を計算できます。`,'muted'));}
 if(r.version===2)target.append(el('p','「全員に配る景品の必要数」は、設定した配布ルールでのビンゴ用景品数＋参加賞1人1個の合計です。金額の違いは計算に含めていません。','muted'));
}

function saveResult(s,r,mode){const record={id:Date.now().toString(36)+'-'+Math.random().toString(36).slice(2),createdAt:new Date().toISOString(),settings:{...s},result:r,mode};try{history=BingoHistory.save(localStorage,record);renderHistory();return true;}catch{history=[record,...history].slice(0,100);renderHistory();return false;}}
function complete(result,mode){const s={...activeSettings};stop();metrics($('result'),result);const saved=saveResult(s,result,mode);$('status').textContent=`${mode==='fast'?'高速計算':'アニメーション'}が完了しました。大会は制限時間で終了しました。${saved?'履歴を保存しました。':'ブラウザーの保存領域に書き込めませんでした。履歴はこの画面を開いている間のみ保持されます。'}`;}
function start(mode){if(busy)return;const s=settings(),errors=Bingo.validate(s);if(errors.length){$('errors').textContent=errors.join('\n');return;}activeSettings={...s};setBusy(true);$('result').replaceChildren();$('progress').hidden=false;$('progress').value=0;$('animation').hidden=mode!=='animation';const id=++runId;
 if(mode==='fast'){
  $('status').textContent='Web Workerで高速計算しています…';
  try{worker=new Worker('worker.js?v=20261124-theory1');worker.onmessage=({data})=>{if(data.runId!==runId)return;if(data.type==='progress'){$('progress').value=100*data.completed/data.total;$('status').textContent=`計算中 ${data.completed} / ${data.total}試行`;}else if(data.type==='done')complete(data.result,'fast');else{stop();$('status').textContent=`計算エラー：${data.message}`;}};worker.onerror=e=>{stop();$('status').textContent=`Workerを開始できませんでした。HTTPサーバーまたはGitHub Pagesで開いてください。${e.message||''}`;};worker.postMessage({settings:s,runId:id});}catch(e){stop();$('status').textContent=`高速計算を開始できませんでした：${e.message}`;}
 }else{
  $('status').textContent='アニメーションは1試行を再生します。';trial=Bingo.createTrial(s);$('participant').replaceChildren();for(let i=0;i<s.participants;i++){const o=el('option',`参加者 ${i+1}`);o.value=i;$('participant').append(o);}$('ball').textContent='–';$('drawn').textContent='';renderLive(trial.snapshot());schedule();
 }
}
function renderLive(state){const p=Number($('participant').value);renderCard($('liveCard'),trial.cards[p],trial.drawn);$('cardStats').textContent=`成立列：${Bingo.completedLines(trial.cards[p],trial.drawn)} / 景品獲得：${trial.gifts[p]}個 / 受取回数：${trial.wins[p]}回${trial.ranks[p]?` / 受取順位：${trial.ranks[p]}位`:``}`;$('liveStats').textContent=`経過 ${(state.elapsed/60).toFixed(2)} / ${activeSettings.duration}分 ・ 抽選 ${state.drawCount} / ${activeSettings.ballCount}球 ・ ビンゴ達成 ${state.bingoAchievers}人 ・ ビンゴ景品受取 ${state.winners}人 ・ 参加賞予定 ${state.participationRecipients}人 ・ ビンゴ用景品 ${state.awards}個`;$('progress').value=100*state.elapsed/(activeSettings.duration*60);}
function schedule(){if(!busy||paused)return;timer=setTimeout(tick,Number($('speed').value));}
function tick(){if(!busy||paused)return;const state=trial.step();if(state.number!==null){$('ball').textContent=state.number;$('drawn').textContent=Array.from(trial.drawn).join(' ・ ');}renderLive(state);if(state.finished){complete(Bingo.aggregate([state]),'animation');return;}if(state.drawCount===activeSettings.ballCount)$('status').textContent='全球の抽選が完了しました。追加抽選は行わず、制限時間で大会を終了します。';schedule();}
function value(key,v){if(key==='columnRanges')return v?'ON（列範囲指定）':'OFF（自由配置）';if(key==='rankPrizes')return v?'ON':'OFF';if(key==='estimatePrizes')return v?'ON（個数上限なし）':'OFF（指定個数を上限）';return String(v);}
function table(rows,heads){const table=el('table');const header=el('tr');for(const h of heads)header.append(el('th',h));const thead=el('thead');thead.append(header);table.append(thead);const body=el('tbody');for(const row of rows){const tr=el('tr');row.forEach(x=>tr.append(el('td',String(x))));body.append(tr);}table.append(body);return table;}
function date(record){const d=new Date(record.createdAt);return Number.isNaN(d.getTime())?'日時不明':d.toLocaleString('ja-JP');}
function renderHistory(){$('history').replaceChildren();if(!history.length)$('history').append(el('p','まだ履歴はありません。','muted'));for(const r of history){const row=el('div',undefined,'history-row');const check=el('input');check.type='checkbox';check.checked=selected.has(r.id);check.setAttribute('aria-label',`${date(r)}の履歴を比較`);check.onchange=()=>{if(check.checked)selected.add(r.id);else selected.delete(r.id);renderComparison();};const button=el('button');button.type='button';button.append(document.createTextNode(date(r)),el('small',`${r.settings.ballCount}球 / 列指定${r.settings.columnRanges?'ON':'OFF'} / ${r.result.trials}試行 / ビンゴ景品受取平均 ${r.result.winners.mean.toFixed(2)}人${r.result.participationRecipients?' / 参加賞平均 '+r.result.participationRecipients.mean.toFixed(2)+'人':''}`));button.onclick=()=>openDetail(r);row.append(check,button);$('history').append(row);}renderComparison();}
function renderComparison(){const records=history.filter(r=>selected.has(r.id));$('comparison').replaceChildren();if(!records.length)return;const rows=Object.entries(labels).map(([k,label])=>[label,...records.map(r=>(k==='prizes'&&r.settings.estimatePrizes)||(k==='maxWins'&&r.settings.rankPrizes)||(['topWinners','topPrizeCount'].includes(k)&&!r.settings.rankPrizes)?'無効（計算に未使用）':value(k,r.settings[k]))]);for(const [k,label]of [['bingoAchievers','平均ビンゴ達成人数'],['winners','平均ビンゴ景品受取人数'],['participationRecipients','平均参加賞人数'],['minimumGifts','平均全景品必要数'],['winEvents','平均景品受取回数'],['awards','平均ビンゴ用景品獲得数'],['drawCount','平均抽選球数']])rows.push([label,...records.map(r=>r.result[k]?r.result[k].mean.toFixed(2):'未集計（再実行してください）')]);$('comparison').append(table(rows,['設定・結果',...records.map(date)]));}
function openDetail(r){detailId=r.id;const target=$('detailContent');target.replaceChildren(el('p',date(r),'muted'),table(Object.entries(labels).map(([k,label])=>[label,(k==='prizes'&&r.settings.estimatePrizes)||(k==='maxWins'&&r.settings.rankPrizes)||(['topWinners','topPrizeCount'].includes(k)&&!r.settings.rankPrizes)?'無効（計算に未使用）':value(k,r.settings[k])]),['設定','値']));const box=el('div');metrics(box,r.result,r.settings);target.append(box);if(r.settings.columnRanges)target.append(el('p',Bingo.ranges(r.settings.ballCount).map(v=>`${v.label}: ${v.start}〜${v.end}`).join(' / '),'muted'));$('restore').disabled=busy;$('detail').showModal();}
$('restore').onclick=()=>{const r=history.find(x=>x.id===detailId);if(r&&!busy){setSettings(r.settings);$('detail').close();$('status').textContent='履歴の設定を読み込みました。開始ボタンで再実行できます。';form.scrollIntoView({behavior:'smooth',block:'start'});}};
$('closeDetail').onclick=()=>$('detail').close();
form.addEventListener('submit',e=>{e.preventDefault();start('fast');});form.addEventListener('input',e=>{if(e.target.id!=='preset')updateRules();});
$('preset').onchange=()=>{if($('preset').value!=='custom'){$('ballCount').value=$('preset').value;updateRules();}else $('ballCount').focus();};
$('refreshPreview').onclick=updateRules;$('animate').onclick=()=>start('animation');$('cancel').onclick=()=>{stop();$('status').textContent='キャンセルしました。途中の結果は履歴に保存しません。';};
$('pause').onclick=()=>{if(!busy)return;paused=!paused;$('pause').textContent=paused?'再開':'一時停止';clearTimeout(timer);if(!paused)schedule();};$('participant').onchange=()=>{if(trial)renderLive(trial.snapshot());};
function applyTheme(theme){document.body.classList.toggle('light',theme==='light');$('theme').textContent=theme==='light'?'ダークモード':'ライトモード';}
$('theme').onclick=()=>{const theme=document.body.classList.contains('light')?'dark':'light';applyTheme(theme);try{localStorage.setItem('xmas-bingo-theme',theme);}catch{}};
try{applyTheme(localStorage.getItem('xmas-bingo-theme')||(matchMedia('(prefers-color-scheme: light)').matches?'light':'dark'));}catch{applyTheme('dark');}
updateRules();renderHistory();
