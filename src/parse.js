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

  const matches = Array.from(html.matchAll(tagRE))
  matches.forEach(function (match, i) {
    const tag = match[0]
    if (!tag) return console.log({ html, matches })
    const amountOfLts = tag.split('<').length
    const amountOfGts = tag.split('>').length
    if (amountOfLts > 0 && amountOfLts > amountOfGts) {
      const firstPart = tag.substring(0, tag.indexOf('<', tag.indexOf('<') + 1))
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
    if (nextChar === '<' && nextMatch)  {
      const nextTag = html.substring(start, nextMatch.index)
      isText = nextTag.split('<').length >  nextTag.split('>').length
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
        let possibleContent = html.slice(start, html.indexOf('<', start))
        const indexOfPossibleContent = html.indexOf(possibleContent, start)
        const startAfterPossibleContent = indexOfPossibleContent + possibleContent.length + 1
        const nextLt = html.indexOf('<', startAfterPossibleContent)
        const nextGt = html.indexOf('>', startAfterPossibleContent)
        if (nextLt > -1 && nextLt < nextGt) {
          possibleContent = html.slice(start, html.indexOf('<', startAfterPossibleContent))
        }
        current.children.push({
          type: 'text',
          content: possibleContent,
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

        // calculate correct end of the content slice in case there's
        // no tag after the text node.
        let end = html.indexOf('<', start)
        if (isText) {
          const nextTag = html.substring(nextMatch.index)
          end = html.indexOf(nextTag, start)
        }
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
