#!/usr/bin/env node

import fs from "node:fs/promises";
import { DOMParser } from "linkedom";

switch (process.argv[2]) {
  case "collect": {
    const corpus: {
      [url: string]: {
        collectedAt: string;
        words: string[];
        html: string;
      };
    } = JSON.parse(
      await fs.readFile("corpus.json", "utf-8").catch(() => JSON.stringify({})),
    );
    const urls = new Set<string>();
    for (const url of JSON.parse(await fs.readFile("urls.json", "utf-8"))) {
      const html = await (await fetch(url)).text();
      const paragraphs = new DOMParser()
        .parseFromString(html, "text/html")
        .querySelectorAll(".mw-content-ltr p");
      const words = [...paragraphs]
        .map((paragraph) => paragraph.textContent)
        .join(" ")
        .toLowerCase()
        .split(/[^a-z']+/)
        .filter((word) => word !== "");
      corpus[url] = {
        collectedAt: new Date().toISOString(),
        words,
        html,
      };
      for (const paragraph of paragraphs)
        for (const link of paragraph.querySelectorAll("a")) {
          const url = new URL(
            link.getAttribute("href"),
            "https://en.wikipedia.org/",
          ).href;
          if (
            url.match(
              new RegExp("^https://en.wikipedia.org/wiki/[A-Za-z0-9_%]+$"),
            ) === null
          )
            continue;
          urls.add(url);
        }
    }
    for (const url of Object.keys(corpus)) urls.delete(url);
    await fs.writeFile("corpus.json", JSON.stringify(corpus, undefined, 2));
    await fs.writeFile("urls.json", JSON.stringify([...urls], undefined, 2));
    break;
  }

  case "train": {
    const corpus: {
      [url: string]: {
        collectedAt: string;
        words: string[];
        html: string;
      };
    } = JSON.parse(await fs.readFile("corpus.json", "utf-8"));
    const model: {
      [predecessor: string]: {
        [successor: string]: {
          count: number;
          percentile: number;
        };
      };
    } = {};
    for (const { words } of Object.values(corpus))
      for (
        let predecessorLength = 1;
        predecessorLength <= 2;
        predecessorLength++
      )
        for (
          let wordIndex = predecessorLength;
          wordIndex < words.length;
          wordIndex++
        ) {
          const predecessor = words
            .slice(wordIndex - predecessorLength, wordIndex)
            .join(" ");
          const successor = words[wordIndex];
          model[predecessor] ??= {};
          model[predecessor][successor] ??= { count: 0, percentile: 0 };
          model[predecessor][successor].count++;
        }
    for (const predecessor of Object.keys(model)) {
      let total = 0;
      for (const successor of Object.keys(model[predecessor]))
        total += model[predecessor][successor].count;
      let percentile = 0;
      for (const successor of Object.keys(model[predecessor])) {
        percentile += model[predecessor][successor].count / total;
        model[predecessor][successor].percentile = percentile;
      }
    }
    await fs.writeFile("model.json", JSON.stringify(model));
    break;
  }

  default:
    throw new Error();
}
