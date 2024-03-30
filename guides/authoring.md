# Authoring

## CSS

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
- Extraction: Often it doesn’t make sense to extract CSS, because it doesn’t make sense without the corresponding HTML structure. It makes more sense to extract HTML & CSS into a function.
- Document: Don’t use `#ids`, because of specificity (use `key=""`s instead, for compatibility with `@radically-straightforward/javascript`)
- Use classes for everything, not just tag name selectors, because you may want an `<a>` to look like a button, and a `button` to look like a link.
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
