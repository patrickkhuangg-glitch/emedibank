import assert from 'node:assert/strict'
import {test} from 'node:test'
import {boundedSectionTimes} from '../src/lib/mock/section-times'
test('preserves visits within the section budget',()=>{
 assert.deepEqual(boundedSectionTimes(['a','b'],{a:30,b:50},'b',90),{a:30,b:50})
})
test('background expiry removes excess from the question left open',()=>{
 assert.deepEqual(boundedSectionTimes(['a','b'],{a:30,b:500},'b',90),{a:30,b:60})
})
test('timing remains bounded after a clock discontinuity',()=>{
 const value=boundedSectionTimes(['a','b','c'],{a:80,b:80,c:10},'c',90)
 assert.equal(Object.values(value).reduce((n,x)=>n+x,0),90)
 assert.equal(value.a,80);assert.equal(value.b,10);assert.equal(value.c,0)
})
test('ignores other sections and invalid readings',()=>{
 assert.deepEqual(boundedSectionTimes(['a','b'],{a:NaN,b:-1,other:900},'b',90),{a:0,b:0})
})
