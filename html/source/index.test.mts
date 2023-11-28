import test from "node:test";
import assert from "node:assert/strict";
import html, { HTML } from "./index.mjs";
import * as htmlHelpers from "./index.mjs";

test("html`___`", () => {
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
    html`
      <div>
        Good (escape once): $${html`<p>${`<script>alert(1);</script>`}</p>`}
      </div>
    `,
    `
      <div>
        Good (escape once): <p>&lt;script&gt;alert(1);&lt;/script&gt;</p>
      </div>
    `,
  );

  assert.equal(
    html`
      <div>
        Bad (double escaping): ${html`<p>${`<script>alert(1);</script>`}</p>`}
      </div>
    `,
    `
      <div>
        Bad (double escaping): &lt;p&gt;&amp;lt;script&amp;gt;alert(1);&amp;lt;/script&amp;gt;&lt;/p&gt;
      </div>
    `,
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
