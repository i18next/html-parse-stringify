# Changelog

## 4.0.0

First release from the package's new maintenance home: [i18next/html-parse-stringify](https://github.com/i18next/html-parse-stringify). Functionally it builds on 3.1.0; the breaking changes below are deliberate and small.

### Breaking

- Modern package entry points: `exports` map with dual ESM/CJS builds and bundled types. Deep imports like `html-parse-stringify/dist/...` no longer work; import the package root instead.
- Boolean attributes (e.g. `disabled`) now carry the value `null` in the AST (was `''`) and stringify bare: `<input disabled/>` instead of `<input disabled=""/>`.
- `<!DOCTYPE html>` parses as a void node and round-trips correctly (#54). Previously the rest of the document was nested inside it and stringify produced `</!DOCTYPE>`.
- `<script>` and `<style>` content is treated as raw text: the whole content becomes a single text child, and `<`/`>` inside it no longer produce bogus tag nodes.

### Fixed

- Comments containing `>` (e.g. `<!-- a > b -->`) are now parsed fully instead of being cut at the first `>`.
- Unquoted attribute values containing `=` are no longer truncated at the second `=` (`<div data-x=a=b>` now keeps `a=b`).
- `stringify` escapes double quotes in attribute values as `&quot;`, so values parsed from single-quoted or multiline attributes can't produce broken markup.
- `parse` no longer mutates the caller's `options` object.

### Added

- `allowedTags` parse option (array of names or predicate): only listed tags are parsed as markup, everything else tag-shaped stays literal text. This is the parser-level version of the escaping that consumers like react-i18next had to implement themselves.
- Named exports: `import { parse, stringify } from 'html-parse-stringify'` (the default export remains for compatibility).
- Rewritten TypeScript types with a discriminated union (`TagNode | TextNode | CommentNode | ComponentNode`) (#56). `CommentNode` was missing entirely before.
- Zero runtime dependencies: the former `void-elements` dependency is inlined.
- CI (lint, tests, build on Node 18–24) plus an integration job that runs the full react-i18next test suite against this parser before anything ships.

## 3.1.0

Released from the original repository. All community fixes that had been waiting:

- LICENSE file added and shipped in the npm package (#66, closes #61) — thanks @monholm
- text containing `<` is no longer truncated (#64, closes #59)
- multi-line attribute values are parsed correctly (#63, closes #62) — thanks @steffanhalv
- TypeScript declaration shipped and improved (#51, #52, closes #56) — thanks @jiangfengming
- text after a comment node is no longer discarded (#53) — thanks @tohosaku

## 3.0.1 and earlier

Historical entries, migrated from the original README:

- `3.0.1` Merged #47 which makes void elements check case insensitive. Thanks again, [@adrai](https://github.com/adrai) for this contribution!
- `3.0.0` Merged #46 which fixed an issue with handling of whitespace. Major version bump since this changes behavior for whitespace-only nodes (see merged PR and #45 for more details). Thanks [@adrai](https://github.com/adrai) for this contribution!
- `2.1.1` Merged #41 which fixed an issue with tag nesting. Thanks [@ericponto](https://github.com/ericponto).
- `2.1.0` Merged support for numeric tags, enabling the use case described in [PR #43](https://github.com/HenrikJoreteg/html-parse-stringify/pull/43). Thanks [@kachkaev](https://github.com/kachkaev).
- `2.0.3` Fixed failed publish (accidentally published an empty package).
- `2.0.2` Fixed incorrect attribution for a vulnerability disclosure. The vulnerability was discovered by Yeting Li; Sam Sanoop reached out about it.
- `2.0.1` Addressed a regular expression denial of service issue found by [Yeting Li](https://github.com/yetingli) and reported by [Sam Sanoop](https://twitter.com/snoopysecurity) of [Snyk](https://snyk.io/).
- `2.0.0` Updated to a more modern build system, switched to prettier. Added support for top level text nodes thanks to @jperl, and comments thanks to @pconerly.
- `1.0.0 - 1.0.3` No big changes, bug fixes and speed improvements.
