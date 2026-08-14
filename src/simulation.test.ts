import {describe,it,expect} from 'vitest';
import {W,EXTERNAL_ROAD,initialState,build,buildLinear,buildIssue,bulldoze,step,dragLine,lineBuildCost,utilityConnected,footprintCells,idx,migrateState,hallUpgradeIssue,upgradeHall,type State,type BuildingKind} from './simulation';

const empty=()=>{const s=initialState();s.grid.fill(null);return s};
const put=(s:State,kind:BuildingKind,x:number,y:number)=>{const i=idx(x,y);s.grid[i]={kind,age:0,anchor:i,level:1};return i};
const link=(s:State,kind:'wire'|'pipe',ax:number,ay:number,bx:number,by:number)=>{const segment={a:idx(ax,ay),b:idx(bx,by)};s.utilities[kind].push(segment);return segment};
const roadTo=(s:State,x:number,y:number)=>{put(s,'road',0,8);for(let xx=1;xx<=x;xx++)put(s,'road',xx,8);for(let yy=7;yy>=y;yy--)put(s,'road',x,yy)};
const runCycle=(s:State)=>{for(let i=0;i<3;i++)s=step(s);return s};
/** Complete vector backbone: plant → intake → purifier, with a separate raw-water segment. */
const utilities=()=>{const s=empty();put(s,'plant',0,0);put(s,'intake',2,1);put(s,'purifier',4,2);link(s,'wire',0,0,2,1);link(s,'wire',2,1,4,2);link(s,'pipe',2,1,4,2);return s};

describe('construction and geometry',()=>{
 it('keeps the outside-city gateway road as permanent infrastructure',()=>{const s=initialState(),n=bulldoze(s,EXTERNAL_ROAD);expect(n.grid[EXTERNAL_ROAD]?.kind).toBe('road');expect(n).toBe(s)});
 it('builds a 2x2 anchored facility, charges once, and bulldozes from any part',()=>{const s=empty(),n=build(s,'plant',idx(2,2))!;expect(footprintCells(idx(2,2),2)).toEqual([idx(2,2),idx(3,2),idx(2,3),idx(3,3)]);expect(n.grid[idx(3,3)]?.anchor).toBe(idx(2,2));expect(n.resources.coins).toBe(810);const gone=bulldoze(n,idx(3,3));expect(gone.grid.filter(Boolean)).toHaveLength(0)});
 it('rejects wrapped, occupied, and unaffordable footprints',()=>{const s=empty();expect(build(s,'plant',idx(W-1,2))).toBeUndefined();put(s,'road',3,3);expect(build(s,'dorm',idx(2,2))).toBeUndefined();s.resources.coins=0;expect(build(s,'road',idx(1,1))).toBeUndefined()});
 it('interpolates continuous drag paths without duplicates',()=>{expect(dragLine(0,42)).toEqual([0,21,42]);expect(new Set(dragLine(0,42)).size).toBe(3)});
 it('prices a straight utility by endpoint distance and rounds down',()=>{const path=dragLine(idx(0,0),idx(2,2));expect(lineBuildCost('wire',path)).toBe(5);const built=buildLinear(empty(),'wire',path)!;expect(built.resources.coins).toBe(895);expect(built.utilities.wire).toEqual([{a:idx(0,0),b:idx(2,2)}]);expect(built.grid.filter(Boolean)).toHaveLength(0)});
 it('passes straight utilities through facilities and crossing utility layers',()=>{let s=empty();put(s,'plant',1,1);link(s,'pipe',0,1,3,1);s=buildLinear(s,'wire',dragLine(idx(0,0),idx(3,3)))!;expect(s.utilities.wire).toEqual([{a:idx(0,0),b:idx(3,3)}]);expect(s.utilities.pipe).toHaveLength(1);expect(s.grid[idx(1,1)]?.kind).toBe('plant')});
});

