const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const B=require('../engine.js');
global.Bingo=B;
const H=require('../history.js');
const settings=(s={})=>({...B.defaults,estimatePrizes:false,...s});
function rng(seed=123){return ()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};}
for(const n of [75,90,25,29,101,24])for(const mode of [true,false]){
 if(n===24&&mode)continue;
 test(`${n}球 / 列指定${mode}: FREE・重複・範囲`,()=>{
 const s=settings({ballCount:n,columnRanges:mode}),random=rng(n);assert.deepEqual(B.validate(s),[]);
 for(let k=0;k<30;k++){const a=B.card(s,random);assert.equal(a.length,25);assert.equal(a[12],null);const nums=a.filter(x=>x!==null);assert.equal(nums.length,24);assert.equal(new Set(nums).size,24);assert(nums.every(v=>v>=1&&v<=n));if(mode)a.forEach((v,i)=>{if(v===null)return;const r=B.ranges(n)[i%5];assert(v>=r.start&&v<=r.end);});}
 const order=B.sequence(n,random);assert.equal(order.length,n);assert.equal(new Set(order).size,n);assert.equal(Math.min(...order),1);assert.equal(Math.max(...order),n);
 });
}
test('75球の標準範囲と90球の均等範囲',()=>{assert.deepEqual(B.ranges(75).map(r=>[r.start,r.end]),[[1,15],[16,30],[31,45],[46,60],[61,75]]);assert.deepEqual(B.ranges(90).map(r=>r.size),[18,18,18,18,18]);});
test('列指定OFFは列範囲に制限されない',()=>{const a=B.card(settings({columnRanges:false}),rng());assert(a.some((v,i)=>v!==null&&(v<B.ranges(75)[i%5].start||v>B.ranges(75)[i%5].end)));});
test('縦・横・斜め全12列と中央FREEを判定',()=>{const a=Array.from({length:25},(_,i)=>i+1);a[12]=null;assert.equal(B.completedLines(a,new Set()),0);for(const line of B.LINES){const drawn=new Set(line.map(i=>a[i]).filter(x=>x!==null));assert.equal(B.completedLines(a,drawn),1);}assert.equal(B.completedLines(a,new Set(a.filter(x=>x!==null))),12);});
test('複数列成立と当選・景品の上限',()=>{const s=settings({ballCount:24,columnRanges:false,participants:3,requiredLines:2,maxWins:6,prizes:100,duration:10,drawInterval:1,awardSeconds:0});const r=B.runTrial(s,rng());assert.equal(r.winners,3);assert.equal(r.winEvents,18);assert.equal(r.awards,18);assert.equal(r.drawCount,24);assert.equal(r.elapsed,600);assert.equal(B.runTrial({...s,prizes:5},rng()).awards,5);});
test('不正な設定を日本語で拒否',()=>{for(const n of [0,23,24.5,NaN,Infinity,100001])assert(B.validate(settings({ballCount:n})).length);assert(B.validate(settings({ballCount:24})).some(x=>x.includes('O列')));assert.deepEqual(B.validate(settings({ballCount:24,columnRanges:false})),[]);assert.throws(()=>B.createTrial(settings({ballCount:1})),/抽選球数/);});
test('高速とアニメーションは同じステップ処理・結果',()=>{for(const s of [settings(),settings({ballCount:90,columnRanges:false,requiredLines:2,maxWins:3}),settings({ballCount:31}),settings({participants:8,rankPrizes:true,topWinners:3,topPrizeCount:4})]){const t=B.createTrial(s,rng());while(!t.snapshot().finished)t.step();assert.deepEqual(t.snapshot(),B.runTrial(s,rng()));}});
test('全球後は追加抽選せず制限時間で終了',()=>{const s=settings({ballCount:25,duration:10,participants:2,drawInterval:1,awardSeconds:0});const t=B.createTrial(s,rng());for(let i=0;i<25;i++)t.step();assert.equal(t.drawn.size,25);assert.equal(t.snapshot().finished,false);const end=t.step();assert.equal(end.elapsed,600);assert.equal(end.finished,true);assert.equal(end.number,null);assert.equal(t.step().drawCount,25);});
test('制限時間を越える抽選・授与を行わない',()=>{const r=B.runTrial(settings({duration:0.01,drawInterval:1}));assert.equal(r.drawCount,0);assert.equal(r.awards,0);assert.equal(r.elapsed,0.6);});
test('試行ごとにカードと抽選順を再生成',()=>{const random=rng(),s=settings();const a=B.createTrial(s,random),b=B.createTrial(s,random);assert.notDeepEqual(a.cards,b.cards);assert.notDeepEqual(a.order,b.order);});
test('履歴の100件制限・設定復元・旧設定補完・破損対応',()=>{let data='[]';const storage={getItem:()=>data,setItem:(_,v)=>{data=v;}};for(let i=0;i<105;i++)H.save(storage,{id:String(i),settings:settings({ballCount:90,columnRanges:false}),result:B.aggregate([{awards:i,winners:1,winEvents:i,drawCount:90}])});const records=H.load(storage);assert.equal(records.length,100);assert.equal(records[0].id,'104');assert.equal(records.at(-1).id,'5');assert.equal(records[0].settings.ballCount,90);assert.equal(records[0].settings.columnRanges,false);assert.deepEqual(B.validate(records[0].settings),[]);assert.equal(H.normalizeSettings({}).ballCount,75);data='broken';assert.deepEqual(H.load(storage),[]);});
test('Web Worker実行・進捗・共通計算・エラー',()=>{const messages=[];const context={self:{postMessage:m=>messages.push(m)},performance:{now:()=>100},Math:Object.create(Math)};context.Math.random=rng();context.importScripts=file=>vm.runInContext(fs.readFileSync(require('node:path').join(__dirname,'..',file.split('?')[0]),'utf8'),context);vm.createContext(context);context.self=context;context.postMessage=m=>messages.push(m);vm.runInContext(fs.readFileSync(require('node:path').join(__dirname,'../worker.js'),'utf8'),context);const s=settings({trials:3,participants:3,ballCount:90,columnRanges:false,rankPrizes:true,topWinners:2,topPrizeCount:3});context.onmessage({data:{settings:s,runId:7}});assert(messages.some(m=>m.type==='progress'&&m.completed===3));const done=messages.find(m=>m.type==='done');assert.equal(done.runId,7);const random=rng();assert.equal(JSON.stringify(done.result),JSON.stringify(B.aggregate(Array.from({length:3},()=>B.runTrial(s,random)))));messages.length=0;context.onmessage({data:{settings:{...s,ballCount:1},runId:8}});assert.equal(messages[0].type,'error');});

