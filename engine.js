(function(root) {
'use strict';
const FREE = null;
const LINES = [];
for(let r=0;r<5;r++) LINES.push(Array.from({length:5},(_,c)=>r*5+c));
for(let c=0;c<5;c++) LINES.push(Array.from({length:5},(_,r)=>r*5+c));
LINES.push([0,6,12,18,24],[4,8,12,16,20]);
const defaults = {ballCount:75,columnRanges:true,estimatePrizes:true,participants:100,trials:100,duration:30,drawInterval:15,awardSeconds:20,requiredLines:1,prizes:30,maxWins:1};
function ranges(n) {
 let start=1; return Array.from({length:5},(_,i)=>{const size=Math.floor(n/5)+(i<n%5?1:0);const range={label:'BINGO'[i],start,end:start+size-1,size};start+=size;return range;});
}
function validate(s) {
 const errors=[];
 for(const [key,label,min,max] of [['ballCount','抽選球数',24,100000],['participants','参加人数',1,10000],['trials','試行回数',1,100000],['requiredLines','必要ビンゴ列数',1,12],['prizes','景品数',0,100000],['maxWins','1人の獲得上限',1,12]]) {
 if(!Number.isSafeInteger(s[key])||s[key]<min||s[key]>max)errors.push(`${label}は${min}〜${max}の整数で入力してください。`);
 }
 for(const [key,label,min,max] of [['duration','制限時間（分）',0.01,1440],['drawInterval','抽選間隔（秒）',0.1,86400],['awardSeconds','1当選あたりの進行時間（秒）',0,86400]]) {
 if(!Number.isFinite(s[key])||s[key]<min||s[key]>max)errors.push(`${label}は${min}〜${max}で入力してください。`);
 }
 if(typeof s.estimatePrizes!=='boolean')errors.push('景品数の見積もり方式を選択してください。');
 if(typeof s.columnRanges!=='boolean')errors.push('カード生成方式を選択してください。');
 if(Number.isSafeInteger(s.ballCount)&&s.ballCount>=24&&s.columnRanges) {
 ranges(s.ballCount).forEach((v,i)=>{const need=i===2?4:5;if(v.size<need)errors.push(`${v.label}列の範囲（${v.start}〜${v.end}）には${need}個の数字が必要です。球数を増やすか列指定をOFFにしてください。`);});
 }
 return errors;
}
function shuffle(a,rng=Math.random) {for(let i=a.length-1;i>0;i--){const j=Math.floor(rng()*(i+1));[a[i],a[j]]=[a[j],a[i]];}return a;}
function sequence(n,rng=Math.random){return shuffle(Array.from({length:n},(_,i)=>i+1),rng);}
function card(s,rng=Math.random) {
 const a=Array(25).fill(FREE);
 if(s.columnRanges) ranges(s.ballCount).forEach((v,c)=>{const nums=shuffle(Array.from({length:v.size},(_,i)=>v.start+i),rng);let j=0;for(let r=0;r<5;r++)if(r!==2||c!==2)a[r*5+c]=nums[j++];});
 else {const nums=sequence(s.ballCount,rng);let j=0;for(let i=0;i<25;i++)if(i!==12)a[i]=nums[j++];}
 return a;
}
function completedLines(a,drawn) {return LINES.filter(line=>line.every(i=>a[i]===FREE||drawn.has(a[i]))).length;}
function createTrial(s,rng=Math.random) {
 const errors=validate(s);if(errors.length)throw new Error(errors.join('\n'));
 const cards=Array.from({length:s.participants},()=>card(s,rng));
 const order=sequence(s.ballCount,rng),drawn=new Set(),wins=Array(s.participants).fill(0),achieved=Array(s.participants).fill(false);
 let index=0,elapsed=0,awards=0,winEvents=0,finished=false;
 const limit=s.duration*60;
 function snapshot(extra={}) {const winners=wins.filter(n=>n>0).length;return {elapsed,drawCount:index,awards,winEvents,winners,bingoAchievers:achieved.filter(Boolean).length,participationRecipients:s.participants-winners,minimumGifts:awards+s.participants-winners,finished,...extra};}
 function finish(){elapsed=limit;finished=true;return snapshot({number:null,newWinners:[]});}
 function step(){
 if(finished)return snapshot({number:null,newWinners:[]});
 if(index===order.length||elapsed+s.drawInterval>limit)return finish();
 elapsed+=s.drawInterval;
 const number=order[index++];drawn.add(number);
 // A single draw may complete several lines. Each group of requiredLines is one winning opportunity.
 const candidates=[];
 cards.forEach((a,p)=>{const lines=completedLines(a,drawn);if(lines>=s.requiredLines)achieved[p]=true;const eligible=Math.min(s.maxWins,Math.floor(lines/s.requiredLines));for(let w=wins[p];w<eligible;w++)candidates.push(p);});
 shuffle(candidates,rng);
 const newWinners=[];
 for(const p of candidates){if((!s.estimatePrizes&&awards>=s.prizes)||elapsed+s.awardSeconds>limit)break;wins[p]++;awards++;winEvents++;newWinners.push(p);elapsed+=s.awardSeconds;}
 return snapshot({number,newWinners});
 }
 return {cards,order,drawn,wins,step,finish,snapshot};
}
function runTrial(s,rng=Math.random){const t=createTrial(s,rng);while(!t.snapshot().finished)t.step();return t.snapshot();}
function aggregate(results){const keys=['awards','winEvents','winners','drawCount','bingoAchievers','participationRecipients','minimumGifts'];const out={trials:results.length,version:results.every(r=>['bingoAchievers','participationRecipients','minimumGifts'].every(k=>Number.isFinite(r[k])))?2:1};for(const key of keys){if(results.some(r=>!Number.isFinite(r[key])))continue;const a=results.map(r=>r[key]);out[key]={mean:a.reduce((x,y)=>x+y,0)/a.length,min:a.reduce((x,y)=>Math.min(x,y),Infinity),max:a.reduce((x,y)=>Math.max(x,y),-Infinity)};}return out;}
const api={FREE,LINES,defaults,ranges,validate,shuffle,sequence,card,completedLines,createTrial,runTrial,aggregate};
if(typeof module!=='undefined'&&module.exports)module.exports=api;
root.Bingo=api;
})(typeof self!=='undefined'?self:globalThis);