describe('network semantics',()=>{
 it('roads never conduct electricity',()=>{const s=empty();put(s,'plant',0,0);put(s,'road',1,0);link(s,'wire',2,0,3,0);expect(utilityConnected(s.grid,s.utilities.wire,['plant']).size).toBe(0)});
 it('shared segment endpoints conduct but geometric crossings do not',()=>{const s=empty();put(s,'plant',0,1);link(s,'wire',0,2,4,2);link(s,'wire',4,2,4,3);link(s,'wire',2,0,2,4);const factory=put(s,'feed',4,4),crossed=put(s,'workshop',2,3),served=utilityConnected(s.grid,s.utilities.wire,['plant']);expect(served.has(factory)).toBe(true);expect(served.has(crossed)).toBe(false)});
 it('pipe and wire crossings stay electrically independent',()=>{const s=empty();put(s,'plant',0,0);put(s,'intake',2,3);link(s,'wire',0,0,4,2);link(s,'pipe',2,3,2,0);const live=utilityConnected(s.grid,s.utilities.wire,['plant']),wet=utilityConnected(s.grid,s.utilities.pipe,['intake']);expect(live.has(idx(2,3))).toBe(false);expect(wet.has(idx(4,2))).toBe(false)});
 it('reports a purifier raw-water break instead of a generic healthy state',()=>{let s=utilities();s.utilities.pipe=[];s=runCycle(s);expect(s.diagnostics[idx(4,2)].bottleneck).toBe('원수관 미연결');expect(s.rates.water).toBe(0)});
});

describe('interacting city economy',()=>{
 it('does not produce clean water without powered intake and purifier chain',()=>{let s=empty();put(s,'intake',0,0);put(s,'purifier',2,0);link(s,'pipe',0,0,2,0);s=runCycle(s);expect(s.rates.water).toBe(0);expect(s.resources.water).toBe(0)});
 it('calculates power capacity and clean water through independently connected utilities',()=>{let s=runCycle(utilities());expect(s.rates.power).toBe(24);expect(s.rates.water).toBe(12);expect(s.resources.power).toBe(18);expect(s.resources.water).toBe(12)});
 it('does not count a plant without an adjacent connected wire',()=>{let s=utilities();put(s,'plant',15,10);s=runCycle(s);expect(s.rates.power).toBe(24);expect(s.resources.power).toBe(18)});
 it('blocks a field without external road, then produces when the gateway reaches it',()=>{let s=utilities();const field=put(s,'field',3,3);link(s,'pipe',4,2,3,3);s=runCycle(s);expect(s.diagnostics[field].bottleneck).toBe('도로 접근 없음');const before=s.resources.catnip;roadTo(s,3,4);s=runCycle(s);expect(s.resources.catnip).toBe(before+3);expect(s.diagnostics[field].online).toBe(true)});
 it('feed production is followed by real citizen food consumption',()=>{let s=utilities();s.resources.population=10;s.resources.catnip=3;const factory=put(s,'feed',6,3);put(s,'dorm',8,3);link(s,'wire',4,2,6,3);link(s,'pipe',4,2,6,3);roadTo(s,8,4);s=runCycle(s);expect(s.resources.feed).toBe(1);expect(s.resources.catnip).toBe(0);const beforePopulation=s.resources.population;s=runCycle(s);expect(s.resources.feed).toBe(1);expect(s.resources.population).toBeLessThan(beforePopulation);expect(s.diagnostics[factory].bottleneck).toBe('캣닢 원료 부족')});
 it('separates hall capacity from labor granted by an externally connected dorm',()=>{let s=utilities();s.resources.population=4;s.resources.feed=20;put(s,'hall',10,10);put(s,'dorm',6,3);link(s,'wire',4,2,6,3);link(s,'pipe',4,2,6,3);s=runCycle(s);expect(s.resources.capacity).toBe(8);expect(s.resources.labor).toBe(2);expect(s.resources.population).toBe(4);roadTo(s,6,4);s=runCycle(s);expect(s.resources.population).toBe(5);expect(s.resources.labor).toBe(4);s.resources.feed=0;s=runCycle(s);expect(s.resources.population).toBe(4)});
});

