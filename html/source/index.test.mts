import test from "node:test";
import assert from "node:assert/strict";
import html, { HTML } from "./index.mjs";
import * as htmlHelpers from "./index.mjs";

// test("html``", () => {
//   assert.equal(html`<p>Leandro Facchinetti</p>`, `<p>Leandro Facchinetti</p>`);

//   assert.equal(
//     html`<p>${"Leandro Facchinetti"}</p>`,
//     `<p>Leandro Facchinetti</p>`
//   );

//   assert.equal(
//     html`<p>${`<script>alert(1);</script>`}</p>`,
//     `<p>&lt;script&gt;alert(1);&lt;/script&gt;</p>`
//   );

//   assert.equal(
//     html`<p>${html`${`<script>alert(1);</script>`}`}</p>`,
//     `<p>&amp;lt;script&amp;gt;alert(1);&amp;lt;/script&amp;gt;</p>`
//   );

//   assert.equal(
//     html`<p>$${html`${`<script>alert(1);</script>`}`}</p>`,
//     `<p>&lt;script&gt;alert(1);&lt;/script&gt;</p>`
//   );

//   assert.equal(
//     html`<p>$${`<span>Leandro Facchinetti</span>`}</p>`,
//     `<p><span>Leandro Facchinetti</span></p>`
//   );

//   assert.equal(
//     html`<p>${html`${"$"}${`<script>alert(1);</script>`}`}</p>`,
//     `<p>$&amp;lt;script&amp;gt;alert(1);&amp;lt;/script&amp;gt;</p>`
//   );

//   assert.equal(
//     html`<p>${["Leandro", " ", "Facchinetti"]}</p>`,
//     `<p>Leandro Facchinetti</p>`
//   );

//   assert.equal(
//     html`
//       <p>
//         ${["Leandro", " ", `<script>alert(1);</script>`, " ", "Facchinetti"]}
//       </p>
//     `,
//     `
//       <p>
//         Leandro &lt;script&gt;alert(1);&lt;/script&gt; Facchinetti
//       </p>
//     `
//   );

//   assert.equal(
//     html`
//       <ul>
//         $${[`<li>Leandro</li>`, `<li>Facchinetti</li>`]}
//       </ul>
//     `,
//     `
//       <ul>
//         <li>Leandro</li><li>Facchinetti</li>
//       </ul>
//     `
//   );

//   assert.equal(
//     // prettier-ignore
//     html`<p>Invalid character (backspace): |💩| |\b| ${"|\b|"} $${"|\b|"} ${["|\b|"]} $${["|\b|"]} |\b| |💩|</p>`,
//     `<p>Invalid character (backspace): |💩| |\b| || |\b| || |\b| |\b| |💩|</p>`
//   );
// });

// test("Benchmark", async (test) => {
//   const iterations = 5_000_000;

//   await test.test("@leafac/html", () => {
//     for (let iteration = 0; iteration < iterations; iteration++)
//       html`
//         <a href="${`https://leafac.com`}">
//           $${html`<strong>${"Hello World"}</strong>`}
//         </a>
//       `;
//   });

//   await test.test("ReactDOMServer.renderToStaticMarkup()", () => {
//     for (let iteration = 0; iteration < iterations; iteration++)
//       ReactDOMServer.renderToStaticMarkup(
//         React.createElement(
//           "a",
//           { href: `https://leafac.com` },
//           React.createElement("strong", null, "Hello World")
//         )
//       );
//   });
// });

test("escape()", () => {
  assert.equal(
    htmlHelpers.escape(
      `"Leandro Facchinetti <radically-straightforward@leafac.com>" & 'Louie'`,
    ),
    `&quot;Leandro Facchinetti &lt;radically-straightforward@leafac.com&gt;&quot; &amp; &apos;Louie&apos;`,
  );
});

test("invalidXMLCharacters", () => {
  assert.equal(
    `abc\u{0}\bdef💩`.replace(htmlHelpers.invalidXMLCharacters, ""),
    `abcdef💩`,
  );
});
