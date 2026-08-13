import {describe,it,expect} from 'vitest';
import {W,initialState,build,bulldoze,step,dragLine,utilityConnected,footprintCells,idx,type State,type BuildingKind} from './simulation';

const empty=()=>{const s=initialState();s.grid.fill(null);return s};
const put=(s:State,kind:BuildingKind,x:number,y:number)=>{const i=idx(x,y);s.grid[i]={kind,age:0,anchor:i};return i};
const runCycle=(s:State)=>{for(let i=0;i<3;i++)s=step(s);return s};
/** Complete shared backbone: power across top, powered intake, raw-water pipe, powered purifier. */
const utilities=()=>{const s=empty();put(s,'plant',0,0);for(let x=1;x<=6;x++)put(s,'wire',x,0);put(s,'wire',5,1);put(s,'wire',5,2);put(s,'wire',6,1);put(s,'wire',6,2);put(s,'intake',2,1);put(s,'pipe',3,1);put(s,'pipe',4,1);put(s,'purifier',4,2);return s};

describe('construction and geometry',()=>{
 it('builds a 2x2 anchored facility, charges once, and bulldozes from any part',()=>{const s=empty(),n=build(s,'plant',idx(2,2))!;expect(footprintCells(idx(2,2),2)).toEqual([idx(2,2),idx(3,2),idx(2,3),idx(3,3)]);expect(n.grid[idx(3,3)]?.anchor).toBe(idx(2,2));expect(n.resources.coins).toBe(810);const gone=bulldoze(n,idx(3,3));expect(gone.grid.filter(Boolean)).toHaveLength(0)});
 it('rejects wrapped, occupied, and unaffordable footprints',()=>{const s=empty();expect(build(s,'plant',idx(W-1,2))).toBeUndefined();put(s,'road',3,3);expect(build(s,'dorm',idx(2,2))).toBeUndefined();s.resources.coins=0;expect(build(s,'road',idx(1,1))).toBeUndefined()});
 it('interpolates continuous drag paths without duplicates',()=>{expect(dragLine(0,42)).toEqual([0,21,42]);expect(new Set(dragLine(0,42)).size).toBe(3)});
});

describe('network semantics',()=>{
 it('roads never conduct electricity',()=>{const s=empty();put(s,'plant',0,0);put(s,'road',1,0);const wire=put(s,'wire',2,0);expect(utilityConnected(s.grid,'wire',['plant']).has(wire)).toBe(false)});
 it('a continuous wire serves an adjacent building endpoint but not through it',()=>{const s=empty();put(s,'plant',0,0);put(s,'wire',1,0);put(s,'wire',2,0);const factory=put(s,'feed',3,0),farWire=put(s,'wire',4,0);const served=utilityConnected(s.grid,'wire',['plant']);expect(served.has(factory)).toBe(true);expect(served.has(farWire)).toBe(false)});
 it('pipes and wires remain separate networks',()=>{const s=empty();put(s,'intake',0,0);put(s,'wire',1,0);const pipe=put(s,'pipe',2,0);expect(utilityConnected(s.grid,'pipe',['intake']).has(pipe)).toBe(false)});
});

describe('interacting city economy',()=>{
 it('does not produce clean water without powered intake and purifier chain',()=>{let s=empty();put(s,'intake',0,0);put(s,'pipe',1,0);put(s,'purifier',2,0);s=runCycle(s);expect(s.rates.water).toBe(0);expect(s.resources.water).toBe(0)});
 it('calculates power capacity and clean water through independently connected utilities',()=>{let s=runCycle(utilities());expect(s.rates.power).toBe(24);expect(s.rates.water).toBe(12);expect(s.resources.power).toBe(18);expect(s.resources.water).toBe(12)});
 it('blocks a field without road, then produces when road and clean pipe serve it',()=>{let s=utilities();put(s,'pipe',4,3);const field=put(s,'field',3,3);s=runCycle(s);expect(s.diagnostics[field].bottleneck).toBe('도로 접근 없음');const before=s.resources.catnip;put(s,'road',3,4);s=runCycle(s);expect(s.resources.catnip).toBe(before+3);expect(s.diagnostics[field].online).toBe(true)});
 it('feed factory consumes catnip and reports its bottleneck when stock is gone',()=>{let s=utilities();s.resources.population=10;s.resources.catnip=3;put(s,'pipe',4,3);put(s,'pipe',5,3);const factory=put(s,'feed',6,3);put(s,'road',6,4);s=runCycle(s);expect(s.resources.feed).toBe(4);expect(s.resources.catnip).toBe(0);s=runCycle(s);expect(s.diagnostics[factory].bottleneck).toBe('캣닢 원료 부족')});
 it('population is capped by both housing and food support',()=>{let s=utilities();s.resources.population=4;s.resources.feed=20;put(s,'pipe',4,3);put(s,'pipe',5,3);put(s,'dorm',6,3);put(s,'road',6,4);s=runCycle(s);expect(s.resources.population).toBe(5);s.resources.feed=0;s=runCycle(s);expect(s.resources.population).toBe(4)});
});
