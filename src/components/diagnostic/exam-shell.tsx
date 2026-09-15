import type {ReactNode} from 'react';import './exam-shell.css';
export function ExamShell({label,children,toolbar,footer}: {label:string;children:ReactNode;toolbar?:ReactNode;footer?:ReactNode}){
 return <div className="ucat-frame" data-exam-shell><header className="ucat-heading">{label}</header><div className="ucat-toolbar">{toolbar}</div><main className="ucat-page">{children}</main><footer className="ucat-footer">{footer}</footer></div>
}
export function ExamLoading({error=false,onRetry}: {error?:boolean;onRetry?:()=>void}){return <div className="ucat-loading" role="status" aria-live="polite">{!error&&<span className="ucat-spinner"/>}<h2>{error?'Questions could not be loaded':'Loading your questions…'}</h2><p>{error?'The timer has not started. Please try again.':'The timer will start once the questions and diagrams are ready.'}</p>{error&&<button onClick={onRetry}>Retry loading</button>}</div>}
