const {test}=require('node:test');
const assert=require('node:assert/strict');
const B=require('../engine.js'),T=require('../theory.js');
const ns=[30,35,40,45,50,60,75];
const expected=[
[2.2,1.1,.6,.4,.2,.1,0],[3.7,1.8,1,.6,.4,.2,.1],[5.7,2.8,1.6,.9,.6,.3,.1],
[8.4,4.2,2.3,1.4,.9,.4,.1],[12,6.1,3.3,2,1.2,.6,.2],[16.4,8.4,4.7,2.8,1.7,.8,.3],
[21.4,11.3,6.3,3.8,2.4,1.1,.4],[27,14.8,8.4,5,3.2,1.4,.5],[32.7,18.8,10.9,6.5,4.1,1.9,.7],
[38.1,23.2,13.7,8.4,5.3,2.4,.9],[42.6,27.8,17,10.5,6.7,3,1.1],[46.1,32.5,20.6,13,8.3,3.8,1.4],
[48.3,36.9,24.4,15.7,10.2,4.7,1.8],[49.4,40.9,28.4,18.7,12.4,5.7,2.2],[49.9,44.2,32.4,22,14.7,6.9,2.7],
[50,46.7,36.2,25.4,17.3,8.3,3.2],[50,48.3,39.6,28.8,20.1,9.8,3.8],[50,49.3,42.7,32.3,23,11.5,4.5],
[50,49.8,45.1,35.6,26.1,13.4,5.3],[50,50,47,38.7,29.2,15.4,6.2],[50,50,48.4,41.5,32.2,17.5,7.2]
];
test('提示された21行×7列の147セルが小数第1位まで一致',()=>{
 const rows=T.table(50,ns,10,30);for(let r=0;r<21;r++)for(let c=0;c<7;c++)assert.equal(rows[r].values[c].toFixed(1),expected[r][c].toFixed(1),`m=${r+10}, n=${ns[c]}`);
});
for(const n of [24,25])for(const m of [4,5])test(`独立した全組合せ列挙と厳密な分子が一致 n=${n}, m=${m}`,()=>{
 const a=Array(25).fill(null);let number=1;for(let i=0;i<25;i++)if(i!==12)a[i]=number++;
 let successes=0,total=0;const drawn=new Set();
 function enumerate(start,left){if(left===0){total++;if(B.completedLines(a,drawn)>0)successes++;return;}for(let v=start;v<=n-left+1;v++){drawn.add(v);enumerate(v+1,left-1);drawn.delete(v);}}
 enumerate(1,m);const f=T.fraction(n,m);assert.equal(f.numerator,BigInt(successes));assert.equal(f.denominator,BigInt(total));
});
test('中央FREEにより4球からビンゴ可能、3球以下は不成立',()=>{for(let m=0;m<4;m++)assert.equal(T.probability(75,m),0);const f=T.fraction(75,4);assert.equal(f.numerator,4n);assert.equal(f.denominator,T.choose(75,4));assert(T.probability(100000,4)>0);});
test('全球終了と球数を超えた抽選回数は全員達成、人数に比例',()=>{for(const n of [24,30,75]){assert.equal(T.expected(50,n,n),50);assert.equal(T.expected(50,n,n+10),50);}assert.equal(T.expected(100,75,30),2*T.expected(50,75,30));});
test('確率は0〜1の範囲で抽選回数とともに増加、大きな整数でも有限',()=>{for(const n of [...ns,100000]){let last=0;for(const m of [0,4,10,20,30,100,1000]){const p=T.probability(n,m);assert(Number.isFinite(p)&&p>=last&&p<=1);last=p;}}});
test('球数・人数・回数の不正入力を拒否し比較球数を解析',()=>{
 assert.deepEqual(T.parseBallCounts('30,35 40、45，50,30'),[30,35,40,45,50]);
 for(const text of ['', '23','30.5','30abc','Infinity','100001'])assert.throws(()=>T.parseBallCounts(text));
 for(const n of [23,30.5,NaN,100001])assert.throws(()=>T.probability(n,10));
 for(const m of [-1,1.5,NaN,1001])assert.throws(()=>T.probability(75,m));
 assert.throws(()=>T.expected(0,75,30));assert.throws(()=>T.table(50,ns,30,10));
});
