export class ProviderError extends Error {constructor(public code:string,public requestId?:string){super(code)}}
