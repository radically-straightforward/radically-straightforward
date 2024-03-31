# TODO

- Investigate how to remove the `` `[css~="${identifier}"]`.repeat(6) `` hack that solves specificity issues
  - Use `@layer`
    - Relatively new and may not be polyfillable
  - esbuild’s CSS modules
