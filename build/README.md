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
              console.log(${"The value of ‘this’: "}, this);
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

Create entrypoints for CSS and browser JavaScript, for example:

**`static/index.css`**

```css
@import "some-library";

body {
  background-color: green;
}

/* Rest of global stylesheet, including `.classes`... */
```

**`static/index.mjs`**

```javascript
import someLibrary from "some-library";

someLibrary.initialize();

/* Rest of global JavaScript... */
```

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

- Overwrites the input files at `build/**/*.mjs` (and their corresponding source maps) to extract the tagged templates with CSS and browser JavaScript:

  **`build/index.mjs`**

  ```typescript
  import server from "@radically-straightforward/server";
  import html from "@radically-straightforward/html";
  import css from "@radically-straightforward/css";
  import javascript from "@radically-straightforward/javascript";

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
              css="${"alkjplsd"}"
              javascript="${JSON.stringify({
                function: "akdljfpqlserk",
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

  > **Note:** See [`@radically-straightforward/javascript`](https://github.com/radically-straightforward/radically-straightforward/tree/main/javascript) for library support to use the extracted browser JavaScript.

- Uses [esbuild](https://esbuild.github.io/) to bundle the entrypoints at `static/index.css` and `static/index.mjs` along with the CSS and browser JavaScript extracted above. The result can be found in the `build/static/` directory. The file names contain hashes of their contents to make them immutable, and you may consult `build/static/paths.json` for a mapping between the names.

- Copies the files specified with `--file-to-copy-with-hash` and `--file-to-copy-without-hash`.

## Related Work

TODO
