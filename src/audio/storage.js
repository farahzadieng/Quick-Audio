const KEY='aqt-user-v1';
export function loadSettings(){try{const s=JSON.parse(localStorage.getItem(KEY)||'{}');return {presets:Array.isArray(s.presets)?s.presets:[],history:Array.isArray(s.history)?s.history:[],theme:s.theme||'light'};}catch{return {presets:[],history:[],theme:'light'};}}
export function saveSettings(settings){localStorage.setItem(KEY,JSON.stringify(settings));}
export function appendHistory(history,event){return [{...event,id:crypto.randomUUID(),time:new Date().toISOString()},...history].slice(0,40);}
