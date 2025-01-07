import path from "node:path";
import fs from "node:fs/promises";
import css from "@radically-straightforward/css";
import postcss from "postcss";
import postcssLightDarkFunction from "@csstools/postcss-light-dark-function";
import prettier from "prettier";

await fs.writeFile(
  path.join(import.meta.dirname, "index.css"),
  await prettier.format(
    (
      await postcss([postcssLightDarkFunction()]).process(
        css`
          @import "@radically-straightforward/css/static/index.css";

          [type~="popover"] {
            font-size: var(--font-size--3-5);
            line-height: var(--font-size--3-5--line-height);
            font-weight: 400;
            color: light-dark(var(--color--black), var(--color--white));
            background-color: light-dark(
              var(--color--slate--50),
              var(--color--slate--950)
            );
            width: max-content;
            max-width: min(calc(100% - var(--space--8)), var(--space--96));
            max-width: min(calc(100cqw - var(--space--8)), var(--space--96));
            padding: var(--space--1) var(--space--2);
            border: var(--border-width--1) solid
              light-dark(var(--color--slate--400), var(--color--slate--600));
            border-radius: var(--border-radius--1);
            box-shadow: var(--box-shadow--4);
            position: absolute;
            top: 0;
            left: 0;
            z-index: 1000;
            transition-property: var(--transition-property--opacity);
            transition-duration: var(--transition-duration--150);
            transition-timing-function: var(
              --transition-timing-function--ease-in-out
            );
            &:not([state~="open"]) {
              visibility: hidden;
              opacity: var(--opacity--0);
            }
            &.popover--error {
              color: light-dark(var(--color--red--800), var(--color--red--200));
              background-color: light-dark(
                var(--color--red--50),
                var(--color--red--950)
              );
              border-color: light-dark(
                var(--color--red--400),
                var(--color--red--600)
              );
            }
            ${[
              "red",
              "orange",
              "amber",
              "yellow",
              "lime",
              "green",
              "emerald",
              "teal",
              "cyan",
              "sky",
              "blue",
              "indigo",
              "violet",
              "purple",
              "fuchsia",
              "pink",
              "rose",
            ].map(
              (color) => css`
                &.popover--${color} {
                  color: light-dark(
                    var(--color--${color}--800),
                    var(--color--${color}--200)
                  );
                  background-color: light-dark(
                    var(--color--${color}--50),
                    var(--color--${color}--950)
                  );
                  border-color: light-dark(
                    var(--color--${color}--400),
                    var(--color--${color}--600)
                  );
                }
              `,
            )}
          }

          [key~="global-error"] {
            color: light-dark(var(--color--red--800), var(--color--red--200));
            background-color: light-dark(
              var(--color--red--50),
              var(--color--red--950)
            );
            width: max-content;
            max-width: min(calc(100% - var(--space--8)), var(--space--96));
            max-width: min(calc(100cqw - var(--space--8)), var(--space--96));
            padding: var(--space--1) var(--space--2);
            border: var(--border-width--1) solid
              light-dark(var(--color--red--400), var(--color--red--600));
            border-radius: var(--border-radius--1);
            margin: var(--space--0) auto;
            box-shadow: var(--box-shadow--4);
            position: fixed;
            top: var(--space--8);
            left: var(--space--2);
            right: var(--space--2);
            z-index: 2000;
          }

          [key~="progress-bar"] {
            background-color: light-dark(
              var(--color--blue--500),
              var(--color--blue--500)
            );
            height: var(--space--1);
            border-bottom: var(--border-width--1) solid
              light-dark(var(--color--blue--700), var(--color--blue--700));
            border-right: var(--border-width--1) solid
              light-dark(var(--color--blue--700), var(--color--blue--700));
            box-shadow: var(--box-shadow--4);
            position: fixed;
            top: var(--space--0);
            right: var(--space--0);
            left: var(--space--0);
            z-index: 3000;
            transition-property: width;
            transition-duration: var(--transition-duration--300);
            transition-timing-function: var(
              --transition-timing-function--ease-in-out
            );
          }
        `,
        { from: undefined },
      )
    ).css,
    { parser: "css" },
  ),
);
