import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Activity, ArrowDownToLine, ArrowRight, AudioLines, Check, ChevronDown, ChevronRight, Clock3, FileAudio, Info, Lock, Moon, Plus, Save, Search, Settings2, ShieldCheck, SlidersHorizontal, Sparkles, Star, Sun, Trash2, WandSparkles, X } from 'lucide-react';
import DropZone from './components/DropZone.jsx';
import Progress from './components/Progress.jsx';
import Field from './components/Field.jsx';
import {readMetadata} from './audio/metadata.js';
import {writeMp3Tags} from './audio/id3.js';
import {convertFile,OUTPUT_FORMATS} from './audio/converter.js';
import {saveBlob,zipDownloads} from './audio/export.js';
import {EMPTY_TAGS,FIELD_GROUPS,prettyBytes,sanitizeFilename} from './audio/fields.js';
import {loadSettings,saveSettings,appendHistory} from './audio/storage.js';
const freshId=()=>crypto.randomUUID();
const isMp3=file=>/\.mp3$/i.test(file.name);
const extension=file=>file.name.split('.').pop()?.toLowerCase()||'audio';
const isoDate=iso=>new Date(iso).toLocaleString(undefined,{dateStyle:'medium',timeStyle:'short'});
const FAQ=[
 ['Are my audio files uploaded to a server?','No. File reading, metadata writing, and conversion all run inside your browser on your own device. The website is delivered as static files.'],
 ['Can I edit more than one MP3 file?','Yes. Choose multiple files or drag an entire selection into the upload area. Select a file for individual edits, or apply shared values in Batch edit.'],
 ['Will editing tags reduce audio quality?','For MP3, the metadata writer replaces the ID3 tag without decoding or re-encoding the audio. Other supported formats use a stream-copy metadata remux when needed.'],
 ['Does Audio Quick Tools work offline?','After the app and its conversion resources have been installed or cached by your browser, the core editing and conversion workflows can work offline. Initial loading requires a network connection.'],
 ['Which formats can I convert?','Common formats include MP3, WAV, FLAC, AAC/M4A, OGG Vorbis and Opus, subject to the codecs bundled with the conversion engine. Some conversions may not work on all devices.'],
 ['Can I save my favorite tag settings?','Yes. Click the star to save a preset. Presets and the recent activity list are stored only in this browser, not in an online account.'],
];
function Header({tab,setTab,theme,toggleTheme}){
 return <header className="site-header"><div className="shell header-content"><button className="brand" onClick={()=>{setTab('tags');window.scrollTo({top:0,behavior:'smooth'});}} aria-label="Audio Quick Tools home"><img src="/icons/icon-192.png" alt=""/><span>audio<span className="brand-dot">.</span>quick<span className="brand-muted">tools</span></span></button>
  <nav className="nav" aria-label="Primary"><button className={tab==='tags'?'active':''} onClick={()=>setTab('tags')}>Tag editor</button><button className={tab==='convert'?'active':''} onClick={()=>setTab('convert')}>Converter</button><a href="#how-it-works">How it works</a></nav>
  <div className="header-end"><span className="private-note"><ShieldCheck size={14}/> 100% on-device</span><button className="icon-button" title="Toggle color theme" aria-label="Toggle color theme" onClick={toggleTheme}>{theme==='dark'?<Sun size={19}/>:<Moon size={19}/>}</button></div></div></header>;
}
function FileList({items,selected,setSelected,onRemove,mode}){
 return <div className="file-list"><div className="list-heading"><span>FILES <strong>{items.length}</strong></span><button className="text-action" onClick={()=>onRemove('all')}><Trash2 size={14}/> Clear all</button></div>
 {items.map(item=><div key={item.id} className={`file-row ${selected===item.id?'selected':''}`}>
  <button className="file-select" onClick={()=>setSelected(item.id)}><div className="file-glyph"><FileAudio size={17}/></div><span className="file-details"><strong title={item.file.name}>{item.file.name}</strong><small>{prettyBytes(item.file.size)} · {extension(item.file).toUpperCase()} {item.metadata?.duration?`· ${Math.round(item.metadata.duration)}s`:''}</small></span></button>
  <div className="file-actions"><span className={`status-dot ${item.status}`}/><button onClick={()=>onRemove(item.id)} className="remove" title={`Remove ${item.file.name}`} aria-label={`Remove ${item.file.name}`}><X size={16}/></button></div>
 </div>)}
 {mode==='tags'&&items.length>1&&<div className="helper-line"><Info size={14}/> Select a file to edit it, or switch on batch mode.</div>}</div>;
}
function Details({active,values,setValues,cover,setCover,removeCover,setRemoveCover,query,setQuery,group,setGroup,customTags,setCustomTags}){
 const coverInput=useRef(null);
 const [artURL,setArtURL]=useState('');
 useEffect(()=>{if(!cover||removeCover){setArtURL('');return;}const url=URL.createObjectURL(cover);setArtURL(url);return ()=>URL.revokeObjectURL(url);},[cover,removeCover]);
 const shown=FIELD_GROUPS.map(g=>({...g,fields:g.fields.filter(([id,label])=>`${id} ${label}`.toLowerCase().includes(query.toLowerCase()))})).filter(g=>g.fields.length);
 return <div className="editor-fields">
 <div className="editor-toolbar"><div><div className="section-overline">METADATA</div><h3>{active?.file?.name||'Batch metadata'}</h3><p>{active?'Edit any field below. Blank fields can be cleared.':'Only populated values are applied to every file.'}</p></div><label className="search"><Search size={15}/><input aria-label="Search metadata fields" placeholder="Find a field..." value={query} onChange={e=>setQuery(e.target.value)}/></label></div>
 <div className="cover-row"><div className="cover-art" style={artURL?{backgroundImage:`url(${artURL})`}:{}}>{(!cover||removeCover)&&<AudioLines size={28}/>}</div><div className="cover-details"><strong>Album artwork</strong><p>JPEG or PNG. Square images work best.</p><div className="inline-actions"><button className="button small outline" onClick={()=>coverInput.current?.click()}>Choose image</button>{cover&&<button className="text-action" onClick={()=>{setCover(null);setRemoveCover(true);}}>Remove artwork</button>}</div><input ref={coverInput} className="visually-hidden" type="file" accept="image/jpeg,image/png" onChange={e=>{const f=e.target.files?.[0];if(f){if(f.size>5*1024*1024){alert('Please choose an image smaller than 5 MB.');return;}setCover(f);setRemoveCover(false);}e.target.value='';}}/></div></div>
 <div className="groups">{shown.map(g=><div className="field-group" key={g.title}><button className="group-heading" onClick={()=>setGroup(group===g.title?'':g.title)}><span>{g.title}<small>{g.fields.length} fields</small></span>{group===g.title?<ChevronDown size={17}/>:<ChevronRight size={17}/>}</button>{group===g.title&&<div className="field-grid">{g.fields.map(([id,label])=><Field key={id} name={id} label={label} value={values[id]} onChange={(key,val)=>setValues(v=>({...v,[key]:val}))} multiline={['lyrics','comment','description','custom'].includes(id)}/>)}</div>}</div>)}</div>
 {!shown.length&&<div className="empty-search">No metadata fields match your search.</div>}
 <div className="custom-section"><div className="small-heading"><span>CUSTOM TAGS (TXXX / METADATA)</span><button className="text-action" onClick={()=>setCustomTags(s=>[...s,{id:crypto.randomUUID(),key:'',value:''}])}><Plus size={14}/> Add tag</button></div>
 <p>Custom key/value metadata, for example LABELCODE or DISCOGS_RELEASE_ID. In MP3 these are written as ID3 TXXX frames.</p>
 {customTags.map(c=><div className="custom-row" key={c.id}><input value={c.key} placeholder="Tag name" aria-label="Custom tag name" onChange={e=>setCustomTags(s=>s.map(x=>x.id===c.id?{...x,key:e.target.value}:x))}/><input value={c.value} placeholder="Value" aria-label="Custom tag value" onChange={e=>setCustomTags(s=>s.map(x=>x.id===c.id?{...x,value:e.target.value}:x))}/><button title="Remove custom tag" aria-label="Remove custom tag" onClick={()=>setCustomTags(s=>s.filter(x=>x.id!==c.id))}><X size={15}/></button></div>)}
 </div>
 </div>;
}
export default function App(){
 const [stored,setStored]=useState(loadSettings);
 const [tab,setTab]=useState('tags'),[files,setFiles]=useState([]),[selected,setSelected]=useState(null);
 const [values,setValues]=useState({...EMPTY_TAGS}),[cover,setCover]=useState(null),[removeCover,setRemoveCover]=useState(false);
 const [query,setQuery]=useState(''),[group,setGroup]=useState('Essentials'),[batch,setBatch]=useState(false),[customTags,setCustomTags]=useState([]);
 const [format,setFormat]=useState('mp3'),[bitrate,setBitrate]=useState('192');
 const [running,setRunning]=useState(false),[results,setResults]=useState([]),[currentStep,setCurrentStep]=useState(''),[error,setError]=useState('');
 const [presetName,setPresetName]=useState(''),[showPresets,setShowPresets]=useState(false),[showHistory,setShowHistory]=useState(false);
 const cancelRef=useRef(false);const filesRef=useRef(files);filesRef.current=files;
 const selectedFile=files.find(f=>f.id===selected)||null;
 const theme=stored.theme;
 useEffect(()=>{document.documentElement.dataset.theme=theme;saveSettings(stored);},[stored,theme]);
 useEffect(()=>{if(!batch&&selectedFile?.metadata){setValues({...EMPTY_TAGS,...selectedFile.metadata.tags});setCover(selectedFile.metadata.cover??null);setRemoveCover(false);setCustomTags([]);setGroup('Essentials');}},[selected,batch,selectedFile?.metadata]);
 const modify=useCallback((id,changes)=>setFiles(prev=>prev.map(f=>f.id===id?{...f,...changes}:f)),[]);
 async function receiveFiles(list){
  setError('');setResults([]);
  const accepted=list.filter(f=>/\.(mp3|flac|wav|wave|m4a|mp4|aac|ogg|oga|opus|aif|aiff|wma)$/i.test(f.name));
  if(accepted.length<list.length)setError('Some unsupported files were skipped.');
  if(accepted.some(f=>f.size>10*1024*1024) && /iPhone|Android|iPad/i.test(navigator.userAgent))setError('Large files may use significant memory on mobile. Files around 10 MB or smaller are recommended.');
  const added=accepted.map(file=>({id:freshId(),file,metadata:null,status:'reading',step:'Reading metadata',progress:8}));
  setFiles(prev=>[...prev,...added]);
  if(added.length&&!selected)setSelected(added[0].id);
  for(const item of added){try{const metadata=await readMetadata(item.file);modify(item.id,{metadata,status:'ready',progress:100,step:'Ready'});}catch(e){modify(item.id,{metadata:{tags:{...EMPTY_TAGS},cover:null},status:'ready',progress:100,step:'Ready (limited metadata)',readError:e.message});}}
 }
 function removeFile(id){if(running)return;if(id==='all'){setFiles([]);setSelected(null);setResults([]);return;}setFiles(prev=>prev.filter(f=>f.id!==id));if(selected===id)setSelected(files.find(f=>f.id!==id)?.id||null);}
 function changeBatch(next){setBatch(next);setValues(next?{...EMPTY_TAGS}:{...EMPTY_TAGS,...selectedFile?.metadata?.tags});setCover(next?null:selectedFile?.metadata?.cover??null);setRemoveCover(false);setCustomTags([]);}
 const countReady=files.filter(f=>f.status==='ready'||f.status==='done'||f.status==='error').length;
 function updateProgress(id,data){modify(id,{status:'working',...data});setCurrentStep(data.step||'Processing');}
 async function processFiles(){
  if(!files.length||running)return;
  cancelRef.current=false;setRunning(true);setError('');setResults([]);
  const jobs=filesRef.current.filter(item=>item.metadata && (tab==='convert'||batch||item.id===selected));
  const saved=[];
  try{for(const item of jobs){
    if(cancelRef.current)break;
    const applying=tab==='convert'||batch||selected===item.id;
    const tags=applying?{...item.metadata.tags,...(batch?Object.fromEntries(Object.entries(values).filter(([,v])=>v!=='')):values)}:item.metadata.tags;
    const artwork=applying?cover:item.metadata.cover;
    const extras=applying?customTags.filter(c=>c.key.trim()&&c.value.trim()).map(c=>({key:c.key.trim(),value:c.value})):[];
    const deleteArtwork=applying?removeCover:false;
    try{
      updateProgress(item.id,{progress:4,step:'Preparing file'});
      let blob,name;
      if(tab==='tags'&&isMp3(item.file)){
        updateProgress(item.id,{progress:24,step:'Writing ID3 metadata'});
        blob=await writeMp3Tags(item.file,tags,artwork,deleteArtwork,extras);
        updateProgress(item.id,{progress:92,step:'Finalizing file'});
        name=sanitizeFilename(item.file.name.replace(/\.mp3$/i,''))+'.mp3';
      }else{
        const outFormat=tab==='convert'?format:(extension(item.file)==='wave'?'wav':extension(item.file));
        if(!['mp3','m4a','wav','flac','ogg','opus'].includes(outFormat))throw Error('Tag saving is available for MP3, M4A, WAV, FLAC, OGG and Opus. Convert other formats first.');
        blob=await convertFile(item.file,outFormat,bitrate,p=>updateProgress(item.id,{progress:p.step==='Loading conversion engine'?Math.min(20,p.progress):Math.max(21,p.progress),step:p.step}),tags,deleteArtwork?null:artwork,tab==='tags',extras);
        name=sanitizeFilename(item.file.name.replace(/\.[^.]+$/,''))+'.'+outFormat;
      }
      saved.push({id:item.id,name,blob});modify(item.id,{status:'done',progress:100,step:'Ready to download'});
    }catch(e){modify(item.id,{status:'error',progress:0,error:e.message||'Processing failed',step:'Failed'});}
  }
  setResults(saved);
  if(saved.length)setStored(prev=>({...prev,history:appendHistory(prev.history,{action:tab==='convert'?`Converted to ${format.toUpperCase()}`:'Edited tags',count:saved.length})}));
  if(!saved.length&&!cancelRef.current)setError('No files could be processed. Review the error shown beside each file.');
  }finally{setCurrentStep('');setRunning(false);}
 }
 async function downloadAll(){if(results.length===1){saveBlob(results[0].blob,results[0].name);return;}try{setCurrentStep('Packaging ZIP');const zip=await zipDownloads(results);saveBlob(zip,'audio-quick-tools-files.zip');}catch(e){setError('ZIP packaging failed: '+e.message);}finally{setCurrentStep('');}}
 function savePreset(){const name=presetName.trim()||`Preset ${stored.presets.length+1}`;setStored(prev=>({...prev,presets:[{id:freshId(),name,tags:{...values},customTags:customTags.map(c=>({...c})),time:new Date().toISOString()},...prev.presets].slice(0,30)}));setPresetName('');setShowPresets(true);}
 function loadPreset(p){setValues(v=>({...v,...p.tags}));setCustomTags(p.customTags||[]);setShowPresets(false);}
 function toggleTheme(){setStored(v=>({...v,theme:v.theme==='light'?'dark':'light'}));}
 const completed=files.filter(f=>f.status==='done').length;
 const benefits=useMemo(()=>[{icon:Lock,title:'Private by design',text:'Your audio never needs to leave your device.'},{icon:Activity,title:'Actual audio tools',text:'Edit metadata or change formats without installing software.'},{icon:Sparkles,title:'Simple, not limited',text:'A clean interface with advanced controls when you need them.'}],[]);
 return <>
  <Header tab={tab} setTab={next=>{if(running)return;setTab(next);setResults([]);}} theme={theme} toggleTheme={toggleTheme}/>
  <main id="top">
   <section className="hero shell"><div className="eyebrow"><span className="eyebrow-mark"/> THE PRIVATE AUDIO WORKSPACE</div><h1>Small tools.<br/><em>Better audio files.</em></h1><p className="hero-copy">Edit audio tags, organize album artwork, and convert audio formats. Everything happens right in your browser — no uploads, no account, no unnecessary steps.</p><div className="hero-tags"><span><ShieldCheck size={15}/> On-device processing</span><span><AudioLines size={15}/> Batch-friendly</span><span><Check size={15}/> Free to use</span></div></section>
   <section className="workspace shell" aria-label="Audio workspace"><div className="workspace-top"><div className="workspace-title"><span className="section-overline">YOUR WORKSPACE</span><h2>Make it yours.</h2></div><div className="workspace-tabs" role="tablist" aria-label="Audio tools"><button role="tab" aria-selected={tab==='tags'} className={tab==='tags'?'active':''} onClick={()=>{if(!running){setTab('tags');setResults([]);}}}><Settings2 size={17}/> Tag editor</button><button role="tab" aria-selected={tab==='convert'} className={tab==='convert'?'active':''} onClick={()=>{if(!running){setTab('convert');setResults([]);}}}><SlidersHorizontal size={17}/> Converter</button></div></div>
   <div className="work-grid"><aside className="work-side"><DropZone onFiles={receiveFiles} compact={files.length>0}/>{files.length>0&&<FileList items={files} selected={selected} setSelected={setSelected} onRemove={removeFile} mode={tab}/>}
     <div className="side-privacy"><ShieldCheck size={18}/><div><strong>Nothing gets uploaded.</strong><p>Your files stay on your device. No server-side audio processing.</p></div></div></aside>
   <div className="work-main">{files.length===0?<div className="empty-panel"><div className="empty-illustration"><AudioLines size={42} strokeWidth={1.1}/></div><h3>{tab==='tags'?'Beautifully simple tag editing.':'Thoughtful audio conversion.'}</h3><p>{tab==='tags'?'Add a track to edit its title, artist, album artwork, and dozens of advanced metadata fields.':'Add one or more audio files, choose an output format, and convert locally with clear progress.'}</p><div className="empty-steps"><span><b>01</b> Add files</span><ChevronRight size={15}/><span><b>02</b> {tab==='tags'?'Edit tags':'Choose format'}</span><ChevronRight size={15}/><span><b>03</b> Download</span></div></div>:<>
     {tab==='tags'?<><div className="tool-actions"><label className="batch-toggle"><input type="checkbox" checked={batch} disabled={running} onChange={e=>changeBatch(e.target.checked)}/><span>Batch edit {files.length>1?`${files.length} files`:''}</span></label><div className="right-tools"><button className="tool-icon" title="Save current fields as preset" onClick={()=>setShowPresets(v=>!v)}><Star size={17}/><span>Presets</span></button><button className="tool-icon" title="View recent activity" onClick={()=>setShowHistory(v=>!v)}><Clock3 size={17}/></button></div></div>
       {showPresets&&<div className="preset-panel"><div className="small-heading">SAVED PRESETS <button onClick={()=>setShowPresets(false)} aria-label="Close presets"><X size={14}/></button></div><div className="preset-form"><input placeholder="Preset name" aria-label="Preset name" value={presetName} onChange={e=>setPresetName(e.target.value)}/><button className="button small primary" onClick={savePreset}><Star size={14}/> Save</button></div>{stored.presets.length?stored.presets.map(p=><div key={p.id} className="preset"><button onClick={()=>loadPreset(p)}><Star size={13}/>{p.name}</button><button title="Delete preset" onClick={()=>setStored(s=>({...s,presets:s.presets.filter(x=>x.id!==p.id)}))}><X size={15}/></button></div>):<p className="muted">No favorites saved yet.</p>}</div>}
       {showHistory&&<div className="preset-panel"><div className="small-heading">RECENT ACTIVITY <button onClick={()=>setShowHistory(false)} aria-label="Close history"><X size={14}/></button></div>{stored.history.length?stored.history.map(h=><p className="history-line" key={h.id}>{h.action} · {h.count} file(s) <small>{isoDate(h.time)}</small></p>):<p className="muted">No activity yet. Audio files and downloads are not stored here.</p>}<button className="text-action" onClick={()=>setStored(s=>({...s,history:[]}))}>Clear history</button></div>}
       <Details active={batch?null:selectedFile} values={values} setValues={setValues} cover={cover} setCover={setCover} removeCover={removeCover} setRemoveCover={setRemoveCover} query={query} setQuery={setQuery} group={group} setGroup={setGroup} customTags={customTags} setCustomTags={setCustomTags}/>
     </>:<div className="converter-options"><span className="section-overline">CONVERSION SETTINGS</span><h3>Choose your output.</h3><p>Select the format and bitrate. Original files are never modified.</p><div className="conversion-grid"><label className="field"><span>Output format</span><select value={format} disabled={running} onChange={e=>setFormat(e.target.value)}>{OUTPUT_FORMATS.map(f=><option key={f.value} value={f.value}>{f.label}</option>)}</select></label><label className="field"><span>Audio bitrate</span><select value={bitrate} disabled={running||['wav','flac'].includes(format)} onChange={e=>setBitrate(e.target.value)}>{['96','128','160','192','256','320'].map(b=><option key={b} value={b}>{b} kbps</option>)}</select></label></div><div className="converter-tip"><Info size={17}/><span>MP3, M4A, OGG and Opus use lossy encoding. WAV and FLAC are lossless output formats; the source's lost detail cannot be recovered.</span></div></div>}
     {files.some(f=>['reading','working','done','error'].includes(f.status))&&<div className="progress-stack"><div className="small-heading">FILE PROGRESS <span>{completed}/{files.length} complete</span></div>{files.filter(f=>f.status!=='ready').map(f=><Progress key={f.id} entry={f}/>)}</div>}
     <div className="bottom-actions"><div className="ready-count"><span className="ready-dot"/>{countReady} of {files.length} files ready</div><div className="action-buttons">{running?<button className="button outline" onClick={()=>{cancelRef.current=true;setCurrentStep('Finishing current file before stopping');}}>Stop after current file</button>:<button className="button primary" disabled={countReady===0} onClick={processFiles}>{tab==='tags'?<Save size={16}/>:<WandSparkles size={16}/>} {tab==='tags'?'Save edited files':'Convert files'} <ArrowRight size={16}/></button>}</div></div>
     {currentStep&&<p className="working-note"><Activity size={14}/>{currentStep}</p>}
     {results.length>0&&<div className="download-panel"><div><strong><Check size={17}/> {results.length} file{results.length>1?'s':''} ready</strong><p>Processed locally. Save the results to your device.</p></div><button className="button dark" onClick={downloadAll}><ArrowDownToLine size={17}/>{results.length===1?'Download file':'Download ZIP'}</button><div className="individual-links">{results.map(f=><button key={f.id} onClick={()=>saveBlob(f.blob,f.name)}><ArrowDownToLine size={13}/>{f.name}</button>)}</div></div>}
   </>}{error&&<div className="error-banner" role="alert">{error}<button aria-label="Dismiss error" onClick={()=>setError('')}><X size={15}/></button></div>}</div></div></section>
   <section className="benefits shell" aria-label="Our principles">{benefits.map(({icon:Icon,title,text})=><div key={title}><Icon size={24} strokeWidth={1.4}/><h3>{title}</h3><p>{text}</p></div>)}</section>
   <section className="about shell" id="how-it-works"><div><span className="section-overline">HOW IT WORKS</span><h2>Online convenience.<br/><em>Offline peace of mind.</em></h2><p>Audio Quick Tools is a free browser-based MP3 tag editor and audio converter built around privacy. Select your files, make your changes, and download the result. Your files are processed locally in your browser, not on a remote audio processing server.</p><p>Use the advanced metadata editor for track titles, artist names, albums, composer credits, lyrics, cover art and more. Save frequently used values as starred presets, or edit multiple tracks in one session.</p></div><div className="about-steps"><div><b>01</b><span><strong>Choose files</strong><small>Select multiple files or drop them directly into the workspace.</small></span></div><div><b>02</b><span><strong>Edit or convert</strong><small>Modify metadata or choose a new audio format and bitrate.</small></span></div><div><b>03</b><span><strong>Download locally</strong><small>Get individual files or package processed files in a ZIP.</small></span></div></div></section>
   <section className="faq shell" id="faq"><span className="section-overline">GOOD TO KNOW</span><h2>Frequently asked questions.</h2><div>{FAQ.map(([q,a])=><details key={q}><summary>{q}<Plus size={18}/></summary><p>{a}</p></details>)}</div></section>
  </main><footer className="footer"><div className="shell footer-content"><div><strong>audio.quicktools</strong><p>Useful audio tools. Respectful of your privacy.</p></div><div><a href="#top">Back to top</a><a href="#how-it-works">How it works</a><a href="#faq">FAQs</a><a href="/privacy.html">Privacy</a></div><small>© {new Date().getFullYear()} Audio Quick Tools. Made for your browser.</small></div></footer>
 </>;
}
