export function SceneIcon({kind}:{kind:'reset'|'pause'|'play'|'close'|'trace'}){
 return <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{
  kind==='reset'?<><circle cx="10" cy="10" r="5.5"/><path d="M10 2v4m0 8v4M2 10h4m8 0h4"/><circle cx="10" cy="10" r="1"/></>:
  kind==='pause'?<path d="M7 5v10m6-10v10"/>:
  kind==='play'?<path d="m7 4 8 6-8 6V4Z"/>:
  kind==='close'?<path d="m5 5 10 10M15 5 5 15"/>:
  <><circle cx="5" cy="5" r="2"/><circle cx="15" cy="10" r="2"/><circle cx="5" cy="15" r="2"/><path d="m7 6 6 3m-6 5 6-3"/></>
 }</svg>;
}
