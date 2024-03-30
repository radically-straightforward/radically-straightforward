# Radically Straightforward · Build

**🏗️ Build static assets**

## Installation

```console
$ npm install --save-dev @radically-straightforward/build
```

## Usage

Author HTML, CSS, and browser JavaScript using [tagged templates](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Template_literals#tagged_templates) with [`@radically-straightforward/html`](https://github.com/radically-straightforward/radically-straightforward/tree/main/html), [`@radically-straightforward/css`](https://github.com/radically-straightforward/radically-straightforward/tree/main/css), and [`@radically-straightforward/javascript`](https://github.com/radically-straightforward/radically-straightforward/tree/main/javascript), for example:

**`source/index.mts`**

```typescript
import server from "@radically-straightforward/server";
import html from "@radically-straightforward/html";
import css from "@radically-straightforward/css";
import javascript from "@radically-straightforward/javascript";

const application = server();

css`
  @import "some-library";

  body {
    background-color: green;
  }

  /* Rest of global CSS, including ‘@font-face’s, typography, ‘.classes’, and so forth. */
`;

javascript`
  import someLibrary from "some-library";

  someLibrary.initialize();

  /* Rest of global JavaScript, including library initialization, global functions, and so forth. */
`;

application.push({
  method: "GET",
  pathname: "/",
  handler: (request, response) => {
    response.end(html`
      <!doctype html>
      <html>
        <head></head>
        <body>
          <h1
            css="${css`
              background-color: pink;
            `}"
            javascript="${javascript`
              console.log("Hello World");
            `}"
          >
            @radically-straightforward/build
          </h1>
        </body>
      </html>
    `);
  },
});
```

Use [`@radically-straightforward/tsconfig`](https://github.com/radically-straightforward/radically-straightforward/tree/main/tsconfig) and compile with TypeScript, which generates JavaScript files in the `build/` directory.

> **Note:** You may use other build processes, as long as they generate files at `build/**/*.mjs`.

Call `@radically-straightforward/build`:

> **Note:** `@radically-straightforward/build` overwrites the input files at `build/**/*.mjs`.

```console
$ npx build
```

> **Parameters**
>
> - **`--file-to-copy-with-hash`:** [Globs](https://www.npmjs.com/package/globby) of files to be copied into `build/static/`, for example, images, videos, and audios. The file names are appended with a hash of their contents to generate immutable names, for example, `image.jpg` may turn into `image--JF98DJ2LL.jpg`. Consult `build/static/paths.json` for a mapping between the names. The `--file-to-copy-with-hash` parameter may be provided multiple times for multiple globs.
> - **`--file-to-copy-without-hash`:** The same as `--file-to-copy-with-hash`, but the names of the files are preserved. This is useful for `favicon.ico` and other files which must have particular names.

`@radically-straightforward/build` does the following:

- Overwrites the input files at `build/**/*.mjs` (and their corresponding source maps) to extract the tagged templates with CSS and browser JavaScript.

- Uses [esbuild](https://esbuild.github.io/) to create a bundle of CSS and browser JavaScript. The result can be found in the `build/static/` directory. The file names contain hashes of their contents to make them immutable, and you may consult `build/static/paths.json` for a mapping between the names.

  > **Note:** The bundling process includes transpiling features such as [CSS nesting](https://developer.mozilla.org/en-US/docs/Web/CSS/CSS_nesting), including CSS prefixes, minifying, and so forth.

  > **Note:** See [`@radically-straightforward/javascript`](https://github.com/radically-straightforward/radically-straightforward/tree/main/javascript) for library support to use the extracted browser JavaScript.

- Copies the files specified with `--file-to-copy-with-hash` and `--file-to-copy-without-hash`.

## Related Work

TODO

---

- Document CSS specificity
  - `` `[css~="${identifier}"]`.repeat(6) ``
  - Overwrite parent styles with the `&& { ... }` pattern:
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
- Document that CSS extraction resolves interpolations at compile time, and browser JavaScript extraction resolves interpolations at run time.
  - Conditional addition of whole blocks of CSS
  - CSS variables in `style="___"`
- Investigate how to remove the `` `[css~="${identifier}"]`.repeat(6) `` hack that solves specificity issues
  - Use `@layer`
    - Relatively new and may not be polyfillable
  - esbuild’s CSS modules

## Related Work

- https://vanilla-extract.style
- https://xstyled.dev/
- https://linaria.dev/
- https://www.npmjs.com/package/csjs
- https://www.npmjs.com/package/radium

---

- https://github.com/CraigCav/css-zero
- https://github.com/callstack/linaria/tree/master/packages/babel
- https://github.com/sgtpep/csstag

---

**`build/index.mjs`**

```javascript
import server from "@radically-straightforward/server";
import html from "@radically-straightforward/html";

const application = server();

application.push({
  method: "GET",
  pathname: "/",
  handler: (request, response) => {
    response.end(html`
      <!doctype html>
      <html>
        <head></head>
        <body>
          <h1
            css="${"feozrypenksece"}"
            javascript="${JSON.stringify({
              function: "bjinlwvqrjhwxc",
              arguments: ["The value of ‘this’: "],
            })}"
          >
            @radically-straightforward/build
          </h1>
        </body>
      </html>
    `);
  },
});
```

**`build/static/index.css`**

```css
body {
  background-color: green;
}

[css~="feozrypenksece"][css~="feozrypenksece"][css~="feozrypenksece"][css~="feozrypenksece"][css~="feozrypenksece"][css~="feozrypenksece"] {
  background-color: pink;
}
```

> **Advanced:** The selector `[css~="feozrypenksece"]` is repeated six times to avoid issues with [specificity](https://specifishity.com/) in cases like the following:
>
> ```javascript
> html`
>   <div
>     css="${css`
>       background-color: pink;
>
>       p {
>         color: blue;
>       }
>     `}"
>   >
>     <p
>       css="${css`
>         color: red;
>       `}"
>     >
>       @radically-straightforward/build
>     </p>
>   </div>
> `;
> ```
>
> You want the `color` of the `<p>` to be `red` as set by the nearest CSS in the `<p>` itself, not `blue` as set by the parent `<div>`, but `[css~="PARENT-DIV"] p` has a higher specificity (0-0-2) than `[css~="CHILD-P"]` (0-0-1), and by repeating the selector six times we increase its precedence to 0-0-6. There isn’t anything magical about the number 6—it just seems to be a good number to cover all practical cases while maintaining the repetition relatively contained.

**`build/static/index.mjs`**

```javascript
(() => {
  someLibrary.initialize();
  javascript?.execute?.functions?.set?.(
    "bjinlwvqrjhwxc",
    async function (e, i) {
      console.log(i, this);
    },
  );
})();
```
