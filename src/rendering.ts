import type{WarningKind}from'./simulation';

export type RenderQuality='high'|'balanced'|'low';
export type WarningBadge={kind:WarningKind;symbol:string;color:string};
const WARNING_BADGES:Record<WarningKind,Omit<WarningBadge,'kind'>>={power:{symbol:'⚡!',color:'#d9a900'},water:{symbol:'💧!',color:'#278bc1'},labor:{symbol:'🐈!',color:'#b86542'},road:{symbol:'🛣!',color:'#756554'},input:{symbol:'📦!',color:'#8f596c'}};
export const facilityWarningBadges=(warnings:WarningKind[]):WarningBadge[]=>warnings.map(kind=>({kind,...WARNING_BADGES[kind]}));

export const targetFrameMs=(quality:RenderQuality,interactive=false)=>interactive?16:quality==='low'?36:33;

export const canvasDpr=(cssWidth:number,deviceDpr:number)=>Math.min(Math.max(1,deviceDpr||1),cssWidth<=720?1.5:2);

export function nextRenderQuality(current:RenderQuality,fps:number,mobile:boolean):RenderQuality{
 if(current==='high'&&fps<28)return'balanced';
 if(current==='balanced'&&mobile&&fps<29.5)return'low';
 if(current==='balanced'&&!mobile&&fps<27)return'low';
 if(current==='low'&&!mobile&&fps>30.5)return'balanced';
 if(current==='balanced'&&!mobile&&fps>30.5)return'high';
 return current;
}

export function renderBudget(quality:RenderQuality,population:number){
 const caps={high:{cats:16,carts:4,utilityPulses:3},balanced:{cats:10,carts:3,utilityPulses:2},low:{cats:3,carts:1,utilityPulses:1}} as const;
 const budget=caps[quality];
 return{...budget,cats:Math.min(Math.max(0,Math.floor(population)),budget.cats)};
}