describe('save migration',()=>{
 it('normalizes malformed scalar and resource values',()=>{const migrated=migrateState({grid:Array(W*14).fill(null),resources:{coins:'oops',population:-4,happiness:999},speed:99,tick:-2,day:'bad',paused:'yes'});expect(migrated.resources.coins).toBe(900);expect(migrated.resources.population).toBe(0);expect(migrated.resources.happiness).toBe(100);expect(migrated.speed).toBe(3);expect(migrated.tick).toBe(0);expect(migrated.day).toBe(1);expect(migrated.paused).toBe(false)});
 it('moves legacy grid utilities into vector layers and frees their tiles',()=>{const old=Array(W*14).fill(null);old[idx(1,1)]={kind:'wire',age:0,anchor:idx(1,1)};old[idx(2,1)]={kind:'wire',age:0,anchor:idx(2,1)};const migrated=migrateState({grid:old});expect(migrated.grid[idx(1,1)]).toBeNull();expect(migrated.grid[idx(2,1)]).toBeNull();expect(migrated.utilities.wire).toContainEqual({a:idx(1,1),b:idx(2,1)})});
});

describe('cohesive progression and fair connections',()=>{
 it('locks later contracts and requires a real riverbank for new intakes',()=>{const s=empty();expect(buildIssue(s,'field',idx(4,4))).toContain('2단계');expect(buildIssue(s,'intake',idx(2,8))).toContain('강변');expect(buildIssue(s,'intake',idx(13,2))).toBe('')});
 it('serves a 2x2 facility when vector endpoints reach non-anchor footprint edges',()=>{let s=utilities();s.stage=3;s.resources.population=6;s.resources.feed=20;s=build(s,'dorm',idx(6,3))!;link(s,'wire',4,2,7,4);link(s,'pipe',4,2,7,4);roadTo(s,7,5);s=runCycle(s);expect(s.diagnostics[idx(6,3)].powered).toBe(true);expect(s.diagnostics[idx(6,3)].watered).toBe(true);expect(s.diagnostics[idx(6,3)].roaded).toBe(true)});
 it('counts a power plant connected along a non-anchor footprint edge',()=>{let s=empty();s=build(s,'plant',idx(2,2))!;link(s,'wire',4,3,5,3);s=runCycle(s);expect(s.rates.power).toBe(24);expect(s.diagnostics[idx(2,2)].powered).toBe(true)});
 it('keeps contract progress monotonic after capacity changes',()=>{let s=utilities();s=runCycle(s);expect(s.stage).toBe(2);s.grid.fill(null);s=runCycle(s);expect(s.stage).toBe(2);expect(migrateState(s).stage).toBe(2)});
 it('changes production allocation when the work policy changes',()=>{let balanced=utilities();balanced.resources.population=3;balanced.resources.catnip=3;put(balanced,'field',3,3);put(balanced,'feed',6,3);put(balanced,'dorm',8,3);roadTo(balanced,3,4);roadTo(balanced,8,4);link(balanced,'wire',4,2,6,3);link(balanced,'pipe',4,2,3,3);link(balanced,'pipe',4,2,6,3);let food=structuredClone(balanced);food.workPolicy='food';balanced=runCycle(balanced);food=runCycle(food);expect(balanced.rates.catnip).toBe(3);expect(balanced.rates.feed||0).toBe(0);expect(food.rates.feed).toBe(2);expect(food.rates.catnip||0).toBe(0)});
 it('requires live utilities, external road, labor and coins before hall upgrade',()=>{let s=utilities();s.stage=3;s.resources.feed=20;s=build(s,'hall',idx(6,3))!;expect(hallUpgradeIssue(s,idx(6,3))).toContain('전력망');link(s,'wire',4,2,6,3);link(s,'pipe',4,2,6,3);s=build(s,'dorm',idx(9,3))!;link(s,'wire',4,2,9,3);link(s,'pipe',4,2,9,3);roadTo(s,9,5);roadTo(s,7,5);s=runCycle(s);expect(s.grid[EXTERNAL_ROAD]?.kind).toBe('road');expect(hallUpgradeIssue(s,idx(6,3))).toBe('');const upgraded=upgradeHall(s,idx(6,3))!;expect(footprintCells(idx(6,3),2).every(i=>upgraded.grid[i]?.level===2)).toBe(true);expect(upgraded.resources.capacity).toBe(s.resources.capacity+4)});
});
