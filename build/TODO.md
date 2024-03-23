# TODO

- Test sourcemaps
  - Server JavaScript which had `` css`___` `` and `` javascript`___` `` removed.
  - CSS and browser JavaScript.
- Investigate how to remove the `.example.example.example.example.example.example` hack that solves specificity issues
  - Use `@layer`
    - Relatively new and may not be polyfillable
  - esbuild’s CSS modules

## Authoring

- Define properties in the following order:
  1.  Font and text properties.
  2.  Colors, from foreground to background (for example, `color` then `background-color`).
  3.  Box model, from the inside out (for example, `width`, then `padding`, then `border`, then `margin`, then `outline`).
  4.  Positioning of element with respect to container (for example, `position`).
  5.  Positioning of children (for example, `display: flex;`).
  6.  Interactions (for example, `cursor`).
  7.  Transformations.
  8.  Animations.
  9.  States (for example, `:hover`).
  10. Variations (for example, breakpoints and dark mode).
  11. Children, including `::before` and `::after`.
- Don’t use the same set of breakpoints all the time. Analyze case by case, and set breakpoints accordingly. (And besides, CSS variables don’t work for setting breakpoints, because they’re defined in `:root`, and the media query lives outside the scope of a selector.)
- Layers
  - Global styles (for example, font)
  - Components for things like form inputs and buttons
  - Inline styles everywhere else
- Extraction: Often it doesn’t make sense to extract CSS, because the HTML structure is fundamental. Extracting using JavaScript functions makes more sense.
- Document: Don’t use `#ids`, because of specificity (use `key=""`s instead, for compatibility with `@radically-straightforward/javascript`)
- Interpolation
  - What I think of as interpolation many libraries call “dynamic” properties/styles/etc.
  - Astroturf
    - Allows two types of interpolation:
      - Values, using CSS variables.
      - Blocks, using extra classes.
        - Doesn’t seem to support nesting, because that requires you to parse the CSS & extract the classes nested inside.
  - vanilla-extract
    - Doesn’t seem to allow for interpolation.
  - Linaria
    - Only interpolation of values, using CSS variables.
  - Compiled
    - No interpolation at all
  - Conclusion:
    - `` css`...` `` is evaluated statically, and doesn’t have access to local variables.
      - That’s because of nesting, which would require you to parse the CSS & extract the classes nested inside.
      - But that’s alright, because CSS is static most of the time. Otherwise, you can use conditional addition of whole blocks of CSS, CSS variables in `style="___"`, and so forth.
    - `` javascript`...` `` allows for interpolation by JSON.stringify() and forwarding the arguments.
- Overwriting parent styles
  - Use the `&& { ... }` pattern:
    ```html
    <div
      css="${css`
        p {
          background-color: green;
        }
      `}"
    >
      <p>Hello</p>
      <p
        css="${css`
          && {
            background-color: blue;
          }
        `}"
      >
        Hello
      </p>
      <p>Hello</p>
    </div>
    ```

## Related Work

### Other CSS-in-JS Tools

- https://vanilla-extract.style
- https://xstyled.dev/
- https://linaria.dev/
- https://www.npmjs.com/package/csjs
- https://www.npmjs.com/package/radium

### Fast Non-Cryptographic Hashes

- Algorithms
  - **xxHash:** Self-proclaimed the fastest. (That’s my option)
  - djb2: Beautifully simple.
  - Murmur: Used by most other CSS-in-JS tools.
- Uses by other related tools:
  - esbuild: xxHash & Boost’s hash_combine (not really sure which does which, but I feel xxHash is doing the file hashing).
  - styled-components: djb2
    - Progressive, which means the same hash is updated across elements that need to be hashed
      - Good: Remarkably simple.
      - Bad: The stability of the hashes depends upon the order of the hashed objects, and one removal in the middle affects all the subsequent hashes.
  - Emotion: murmur2
  - vanilla-extract: @emotion/hash & MD5
  - Linaria: murmur2
  - Compiled: murmur2
  - All of these implementations are only for strings, not for arbitrary binary data, which we need to do cache busting of images, for example.
- xxHash Implementations for Node.js
  - All of them support `Buffer`s (binary data and/or strings) & `Stream`s.
  - Options below in order of popularity.
  - xxhashjs
    - Pure JavaScript (port).
    - Hasn’t been updated recently.
  - xxhash-wasm
    - Wasm
      - Maybe compiled from the canonical implementation, maybe hand-written?
    - Orders of magnitude faster than xxhashjs
    - Updated recently
      -xxhash
    - Node.js native module (old API) based on the canonical implementation.
    - Hasn’t been updated recently.
    - Annoying interface that requires a seed (which could be zero).
  - **xxhash-addon** (That’s my option)
    - Node.js native module (N-API) based on the canonical implementation.
    - Updated recently.
    - The only one to provide XXH3
  - https://github.com/bryc/code/tree/master/jshash/hashes

### JavaScript Compilation

- TypeScript transformation
  - The `tsc` compiler doesn’t yet let you run your own transforms.
  - And what if your project isn’t using TypeScript?
- esbuild doesn’t allow you to manipulate the AST
- **Babel Plugin** (That’s my option)
  - More powerful & easier to conceptualize.
- Babel Macros (https://github.com/kentcdodds/babel-plugin-macros)
  - Useful for `create-react-app` and things that don’t allow you to change configuration easily.
  - Macros have to be CommonJS
    - A Babel visitor must be synchronous and the visitor needs to `require()` the macro definition, but `import()` is async.
  - The interface is more limited (for example, I think it doesn’t give you easy access to the output file name).
  - The emotion documentation, for example, also recommends a Babel plugin approach instead of a macro if you can, because it allows for extra optimizations.
- recast (https://github.com/benjamn/recast & https://github.com/benjamn/ast-types)
  - It’s more for codemods, where a human is involved in looking at the output.
  - Doesn’t offer a lot more on top of Babel. It’s purpose is, for example, to preserve whitespace in the code, which we don’t care about.
- https://github.com/facebook/jscodeshift
  - codemod seems abandoned
  - Based on recast
  - Seems to only be useful if you’re already in the context of codemods
- https://github.com/acornjs/acorn
  - More popular than Babel, but requires other auxiliary tools
  - https://github.com/estools/escodegen
- https://github.com/swc-project/swc
  - Plugin is written in Rust.
- Useful references:
  - https://astexplorer.net
  - https://babeljs.io/docs/en/babel-types
  - https://github.com/jamiebuilds/babel-handbook/blob/master/translations/en/plugin-handbook.md
- Implementation references:
  - https://github.com/CraigCav/css-zero
  - https://github.com/callstack/linaria/tree/master/packages/babel
  - https://github.com/sgtpep/csstag
