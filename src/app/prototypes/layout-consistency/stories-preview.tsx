'use client'
import { useState } from 'react'
import { PageContainer } from '@/components/container'
import { StoryPromptLibrary } from '@/components/interviews/story-prompt-library'
export function StoriesPreview(){
 const [selected,setSelected]=useState('')
 return <PageContainer><h1 className="page-title">Your story bank</h1><p className="mt-3 max-w-2xl leading-7 text-muted">Explore the story prompts. This local preview does not save any personal information.</p><div className="mt-8"><StoryPromptLibrary stories={[]} loading={false} onPrompt={p=>setSelected(p.text)} onStory={s=>setSelected(s.title)} onCreate={()=>setSelected('Your own experience')}/></div>{selected&&<p role="status" className="mt-5 rounded-2xl bg-brand-muted p-5">Selected: {selected}</p>}</PageContainer>
}
