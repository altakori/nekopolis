export type AudioCue='select'|'build'|'utility'|'success'|'error'|'demolish'|'toggle';
export type AudioMode='all'|'sfx'|'muted';

const STORAGE_KEY='nekopolis-audio-settings';
const AUDIO_FILES={
  music:'audio/bgm-happy-town.mp3',
  select:'audio/ui-select.ogg',
  build:'audio/build.ogg',
  utility:'audio/utility.ogg',
  success:'audio/success.ogg',
  error:'audio/error.ogg',
  demolish:'audio/demolish.ogg',
  toggle:'audio/toggle.ogg',
}as const;
const CUE_GAIN:Record<AudioCue,number>={select:.34,build:.52,utility:.45,success:.5,error:.42,demolish:.48,toggle:.38};
const CUE_COOLDOWN:Record<AudioCue,number>={select:45,build:70,utility:85,success:120,error:120,demolish:100,toggle:80};

function loadMode():AudioMode{try{const parsed=JSON.parse(localStorage.getItem(STORAGE_KEY)||'null')as{mode?:unknown}|null;return parsed?.mode==='sfx'||parsed?.mode==='muted'?parsed.mode:'all'}catch{return'all'}}
function audioUrl(path:string){return new URL(path,document.baseURI).href}

class GameAudio{
  private context:AudioContext|null=null;
  private master:GainNode|null=null;
  private musicBus:GainNode|null=null;
  private sfxBus:GainNode|null=null;
  private buffers=new Map<string,AudioBuffer>();
  private loading:Promise<void>|null=null;
  private musicSource:AudioBufferSourceNode|null=null;
  private lastPlayed=new Map<AudioCue,number>();
  private mode:AudioMode=loadMode();
  private sfxPlayed=0;
  private lastCue:AudioCue|null=null;
  private cueCounts:Record<AudioCue,number>={select:0,build:0,utility:0,success:0,error:0,demolish:0,toggle:0};
  private engineFailed=false;
  private musicFailed=false;
  private assetFailures:string[]=[];

  constructor(){
    const unlock=()=>{void this.unlock()};
    addEventListener('pointerdown',unlock,{capture:true,once:true});
    addEventListener('keydown',unlock,{capture:true,once:true});
    document.addEventListener('visibilitychange',()=>this.applyMix());
  }

  getMode(){return this.mode}
  getLabel(){return this.mode==='all'?'🔊 전체 음향':this.mode==='sfx'?'♪ BGM 끔':'🔇 음소거'}
  getAriaLabel(){return this.mode==='all'?'배경 음악과 효과음 켜짐':this.mode==='sfx'?'배경 음악 꺼짐, 효과음 켜짐':'모든 음향 꺼짐'}

  cycleMode(){
    this.mode=this.mode==='all'?'sfx':this.mode==='sfx'?'muted':'all';
    try{localStorage.setItem(STORAGE_KEY,JSON.stringify({mode:this.mode}))}catch{}
    void this.unlock();
    this.applyMix();
    return this.mode;
  }

  async unlock(){
    if(this.engineFailed)return;
    try{
      if(!this.context){
        this.context=new AudioContext();
        this.master=this.context.createGain();
        this.musicBus=this.context.createGain();
        this.sfxBus=this.context.createGain();
        this.musicBus.connect(this.master);this.sfxBus.connect(this.master);this.master.connect(this.context.destination);
        this.applyMix(true);
      }
      if(this.context.state==='suspended')await this.context.resume();
      if(!this.loading)this.loading=this.loadBuffers();
      await this.loading;
      this.startMusic();
    }catch{this.engineFailed=true}
  }

  async play(cue:AudioCue){
    const now=performance.now(),last=this.lastPlayed.get(cue)||-Infinity;
    if(now-last<CUE_COOLDOWN[cue])return;
    this.lastPlayed.set(cue,now);
    await this.unlock();
    if(this.mode==='muted'||!this.context||!this.sfxBus)return;
    const buffer=this.buffers.get(cue);if(!buffer)return;
    const source=this.context.createBufferSource(),gain=this.context.createGain();
    source.buffer=buffer;source.playbackRate.value=cue==='select'?.98+Math.random()*.04:1;
    gain.gain.value=CUE_GAIN[cue];source.connect(gain);gain.connect(this.sfxBus);source.start();
    source.addEventListener('ended',()=>{source.disconnect();gain.disconnect()},{once:true});
    this.sfxPlayed++;this.lastCue=cue;this.cueCounts[cue]++;
  }

  debug(){return{mode:this.mode,contextState:this.context?.state||'uninitialized',musicStarted:Boolean(this.musicSource),buffers:this.buffers.size,sfxPlayed:this.sfxPlayed,lastCue:this.lastCue,cueCounts:{...this.cueCounts},failed:this.engineFailed,musicFailed:this.musicFailed,assetFailures:[...this.assetFailures]}}

  private async loadBuffers(){
    if(!this.context)return;
    await Promise.all(Object.entries(AUDIO_FILES).map(async([key,path])=>{
      try{const response=await fetch(audioUrl(path));if(!response.ok)throw new Error(String(response.status));const data=await response.arrayBuffer();this.buffers.set(key,await this.context!.decodeAudioData(data))}catch{this.assetFailures.push(key);if(key==='music')this.musicFailed=true}
    }));
  }

  private startMusic(){
    if(this.musicSource||!this.context||!this.musicBus)return;
    const buffer=this.buffers.get('music');if(!buffer)return;
    const source=this.context.createBufferSource();source.buffer=buffer;source.loop=true;source.connect(this.musicBus);source.start();this.musicSource=source;this.applyMix(true);
  }

  private applyMix(immediate=false){
    if(!this.context||!this.master||!this.musicBus||!this.sfxBus)return;
    const now=this.context.currentTime,hidden=document.hidden,master=hidden?.18:1,music=this.mode==='all'?.18:0,sfx=this.mode==='muted'?0:.72;
    for(const[node,value]of[[this.master,master],[this.musicBus,music],[this.sfxBus,sfx]]as const){node.gain.cancelScheduledValues(now);if(immediate)node.gain.setValueAtTime(value,now);else node.gain.setTargetAtTime(value,now,.035)}
  }
}

export const gameAudio=new GameAudio();

declare global{interface Window{nekopolisAudioDebug?:()=>ReturnType<GameAudio['debug']>}}
window.nekopolisAudioDebug=()=>gameAudio.debug();
