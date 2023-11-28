/**
 * A type alias to make your type annotations more specific.
 */
export type HTML = string;

/**
 * A [tagged template](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Template_literals#tagged_templates) for HTML:
 *
 * ```typescript
 * html`<p>Leandro Facchinetti</p>`;
 * ```
 *
 * Sanitizes interpolations to prevent injection attacks:
 *
 * ```typescript
 * html`<p>${"Leandro Facchinetti"}</p>`;
 * // => `<p>Leandro Facchinetti</p>`
 * html`<p>${`<script>alert(1);</script>`}</p>`;
 * // => `<p>&lt;script&gt;alert(1);&lt;/script&gt;</p>`
 * ```
 *
 * Opt out of sanitization with `$${___}` instead of `${___}`:
 *
 * ```typescript
 * html`<div>$${`<p>Leandro Facchinetti</p>`}</div>`;
 * // => `<div><p>Leandro Facchinetti</p></div>`
 * ```
 *
 * > **Note:** Only opt out of sanitization if you are sure that the interpolated string is safe, in particular it must not contain user input, otherwise you’d be open to injection attacks:
 * >
 * > ```typescript
 * > html`<div>$${`<script>alert(1);</script>`}</div>`;
 * > // => `<div><script>alert(1);</script></div>`
 * > ```
 *
 * > **Note:** You must opt out of sanitization when the interpolated string is itself the result of `` html`___` ``, otherwise the escaping would be doubled:
 * >
 * > ```typescript
 * > html`
 * >   <div>
 * >     Good (escape once): $${html`<p>${`<script>alert(1);</script>`}</p>`}
 * >   </div>
 * > `
 * > // =>
 * > // `
 * > //   <div>
 * > //     Good (escape once): <p>&lt;script&gt;alert(1);&lt;/script&gt;</p>
 * > //   </div>
 * > // `
 * >
 * > html`
 * >   <div>
 * >     Bad (double escaping): ${html`<p>${`<script>alert(1);</script>`}</p>`}
 * >   </div>
 * > `
 * > // =>
 * > // `
 * > //   <div>
 * > //     Bad (double escaping): &lt;p&gt;&amp;lt;script&amp;gt;alert(1);&amp;lt;/script&amp;gt;&lt;/p&gt;
 * > //   </div>
 * > // `
 * > ```
 *
 * > **Note:** As an edge case, if you need a literal `$` before an interpolation, interpolate the `$` itself:
 * >
 * > ```typescript
 * > html`<p>${"$"}${"Leandro Facchinetti"}</p>`;
 * > // => `<p>$Leandro Facchinetti</p>`
 * > ```
 *
 * Interpolated lists are joined:
 *
 * ```typescript
 * html`<p>${["Leandro", " ", "Facchinetti"]}</p>`;
 * // => `<p>Leandro Facchinetti</p>`
 * ```
 *
 * > **Note:** Interpolated lists are sanitized:
 * >
 * > ```typescript
 * > html`
 * >   <p>${["Leandro", " ", "<script>alert(1);</script>", " ", "Facchinetti"]}</p>
 * > `;
 * > // =>
 * > // `
 * > //   <p>Leandro &lt;script&gt;alert(1);&lt;/script&gt; Facchinetti</p>
 * > // `
 * > ```
 * >
 * > You may opt out of the sanitization of interpolated lists by using `$${___}` instead of `${___}`:
 * >
 * > ```typescript
 * > html`
 * >   <ul>
 * >     $${[html`<li>Leandro</li>`, html`<li>Facchinetti</li>`]}
 * >   </ul>
 * > `;
 * > // =>
 * > // `
 * > //   <ul>
 * > //     <li>Leandro</li><li>Facchinetti</li>
 * > //   </ul>
 * > // `
 * > ```
 */
export default function html(
  templateStrings: TemplateStringsArray,
  ...substitutions: (string | string[])[]
): HTML {
  let output = "";

  for (const index of substitutions.keys()) {
    const templateString = templateStrings[index];
    const unsafeSubstitution = templateString.endsWith("$");
    output += unsafeSubstitution ? templateString.slice(0, -1) : templateString;

    const substitution = substitutions[index];
    if (Array.isArray(substitution)) {
      if (unsafeSubstitution)
        for (const substitutionPart of substitution) output += substitutionPart;
      else
        for (const substitutionPart of substitution)
          output += sanitize(substitutionPart);
    } else {
      if (unsafeSubstitution) output += substitution;
      else output += sanitize(substitution);
    }
  }

  output += templateStrings.at(-1);

  return output;
}

/**
 * Sanitize text for safe insertion in HTML.
 *
 * `sanitize()` escapes characters that are meaningful in HTML syntax and replaces invalid XML characters with a string of your choosing—by default, an empty string (`""`). You may provide the `replacement` as a parameter or set a new default by overwriting `sanitize.replacement`. For example, to use the Unicode replacement character:
 *
 * ```typescript
 * sanitize.replacement = "�";
 * ```
 *
 * > **Note:** The `` html`___` `` tagged template already calls `sanitize()`, so you must **not** call `sanitize()` yourself or the sanitization would happen twice.
 *
 * > **Note:** The sanitization that we refer to here is at the character level, not cleaning up certain tags while preserving others. For that, we recommend [`rehype-sanitize`](https://npm.im/rehype-sanitize).
 *
 * > **Note:** Even this sanitization isn’t enough in certain contexts, for example, HTML attributes without quotes `<a href=${sanitize(___)}>` could still lead to XSS attacks.
 */
