import Link from 'next/link'
import {notFound} from 'next/navigation'
import {panelReviewDetail} from '@/lib/interviews/panel-data'
import {PanelReviewEditor} from '@/components/interviews/panel-review-editor'
export const dynamic='force-dynamic'
export const metadata={title:'Whole-panel review · Studocyte'}
export default async function Page({params}:{params:Promise<{id:string}>}){const {id}=await params;if(!/^[0-9a-f-]{36}$/i.test(id))notFound();const detail=await panelReviewDetail(id);if(!detail)notFound();return <main className="page-frame page-shell space-y-6"><Link href="/admin/interviews" className="text-brand">← Interview reviews</Link><h1 className="page-title">Whole-panel review</h1><p className="text-muted">{detail.student} · {new Date(detail.marking.created_at).toLocaleDateString('en-AU')}</p><PanelReviewEditor key={`${detail.marking.id}:${detail.marking.lock_version}`} detail={detail}/></main>}