test('ビンゴ達成と景品受取を分け、参加賞で全員に1個以上配る',()=>{
 const s=settings({ballCount:24,columnRanges:false,participants:5,duration:10,drawInterval:1,awardSeconds:0,prizes:2});
 const r=B.runTrial(s,rng());assert.equal(r.bingoAchievers,5);assert.equal(r.winners,2);assert.equal(r.participationRecipients,3);assert.equal(r.minimumGifts,5);assert.equal(r.winners+r.participationRecipients,s.participants);
});
test('上限なしなら未定の景品数に制約されず必要数を見積もる',()=>{
 const s=settings({ballCount:24,columnRanges:false,participants:5,duration:10,drawInterval:1,awardSeconds:0,prizes:0,estimatePrizes:true,maxWins:2});
 const r=B.runTrial(s,rng());assert.equal(r.bingoAchievers,5);assert.equal(r.winners,5);assert.equal(r.awards,10);assert.equal(r.participationRecipients,0);assert.equal(r.minimumGifts,10);
});
test('受取時間切れのビンゴ達成者は参加賞を用意する',()=>{
 const r=B.runTrial(settings({ballCount:24,columnRanges:false,participants:5,duration:1,drawInterval:1,awardSeconds:100,estimatePrizes:true}),rng());
 assert.equal(r.bingoAchievers,5);assert.equal(r.winners,0);assert.equal(r.participationRecipients,5);assert.equal(r.minimumGifts,5);
});
test('全員不成立なら全員に参加賞、必要ビンゴ数を考慮する',()=>{
 const r=B.runTrial(settings({participants:8,duration:0.01,requiredLines:2}),rng());assert.equal(r.bingoAchievers,0);assert.equal(r.participationRecipients,8);assert.equal(r.minimumGifts,8);
});
test('新指標の平均は大会ごとの集計、人数合計は参加人数と一致',()=>{
 const s=settings({participants:10,duration:3,awardSeconds:10,estimatePrizes:true});const random=rng();const results=Array.from({length:20},()=>B.runTrial(s,random));const a=B.aggregate(results);
 for(const key of ['bingoAchievers','winners','participationRecipients','minimumGifts'])assert.equal(a[key].mean,results.reduce((sum,r)=>sum+r[key],0)/20);
 assert.equal(a.winners.mean+a.participationRecipients.mean,10);assert.equal(a.version,2);
});
test('旧履歴は景品数上限の意味を保持し未集計を捏造しない',()=>{assert.equal(H.normalizeSettings({}).estimatePrizes,false);const a=B.aggregate([{awards:2,winEvents:2,winners:2,drawCount:40}]);assert.equal(a.bingoAchievers,undefined);});

