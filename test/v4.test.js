// new behavior introduced in 4.0.0
import { test, expect } from 'vitest'
import HTML, { parse, stringify } from '../src/index'

test('named exports work alongside the default export', () => {
  expect(parse).toBe(HTML.parse)
  expect(stringify).toBe(HTML.stringify)
})

test('doctype parses as a void node and round-trips (#54)', () => {
  const html = '<!DOCTYPE html><div>x</div>'
  const ast = parse(html)
  expect(ast[0]).toEqual({
    type: 'tag',
    name: '!DOCTYPE',
    voidElement: true,
    attrs: { html: null },
    children: [],
  })
  expect(stringify(ast)).toBe(html)
})

test('boolean attributes are null and stringify bare', () => {
  const ast = parse('<input disabled/>')
  expect(ast[0].attrs).toEqual({ disabled: null })
  expect(stringify(ast)).toBe('<input disabled/>')
})

test('script content is raw text', () => {
  const html = '<script>if (a<b) { render("<span>hi</span>") }</script>'
  const ast = parse(html)
  expect(ast).toEqual([
    {
      type: 'tag',
      name: 'script',
      voidElement: false,
      attrs: {},
      children: [
        { type: 'text', content: 'if (a<b) { render("<span>hi</span>") }' },
      ],
    },
  ])
  expect(stringify(ast)).toBe(html)
})

test('style content is raw text', () => {
  const html = '<style>a > b { color: red }</style><div>x</div>'
  const ast = parse(html)
  expect(ast[0].children).toEqual([
    { type: 'text', content: 'a > b { color: red }' },
  ])
  expect(ast[1].name).toBe('div')
})

test('unclosed script swallows the rest as raw text', () => {
  const ast = parse('<script>var a = 1<div>x</div>')
  expect(ast).toEqual([
    {
      type: 'tag',
      name: 'script',
      voidElement: false,
      attrs: {},
      children: [{ type: 'text', content: 'var a = 1<div>x</div>' }],
    },
  ])
})

test('comment node type exists in stringify round-trip', () => {
  const html = '<div><!-- note -->after</div>'
  expect(stringify(parse(html))).toBe(html)
})

test('text containing < survives (#59/#64)', () => {
  const ast = parse('<div>a < b</div>')
  expect(ast[0].children).toEqual([{ type: 'text', content: 'a < b' }])
})

test('multiline attribute values are parsed (#62/#63)', () => {
  const ast = parse('<div title="line1\nline2">x</div>')
  expect(ast[0].attrs.title).toBe('line1\nline2')
})

test('unquoted attribute value containing = keeps its full value', () => {
  const ast = parse('<div data-x=a=b>x</div>')
  expect(ast[0].attrs['data-x']).toBe('a=b')
})

test('double quotes in attr values are escaped on stringify', () => {
  const ast = parse('<div title=\'say "hi"\'>x</div>')
  expect(ast[0].attrs.title).toBe('say "hi"')
  expect(stringify(ast)).toBe('<div title="say &quot;hi&quot;">x</div>')
})

test('parse does not mutate the caller options object', () => {
  const options = {}
  parse('<div>x</div>', options)
  expect(options).toEqual({})
})

test('comment containing > parses fully', () => {
  const html = '<div><!-- a > b -->x</div>'
  const ast = parse(html)
  expect(ast[0].children[0]).toEqual({ type: 'comment', comment: ' a > b ' })
  expect(stringify(ast)).toBe(html)
})

test('comment containing markup stays a comment', () => {
  const ast = parse('<!-- <b>x</b> -->')
  expect(ast).toEqual([{ type: 'comment', comment: ' <b>x</b> ' }])
})

test('allowedTags array: unlisted tags become literal text', () => {
  const ast = parse('Use <div> with <b>bold</b>', { allowedTags: ['b'] })
  expect(ast).toEqual([
    { type: 'text', content: 'Use <div> with ' },
    {
      type: 'tag',
      name: 'b',
      voidElement: false,
      attrs: {},
      children: [{ type: 'text', content: 'bold' }],
    },
  ])
})

