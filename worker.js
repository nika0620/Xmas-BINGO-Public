importScripts('engine.js?v=20261123-rank1');
self.onmessage = ({data}) => {
 const {settings,runId}=data;
 try {
  const errors=Bingo.validate(settings);if(errors.length)throw new Error(errors.join('\n'));
  const results=[];let nextProgress=0;
  for(let i=0;i<settings.trials;i++) {
   results.push(Bingo.runTrial(settings));
   if(performance.now()>=nextProgress||i+1===settings.trials){self.postMessage({type:'progress',runId,completed:i+1,total:settings.trials});nextProgress=performance.now()+100;}
  }
  self.postMessage({type:'done',runId,result:Bingo.aggregate(results)});
 }catch(error){self.postMessage({type:'error',runId,message:error.message});}
};
