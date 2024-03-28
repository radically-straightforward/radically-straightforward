# Changelog

## 2.0.0 · 2024-03-28

- **Breaking Change:** Removed command-line parameters.

  - Now the default `--input` of `.` (the current working directory) is the only option. If you need to run `package` in another directory, `cd` into it.

  - Now the default `command` of `"$PACKAGE/node_modules/.bin/node" "$PACKAGE/build/index.mjs"` is the only option. If you need to start your application differently, create a startup script at `build/index.mjs`.

- The directory containing your application’s source code in the package was renamed from `YOUR-APPLICATION-NAME--source` into `_`, which is shorter and doesn’t depend on the application’s name. This shouldn’t cause any issues, because the `$PACKAGE` environment variable continues working the same.

- Removed the dependencies on `execa` and `commander`.

## 1.0.0 · 2023-11-21

- Initial release, based on [`caxa`](https://www.npmjs.com/package/caxa).
