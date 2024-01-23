<!--
    - [ ] https://www.npmjs.com/package/csjs
    - [ ] https://www.npmjs.com/package/radium



    https://vanilla-extract.style
    Type checking & autocomplete. I’m totally stealing that idea! Instead of writing:

color: var(--color--green--200);

You’ll write something like:

color: ${css.color.green[200]};


xxhash

https://xstyled.dev

https://github.com/bryc/code/tree/master/jshash/hashes

https://linaria.dev/
 -->

<!-- What else is there to love about Tailwind? The docs (including the book), and the design system -->

<!-- And sometimes in those situations extracting CSS components isn’t the right level of abstraction, because the component also has opinions on the HTML. React, for example, but we can do it much more simply. -->

<!-- Put a code example right away -->

<!-- <meta
            name="viewport"
            content="width=device-width, initial-scale=1, maximum-scale=1"
          /> -->

<!--
trust your eyes

screens: don’t use a set of breakpoints, instead look at the interface, determine when it isn’t working anymore, and add a breakpoint there (also, CSS custom properties don’t work in media queries)

approach:
reset
design system
global styles (for example, font)
components for things like form inputs and buttons
inline styles everywhere else

think about styles and order them in the stylesheet inside-out


- https://tailwindcss.com/docs/utility-first#why-not-just-use-inline-styles

      // TODO: Make this possibly faster by using Rehype instead of JSDOM (though we have to benchmark to be sure…)
      //       https://developer.mozilla.org/en-US/docs/Web/CSS/Pseudo-classes
      //         https://www.npmjs.com/package/pseudo-classes
      //       https://developer.mozilla.org/en-US/docs/Web/CSS/Pseudo-elements
      //       https://github.com/postcss/postcss
      //       https://github.com/brettstimmerman/mensch
      // https://stackoverflow.com/questions/10963997/css-parser-for-javascript
      // https://github.com/CSSLint/parser-lib
      // https://github.com/NV/CSSOM
      // https://github.com/reworkcss/css
      // https://www.npmjs.com/package/cssparser
      // https://rahulnpadalkar.medium.com/css-parser-in-javascript-578eba0977e5
      // https://github.com/rahulnpadalkar/CSSParser
      // http://glazman.org/JSCSSP/

      // https://github.com/postcss/postcss-scss
      // https://github.com/postcss/postcss-js
      // https://github.com/jonathantneal/precss
      // https://github.com/postcss/postcss-nested (more installations than the one below)
      // https://github.com/jonathantneal/postcss-nesting (closer to the standard and more stars than the one above)

      // https://github.com/jsdom/cssstyle
      // https://github.com/reworkcss/css
      // https://github.com/css/csso
      // https://github.com/csstree/csstree
      // https://github.com/brettstimmerman/mensch



