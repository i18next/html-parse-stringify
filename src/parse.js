import parseTag from './parse-tag'

const tagRE = /<[a-zA-Z0-9\-\!\/](?:"[^"]*"|'[^']*'|[^'">])*>/g
const whitespaceRE = /^\s*$/

// re-used obj for quick lookups of components
const empty = Object.create(null)

export default function parse(html, options) {
  options || (options = {})
  options.components || (options.components = empty)
  const result = []
  const arr = []
  let current
  let level = -1
  let inComponent = false

  // handle text at top level
  if (html.indexOf('<') !== 0) {
    var end = html.indexOf('<')
    result.push({
      type: 'text',
      content: end === -1 ? html : html.substring(0, end),
    })
  }

  // collect matches with an exec loop instead of matchAll to keep ES5 API compat
  const matches = []
  let m
  while ((m = tagRE.exec(html))) {
    matches.push(m)
  }
  matches.forEach(function (match, i) {
    const tag = match[0]
    if (!tag) return
    // comments are handled by parseTag as a whole
    if (tag.startsWith('<!--')) return
    // count brackets outside quoted attribute values, so `<` inside an
    // attribute (e.g. title="1 < 2") can't trigger a bogus split
    let lts = 0
    let gts = 0
    let secondLt = -1
    let quote = null
    for (let j = 0; j < tag.length; j++) {
      const c = tag.charAt(j)
      if (quote) {
        if (c === quote) quote = null
      } else if (c === '"' || c === "'") {
        quote = c
      } else if (c === '<') {
        lts++
        if (lts === 2) secondLt = j
      } else if (c === '>') {
        gts++
      }
    }
    // only split when the remainder is itself a valid tag start; otherwise
    // a fragment like `< <!-->` desyncs the string-level isComment check
    // from parseTag's name-based comment detection and crashes the walker
    const validSplit =
      secondLt > -1 && /[a-zA-Z0-9\-!/]/.test(tag.charAt(secondLt + 1))
    if (lts > gts && validSplit) {
      const firstPart = tag.substring(0, secondLt)
      const secondPart = tag.substring(firstPart.length)
      matches[i][0] = secondPart
      matches[i].index += firstPart.length
    }
  })
  matches.forEach(function (match, i) {
    const tag = match[0]
    if (!tag) return
    const index = match.index
    if (inComponent) {
      if (tag !== '</' + current.name + '>') {
        return
      } else {
        inComponent = false
      }
    }
    const isOpen = tag.charAt(1) !== '/'
    const isComment = tag.startsWith('<!--')
    const start = index + tag.length
    const nextChar = html.charAt(start)
    const nextMatch = matches[i + 1]
    let isText
    if (nextChar === '<' && nextMatch) {
      const nextTag = html.substring(start, nextMatch.index)
      isText = nextTag.split('<').length > nextTag.split('>').length
    }

    let parent

    if (isComment) {
      const comment = parseTag(tag)

      // if we're at root, push new base node
      if (level < 0) {
        result.push(comment)
        return result
      }
      parent = arr[level]
      parent.children.push(comment)

      const text = html.slice(start, nextMatch ? nextMatch.index : undefined)
      if (text.length > 0) {
        parent.children.push({
          type: 'text',
          content: text,
        })
      }
      return result
    }

    if (isOpen) {
      level++

      current = parseTag(tag)
      if (current.type === 'tag' && options.components[current.name]) {
        current.type = 'component'
        inComponent = true
      }

      if (
        !current.voidElement &&
        !inComponent &&
        nextChar &&
        nextChar !== '<'
      ) {
        // text content runs to the next actual tag match; stray `<`
        // characters in between are part of the text
        current.children.push({
          type: 'text',
          content: html.slice(start, nextMatch ? nextMatch.index : undefined),
        })
      }

      // if we're at root, push new base node
      if (level === 0) {
        result.push(current)
      }

      parent = arr[level - 1]

      if (parent) {
        parent.children.push(current)
      }

      arr[level] = current
    }

    if (!isOpen || current.voidElement) {
      if (
        level > -1 &&
        (current.voidElement || current.name === tag.slice(2, -1))
      ) {
        level--
        // move current up a level to match the end tag
        current = level === -1 ? result : arr[level]
      }
      if (!inComponent && (nextChar !== '<' || isText) && nextChar) {
        // trailing text node
        // if we're at the root, push a base text node. otherwise add as
        // a child to the current node.
        parent = level === -1 ? result : arr[level].children

        // the text node runs to the next actual tag match; -1 means
        // there's no tag after it (trailing text)
        const end = nextMatch ? nextMatch.index : -1
        let content = html.slice(start, end === -1 ? undefined : end)
        // if a node is nothing but whitespace, collapse it as the spec states:
        // https://www.w3.org/TR/html4/struct/text.html#h-9.1
        if (whitespaceRE.test(content)) {
          content = ' '
        }
        // don't add whitespace-only text nodes if they would be trailing text nodes
        // or if they would be leading whitespace-only text nodes:
        //  * end > -1 indicates this is not a trailing text node
        //  * leading node is when level is -1 and parent has length 0
        if ((end > -1 && level + parent.length >= 0) || content !== ' ') {
          parent.push({
            type: 'text',
            content: content,
          })
        }
      }
    }
  })

  return result
}
