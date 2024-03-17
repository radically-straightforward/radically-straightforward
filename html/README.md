# Radically Straightforward · HTML

**📄 HTML in [Tagged Templates](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Template_literals#tagged_templates)**

## Installation

```console
$ npm install @radically-straightforward/html
```

> **Note:** We recommend the following tools:
>
> **[Prettier](https://prettier.io):** A code formatter that supports HTML in tagged templates.
>
> **[Prettier - Code formatter](https://marketplace.visualstudio.com/items?itemName=esbenp.prettier-vscode):** A [Visual Studio Code](https://code.visualstudio.com/) extension to use Prettier more ergonomically.
>
> **[es6-string-html](https://marketplace.visualstudio.com/items?itemName=Tobermory.es6-string-html):** A Visual Studio Code extension to syntax highlight HTML in tagged templates.

> **Note:** This tool is primarily designed for rendering HTML on the server with Node.js, but it also works in the browser.

## Usage

```typescript
import html, { HTML } from "@radically-straightforward/html";
import * as htmlHelpers from "@radically-straightforward/html";
```

<!-- DOCUMENTATION START: ./source/index.mts -->

### `HTML`

```typescript
export type HTML = string;
```

A type alias to make your type annotations more specific.

### `html()`

```typescript
export default function html(
  templateStrings: TemplateStringsArray,
  ...substitutions: (string | string[])[]
): HTML;
```

A [tagged template](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Template_literals#tagged_templates) for HTML:

```typescript
html`<p>Leandro Facchinetti</p>`;
```

Sanitizes interpolations to prevent injection attacks:

```typescript
html`<p>${"Leandro Facchinetti"}</p>`;
// => `<p>Leandro Facchinetti</p>`
html`<p>${`<script>alert(1);</script>`}</p>`;
// => `<p>&lt;script&gt;alert(1);&lt;/script&gt;</p>`
```

> **Note:** Sanitization is only part of the defense against injection attacks. Also deploy the following measures:
>
> - Serve your pages with UTF-8 encoding.
> - Have your server send the header `Content-Type: text/html; charset=utf-8`.
> - If you want to be extra sure that the encoding will be picked up by the browser, include a `<meta charset="utf-8" />` meta tag. (But HTML 5 documents must be encoded in UTF-8, so it should be sufficient to declare your document as HTML 5 by starting it with `<!DOCTYPE html>`.)
> - Always use quotes around HTML attributes (for example, `href="https://leafac.com"` instead of `href=https://leafac.com`).
> - See <https://wonko.com/post/html-escaping/>.

> **Note:** This library works by concatenating strings. It doesn’t prettify the output (if you need that you may, for example, call [Prettier](https://prettier.io/) programmatically on the output of `` html`___` ``), and it doesn’t generate any kind of [virtual DOM](https://reactjs.org/docs/faq-internals.html). The virtues of this approach are that this library is conceptually simple and it is one order of magnitude faster than [`ReactDOMServer.renderToStaticMarkup()`](https://react.dev/reference/react-dom/server/renderToStaticMarkup) (performance matters because rendering may be one of the most time-consuming tasks in responding to a request).

Opt out of sanitization with `$${___}` instead of `${___}`:

```typescript
html`<div>$${`<p>Leandro Facchinetti</p>`}</div>`;
// => `<div><p>Leandro Facchinetti</p></div>`
```

> **Note:** Only opt out of sanitization if you are sure that the interpolated string is safe, in particular it must not contain user input, otherwise you’d be open to injection attacks:
>
> ```typescript
> html`<div>$${`<script>alert(1);</script>`}</div>`;
> // => `<div><script>alert(1);</script></div>`
> ```

> **Note:** You must opt out of sanitization when the interpolated string is itself the result of `` html`___` ``, otherwise the escaping would be doubled:
>
> ```typescript
> html`
>   <div>
>     Good (escape once): $${html`<p>${`<script>alert(1);</script>`}</p>`}
>   </div>
> `;
> // =>
> // `
> //   <div>
> //     Good (escape once): <p>&lt;script&gt;alert(1);&lt;/script&gt;</p>
> //   </div>
> // `
>
> html`
>   <div>
>     Bad (double escaping): ${html`<p>${`<script>alert(1);</script>`}</p>`}
>   </div>
> `;
> // =>
> // `
> //   <div>
> //     Bad (double escaping): &lt;p&gt;&amp;lt;script&amp;gt;alert(1);&amp;lt;/script&amp;gt;&lt;/p&gt;
> //   </div>
> // `
> ```

> **Note:** As an edge case, if you need a literal `$` before an interpolation, interpolate the `$` itself:
>
> ```typescript
> html`<p>${"$"}${"Leandro Facchinetti"}</p>`;
> // => `<p>$Leandro Facchinetti</p>`
> ```

Interpolated arrays are joined:

```typescript
html`<p>${["Leandro", " ", "Facchinetti"]}</p>`;
// => `<p>Leandro Facchinetti</p>`
```

> **Note:** Interpolated arrays are sanitized:
>
> ```typescript
> html`
>   <p>${["Leandro", " ", "<script>alert(1);</script>", " ", "Facchinetti"]}</p>
> `;
> // =>
> // `
> //   <p>Leandro &lt;script&gt;alert(1);&lt;/script&gt; Facchinetti</p>
> // `
> ```
>
> You may opt out of the sanitization of interpolated arrays by using `$${___}` instead of `${___}`:
>
> ```typescript
> html`
>   <ul>
>     $${[html`<li>Leandro</li>`, html`<li>Facchinetti</li>`]}
>   </ul>
> `;
> // =>
> // `
> //   <ul>
> //     <li>Leandro</li><li>Facchinetti</li>
> //   </ul>
> // `
> ```

### `sanitize()`

```typescript
export function sanitize(
  text: string,
  replacement: string = sanitize.replacement,
): string;
```

Sanitize text for safe insertion in HTML.

`sanitize()` escapes characters that are meaningful in HTML syntax and replaces invalid XML characters with a string of your choosing—by default, an empty string (`""`). You may provide the `replacement` as a parameter or set a new default by overwriting `sanitize.replacement`. For example, to use the [Unicode replacement character](<https://en.wikipedia.org/wiki/Specials_(Unicode_block)#Replacement_character>):

```typescript
sanitize.replacement = "�";
```

> **Note:** The `` html`___` `` tagged template already calls `sanitize()`, so you must **not** call `sanitize()` yourself or the sanitization would happen twice.

> **Note:** The sanitization to which we refer here is at the character level, not cleaning up certain tags while preserving others. For that, we recommend [`rehype-sanitize`](https://www.npmjs.com/package/rehype-sanitize).

> **Note:** Even this sanitization isn’t enough in certain contexts, for example, HTML attributes without quotes (`<a href=${sanitize(___)}>`) could still lead to XSS attacks.

### `escape()`

```typescript
export function escape(text: string): string;
```

Escape characters that are meaningful in HTML syntax.

What sets this implementation apart from existing ones are the following:

- **Performance.**

  The performance of the `escape()` function matters because it’s used frequently to escape user input when rendering HTML with the `` html`___` `` tagged template.

  The following are some details on how this implementation is made faster:

  - The relatively new string function `replaceAll()` when used with a string parameter is faster than `replace()` with a regular expression.

  - Perhaps surprisingly, calling `replaceAll()` multiple times is faster than using a single regular expression of the kind `/[&<>"']/g`.

  - And even if we were to use a single regular expression, using `switch/case` would have been faster than the lookup tables that most other implementations use.

  - And also if we were to use regular expressions, using the flag `v` incurs on a very small but consistent performance penalty.

  - And also if we were to use regular expressions, `replace()` is marginally but consistently faster than `replaceAll()`.

  - Measurements performed in Node.js 21.2.0.

- **Supports modern browsers only.**

  Most other implementations escape characters such as `` ` ``, which could cause problems in Internet Explorer 8 and older.

  Some other implementations avoid transforming `'` into the entity `&apos;`, because that entity isn’t understood by some versions of Internet Explorer.

**References**

- <https://github.com/lodash/lodash/blob/ddfd9b11a0126db2302cb70ec9973b66baec0975/lodash.js#L384-L390>
- <https://github.com/mathiasbynens/he/blob/36afe179392226cf1b6ccdb16ebbb7a5a844d93a/src/he.js#L35-L50>
- <https://github.com/fb55/entities/blob/02a5ced5708fa4a91b9f17a038da24d1c6200f1f/src/escape.ts>
- <https://mathiasbynens.be/notes/ambiguous-ampersands>
- <https://wonko.com/post/html-escaping/>
- <https://stackoverflow.com/questions/7918868/how-to-escape-xml-entities-in-javascript>

### `invalidXMLCharacters`

```typescript
export const invalidXMLCharacters: RegExp;
```

A regular expression that matches invalid XML characters.

Use this to remove or replace invalid XML characters, or simply to detect that a string doesn’t contain them. This is particularly useful when generating XML based on user input.

This list is based on **Extensible Markup Language (XML) 1.1 (Second Edition), § 2.2 Characters** (https://www.w3.org/TR/xml11/#charsets). In particular, it includes:

1. `\u{0}`, which is always invalid in XML.
2. The gaps between the allowed ranges in the production rule for `[2] Char` from the “Character Range” grammar.
3. The discouraged characters from the **Note** in that section of the document.

Notably, it does **not** include the “"compatibility characters", as defined in Unicode” mentioned in that section of the document, because that list was difficult to find and doesn’t seem to be very important.

**Example**

```javascript
someUserInput.replace(invalidXMLCharacters, ""); // Remove invalid XML characters.
someUserInput.replace(invalidXMLCharacters, "�"); // Replace invalid XML characters with the Unicode replacement character.
someUserInput.match(invalidXMLCharacters); // Detect whether there are invalid XML characters.
```

**References**

- <https://www.w3.org/TR/xml/#charsets>: An older version of the XML standard.
- <https://en.wikipedia.org/wiki/Valid_characters_in_XML>
- <https://en.wikipedia.org/wiki/XML>
- <https://github.com/felixrieseberg/sanitize-xml-string/blob/661bd881613c0f7555eb7d73b883b853b9826cc6/src/index.ts>: It was the inspiration for this code. The differences are:
  1. We export the regular expression, instead of encapsulating it in auxiliary functions, which arguably makes it more useful.
  2. We are more strict on what we consider to be valid characters (see description above).
  3. We use the regular expression flag `v` instead of `u` (see <https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/RegExp/unicodeSets>).

<!-- DOCUMENTATION END: ./source/index.mts -->

## Related Work

### [`html-template-tag`](https://www.npmjs.com/package/html-template-tag)

- Was a major inspiration for this. Its design is simple and great. In particular, I love (and stole) the idea of using `$${___}` for opting out of sanitization.
- [Doesn’t encode arrays by default](https://github.com/AntonioVdlC/html-template-tag/issues/10).

### [`common-tags`](https://www.npmjs.com/package/common-tags)

- Doesn’t encode interpolated values by default.
- Uses the `safeHtml` tag, which isn’t recognized by Prettier or the Visual Studio Code extension es6-string-html extension.

### [`escape-html-template-tag`](https://www.npmjs.com/package/escape-html-template-tag)

- Less ergonomic API with `escapeHtml.safe()` and `escapeHtml.join()` instead of the `$${}` trick.

### [`lit-html`](https://www.npmjs.com/package/lit-html), [`nanohtml`](https://www.npmjs.com/package/nanohtml), [`htm`](https://www.npmjs.com/package/htm), and [`viperhtml`](https://www.npmjs.com/package/viperhtml)

- Have the notion of virtual DOM instead of simple string concatenation.
