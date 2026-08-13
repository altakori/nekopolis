import { describe,it,expect } from 'vitest';
import {initialState,build,step,connected} from './simulation';
describe('simulation',()=>{
 it('builds and charges',()=>{const s=initialState(),n=build(s,'plant',1)!;expect(n.grid[1]?.kind).toBe('plant');expect(n.resources.coins).toBe(450);expect(n.log[0]).toContain('건설')});
 it('power network connects through wire',()=>{const s=initialState();s.grid[0]={kind:'plant',age:0};s.grid[1]={kind:'wire',age:0};expect(connected(s.grid,['plant','wire'],['plant']).has(1)).toBe(true)});
 it('production exposes rates and consumes input',()=>{let s=initialState();s.grid[0]={kind:'plant',age:0};s.grid[1]={kind:'wire',age:0};s.grid[2]={kind:'intake',age:0};s.grid[3]={kind:'pipe',age:0};s.grid[4]={kind:'field',age:0};for(let i=0;i<3;i++)s=step(s);expect(s.resources.power).toBeGreaterThan(0);expect(s.resources.water).toBeGreaterThan(0);expect(s.rates.power).toBeGreaterThan(0)});
});
