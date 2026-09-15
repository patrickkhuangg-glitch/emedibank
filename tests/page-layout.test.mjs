import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync, readdirSync } from 'node:fs'
import path from 'node:path'
import ts from 'typescript'

const read = file => readFileSync(file, 'utf8')
const directPages = [
  'src/app/(app)/app/exam-picker.tsx',
  'src/components/interview-practice-lobby.tsx',
  'src/components/interview-attempt-review.tsx',
  'src/components/interview-workspace-pages.tsx',
  'src/components/interviews/story-bank.tsx',
  'src/components/interviews/mock-lobby.tsx',
  'src/components/essay-feedback-review.tsx',
  'src/app/(app)/admin/interviews/page.tsx',
  'src/app/(app)/admin/interviews/[attemptId]/page.tsx',
  'src/app/(app)/admin/interviews/panels/[id]/page.tsx',
  'src/app/(app)/interviews/practice/recordings/page.tsx',
]
const walk = dir => readdirSync(dir, { withFileTypes: true }).flatMap(e => e.isDirectory() ? walk(path.join(dir, e.name)) : [path.join(dir, e.name)])

test('page shells never silently reintroduce a narrower immediate content wrapper', () => {
  const pages = [...walk('src/app/(app)').filter(f => f.endsWith('page.tsx')), 'src/app/status/page.tsx']
  let checked = 0
  for (const file of pages) {
    const source = read(file)
    if (!source.includes('PageContainer as Container')) continue
    checked++
    const ast = ts.createSourceFile(file, source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX)
    function visit(node) {
      if (ts.isJsxElement(node) && node.openingElement.tagName.getText(ast) === 'Container') {
        for (const child of node.children.filter(ts.isJsxElement)) {
          const tag = child.openingElement
          if (!['div', 'main'].includes(tag.tagName.getText(ast))) continue
          const cls = tag.attributes.properties.find(a => ts.isJsxAttribute(a) && a.name.text === 'className')
          if (cls?.initializer && ts.isStringLiteral(cls.initializer)) {
            assert.doesNotMatch(cls.initializer.text, /\bmax-w-/, `${file}: outer content must align with the page frame; constrain inner forms/text instead`)
          }
        }
      }
      ts.forEachChild(node, visit)
    }
    visit(ast)
  }
  assert.ok(checked >= 25, 'The student and admin route inventory should be covered')
})

test('custom interview and marking workspaces use the shared frame and heading styles', () => {
  for (const file of directPages) {
    const source = read(file)
    assert.match(source, /className="page-frame page-shell/, file)
    assert.doesNotMatch(source, /<h1 className="(?!page-title)/, file)
  }
})

test('loading placeholders and trial notices use the same frame as loaded content', () => {
  assert.match(read('src/components/ui/page-skeleton.tsx'), /PageContainer as Container/)
  assert.match(read('src/app/(app)/interviews/loading.tsx'), /page-frame page-shell/)
  assert.match(read('src/components/interviews/trial-notice.tsx'), /className="page-frame"/)
})

test('shared page rules are scoped and do not restyle timed exam runners', () => {
  const css = read('src/app/page-layout.css')
  assert.doesNotMatch(css, /!important|(?:^|\n)\s*(?:main|h1|button|input)\s*\{/)
  for (const file of [...walk('src/components'), ...walk('src/app/(app)')].filter(f => /(?:runner|past-session-review)\.tsx$/.test(f))) {
    assert.doesNotMatch(read(file), /page-shell|page-title|PageContainer/, `${file} must keep the exam-specific layout`)
  }
})
