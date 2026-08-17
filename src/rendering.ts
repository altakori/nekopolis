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

export type RoadTopologyKind='isolated'|'dead-end'|'straight'|'corner'|'t-junction'|'cross';
export type RoadTopology={mask:number;degree:number;kind:RoadTopologyKind;north:boolean;east:boolean;south:boolean;west:boolean};

/** Cardinal road mask: N=1, E=2, S=4, W=8. Pure and shared by both renderers. */
export function cardinalRoadTopology(cell:number,roads:ReadonlySet<number>,width:number,height:number,externalWest=false):RoadTopology{
 const x=cell%width,y=Math.floor(cell/width),north=y>0&&roads.has(cell-width),east=x+1<width&&roads.has(cell+1),south=y+1<height&&roads.has(cell+width),west=x>0&&roads.has(cell-1)||(externalWest&&x===0);
 const mask=(north?1:0)|(east?2:0)|(south?4:0)|(west?8:0),degree=Number(north)+Number(east)+Number(south)+Number(west);
 const kind:RoadTopologyKind=degree===0?'isolated':degree===1?'dead-end':degree===2?((north&&south)||(east&&west)?'straight':'corner'):degree===3?'t-junction':'cross';
 return{mask,degree,kind,north,east,south,west};
}

export function roadFacingDoor(road:number,edgeCell:number,width:number){
 const roadX=road%width,roadY=Math.floor(road/width),cellX=edgeCell%width,cellY=Math.floor(edgeCell/width);
 return{x:(roadX+cellX)/2,y:(roadY+cellY)/2};
}

export function routeWithDwell(raw:number,dwell:number){
 const cycle=2+dwell*2,phase=((raw%cycle)+cycle)%cycle;
 if(phase<dwell)return{progress:0,moving:false};
 if(phase<dwell+1)return{progress:phase-dwell,moving:true};
 if(phase<dwell*2+1)return{progress:1,moving:false};
 return{progress:1-(phase-dwell*2-1),moving:true};
}
