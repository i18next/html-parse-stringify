function attrString(attrs) {
  const buff = []
  for (const key in attrs) {
    if (attrs[key] === null) {
      // boolean attribute, render bare
      buff.push(key)
    } else {
      // escape double quotes so values parsed from single-quoted or
      // multiline attributes can't break out of the generated markup
      buff.push(key + '="' + String(attrs[key]).replace(/"/g, '&quot;') + '"')
    }
  }
  if (!buff.length) {
    return ''
  }
  return ' ' + buff.join(' ')
}

function stringifyNode(buff, doc) {
  switch (doc.type) {
    case 'text':
      return buff + doc.content
    case 'tag': {
      // a doctype is void but must not self-close: `<!DOCTYPE html>` not `<!DOCTYPE html/>`
      const tagEnd =
        doc.voidElement && doc.name.toLowerCase() !== '!doctype' ? '/>' : '>'
      buff += '<' + doc.name + (doc.attrs ? attrString(doc.attrs) : '') + tagEnd
      if (doc.voidElement) {
        return buff
      }
      return (
        buff + doc.children.reduce(stringifyNode, '') + '</' + doc.name + '>'
      )
    }
    case 'comment':
      buff += '<!--' + doc.comment + '-->'
      return buff
  }
}

export default function stringify(doc) {
  return doc.reduce(function (token, rootEl) {
    return token + stringifyNode('', rootEl)
  }, '')
}
