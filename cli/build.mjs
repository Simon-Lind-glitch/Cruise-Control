// Bundle the cc CLI into a single self-contained ESM file (dist/cc.js).
//
// Two non-obvious bits:
//  * banner injects a real `require` via createRequire — @oclif/core does CommonJS-style
//    `require()` of node builtins internally, which an ESM bundle otherwise can't provide
//    ("Dynamic require of 'node:url' is not supported").
//  * minify keeps the committed artifact small (oclif's tree is large unminified).
import {build} from 'esbuild'

await build({
  entryPoints: ['bin/run.ts'],
  bundle: true,
  platform: 'node',
  format: 'esm',
  target: 'node22',
  outfile: 'dist/cc.js',
  minify: true,
  legalComments: 'none',
  banner: {
    js: [
      '#!/usr/bin/env node',
      "import {createRequire as __ccCreateRequire} from 'node:module';",
      'const require = __ccCreateRequire(import.meta.url);',
    ].join('\n'),
  },
})

console.log('built dist/cc.js')
