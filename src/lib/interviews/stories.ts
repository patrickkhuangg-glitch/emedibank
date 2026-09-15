import {findStoryPrompt} from './story-prompts'
export const STORY_THEMES=['Teamwork','Communication','Empathy','Responsibility','Service','Growth','Motivation','Other'] as const
export type StoryTheme=typeof STORY_THEMES[number]
export type StoryDraft={title:string;theme:StoryTheme;context:string;actions:string;reflection:string;prompt_id?:string|null}
export type InterviewStory=StoryDraft&{id:string;user_id:string;created_at:string;updated_at:string;version:number}
export function validateStory(value:Record<string,unknown>):StoryDraft{
 const fields={} as StoryDraft
 for(const key of ['title','context','actions','reflection'] as const){
  const text=typeof value[key]==='string'?value[key].trim():''
  if((key==='title'&&!text)||Array.from(text).length>(key==='title'?120:2000))throw new Error(key==='title'?'Give your story a title of 1–120 characters.':'Keep each story section to 2,000 characters or fewer.')
  fields[key]=text
 }
 if(!STORY_THEMES.includes(value.theme as StoryTheme))throw new Error('Choose a story theme.')
 fields.theme=value.theme as StoryTheme
 if(![fields.context,fields.actions,fields.reflection].some(Boolean))throw new Error('Add something to Context, Your actions or Reflection before saving.')
 if('prompt_id' in value){
  if(value.prompt_id===null)fields.prompt_id=null
  else{const prompt=findStoryPrompt(value.prompt_id);if(!prompt)throw new Error('Choose a prompt from the story library.');fields.prompt_id=prompt.id;fields.theme=prompt.storyTheme}
 }
 return fields
}
export function validStoryId(value:unknown):value is string{return typeof value==='string'&&/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value)}

export function isStoryAnswered(story:Pick<StoryDraft,'context'|'actions'|'reflection'>){return [story.context,story.actions,story.reflection].every(value=>value.trim().length>0)}
export type StoryPromptStatus='not-started'|'in-progress'|'answered'
export function storyPromptStatus(stories:InterviewStory[],promptId:string):StoryPromptStatus{
 const linked=stories.filter(story=>story.prompt_id===promptId)
 return linked.some(isStoryAnswered)?'answered':linked.length?'in-progress':'not-started'
}