test('allowedTags predicate: numbered Trans-style tags', () => {
  const allowed = name => /^\d+$/.test(name) || name === 'br'
  const ast = parse('<0>a < b</0> keep <br/> drop <div>y</div>', {
    allowedTags: allowed,
  })
  expect(ast).toEqual([
    {
      type: 'tag',
      name: '0',
      voidElement: false,
      attrs: {},
      children: [{ type: 'text', content: 'a < b' }],
    },
    { type: 'text', content: ' keep ' },
    { type: 'tag', name: 'br', voidElement: true, attrs: {}, children: [] },
    { type: 'text', content: ' drop <div>y</div>' },
  ])
})

test('allowedTags: disallowed closing tags become text too', () => {
  const ast = parse('<b>x</b> and </div>', { allowedTags: ['b'] })
  expect(ast[ast.length - 1]).toEqual({ type: 'text', content: ' and </div>' })
})

test('allowedTags: attrs of disallowed tags survive as text', () => {
  const ast = parse('<a href="https://x.example">y</a>', { allowedTags: [] })
  expect(ast).toEqual([
    { type: 'text', content: '<a href="https://x.example">y</a>' },
  ])
})

// heritage regression tests, adopted from the fork-network sweep (2026-07)
test('deeply nested tags with trailing text round-trip (kachkaev broken-test)', () => {
  const html =
    '<div>Testing <strong>multiple <em>nested</em></strong> tags</div>'
  expect(stringify(parse(html))).toBe(html)
})

test('excess close tags at root do not corrupt state (btpoe)', () => {
  expect(parse('</div><b>x</b>')).toEqual([
    {
      type: 'tag',
      name: 'b',
      voidElement: false,
      attrs: {},
      children: [{ type: 'text', content: 'x' }],
    },
  ])
})

test('no catastrophic backtracking on ReDoS input (CVE-2021-23346 class)', () => {
  const evil1 = '<!' + "'".repeat(140) + '!'
  const evil2 = '<!' + '"'.repeat(160) + '!'
  const t0 = Date.now()
  parse(evil1)
  parse(evil2)
  expect(Date.now() - t0).toBeLessThan(100)
})

test('mixed boolean and valued attributes (html-parse-stringify2#13)', () => {
  expect(parse('<input disabled required type="text"/>')[0].attrs).toEqual({
    disabled: null,
    required: null,
    type: 'text',
  })
})

test('lt inside quoted attribute values is preserved (#67 review)', () => {
  const html = '<div title="1 < 2">Hello</div>'
  expect(parse(html)[0].attrs).toEqual({ title: '1 < 2' })
  expect(stringify(parse(html))).toBe(html)
  expect(parse("<div title='1 < 2'>x</div>")[0].attrs).toEqual({
    title: '1 < 2',
  })
  expect(parse('<div title="a > b < c">x</div>')[0].attrs).toEqual({
    title: 'a > b < c',
  })
})

test('multiple literal < in text and CRLF attributes (#67 review round 2)', () => {
  const html = '<div>1 < 2 < 3</div>'
  expect(parse(html)[0].children).toEqual([
    { type: 'text', content: '1 < 2 < 3' },
  ])
  expect(stringify(parse(html))).toBe(html)
  expect(parse('<span>x</span>1 < 2 < 3')[1]).toEqual({
    type: 'text',
    content: '1 < 2 < 3',
  })
  expect(parse('<div><!-- c -->1 < 2</div>')[0].children[1]).toEqual({
    type: 'text',
    content: '1 < 2',
  })
  expect(parse('<div title="first\r\nsecond">Hello</div>')[0].attrs).toEqual({
    title: 'first\r\nsecond',
  })
  expect(parse("<div title='first\r\nsecond'>x</div>")[0].attrs).toEqual({
    title: 'first\r\nsecond',
  })
})

test('pathological split fragments must not crash (#67 fuzz)', () => {
  expect(() => parse("<a< <!-->'")).not.toThrow()
  expect(() => parse("</0><3 a < b <!-- c -->=<div -->'")).not.toThrow()
  expect(() => parse('<div>a<b<c<d</div>')).not.toThrow()
})
