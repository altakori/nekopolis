const KEY='nekopolis-fullscreen-handoff';

export function markFullscreenHandoff(){
 if(document.fullscreenElement)sessionStorage.setItem(KEY,'1');
 else sessionStorage.removeItem(KEY);
}

export function installFullscreenHandoff(notify?:(message:string)=>void){
 if(sessionStorage.getItem(KEY)!=='1')return()=>{};
 notify?.('화면을 한 번 누르면 전체화면 가로 모드가 이어집니다.');
 const restore=async()=>{
  sessionStorage.removeItem(KEY);
  try{
   if(!document.fullscreenElement)await document.documentElement.requestFullscreen();
   const orientation=screen.orientation as ScreenOrientation&{lock?:(mode:string)=>Promise<void>};
   await orientation.lock?.('landscape').catch(()=>undefined);
  }catch{notify?.('브라우저 메뉴에서 전체화면을 허용해 주세요.');}
 };
 addEventListener('pointerdown',restore,{once:true,capture:true});
 return()=>removeEventListener('pointerdown',restore,{capture:true});
}