export function sanitize(
  text: string,
  replacement: string = sanitize.replacement,
): string {
  return escape(text).replace(invalidXMLCharacters, replacement);
}

sanitize.replacement = "";

/**
 * Escape characters that are meaningful in HTML syntax.
 *
 * What sets this implementation apart from existing ones are the following:
 *
 * - **Performance.**
 *
 *   The performance of the `escape()` function matters because it’s used a lot to escape user input when rendering HTML with the `` html`___` `` tagged template.
 *
 *   The following are some details on how this implementation is made faster:
 *
 *   - The relatively new string function `.replaceAll()` when used with a string parameter is faster than `.replace()` with a global regular expression.
 *
 *   - Perhaps surprisingly, calling `.replaceAll()` multiple times is faster than using a single regular expression of the kind `/[&<>"']/g`.
 *
 *   - And even if we were to use a single regular expression, using `switch/case` would have been faster than the lookup tables that most other implementations use.
 *
 *   - And also if we were to use regular expressions, using the flag `v` incurs on a very small but consistent performance penalty.
 *
 *   - And also if we were to use regular expressions, `.replace()` is marginally but consistently faster than `.replaceAll()`.
 *
 *   - Measurements performed in Node.js 21.2.0.
 *
 * - **Supports modern browsers only.**
 *
 *   Most other implementations treat characters such as `` ` ``, which could cause problems in Internet Explorer 8 and older.
 *
 *   Some other implementations avoid transforming `'` into the entity `&apos;`, because that entity isn’t understood by some versions of Internet Explorer.
 *
 * **References**
 *
 * - <https://github.com/lodash/lodash/blob/ddfd9b11a0126db2302cb70ec9973b66baec0975/lodash.js#L384-L390>
 * - <https://github.com/mathiasbynens/he/blob/36afe179392226cf1b6ccdb16ebbb7a5a844d93a/src/he.js#L35-L50>
 * - <https://github.com/fb55/entities/blob/02a5ced5708fa4a91b9f17a038da24d1c6200f1f/src/escape.ts>
 * - <https://mathiasbynens.be/notes/ambiguous-ampersands>
 * - <https://wonko.com/post/html-escaping/>
 * - <https://stackoverflow.com/questions/7918868/how-to-escape-xml-entities-in-javascript>
 */
export function escape(text: string): string {
  return text
    .replaceAll(`&`, `&amp;`)
    .replaceAll(`<`, `&lt;`)
    .replaceAll(`>`, `&gt;`)
    .replaceAll(`"`, `&quot;`)
    .replaceAll(`'`, `&apos;`);
}

/**
 * A regular expression that matches invalid XML characters.
 *
 * Use this to remove or replace invalid XML characters, or simply to detect that a string doesn’t contain them. This is particularly useful when generating XML based on user input.
 *
 * This list is based on **Extensible Markup Language (XML) 1.1 (Second Edition), § 2.2 Characters** (https://www.w3.org/TR/xml11/#charsets). In particular, it includes:
 *
 * 1. `\u{0}`, which is always invalid in XML.
 * 2. The gaps between the allowed ranges in the production rule for `[2] Char` from the “Character Range” grammar.
 * 3. The discouraged characters from the **Note** in that section of the document.
 *
 * Notably, it does **not** include the “"compatibility characters", as defined in Unicode” mentioned in that section of the document, because that list was difficult to find and doesn’t seem to be very important.
 *
 * **Example**
 *
 * ```javascript
 * someUserInput.replace(invalidXMLCharacters, ""); // Remove invalid XML characters.
 * someUserInput.replace(invalidXMLCharacters, "�"); // Replace invalid XML characters with the Unicode replacement character.
 * someUserInput.match(invalidXMLCharacters); // Detect whether there are invalid XML characters.
 * ```
 *
 * **References**
 *
 * - <https://www.w3.org/TR/xml/#charsets>: An older version of the XML standard.
 * - <https://en.wikipedia.org/wiki/Valid_characters_in_XML>
 * - <https://en.wikipedia.org/wiki/XML>
 * - <https://github.com/felixrieseberg/sanitize-xml-string/blob/661bd881613c0f7555eb7d73b883b853b9826cc6/src/index.ts>: It was the inspiration for this code. The differences are:
 *   1. We export the regular expression, instead of encapsulating it in auxiliary functions, which arguably makes it more useful.
 *   2. We are more strict on what we consider to be valid characters (see description above).
 *   3. We use the regular expression flag `v` instead of `u` (see <https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/RegExp/unicodeSets>).
 */
export const invalidXMLCharacters: RegExp =
  /[\u{0}-\u{8}\u{B}-\u{C}\u{E}-\u{1F}\u{7F}-\u{84}\u{86}-\u{9F}\u{D800}-\u{DFFF}\u{FDD0}-\u{FDDF}\u{FFFE}-\u{FFFF}\u{1FFFE}-\u{1FFFF}\u{2FFFE}-\u{2FFFF}\u{3FFFE}-\u{3FFFF}\u{4FFFE}-\u{4FFFF}\u{5FFFE}-\u{5FFFF}\u{6FFFE}-\u{6FFFF}\u{7FFFE}-\u{7FFFF}\u{8FFFE}-\u{8FFFF}\u{9FFFE}-\u{9FFFF}\u{AFFFE}-\u{AFFFF}\u{BFFFE}-\u{BFFFF}\u{CFFFE}-\u{CFFFF}\u{DFFFE}-\u{DFFFF}\u{EFFFE}-\u{EFFFF}\u{FFFFE}-\u{FFFFF}\u{10FFFE}-\u{10FFFF}]/gv;
