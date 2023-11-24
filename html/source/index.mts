// export type HTML = string;

// export default function html(
//   templateStrings: TemplateStringsArray,
//   ...substitutions: (string | string[])[]
// ): HTML {
//   let output = "";

//   for (const index of substitutions.keys()) {
//     const templateString = templateStrings[index];
//     const unsafeSubstitution = templateString.endsWith("$");
//     output += unsafeSubstitution ? templateString.slice(0, -1) : templateString;

//     const substitution = substitutions[index];
//     if (Array.isArray(substitution)) {
//       if (unsafeSubstitution)
//         for (const substitutionPart of substitution) output += substitutionPart;
//       else
//         for (const substitutionPart of substitution)
//           output += entities.escapeUTF8(
//             sanitizeXMLCharacters.sanitize(substitutionPart),
//           );
//     } else {
//       if (unsafeSubstitution) output += substitution;
//       else
//         output += entities.escapeUTF8(
//           sanitizeXMLCharacters.sanitize(substitution),
//         );
//     }
//   }

//   output += templateStrings.at(-1);

//   return output;
// }

/**
 * Escape characters that are HTML syntax and make `text` safe to interpolate in HTML.
 *
 * What sets this implementation apart from existing ones are the following:
 *
 * - **Performance.**
 *
 *   The performance of the `escape()` function matters because it’s used a lot to escape user input when rendering HTML with the `` html`...` `` tagged template.
 *
 *   The relatively new string function `.replaceAll()` when used with a string parameter is faster than `.replace()` with a global regular expression.
 *
 *   Perhaps surprisingly, calling `.replaceAll()` multiple times is faster than using a single regular expression of the kind `/[&<>"']/g`.
 *
 *   And even if we were to use a single regular expression, using `switch/case` would have been faster than the lookup tables that most other implementations use.
 *
 *   And also if we were to use regular expressions, using the flag `v` incurs on a very small but consistent performance penalty.
 *
 *   And also if we were to use regular expressions, `.replace()` is marginally but consistently faster than `.replaceAll()`.
 *
 *   Measurements performed in Node.js 21.2.0.
 *
 * - **Supports modern browsers only.**
 *
 *   Most other implementations treat characters such as `` ` ``, which could cause problems in Internet Explorer 8 and older.
 *
 *   Some other implementations avoid transforming `'` into the entity `&apos;`, because that entity isn’t understood by some versions of Internet Explorer.
 *
 * @see
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
 * 0x000000
 * 0x10FFFF
 */
export const invalidXMLCharacters = /[]/gv;
