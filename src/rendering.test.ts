import {describe,expect,it} from 'vitest';
import {canvasDpr,nextRenderQuality,renderBudget,targetFrameMs} from './rendering';

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
});
