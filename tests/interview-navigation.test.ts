import test from 'node:test'
import assert from 'node:assert/strict'
import {canPrefetchInterviewPage,INTERVIEW_PREFETCH_PATHS} from '../src/lib/interviews/navigation'

test('navigation warms the library but stays away from selected media, account and timed routes',()=>{
 for(const route of INTERVIEW_PREFETCH_PATHS)assert.equal(canPrefetchInterviewPage(route),true)
 for(const route of ['/interviews/mock-interviews/review?attempt=private','/interviews/mock-interviews/session','/interviews/practice/session','/account','/api/interviews/stories','https://example.com/interviews','/interviews/stories?user=other'])assert.equal(canPrefetchInterviewPage(route),false,route)
})
