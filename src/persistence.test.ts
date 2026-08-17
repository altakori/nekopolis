import {describe,it,expect} from 'vitest';
import {CANONICAL_SAVE_KEY,LEGACY_SAVE_KEYS,loadSharedState,migrateSharedState,saveSharedState,type SaveStorage} from './persistence';
import {initialState} from './simulation';

type MemoryStorage=SaveStorage&{data:Record<string,string|undefined>};
const storage=():MemoryStorage=>({data:{},getItem(key){return this.data[key]??null},setItem(key,value){this.data[key]=value}});
const encoded=(tick:number,coins:number)=>JSON.stringify({...initialState(),tick,resources:{...initialState().resources,coins}});

describe('shared page save persistence',()=>{
 it('migrates a 2D-only legacy save into the canonical key',()=>{const s=storage();s.data[LEGACY_SAVE_KEYS[0]]=encoded(7,701);const loaded=migrateSharedState(s);expect(loaded.tick).toBe(7);expect(loaded.resources.coins).toBe(701);expect(s.data[CANONICAL_SAVE_KEY]).toBeTruthy()});
 it('migrates a 3D-only legacy save when no 2D save exists',()=>{const s=storage();s.data[LEGACY_SAVE_KEYS[1]]=encoded(9,709);expect(migrateSharedState(s).tick).toBe(9);expect(JSON.parse(s.data[CANONICAL_SAVE_KEY]!).resources.coins).toBe(709)});
 it('prefers canonical state over stale legacy data',()=>{const s=storage();s.data[CANONICAL_SAVE_KEY]=encoded(20,820);s.data[LEGACY_SAVE_KEYS[0]]=encoded(99,899);expect(loadSharedState(s)).toMatchObject({tick:20,resources:{coins:820}});expect(JSON.parse(s.data[CANONICAL_SAVE_KEY]!).resources.coins).toBe(820)});
 it('chooses the furthest legacy tick when both legacy pages exist',()=>{const s=storage();s.data[LEGACY_SAVE_KEYS[0]]=encoded(4,704);s.data[LEGACY_SAVE_KEYS[1]]=encoded(6,706);expect(loadSharedState(s)).toMatchObject({tick:6,resources:{coins:706}})});
 it('round-trips simulation fields through the shared save',()=>{const s=storage(),state=initialState();state.tick=33;state.paused=true;state.speed=3;state.stage=3;state.workPolicy='materials';state.utilities.wire.push({a:1,b:8});state.resources.coins=432;saveSharedState(s,state);const loaded=loadSharedState(s);expect(loaded).toMatchObject({tick:33,paused:true,speed:3,stage:3,workPolicy:'materials',resources:{coins:432},utilities:{wire:[{a:1,b:8}]}})});
});
