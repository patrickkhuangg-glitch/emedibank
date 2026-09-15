// Only Node tests use this marker replacement. Next retains its client import guard.
import {registerHooks} from 'node:module'
import {fileURLToPath} from 'node:url'
const marker=fileURLToPath(new URL('./server-only.cjs',import.meta.url))
const cssModule=fileURLToPath(new URL('./css-module.mjs',import.meta.url))
registerHooks({resolve(specifier,context,next){
  if(specifier.endsWith('.module.css'))return next(cssModule,context)
  return next(specifier==='server-only'?marker:specifier,context)
}})
