/**
 * A type alias to make your type annotations more specific.
 */
export type JavaScript = string;

/**
 * A [tagged template](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Template_literals#tagged_templates) for browser JavaScript:
 *
 * ```typescript
 * javascript`
 *   console.log(${["Hello World", 2]});
 * `;
 * ```
 *
 * > **Note:** Browser JavaScript is represented as a string and this tagged template works by performing string interpolation. The substitutions are `JSON.stringify()`ed. This is conceptually simple and fast. To extract and process the browser JavaScript refer to [`@radically-straightforward/build`](https://www.npmjs.com/package/@radically-straightforward/build).
 */
export default function javascript(
  templateStrings: TemplateStringsArray,
  ...substitutions: any[]
): JavaScript {
  let output = "";

  for (const index of substitutions.keys()) {
    const templateString = templateStrings[index];
    output += templateString;

    const substitution = substitutions[index];
    output += JSON.stringify(substitution);
  }

  output += templateStrings.at(-1);

  return output;
}
