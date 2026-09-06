export type TourRect = {left:number;top:number;width:number;height:number}
const clamp=(value:number,min:number,max:number)=>Math.max(min,Math.min(value,Math.max(min,max)))

/** Preserve the whole target. Card placement must never change the spotlight bounds. */
export function positionTour(target:TourRect,viewport:{width:number;height:number},panel:{width:number;height:number}){
 const margin=16,gap=20,padding=8
 const width=Math.min(panel.width,viewport.width-margin*2),height=Math.min(panel.height,viewport.height-margin*2)
 // Keep the actual bounds, even beyond the screen. The viewport clips naturally;
 // clamping first would round off or blur the edges of a partially visible target.
 const spot=target.left<viewport.width&&target.top<viewport.height&&target.left+target.width>0&&target.top+target.height>0
  ?{left:target.left-padding,top:target.top-padding,width:target.width+padding*2,height:target.height+padding*2}:null
 const left=target.left-padding,top=target.top-padding,right=target.left+target.width+padding,bottom=target.top+target.height+padding
 let x:number,y:number,side:'top'|'bottom'|'left'|'right'
 if(viewport.width>=760&&right+gap+width<=viewport.width-margin){
  x=right+gap;y=clamp(top,margin,viewport.height-height-margin);side='left'
 }else if(viewport.width>=760&&left-gap-width>=margin){
  x=left-gap-width;y=clamp(top,margin,viewport.height-height-margin);side='right'
 }else if(bottom+gap+height<=viewport.height-margin&&bottom>=0){
  x=clamp(left+(right-left-width)/2,margin,viewport.width-width-margin);y=bottom+gap;side='top'
 }else if(top-gap-height>=margin&&top<=viewport.height){
  x=clamp(left+(right-left-width)/2,margin,viewport.width-width-margin);y=top-gap-height;side='bottom'
 }else{
  // Space is limited: keep a compact explanation at the edge without cropping
  // the referenced section to manufacture room for it.
  x=viewport.width-width-margin;y=viewport.height-height-margin;side='top'
 }
 const arrow=side==='top'||side==='bottom'
  ?clamp(target.left+target.width/2-x,24,width-24)
  :clamp(target.top+target.height/2-y,24,height-24)
 return {spot,x,y,width,height,side,arrow}
}

/** A rounded clear window in a single, bounded backdrop-blur layer. */
export function tourCutout(rect:TourRect,width:number,height:number){
 const x=rect.left,y=rect.top,r=Math.min(18,rect.width/2,rect.height/2),right=x+rect.width,bottom=y+rect.height
 return `path(evenodd, "M0 0 H${width} V${height} H0 Z M${x+r} ${y} H${right-r} Q${right} ${y} ${right} ${y+r} V${bottom-r} Q${right} ${bottom} ${right-r} ${bottom} H${x+r} Q${x} ${bottom} ${x} ${bottom-r} V${y+r} Q${x} ${y} ${x+r} ${y} Z")`
}
