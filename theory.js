(function(root){
'use strict';
const B=typeof module!=='undefined'&&module.exports?require('./engine.js'):root.Bingo;
let coefficients;
function popcount(x){let count=0;while(x){x&=x-1;count++;}return count;}
function lineCoefficients(){
 if(coefficients)return coefficients.slice();
 const lines=B.LINES.map(line=>line.reduce((mask,i)=>i===12?mask:mask|(1<<i),0));
 const unions=new Int32Array(1<<lines.length),counts=Array(25).fill(0);
 for(let subset=1;subset<unions.length;subset++){
  const bit=subset&-subset,index=31-Math.clz32(bit);
  unions[subset]=unions[subset^bit]|lines[index];
  counts[popcount(unions[subset])]+=popcount(subset)%2?1:-1;
 }
 coefficients=counts;return counts.slice();
}
function choose(n,k){if(k<0||k>n)return 0n;k=Math.min(k,n-k);let value=1n;for(let i=1;i<=k;i++)value=value*BigInt(n-k+i)/BigInt(i);return value;}
function fraction(n,m){
 if(!Number.isSafeInteger(n)||n<24||n>100000)throw new Error('抽選球数は24〜100000の整数で入力してください。');
 if(!Number.isSafeInteger(m)||m<0||m>1000)throw new Error('抽選回数は0〜1000の整数で入力してください。');
 m=Math.min(m,n);
 const denominator=choose(n,m),counts=lineCoefficients();let term=denominator,numerator=0n;
 for(let k=1;k<=Math.min(m,24);k++){term=term*BigInt(m-k+1)/BigInt(n-k+1);numerator+=BigInt(counts[k])*term;}
 return {numerator,denominator,effectiveDraws:m};
}
function probability(n,m){const f=fraction(n,m);if(f.numerator===0n)return 0;if(f.numerator===f.denominator)return 1;const a=f.numerator.toString(),b=f.denominator.toString(),ka=Math.min(16,a.length),kb=Math.min(16,b.length);return Math.min(1,Number(a.slice(0,ka))/Number(b.slice(0,kb))*10**(a.length-ka-b.length+kb));}
function expected(participants,n,m){if(!Number.isSafeInteger(participants)||participants<1||participants>10000)throw new Error('参加人数は1〜10000の整数で入力してください。');return participants*probability(n,m);}
function parseBallCounts(text){
 const parts=text.trim().split(/[\s,、，]+/).filter(Boolean);
 if(!parts.length||parts.length>15)throw new Error('比較する球数は1〜15種類を、カンマまたは空白で区切って入力してください。');
 if(parts.some(p=>!/^\d+$/.test(p)))throw new Error('球数には24〜100000の整数を入力してください。');
 const ns=[...new Set(parts.map(Number))];if(ns.some(n=>!Number.isSafeInteger(n)||n<24||n>100000))throw new Error('球数には24〜100000の整数を入力してください。');return ns;
}
function table(participants,ns,start,end){
 if(!Number.isSafeInteger(start)||!Number.isSafeInteger(end)||start<0||end>1000||start>end)throw new Error('抽選回数の範囲は0〜1000の整数で、開始回数≦終了回数にしてください。');
 return Array.from({length:end-start+1},(_,i)=>{const m=start+i;return {draws:m,values:ns.map(n=>expected(participants,n,m))};});
}
const api={lineCoefficients,choose,fraction,probability,expected,parseBallCounts,table};root.BingoTheory=api;if(typeof module!=='undefined'&&module.exports)module.exports=api;
})(typeof self!=='undefined'?self:globalThis);
