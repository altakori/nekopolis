import {initialState,migrateState,type State} from './simulation';

export const CANONICAL_SAVE_KEY='nekopolis-shared-save';
export const LEGACY_SAVE_KEYS=['nekopolis-save','nekopolis-v2-save'] as const;

export interface SaveStorage{getItem(key:string):string|null;setItem(key:string,value:string):void}

function parse(storage:SaveStorage,key:string):State|null{
  try{const raw=storage.getItem(key);return raw?migrateState(JSON.parse(raw)):null}catch{return null}
}

/** Read one shared state. A valid canonical save always wins over legacy slots. */
export function loadSharedState(storage:SaveStorage):State{
  const canonical=parse(storage,CANONICAL_SAVE_KEY);
  if(canonical)return canonical;
  const legacy=LEGACY_SAVE_KEYS.map((key,index)=>({state:parse(storage,key),index})).filter((entry):entry is {state:State;index:number}=>entry.state!==null);
  if(!legacy.length)return initialState();
  // If both old surfaces exist, retain the one with the furthest simulation tick.
  return legacy.sort((a,b)=>b.state.tick-a.state.tick||a.index-b.index)[0].state;
}

export function saveSharedState(storage:SaveStorage,state:State):void{
  storage.setItem(CANONICAL_SAVE_KEY,JSON.stringify(state));
}

/** Migrate a legacy-only browser once, without overwriting an existing canonical save. */
export function migrateSharedState(storage:SaveStorage):State{
  const state=loadSharedState(storage);
  if(!parse(storage,CANONICAL_SAVE_KEY))saveSharedState(storage,state);
  return state;
}
