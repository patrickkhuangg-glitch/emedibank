import {test} from 'node:test'
import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
import {STORY_PROMPTS,STORY_PROMPT_CATEGORIES} from '../src/lib/interviews/story-prompts'
import {validateStory,isStoryAnswered,storyPromptStatus,type InterviewStory} from '../src/lib/interviews/stories'
import {fullDatabase} from './helpers/full-database.mjs'

test('the story catalogue contains every supplied prompt in order with stable unique identifiers',()=>{
 const source=readFileSync('tests/fixtures/interview-story-prompts.txt','utf8')
 assert.deepEqual(STORY_PROMPTS.map(p=>p.text),source.split('\n').filter(s=>s.startsWith('- ')).map(s=>s.slice(2).trim()))
 assert.deepEqual(STORY_PROMPT_CATEGORIES.map(c=>c.label),source.split('\n').map(s=>s.trim()).filter(s=>s&&!s.startsWith('- ')))
 assert.equal(STORY_PROMPTS.length,104);assert.equal(STORY_PROMPT_CATEGORIES.length,12)
 assert.equal(new Set(STORY_PROMPTS.map(p=>p.id)).size,104)
})
test('partial responses keep their prompt link, and answered prompts remain discoverable through edits',()=>{
 const prompt=STORY_PROMPTS[0]
 const draft=validateStory({title:'My volunteering',theme:'Other',context:'I helped at a local food bank.',actions:'',reflection:'',prompt_id:prompt.id})
 assert.equal(draft.theme,'Service');assert.equal(draft.prompt_id,prompt.id);assert.equal(isStoryAnswered(draft),false)
 const story={...draft,id:'s',user_id:'owner',version:1,created_at:'2026-09-08',updated_at:'2026-09-08'} as InterviewStory
 assert.equal(storyPromptStatus([],prompt.id),'not-started');assert.equal(storyPromptStatus([story],prompt.id),'in-progress')
 const answered={...story,actions:'I listened before suggesting changes.',reflection:'Ask what people need first.'}
 assert.equal(storyPromptStatus([story,answered],prompt.id),'answered')
 assert.equal(storyPromptStatus([{...answered,title:'A revised title'}],prompt.id),'answered')
 assert.throws(()=>validateStory({...draft,prompt_id:'invented-prompt'}));assert.throws(()=>validateStory({...draft,context:'',actions:'',reflection:''}))
})
test('prompt migration preserves old stories, supports private partial saves and rejects invalid links or stale edits',async()=>{
 const db=await fullDatabase(),owner='00000000-0000-4000-8000-000000000001',other='00000000-0000-4000-8000-000000000002',id='00000000-0000-4000-8000-000000000003'
 try{
  await db.exec(`insert into auth.users(id) values('${owner}'),('${other}');`)
  const catalog=(await db.query<{id:string;prompt:string}>('select id,prompt from interview_story_prompts')).rows
  assert.equal(catalog.length,104);for(const p of STORY_PROMPTS)assert.equal(catalog.find(r=>r.id===p.id)?.prompt,p.text)
  await db.exec(`set role authenticated;set request.jwt.claim.sub='${owner}';`)
  await db.query("insert into interview_stories(id,user_id,title,theme,context,actions,reflection,prompt_id) values($1,$2,'My story','Service','A beginning','','',$3)",[id,owner,STORY_PROMPTS[0].id])
  assert.equal((await db.query<{prompt_id:string}>('select prompt_id from interview_stories')).rows[0].prompt_id,STORY_PROMPTS[0].id)
  await assert.rejects(db.exec("update interview_story_prompts set prompt='forged'"),/permission denied/)
  await assert.rejects(db.query('update interview_stories set prompt_id=$1 where id=$2',['fake',id]),/foreign key/)
  await assert.rejects(db.query("update interview_stories set context='',actions='',reflection='' where id=$1",[id]),/check constraint/)
  await db.exec(`set request.jwt.claim.sub='${other}';`)
  assert.equal((await db.query('select * from interview_stories')).rows.length,0)
  assert.equal((await db.query("update interview_stories set actions='forged' where id=$1 returning id",[id])).rows.length,0)
  await db.exec(`set request.jwt.claim.sub='${owner}';`)
  const saved=await db.query<{version:number}>("update interview_stories set actions='I helped',reflection='I learnt',title='Renamed' where id=$1 and version=1 returning version",[id]);assert.equal(saved.rows[0].version,2)
  assert.equal((await db.query("update interview_stories set title='Stale' where id=$1 and version=1 returning id",[id])).rows.length,0)
  await db.query("insert into interview_stories(user_id,title,theme,context,actions,reflection) values($1,'Earlier story','Teamwork','Context','Actions','Reflection')",[owner])
  assert.equal((await db.query('select * from interview_stories where prompt_id is null')).rows.length,1)
 }finally{await db.close()}
})
