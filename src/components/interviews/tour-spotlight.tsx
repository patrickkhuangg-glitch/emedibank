'use client'
import {useEffect,useRef,useState,type CSSProperties,type ReactNode} from 'react'
import {positionTour,tourCutout,type TourRect} from '@/lib/interviews/tour-position'

type Geometry={key:string;target:TourRect;viewport:{width:number;height:number};panel:{width:number;height:number}}
export function TourSpotlight({target,stepKey,onPage,onClose,children}:{target:string;stepKey:string;onPage:boolean;onClose:()=>void;children:ReactNode}){
 const panel=useRef<HTMLElement>(null),close=useRef(onClose)
 const [geometry,setGeometry]=useState<Geometry|null>(null)
 useEffect(()=>{close.current=onClose},[onClose])
 useEffect(()=>{
  function escape(event:KeyboardEvent){if(event.key==='Escape'){event.preventDefault();close.current()}}
  window.addEventListener('keydown',escape)
  return()=>window.removeEventListener('keydown',escape)
 },[])
 useEffect(()=>{
  if(!onPage)return
  let element:HTMLElement|null=null,frame=0
  function measure(){
   frame=0
   if(!element?.isConnected||!panel.current)return
   const rect=element.getBoundingClientRect(),card=panel.current.getBoundingClientRect()
   setGeometry({key:stepKey,target:{left:rect.left,top:rect.top,width:rect.width,height:rect.height},viewport:{width:window.innerWidth,height:window.innerHeight},panel:{width:card.width,height:card.height}})
  }
  function schedule(){if(!frame)frame=requestAnimationFrame(measure)}
  const resize=new ResizeObserver(schedule)
  function locate(){
   const found=document.querySelector<HTMLElement>(`[data-interview-tour="${target}"]`)
   if(!found||found===element)return
   if(element)resize.unobserve(element)
   element=found;resize.observe(element)
   const initial=window.scrollY,rect=element.getBoundingClientRect()
   const destination=Math.max(0,initial+rect.top-96)
   // Position the page before revealing the explanation. Combining a guided
   // scroll with a moving popover made the final route transition jump twice.
   window.scrollTo({top:destination,behavior:'instant'})
   schedule()
  }
  const observer=new MutationObserver(locate)
  observer.observe(document.body,{childList:true,subtree:true})
  if(panel.current)resize.observe(panel.current)
  locate();window.addEventListener('scroll',schedule,{passive:true});window.addEventListener('resize',schedule)
  const timeout=setTimeout(()=>observer.disconnect(),10000)
  return()=>{observer.disconnect();resize.disconnect();clearTimeout(timeout);cancelAnimationFrame(frame);window.removeEventListener('scroll',schedule);window.removeEventListener('resize',schedule)}
 },[target,stepKey,onPage])
 const ready=onPage&&geometry?.key===stepKey
 useEffect(()=>{if(ready)panel.current?.querySelector<HTMLElement>('h2')?.focus({preventScroll:true})},[ready,stepKey])
 const position=geometry?positionTour(geometry.target,geometry.viewport,geometry.panel):null
 const style:CSSProperties=position?{transform:`translate3d(${position.x}px,${position.y}px,0)`}:{}
 const arrow:CSSProperties=position?{[position.side==='top'||position.side==='bottom'?'left':'top']:position.arrow}:{}
 return <>
  <div aria-hidden="true" className="interview-tour-shade" style={{clipPath:ready&&position?.spot?tourCutout(position.spot,geometry!.viewport.width,geometry!.viewport.height):undefined}}/>
  <div className="interview-tour-layer"><aside ref={panel} aria-label="Interview introduction" aria-hidden={!ready} inert={!ready} className={`interview-tour-panel${ready?' is-ready':''}`} style={style}>
   {ready&&position?.spot&&<span aria-hidden="true" className={`interview-tour-pointer from-${position.side}`} style={arrow}/>}
   {children}
  </aside></div>
  {!ready&&<div className="interview-tour-wait" role="status"><span>Opening introduction step…</span><button type="button" onClick={onClose} className="min-h-11 rounded-full px-3 font-semibold">End tour</button></div>}
  <style>{`
   .interview-tour-shade{position:fixed;inset:0;z-index:88;background:rgb(29 22 47 / 34%);backdrop-filter:blur(3px);-webkit-backdrop-filter:blur(3px);pointer-events:none;animation:interview-shade-in 220ms ease-out both}
   .interview-tour-layer{position:fixed;inset:0;z-index:90;overflow:clip;pointer-events:none}
   .interview-tour-panel{position:absolute;pointer-events:auto;left:0;top:0;width:min(390px,calc(100vw - 32px));max-height:calc(100dvh - 32px);display:flex;flex-direction:column;border-radius:16px;background:var(--surface);color:var(--foreground);padding:20px;box-shadow:0 12px 40px rgb(29 22 47 / 20%);transform:translate3d(16px,calc(100dvh - 100% - 16px),0);opacity:0;transition:opacity 160ms cubic-bezier(.23,1,.32,1)}
   .interview-tour-panel.is-ready{opacity:1}
   .interview-tour-panel:not(.is-ready){pointer-events:none}
   .interview-tour-wait{position:fixed;right:16px;bottom:16px;z-index:91;display:flex;align-items:center;gap:12px;border-radius:16px;background:var(--surface);color:var(--foreground);padding:4px 12px;font-size:13px;animation:interview-shade-in 160ms 250ms both}
   .interview-tour-panel h2{outline:none}
   .interview-tour-copy{overflow-y:auto;min-height:0;max-height:calc(48dvh - 142px);overscroll-behavior:contain;animation:interview-copy-in 200ms ease-out both}
   .interview-tour-pointer{position:absolute;width:16px;height:16px;background:var(--surface);border-radius:3px;pointer-events:none}
   .interview-tour-pointer.from-top{top:-7px;transform:translateX(-50%) rotate(45deg)}
   .interview-tour-pointer.from-bottom{bottom:-7px;transform:translateX(-50%) rotate(45deg)}
   .interview-tour-pointer.from-left{left:-7px;transform:translateY(-50%) rotate(45deg)}
   .interview-tour-pointer.from-right{right:-7px;transform:translateY(-50%) rotate(45deg)}
   @keyframes interview-shade-in{from{opacity:0}to{opacity:1}}
   @keyframes interview-copy-in{from{opacity:.25;transform:translateY(4px)}to{opacity:1;transform:translateY(0)}}
   @media(min-width:640px){.interview-tour-panel{padding:24px}.interview-tour-copy{max-height:calc(65dvh - 166px)}}
   @media(prefers-reduced-motion:reduce){.interview-tour-panel{transition:none}.interview-tour-copy{animation:interview-shade-in 100ms ease-out both}.interview-tour-shade{animation-duration:100ms}}
  `}</style>
 </>
}
