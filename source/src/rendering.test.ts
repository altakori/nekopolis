import {describe,expect,it} from 'vitest';
import {canvasDpr,cardinalRoadTopology,facilityWarningBadges,nextRenderQuality,renderBudget,roadFacingDoor,routeWithDwell,sharedDriveways,sidewalkSlabs,targetFrameMs} from './rendering';

describe('render budget',()=>{
 it('caps high-density mobile canvases at DPR 1.5',()=>{
  expect(canvasDpr(390,3)).toBe(1.5);
  expect(canvasDpr(720,2)).toBe(1.5);
 });
 it('caps desktop canvases at DPR 2 without upscaling low-DPR screens',()=>{
  expect(canvasDpr(1440,3)).toBe(2);
  expect(canvasDpr(1440,1)).toBe(1);
 });
 it('uses a bounded background budget and a responsive interaction budget',()=>{expect(targetFrameMs('balanced')).toBe(33);expect(targetFrameMs('low')).toBe(36);expect(targetFrameMs('low',true)).toBe(16)});
 it('uses a mobile safety band and hysteresis before recovering',()=>{
  expect(nextRenderQuality('high',27,false)).toBe('balanced');
  expect(nextRenderQuality('balanced',26,true)).toBe('low');
  expect(nextRenderQuality('balanced',29.4,true)).toBe('low');
  expect(nextRenderQuality('balanced',29.5,true)).toBe('balanced');
  expect(nextRenderQuality('balanced',28,false)).toBe('balanced');
  expect(nextRenderQuality('low',30,true)).toBe('low');
  expect(nextRenderQuality('low',31,true)).toBe('low');
  expect(nextRenderQuality('low',31,false)).toBe('balanced');
  expect(nextRenderQuality('balanced',31,true)).toBe('balanced');
 });
 it('keeps a bounded living-city population at each quality tier',()=>{
  expect(renderBudget('high',30)).toEqual({cats:16,carts:4,utilityPulses:3});
  expect(renderBudget('balanced',30)).toEqual({cats:10,carts:3,utilityPulses:2});
  expect(renderBudget('low',30)).toEqual({cats:3,carts:1,utilityPulses:1});
  expect(renderBudget('high',3).cats).toBe(3);
 });
 it('maps simultaneous shortages to ordered resource-specific warning badges',()=>{
  expect(facilityWarningBadges(['power','water','labor','road','input'])).toEqual([
   {kind:'power',symbol:'⚡!',color:'#d9a900'},
   {kind:'water',symbol:'💧!',color:'#278bc1'},
   {kind:'labor',symbol:'🐈!',color:'#b86542'},
   {kind:'road',symbol:'🛣!',color:'#756554'},
   {kind:'input',symbol:'📦!',color:'#8f596c'},
  ]);
 });
 it('classifies cardinal road masks for every intersection shape',()=>{
  const roads=new Set([2,5,6,9,10,11,14,17]);
  expect(cardinalRoadTopology(5,roads,4,5).kind).toBe('corner');
  expect(cardinalRoadTopology(6,roads,4,5)).toMatchObject({mask:13,degree:3,kind:'t-junction'});
  expect(cardinalRoadTopology(10,roads,4,5)).toMatchObject({mask:15,degree:4,kind:'cross'});
  expect(cardinalRoadTopology(0,new Set([0]),4,5,true)).toMatchObject({mask:8,degree:1,kind:'dead-end'});
 });
 it('places a facility door on the boundary between its road and edge cell',()=>{
  expect(roadFacingDoor(25,26,24)).toEqual({x:1.5,y:1});
  expect(roadFacingDoor(49,25,24)).toEqual({x:1,y:1.5});
 });
 it('returns one deterministic cardinal driveway on the exact footprint boundary',()=>{
  const width=8,height=6,grid=Array(width*height).fill(null) as any[];grid[18]={kind:'field',age:0,anchor:18,level:1};grid[17]={kind:'road',age:0,anchor:17,level:1};grid[26]={kind:'road',age:0,anchor:26,level:1};
  const first=sharedDriveways(grid,width,height),second=sharedDriveways(grid,width,height);expect(first).toEqual(second);expect(first[0]).toMatchObject({anchor:18,kind:'field',road:17,roadCenter:{x:1,y:2},door:{x:1.5,y:2},doorGrid:{x:2,y:2}});
 });
 it('uses a 2x2 edge cell and rejects diagonal-only roads',()=>{
  const width=8,height=6,grid=Array(width*height).fill(null) as any[];grid[27]={kind:'hall',age:0,anchor:27,level:1};grid[19]={kind:'road',age:0,anchor:19,level:1};
  expect(sharedDriveways(grid,width,height)[0]).toMatchObject({road:19,door:{x:3,y:2.5},doorGrid:{x:3,y:3}});
  const diagonal=Array(width*height).fill(null) as any[];diagonal[18]={kind:'hall',age:0,anchor:18,level:1};diagonal[9]={kind:'road',age:0,anchor:9,level:1};expect(sharedDriveways(diagonal,width,height)).toEqual([]);
 });
 it('holds at both doors and moves continuously in both directions',()=>{
  expect(routeWithDwell(.1,.2)).toEqual({progress:0,moving:false});
  expect(routeWithDwell(.7,.2).progress).toBeCloseTo(.5);
  expect(routeWithDwell(1.3,.2)).toEqual({progress:1,moving:false});
  const returning=routeWithDwell(1.9,.2);expect(returning.moving).toBe(true);expect(returning.progress).toBeCloseTo(.5);
 });
});

describe('sidewalk rendering geometry',()=>{it('keeps four pedestrian slabs beside every road and extends connected edges',()=>{const isolated=sidewalkSlabs({mask:0,degree:0,kind:'isolated',north:false,east:false,south:false,west:false});expect(isolated).toHaveLength(4);const corner=sidewalkSlabs({mask:3,degree:2,kind:'corner',north:true,east:true,south:false,west:false});expect(corner.length).toBeGreaterThan(isolated.length);expect(corner.every(s=>s.width>0&&s.depth>0)).toBe(true)})});
