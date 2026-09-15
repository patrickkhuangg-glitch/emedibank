import {readFileSync} from 'node:fs'
import vm from 'node:vm'
import ts from 'typescript'
export function loadModule(file,deps={},globals={}) {
 const box={exports:{}}
 const code=ts.transpileModule(readFileSync(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText
 vm.runInNewContext(code,{module:box,exports:box.exports,console,Buffer,Date,URL,URLSearchParams,Request,Response,crypto,process,
 require(id){if(id==='server-only')return {};if(!(id in deps))throw Error(`Unexpected dependency ${id}`);return deps[id]},...globals})
 return box.exports
}