test('上位2名に3個、残り3名に1個。1人1回の受取で全必要数9個',()=>{
 const s=settings({ballCount:24,columnRanges:false,participants:5,duration:10,drawInterval:1,awardSeconds:0,estimatePrizes:true,rankPrizes:true,topWinners:2,topPrizeCount:3,maxWins:12});
 const t=B.createTrial(s,rng());while(!t.snapshot().finished)t.step();const r=t.snapshot();
 assert.equal(r.winners,5);assert.equal(r.awards,9);assert.equal(r.winEvents,5);assert.equal(r.minimumGifts,9);assert.equal(r.participationRecipients,0);
 assert.deepEqual([...t.gifts].sort((a,b)=>a-b),[1,1,1,3,3]);assert(t.wins.every(n=>n===1));
 for(let p=0;p<5;p++)assert.equal(t.gifts[p],t.ranks[p]<=2?3:1);
});
test('上位配布OFFなら設定値を無視し従来の個数上限を維持',()=>{
 const s=settings({ballCount:24,columnRanges:false,participants:5,duration:10,drawInterval:1,awardSeconds:0,estimatePrizes:true,rankPrizes:false,topWinners:NaN,topPrizeCount:NaN,maxWins:2});
 assert.deepEqual(B.validate(s),[]);const r=B.runTrial(s,rng());assert.equal(r.awards,10);assert.equal(r.winEvents,10);
});
test('有限在庫が上位者の指定個数に不足したら一部だけ渡さない',()=>{
 const s=settings({ballCount:24,columnRanges:false,participants:5,duration:10,drawInterval:1,awardSeconds:0,estimatePrizes:false,prizes:4,rankPrizes:true,topWinners:2,topPrizeCount:3});
 const r=B.runTrial(s,rng());assert.equal(r.winners,1);assert.equal(r.awards,3);assert.equal(r.participationRecipients,4);assert.equal(r.minimumGifts,7);
});
test('上位の指定個数をまとめて渡し進行時間は1人1回分',()=>{
 const s=settings({ballCount:24,columnRanges:false,participants:1,duration:2,drawInterval:1,awardSeconds:10,estimatePrizes:true,rankPrizes:true,topWinners:1,topPrizeCount:3});
 const t=B.createTrial(s,rng());let previous=0,receipt=null;while(!t.snapshot().finished){const r=t.step();if(r.newWinners?.length)receipt=r.elapsed-previous;previous=r.elapsed;}
 assert.equal(receipt,11);assert.equal(t.snapshot().awards,3);assert.equal(t.snapshot().winEvents,1);
});
test('上位配布の入力検証と無効項目の除外',()=>{
 const s=settings({participants:5,rankPrizes:true,topWinners:2,topPrizeCount:3,estimatePrizes:true,prizes:NaN,maxWins:NaN});assert.deepEqual(B.validate(s),[]);
 for(const topWinners of [0,6,1.5,NaN])assert(B.validate({...s,topWinners}).some(e=>e.includes('上位人数')));
 for(const topPrizeCount of [0,1.5,NaN,100001])assert(B.validate({...s,topPrizeCount}).some(e=>e.includes('上位者1人')));
 const old=H.normalizeSettings({});assert.equal(old.rankPrizes,false);assert.equal(old.topWinners,10);assert.equal(old.topPrizeCount,3);
});
