import { timingSafeEqual } from 'node:crypto'
export function validWorkerSecret(authorization:string|null,secret:string|undefined) {
 if(!secret||secret.length<32||!authorization)return false
 const expected=Buffer.from(`Bearer ${secret}`),actual=Buffer.from(authorization)
 return expected.length===actual.length&&timingSafeEqual(expected,actual)
}