Use @leafac/html with [Prettier](https://prettier.io) (automatic formatting), and the Visual Studio Code extensions [Prettier - Code formatter](https://marketplace.visualstudio.com/items?itemName=esbenp.prettier-vscode) (Prettier support) and [es6-string-html](https://marketplace.visualstudio.com/items?itemName=Tobermory.es6-string-html) (syntax highlighting).


### Related Projects


### Prior Art


-->

# Radically Straightforward · CSS

**💄 CSS in [Tagged Templates](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Template_literals#tagged_templates)**

## Installation

```console
$ npm install @radically-straightforward/css
```

> **Note:** We recommend the following tools:
>
> **[Prettier](https://prettier.io):** A code formatter that supports CSS in tagged templates.
>
> **[Prettier - Code formatter](https://marketplace.visualstudio.com/items?itemName=esbenp.prettier-vscode):** A [Visual Studio Code](https://code.visualstudio.com/) extension to use Prettier more ergonomically.

## Usage

```typescript
import css, { CSS } from "@radically-straightforward/css";
```

<!-- DOCUMENTATION START: ./source/index.mts -->

### `CSS`

```typescript
export type CSS = string;
```

A type alias to make your type annotations more specific.

### `css()`

```typescript
export default function css(
  templateStrings: TemplateStringsArray,
  ...substitutions: (CSS | CSS[])[]
): CSS;
```

A [tagged template](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Template_literals#tagged_templates) for CSS:

```typescript
css`
  body {
    background-color: ${"red"};
  }
`;
```

> **Note:** CSS is represented as strings and this tagged template works by performing string interpolation. This is conceptually simple and fast. To process the generated CSS, find issues automatically, and so forth, refer to [`@radically-straightforward/build`](https://www.npmjs.com/package/@radically-straightforward/build).

Interpolated arrays are joined:

```typescript
css`
  ${["red", "green", "blue"].map(
    (color) => css`
      .text--${color} {
        color: ${color};
      }
    `,
  )}
`;
```

<!-- DOCUMENTATION END: ./source/index.mts -->

### CSS Framework

Beyond the tagged template to define CSS in JavaScript, `@radically-straightforward/css` also includes a CSS framework featuring a CSS reset, a design system, and helper classes.

To use this framework:

1. Use HTML 5 and include a `<meta name="viewport" />` meta tag:

   ```html
   <!doctype html>
   <html lang="en">
     <head>
       <meta
         name="viewport"
         content="width=device-width, initial-scale=1, maximum-scale=1"
       />
       <!-- ... -->
     </head>
     <body>
       <!-- ... -->
     </body>
   </html>
   ```

   > **Note:** Unfortunately there isn’t a way to set properties about the viewport from CSS, which is why the `<meta name="viewport" />` meta tag is necessary.

   > **Note:** `maximum-scale=1` prevents iOS from zooming into the viewport when a form field is active. People on the internet have written that this could be an accessibility issue because it would prevent users from zooming in with a pinch gesture, but our tests reveal that this is not the case.

2. Include [`@radically-straightforward/css/static/index.css`](./static/index.css) at the top of your CSS:

   ```css
   @import "@radically-straightforward/css/static/index.css";
   /* ... */
   ```

3. Learn about the framework, particularly the design system, by reading the [the source](./static/index.css).

4. (Optional but recommended) Follow the CSS coding style of the framework. In particular, define properties in the following order:

   1. Font and text properties.
   2. Colors, from foreground to background (for example, `color` then `background-color`).
   3. Box model, from the inside out (for example, `width`, then `padding`, then `border`, then `margin`, then `outline`).
   4. Positioning of element with respect to container (for example, `position`).
   5. Positioning of children (for example, `display: flex;`).
   6. Interactions (for example, `cursor`).
   7. Transformations.
   8. Animations.
   9. States (for example, `:hover`).
   10. Variations (for example, breakpoints and dark mode).
   11. Children, including `::before` and `::after`.

5. (Optional but recommended) Transpile for broader browser support and bundle your CSS. This framework uses modern CSS features, for example, CSS Nesting and properties that need to be prefixed. We recommend [`@radically-straightforward/build`](https://npm.im/@radically-straightforward/build).

## Related Work

### [Tailwind](https://tailwindcss.com/)

`@radically-straightforward/css` follows some of the ideas popularized by Tailwind:

- Colocate HTML and its corresponding CSS.

- Include few opinions on style, so that every design looks unique.

- Include a design system with a selection of spaces, colors, fonts, and so forth.

  > **Note**: To learn more about how to use a design system, we recommend [Refactoring UI](https://www.refactoringui.com/) and [Practical Typography](https://practicaltypography.com/).

But `@radically-straightforward/css` is different from Tailwind in how it solves [some issues](https://tailwindcss.com/docs/utility-first#why-not-just-use-inline-styles):

- **Designing with constraints.** The design systems in Tailwind and `@radically-straightforward/css` are largely identical, because we ported Tailwind’s design system. But Tailwind presents its design system as classes, and `@radically-straightforward/css` presents its design system as CSS variables.

  The class names in Tailwind are an extra layer of indirection that you need to learn about: at some point you will have to translate the CSS you find in [MDN](https://developer.mozilla.org/en-US/docs/Web/CSS), blog posts, and so forth, into Tailwind class names. Copying-and-pasting doesn’t work anymore, and using third-party libraries may be awkward.

  In the best of cases the layer of indirection is small, for example, the class `.float-right` corresponds to the CSS `float: right;`. In these cases the class names simply add noise over the CSS that you would write normally.

  In the worst of cases the layer of indirection is more confusing, for example, the class `.m-2` corresponds to the CSS `margin: 0.5rem;`. In Tailwind’s defense, abbreviations like these are used only on the most common properties, and they’re for the most part tasteful. But they’re still one extra layer of indirection, and they can be disorienting, especially to beginners, and especially when they pile up.

  In addition, customizing the design system in Tailwind involves learning about a whole customization system.

  The CSS variables in `@radically-straightforward/css`, on the other hand, integrate seamlessly with the CSS you already know and write, including CSS imported from third-party libraries. Copying-and-pasting snippets from the internet just works and goes well with the rest of the style in the codebase. And customizing is a matter of setting new CSS variables.

- **Responsive design** and **Hover, focus, and other states.** Media queries, pseudo-elements, children, and so forth, are supported in `@radically-straightforward/css` paired with `@radically-straightforward/build`, all while still colocating HTML and its corresponding CSS—you can think of it as inline styles infused with the power of nesting.

> **Note:** Another small quality-of-life gain of `@radically-straightforward/build` over Tailwind: Prettier formats CSS in tagged templates over multiple lines, making the code more readable than the long lines of `class`es in Tailwind.

### [Open Props](https://open-props.style)

It’s a design system similar in spirit to the one included in `@radically-straightforward/css`, in the sense that it’s also presented a CSS variables. Open Props takes the approach of normalizing CSS across browsers, instead of resetting browser styles; it comes with more transitions and animations, and fewer sizes. It also comes with an approach of fixed breakpoints, while in `@radically-straightforward/css`’s style we prefer to use breakpoints case-by-case.
