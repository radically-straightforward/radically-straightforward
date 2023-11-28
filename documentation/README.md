# Radically Straightforward · Documentation

**📚 Extract documentation from TypeScript source files to Markdown**

## Installation

```console
$ npm install --save-dev @radically-straightforward/documentation
```

## Usage

Document your TypeScript code with comments of the form `/** ... */` containing Markdown (not JSDoc) above `export`ed function declarations, variable declarations, class declarations, and TypeScript types alias declarations, for example:

`index.mts`

```typescript
/**
 * Example of \`FunctionDeclaration\`.
 *
 * **\`exampleOfParameter\`:** Example of some documentation about a parameter.
 *
 * **Return:** Example of some documentation about the return value.
 */
export default async function exampleOfFunctionDeclaration(
  exampleOfParameter: string,
): Promise<string> {
  // ...
}

/**
 * Example of \`VariableDeclaration\`.
 */
export const exampleOfVariableDeclaration: string =
  "exampleOfVariableDeclaration";

/**
 * Example of \`ClassDeclaration\`.
 */
export class ExampleOfClassDeclaration {
  /**
   * Example of \`ClassMethod\`.
   */
  exampleOfClassMethod(): void {
    // ...
  }

  /**
   * Example of \`ClassProperty\`.
   */
  exampleOfClassProperty: string = "exampleOfClassProperty";
}

/**
 * Example of \`TSTypeAliasDeclaration\`.
 */
export type ExampleOfTSTypeAliasDeclaration = string;

// Example of last line for command.
```

> **Note:** Include type annotations in function declarations, variable declarations, and class declarations. There are tools, for example, Visual Studio Code, which can display tooltips including types even when there are no type annotations because they infer the types based on the values in declarations, but this tool doesn’t do that.

In your documentation, include directives, for example:

`README.md`

```markdown
# Example of \`@radically-straightforward/documentation\`

## Extract TypeScript Documentation

<!-- DOCUMENTATION: ./index.mts -->

## Run Command

<!-- DOCUMENTATION: $ tail -n 1 ./index.mts -->
```

> **Note:** Besides pointing at TypeScript files a directive may also contain a command line. This is useful, for example, to include the command-line help explaining command-line parameters: `<!-- DOCUMENTATION: $ ./example-tool --help -->`.

Run this tool to extract the comments from the TypeScript files and include them in the documentation:

```console
$ npx documentation
```

> **Note:** Don’t modify by hand the parts of the documentation that were generated by this tool or you would risk having your modifications overwritten the next time you run the tool.

You must rerun this tool when the TypeScript files are modified. We suggest including this as part of the build process, for example:

`package.json`

```json
{
  "scripts": {
    "prepare": "... && documentation"
  }
}
```

### `$ npx documentation --help`

<!-- Oh, the irony! 🙃 If we were to use this tool to generate this section it would be confused by the other directives in the examples, so we had to copy-and-paste this one by hand. But it should be the last time we have to do this! 🙌 -->

```
Usage: documentation [options] [input...]

📚 Extract documentation from TypeScript source files to Markdown

Arguments:
  input          The files with documentation directives to process. (default:
                 ["./README.md"])

Options:
  -V, --version  output the version number
  -h, --help     display help for command
```

## Related Work

**[TSDoc](https://tsdoc.org/)**

TSDoc is based on JSDoc tags, for example, `@param`, `@returns`, and so forth. In this tool we avoid JSDoc markup and use only Markdown, because:

1. JSDoc is yet another markup language to learn.
2. Sometimes JSDoc and Markdown interact unpredictably.
3. Most of the benefit of JSDoc is in informing types, which is subsumed by TypeScript.

**[TypeDoc](https://typedoc.org/)**

TypeDoc, in conjunction with [`typedoc-plugin-markdown`](https://www.npmjs.com/package/typedoc-plugin-markdown), does something very similar to this tool, but it relies on JSDoc tags and we found the formatting that it produces to be a bit clunky—we prefer to keep the TypeScript syntax which is well-known. Also, we added a directive to run command lines, which are helpful, for example, when documenting command-line tools.