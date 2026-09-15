'use client'
import {useEffect,useRef} from 'react'
/** Scroll depth belongs to the decorative field. Results and controls never move. */
export function useReviewMotion(){
 const ref=useRef<HTMLDivElement>(null)
 useEffect(()=>{
  const root=ref.current;if(!root)return
  const media=window.matchMedia('(prefers-reduced-motion: no-preference) and (min-width: 761px) and (pointer: fine)')
  let frame=0,value=0,target=0
  const tick=()=>{value+=(target-value)*.14;root.style.setProperty('--review-depth',`${value.toFixed(2)}px`);if(Math.abs(target-value)>.05)frame=requestAnimationFrame(tick);else frame=0}
  const scroll=()=>{target=Math.min(90,root.scrollTop*.075);if(!frame)frame=requestAnimationFrame(tick)}
  const update=()=>{
   root.removeEventListener('scroll',scroll);cancelAnimationFrame(frame);frame=0
   root.dataset.parallax=String(media.matches)
   if(media.matches){root.addEventListener('scroll',scroll,{passive:true});scroll()}
   else{value=target=0;root.style.removeProperty('--review-depth')}
  }
  update();media.addEventListener('change',update)
  return()=>{root.removeEventListener('scroll',scroll);media.removeEventListener('change',update);cancelAnimationFrame(frame);root.style.removeProperty('--review-depth')}
 },[])
 return ref
}
