# Changelog

## 1.0.5 · 2024-11-08

- Changed the `.noninteractive` class into the `[state~="noninteractive"]` state.

## 1.0.4 · 2024-07-16

- Removed `--space--prose`.
- Reset `<button>` text alignment.

## 1.0.3 · 2024-06-10

- Added `-webkit-tap-highlight-color: transparent;` to remove tap highlight on Android.

## 1.0.2 · 2024-06-10

- Added `touch-action: none;` to the `.noninteractive` class to allow for the `pointermove` event to work.

## 1.0.1 · 2024-05-30

- Added the `.noninteractive` class.

## 1.0.0 · 2024-01-23

- Initial release, based on [`@leafac/css`](https://www.npmjs.com/package/@leafac/css). There are breaking changes: Mostly variables that have been renamed into a better scheme, and some that have been removed:

  | `@leafac/css`                          | `@radically-straightforward/css`               |
  | -------------------------------------- | ---------------------------------------------- |
  |                                        | **No longer a variable**                       |
  | `--color--transparent`                 | `transparent`                                  |
  | `--color--current`                     | `currentColor`                                 |
  | ———                                    | ———                                            |
  | `--font-size--2xs`                     | `--font-size--2-5`                             |
  | `--line-height--2xs`                   | `--font-size--2-5--line-height`                |
  | `--font-size--xs`                      | `--font-size--3`                               |
  | `--line-height--xs`                    | `--font-size--3--line-height`                  |
  | `--font-size--sm`                      | `--font-size--3-5`                             |
  | `--line-height--sm`                    | `--font-size--3-5--line-height`                |
  | `--font-size--base`                    | `--font-size--4`                               |
  | `--line-height--base`                  | `--font-size--4--line-height`                  |
  | `--font-size--lg`                      | `--font-size--4-5`                             |
  | `--line-height--lg`                    | `--font-size--4-5--line-height`                |
  | `--font-size--xl`                      | `--font-size--5`                               |
  | `--line-height--xl`                    | `--font-size--5--line-height`                  |
  | `--font-size--2xl`                     | `--font-size--6`                               |
  | `--line-height--2xl`                   | `--font-size--6--line-height`                  |
  | `--font-size--3xl`                     | `--font-size--7-5`                             |
  | `--line-height--3xl`                   | `--font-size--7-5--line-height`                |
  | `--font-size--4xl`                     | `--font-size--9`                               |
  | `--line-height--4xl`                   | `--font-size--9--line-height`                  |
  | `--font-size--5xl`                     | `--font-size--12`                              |
  | `--line-height--5xl`                   | `--font-size--12--line-height`                 |
  | `--font-size--6xl`                     | `--font-size--15`                              |
  | `--line-height--6xl`                   | `--font-size--15--line-height`                 |
  | `--font-size--7xl`                     | `--font-size--18`                              |
  | `--line-height--7xl`                   | `--font-size--18--line-height`                 |
  | `--font-size--8xl`                     | `--font-size--24`                              |
  | `--line-height--8xl`                   | `--font-size--24--line-height`                 |
  | `--font-size--9xl`                     | `--font-size--32`                              |
  | `--line-height--9xl`                   | `--font-size--32--line-height`                 |
  | ———                                    | ———                                            |
  |                                        | **No longer a variable**                       |
  | `--font-weight--thin`                  | `100`                                          |
  | `--font-weight--extralight`            | `200`                                          |
  | `--font-weight--light`                 | `300`                                          |
  | `--font-weight--normal`                | `400`                                          |
  | `--font-weight--medium`                | `500`                                          |
  | `--font-weight--semibold`              | `600`                                          |
  | `--font-weight--bold`                  | `700`                                          |
  | `--font-weight--extrabold`             | `800`                                          |
  | `--font-weight--black`                 | `900`                                          |
  | ———                                    | ———                                            |
  | `--letter-spacing--tighter`            | `--letter-spacing---2`                         |
  | `--letter-spacing--tight`              | `--letter-spacing---1`                         |
  | `--letter-spacing--normal`             | `--letter-spacing--0`                          |
  | `--letter-spacing--wide`               | `--letter-spacing--1`                          |
  | `--letter-spacing--wider`              | `--letter-spacing--2`                          |
  | `--letter-spacing--widest`             | `--letter-spacing--4`                          |
  | ———                                    | ———                                            |
  | `--width--0`                           | `--space--0`                                   |
  | `--width--xs`                          | `--space--80`                                  |
  | `--width--sm`                          | `--space--96`                                  |
  | `--width--md`                          | `--space--112`                                 |
  | `--width--lg`                          | `--space--128`                                 |
  | `--width--xl`                          | `--space--144`                                 |
  | `--width--2xl`                         | `--space--168`                                 |
  | `--width--3xl`                         | `--space--192`                                 |
  | `--width--4xl`                         | `--space--224`                                 |
  | `--width--5xl`                         | `--space--256`                                 |
  | `--width--6xl`                         | `--space--288`                                 |
  | `--width--7xl`                         | `--space--320`                                 |
  | `--width--prose`                       | `--space--prose`                               |
  | ———                                    | ———                                            |
  | `--border-radius--none`                | `--border-radius--0`                           |
  | `--border-radius--sm`                  | `--border-radius--0-5`                         |
  | `--border-radius--base`                | `--border-radius--1`                           |
  | `--border-radius--md`                  | `--border-radius--1-5`                         |
  | `--border-radius--lg`                  | `--border-radius--2`                           |
  | `--border-radius--xl`                  | `--border-radius--3`                           |
  | `--border-radius--2xl`                 | `--border-radius--4`                           |
  | `--border-radius--3xl`                 | `--border-radius--6`                           |
  | `--border-radius--full`                | `--border-radius--round`                       |
  | ———                                    | ———                                            |
  |                                        | **No longer a variable**                       |
  | `--outline--none`                      | `2px solid transparent`                        |
  | `--outline--white`                     | `2px dotted white`                             |
  | `--outline--black`                     | `2px dotted black`                             |
  | ———                                    | ———                                            |
  | `--box-shadow--none`                   | `--box-shadow--0`                              |
  | `--box-shadow--sm`                     | `--box-shadow--1`                              |
  | `--box-shadow--base`                   | `--box-shadow--2`                              |
  | `--box-shadow--md`                     | `--box-shadow--4`                              |
  | `--box-shadow--lg`                     | `--box-shadow--10`                             |
  | `--box-shadow--xl`                     | `--box-shadow--20`                             |
  | `--box-shadow--2xl`                    | `--box-shadow--25`                             |
  | `--box-shadow--inner`                  | `--box-shadow--inset`                          |
  | ———                                    | ———                                            |
  | `--stroke-width--0`                    | `--border-width--0`                            |
  | `--stroke-width--1`                    | `--border-width--1`                            |
  | `--stroke-width--2`                    | `--border-width--2`                            |
  | ———                                    | ———                                            |
  |                                        | **No longer a variable**                       |
  | `--order--none`                        | `0`                                            |
  | `--order--first`                       | `-9999`                                        |
  | `--order--last`                        | `9999`                                         |
  | ———                                    | ———                                            |
  |                                        | **No longer a variable**                       |
  | `--z-index--auto`                      | `auto`                                         |
  | `--z-index---1`                        | `-1`                                           |
  | `--z-index--0`                         | `0`                                            |
  | `--z-index--10`                        | `10`                                           |
  | `--z-index--20`                        | `20`                                           |
  | `--z-index--30`                        | `30`                                           |
  | `--z-index--40`                        | `40`                                           |
  | `--z-index--50`                        | `50`                                           |
  | ———                                    | ———                                            |
  | `--rotate---180`                       | `--transform--rotate---180`                    |
  | `--rotate---90`                        | `--transform--rotate---90`                     |
  | `--rotate---45`                        | `--transform--rotate---45`                     |
  | `--rotate---12`                        | `--transform--rotate---12`                     |
  | `--rotate---6`                         | `--transform--rotate---6`                      |
  | `--rotate---3`                         | `--transform--rotate---3`                      |
  | `--rotate---2`                         | `--transform--rotate---2`                      |
  | `--rotate---1`                         | `--transform--rotate---1`                      |
  | `--rotate--0`                          | `--transform--rotate--0`                       |
  | `--rotate--1`                          | `--transform--rotate--1`                       |
  | `--rotate--2`                          | `--transform--rotate--2`                       |
  | `--rotate--3`                          | `--transform--rotate--3`                       |
  | `--rotate--6`                          | `--transform--rotate--6`                       |
  | `--rotate--12`                         | `--transform--rotate--12`                      |
  | `--rotate--45`                         | `--transform--rotate--45`                      |
  | `--rotate--90`                         | `--transform--rotate--90`                      |
  | `--rotate--180`                        | `--transform--rotate--180`                     |
  | ———                                    | ———                                            |
  | `--scale--0`                           | `--transform--scale--0`                        |
  | `--scale--50`                          | `--transform--scale--50`                       |
  | `--scale--75`                          | `--transform--scale--75`                       |
  | `--scale--90`                          | `--transform--scale--90`                       |
  | `--scale--95`                          | `--transform--scale--95`                       |
  | `--scale--100`                         | `--transform--scale--100`                      |
  | `--scale--105`                         | `--transform--scale--105`                      |
  | `--scale--110`                         | `--transform--scale--110`                      |
  | `--scale--125`                         | `--transform--scale--125`                      |
  | `--scale--150`                         | `--transform--scale--150`                      |
  | ———                                    | ———                                            |
  | `--skew---12`                          | `--transform--skew---12`                       |
  | `--skew---6`                           | `--transform--skew---6`                        |
  | `--skew---3`                           | `--transform--skew---3`                        |
  | `--skew---2`                           | `--transform--skew---2`                        |
  | `--skew---1`                           | `--transform--skew---1`                        |
  | `--skew--0`                            | `--transform--skew--0`                         |
  | `--skew--1`                            | `--transform--skew--1`                         |
  | `--skew--2`                            | `--transform--skew--2`                         |
  | `--skew--3`                            | `--transform--skew--3`                         |
  | `--skew--6`                            | `--transform--skew--6`                         |
  | `--skew--12`                           | `--transform--skew--12`                        |
  | ———                                    | ———                                            |
  | `--brightness--0`                      | `--filter--brightness--0`                      |
  | `--brightness--50`                     | `--filter--brightness--50`                     |
  | `--brightness--75`                     | `--filter--brightness--75`                     |
  | `--brightness--90`                     | `--filter--brightness--90`                     |
  | `--brightness--95`                     | `--filter--brightness--95`                     |
  | `--brightness--100`                    | `--filter--brightness--100`                    |
  | `--brightness--105`                    | `--filter--brightness--105`                    |
  | `--brightness--110`                    | `--filter--brightness--110`                    |
  | `--brightness--125`                    | `--filter--brightness--125`                    |
  | `--brightness--150`                    | `--filter--brightness--150`                    |
  | `--brightness--200`                    | `--filter--brightness--200`                    |
  | ———                                    | ———                                            |
  | `--contrast--0`                        | `--filter--contrast--0`                        |
  | `--contrast--50`                       | `--filter--contrast--50`                       |
  | `--contrast--75`                       | `--filter--contrast--75`                       |
  | `--contrast--100`                      | `--filter--contrast--100`                      |
  | `--contrast--125`                      | `--filter--contrast--125`                      |
  | `--contrast--150`                      | `--filter--contrast--150`                      |
  | `--contrast--200`                      | `--filter--contrast--200`                      |
  | ———                                    | ———                                            |
  | `--saturate--0`                        | `--filter--saturate--0`                        |
  | `--saturate--50`                       | `--filter--saturate--50`                       |
  | `--saturate--100`                      | `--filter--saturate--100`                      |
  | `--saturate--150`                      | `--filter--saturate--150`                      |
  | `--saturate--200`                      | `--filter--saturate--200`                      |
  | ———                                    | ———                                            |
  | `--blur--none`                         | `--filter--blur--0`                            |
  | `--blur--sm`                           | `--filter--blur--4`                            |
  | `--blur--base`                         | `--filter--blur--8`                            |
  | `--blur--md`                           | `--filter--blur--12`                           |
  | `--blur--lg`                           | `--filter--blur--16`                           |
  | `--blur--xl`                           | `--filter--blur--24`                           |
  | `--blur--2xl`                          | `--filter--blur--40`                           |
  | `--blur--3xl`                          | `--filter--blur--64`                           |
  | ———                                    | ———                                            |
  | `--sepia--0`                           | `--filter--sepia--0`                           |
  | `--sepia--base`                        | `--filter--sepia--100`                         |
  | ———                                    | ———                                            |
  |                                        | **Now includes the `drop-shadow()` functions** |
  | `--drop-shadow--none`                  | `--filter--drop-shadow--0`                     |
  | `--drop-shadow--sm`                    | `--filter--drop-shadow--1`                     |
  | `--drop-shadow--base`                  | `--filter--drop-shadow--2`                     |
  | `--drop-shadow--md`                    | `--filter--drop-shadow--4`                     |
  | `--drop-shadow--lg`                    | `--filter--drop-shadow--10`                    |
  | `--drop-shadow--xl`                    | `--filter--drop-shadow--20`                    |
  | `--drop-shadow--2xl`                   | `--filter--drop-shadow--25`                    |
  | ———                                    | ———                                            |
  | `--transition-timing-function--base`   | `--transition-timing-function--ease-in-out`    |
  | `--transition-timing-function--linear` | `--transition-timing-function--ease-linear`    |
  | `--transition-timing-function--in`     | `--transition-timing-function--ease-in`        |
  | `--transition-timing-function--out`    | `--transition-timing-function--ease-out`       |
  | `--transition-timing-function--in-out` | `--transition-timing-function--ease-in-out`    |

  > **Note:** Since `@leafac/css@0.9.6` we introduced colors of darkness `950`. You may want to convert some background colors of `900` to `950`. And we also renamed the grays:
  >
  > | `@leafac/css@0.9.6` | `@leafac/css@0.10.0` |
  > | ------------------- | -------------------- |
  > | `gray--blue`        | `slate`              |
  > | `gray--cool`        | `gray`               |
  > | `gray--medium`      | `zinc`               |
  > | `gray--true`        | `neutral`            |
  > | `gray--warm`        | `stone`              |
