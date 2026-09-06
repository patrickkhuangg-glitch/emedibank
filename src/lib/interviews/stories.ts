export const STORY_THEMES=['Teamwork','Communication','Empathy','Responsibility','Service','Growth','Motivation','Other'] as const
export type StoryTheme=typeof STORY_THEMES[number]
export type StoryDraft={title:string;theme:StoryTheme;context:string;actions:string;reflection:string}
export type InterviewStory=StoryDraft&{id:string;user_id:string;created_at:string;updated_at:string;version:number}
export function validateStory(value:Record<string,unknown>):StoryDraft{
 const fields={} as StoryDraft
 for(const key of ['title','context','actions','reflection'] as const){
  const text=typeof value[key]==='string'?value[key].trim():''
  if(!text||Array.from(text).length>(key==='title'?120:2000))throw new Error(key==='title'?'Give your story a title of 1–120 characters.':'Complete each story section using 1–2,000 characters.')
  fields[key]=text
 }
 if(!STORY_THEMES.includes(value.theme as StoryTheme))throw new Error('Choose a story theme.')
 fields.theme=value.theme as StoryTheme
 return fields
}
export function validStoryId(value:unknown):value is string{return typeof value==='string'&&/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value)}
