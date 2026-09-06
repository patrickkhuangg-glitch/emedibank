import test from 'node:test'
import assert from 'node:assert/strict'
import {positionTour} from '../src/lib/interviews/tour-position'

test('spotlight never crops the referenced section to make room for the explanation',()=>{
 for(const viewport of [{width:1440,height:900},{width:1024,height:768},{width:390,height:844},{width:320,height:568},{width:844,height:390}]){
  const panel={width:Math.min(390,viewport.width-32),height:Math.min(320,viewport.height*.48)}
  for(const target of [{left:20,top:96,width:viewport.width-40,height:1000},{left:40,top:120,width:280,height:180},{left:20,top:-400,width:viewport.width-40,height:1000}]){
   const p=positionTour(target,viewport,panel),s=p.spot!
   assert.ok(s,'visible target must have a spotlight')
   // Regression: the former fallback shortened the bottom to the top of the card.
   assert.ok(s.top<=target.top&&s.top+s.height>=target.top+target.height)
   assert.ok(s.left<=target.left&&s.left+s.width>=target.left+target.width)
   assert.ok(p.x>=16&&p.y>=16&&p.x+p.width<=viewport.width-16&&p.y+p.height<=viewport.height-16)
  }
 }
})

test('a scrolled-away target does not highlight unrelated content; cards use free space when available',()=>{
 assert.equal(positionTour({left:20,top:-500,width:800,height:200},{width:1280,height:800},{width:390,height:300}).spot,null)
 const target={left:40,top:100,width:400,height:250},p=positionTour(target,{width:1280,height:800},{width:390,height:300})
 assert.ok(p.x>=target.left+target.width,'use the available side space')
})
