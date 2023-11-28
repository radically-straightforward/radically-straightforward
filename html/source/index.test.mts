import test from "node:test";
import assert from "node:assert/strict";
import html, { HTML } from "./index.mjs";
import * as htmlHelpers from "./index.mjs";

test("html``", () => {
  assert.equal(html`<p>Leandro Facchinetti</p>`, `<p>Leandro Facchinetti</p>`);

  assert.equal(
    html`<p>${"Leandro Facchinetti"}</p>`,
    `<p>Leandro Facchinetti</p>`,
  );

  assert.equal(
    html`<p>${`<script>alert(1);</script>`}</p>`,
    `<p>&lt;script&gt;alert(1);&lt;/script&gt;</p>`,
  );

  assert.equal(
    html`<div>$${`<p>Leandro Facchinetti</p>`}</div>`,
    `<div><p>Leandro Facchinetti</p></div>`,
  );

  assert.equal(
    html`<div>$${`<script>alert(1);</script>`}</div>`,
    `<div><script>alert(1);</script></div>`,
  );

  assert.equal(
    html`<div>$${html`<p>${`<script>alert(1);</script>`}</p>`}</div>`,
    `<div><p>&lt;script&gt;alert(1);&lt;/script&gt;</p></div>`,
  );

  assert.equal(
    html`<div>${html`Double escaping: ${`<script>alert(1);</script>`}`}</div>`,
    `<div>Double escaping: &amp;lt;script&amp;gt;alert(1);&amp;lt;/script&amp;gt;</div>`,
  );

  assert.equal(
    html`<p>${"$"}${"Leandro Facchinetti"}</p>`,
    `<p>$Leandro Facchinetti</p>`,
  );

  assert.equal(
    html`<p>${["Leandro", " ", "Facchinetti"]}</p>`,
    `<p>Leandro Facchinetti</p>`,
  );

  assert.equal(
    html`
      <p>
        ${["Leandro", " ", "<script>alert(1);</script>", " ", "Facchinetti"]}
      </p>
    `,
    `
      <p>
        Leandro &lt;script&gt;alert(1);&lt;/script&gt; Facchinetti
      </p>
    `,
  );

  assert.equal(
    html`
      <ul>
        $${[html`<li>Leandro</li>`, html`<li>Facchinetti</li>`]}
      </ul>
    `,
    `
      <ul>
        <li>Leandro</li><li>Facchinetti</li>
      </ul>
    `,
  );

  assert.equal(
    // prettier-ignore
    html`<p>Invalid character (backspace): |💩| |\b| ${"|\b|"} $${"|\b|"} ${["|\b|"]} $${["|\b|"]} |\b| |💩|</p>`,
    `<p>Invalid character (backspace): |💩| |\b| || |\b| || |\b| |\b| |💩|</p>`,
  );
});

test("sanitize()", () => {
  assert.equal(
    htmlHelpers.sanitize(
      `"Leandro Facchinetti \u{0}\b<radically-straightforward@leafac.com>" & 'Louie'`,
    ),
    `&quot;Leandro Facchinetti &lt;radically-straightforward@leafac.com&gt;&quot; &amp; &apos;Louie&apos;`,
  );
});

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
