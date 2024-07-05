# Radically Straightforward · Examples

**🥸 Example data for testing**

## Installation

```console
$ npm install @radically-straightforward/examples
```

## Usage

```typescript
import * as examples from "./index.mjs";
```

<!-- DOCUMENTATION START: ./source/index.mts -->

### `name()`

```typescript
export function name(): string;
```

Examples of names of people.

**Sources**

- **First names:** https://www.ssa.gov/oact/babynames/decades/century.html
- **Last names:** https://www.thoughtco.com/most-common-us-surnames-1422656

### `text()`

```typescript
export function text({
  model = textModel,
  length = 10,
}: {
  model?: {
    [predecessor: string]: {
      [successor: string]: {
        count: number;
        percentile: number;
      };
    };
  };
  length?: number;
} = {}): string;
```

Example text.

If the `length` is `0`, then the text is short and may not contain punctuation, which is suitable, for example, for the title of a conversation.

The default `model` mostly talks about food. You may train your own `model` on other subjects by following these steps:

1. Create a file called `urls.json` with a list of Wikipedia articles on subjects that the `model` should talk about, for example:

   `urls.json`

   ```json
   [
     "https://en.wikipedia.org/wiki/Maple_syrup",
     "https://en.wikipedia.org/wiki/Chocolate_chip"
   ]
   ```

2. Run the binary that comes with `@radically-straightforward/examples` to collect those Wikipedia articles:

   ```console
   $ npx examples collect
   ```

3. A file called `corpus.json` is created with the collected Wikipedia articles, and the `urls.json` file is updated with more Wikipedia articles.

   Select the articles that you consider relevant in `urls.json`, return to step 1, and repeat until enough enough Wikipedia articles have been collected. A bigger corpus yields a richer model with more diverse example texts, but it also produces bigger files and risks going off-topic.

4. Train the `model` with the binary that comes with `@radically-straightforward/examples`:

   ```console
   $ npx examples train
   ```

   This produces a file called `model.json` which includes the model, and its contents can be provided to `text()` as the `model`.

   At this point you may delete the files `urls.json` and `corpus.json` if you wish.

**References**

- https://healeycodes.com/generating-text-with-markov-chains
- https://www.youtube.com/watch?v=eGFJ8vugIWA

<!-- DOCUMENTATION END: ./source/index.mts -->

### Avatars

The folder `avatars/` contains 263 examples of faces.

These people don’t exist, the faces were collected from https://github.com/NVlabs/stylegan2 / https://drive.google.com/drive/folders/1mTeo3J3Jo6aYImBshLM6XRl_Ua8fqgVW and resized to 256×256px with `avatars/index.mjs`.
