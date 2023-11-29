/**
 * A type alias to make your type annotations more specific.
 */
export type CSS = string;

/**
 * A [tagged template](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Template_literals#tagged_templates) for CSS:
 *
 * ```typescript
 * css`
 *   body {
 *     background-color: ${"red"};
 *   }
 * `;
 * ```
 *
 * > **Note:** CSS is represented as strings and this tagged template works by performing string interpolation. This is conceptually simple and fast. To process the generated CSS, find issues automatically, and so forth, refer to [`@radically-straightforward/build`](https://npm.im/@radically-straightforward/build).
 *
 * Interpolated arrays are joined:
 *
 * ```typescript
 * css`
 *   ${["red", "green", "blue"].map(
 *     (color) => css`
 *       .text--${color} {
 *         color: ${color};
 *       }
 *     `,
 *   )}
 * `;
 * ```
 */
export default function css(
  templateStrings: TemplateStringsArray,
  ...substitutions: (CSS | CSS[])[]
): CSS {
  let output = "";

  for (const index of substitutions.keys()) {
    const templateString = templateStrings[index];
    output += templateString;

    const substitution = substitutions[index];
    if (Array.isArray(substitution))
      for (const substitutionPart of substitution) output += substitutionPart;
    else output += substitution;
  }

  output += templateStrings.at(-1);

  return output;
}
