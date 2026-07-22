// minimal tape -> vitest adapter so the historical test files stay untouched
import { test as vitestTest, expect } from 'vitest'

export default function test(name, fn) {
  vitestTest(
    name,
    () =>
      new Promise(resolve => {
        const t = {
          deepEqual: (actual, expected, msg) =>
            expect(actual, msg).toEqual(expected),
          equal: (actual, expected, msg) => expect(actual, msg).toBe(expected),
          ok: (value, msg) => expect(value, msg).toBeTruthy(),
          notOk: (value, msg) => expect(value, msg).toBeFalsy(),
          pass: () => {},
          end: resolve,
        }
        fn(t)
      }),
  )
}
