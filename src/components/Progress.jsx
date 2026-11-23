import { Check, CircleAlert, LoaderCircle } from 'lucide-react';
export default function Progress({entry}){
 const progress=Math.max(0,Math.min(100,entry.progress||0));
 const done=entry.status==='done',error=entry.status==='error';
 return <div className="progress-item" role="status" aria-live="polite">
   <div className="progress-top"><span className="file-name">{entry.file.name}</span><span className="progress-state">{done?<><Check size={14}/> Done</>:error?<><CircleAlert size={14}/> Failed</>:<><LoaderCircle size={14} className={entry.status==='working'?'spin':''}/>{entry.step||'Queued'}</>}</span></div>
   <div className="track" role="progressbar" aria-label={`Progress for ${entry.file.name}`} aria-valuemin={0} aria-valuemax={100} aria-valuenow={progress}><div style={{width:`${progress}%`}} className={error?'error':done?'complete':''}/></div>
   <div className="progress-foot"><span>{entry.error||entry.step||'Waiting'}</span><span>{progress}%</span></div>
 </div>;
}
