// inlined from the former `void-elements` dependency, so the package has
// zero runtime dependencies. `!doctype`/`!DOCTYPE` are treated as void so a
// doctype parses as a childless node instead of swallowing the document.
const voidElements = {
  area: true,
  base: true,
  br: true,
  col: true,
  embed: true,
  hr: true,
  img: true,
  input: true,
  link: true,
  meta: true,
  param: true,
  source: true,
  track: true,
  wbr: true,
  '!doctype': true,
  '!DOCTYPE': true,
}

const attrRE = /\s([^'"/\s><]+?)[\s/>]|([^\s=]+)=\s?("[^"]*"|'[^']*')/g

export default function parseTag(tag) {
  const res = {
    type: 'tag',
    name: '',
    voidElement: false,
    attrs: {},
    children: [],
  }

  const tagMatch = tag.match(/<\/?([^\s]+?)[/\s>]/)
  if (tagMatch) {
    res.name = tagMatch[1]
    // void-element lookup stays case sensitive on purpose: react-i18next
    // relies on `<Br>` NOT being treated as a void `<br>` (see 1df0f9d)
    if (voidElements[tagMatch[1]] || tag.charAt(tag.length - 2) === '/') {
      res.voidElement = true
    }

    // handle comment tag
    if (res.name.startsWith('!--')) {
      const endIndex = tag.indexOf('-->')
      return {
        type: 'comment',
        comment: endIndex !== -1 ? tag.slice(4, endIndex) : '',
      }
    }
  }

  const reg = new RegExp(attrRE)
  let result = null
  for (;;) {
    result = reg.exec(tag)

    if (result === null) {
      break
    }

    if (!result[0].trim()) {
      continue
    }

    if (result[1]) {
      const attr = result[1].trim()
      // boolean attributes carry `null` so stringify can render them bare
      // (`<input disabled/>` instead of `<input disabled=""/>`)
      let arr = [attr, null]

      const eq = attr.indexOf('=')
      if (eq > -1) {
        // split at the first `=` only, so `data-x=a=b` keeps its full value
        arr = [attr.slice(0, eq), attr.slice(eq + 1)]
      }

      res.attrs[arr[0]] = arr[1]
      reg.lastIndex--
    } else if (result[2]) {
      res.attrs[result[2]] = result[3].trim().substring(1, result[3].length - 1)
    }
  }

  return res
}
