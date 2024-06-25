export default (
  model: {
    [predecessor: string]: {
      [successor: string]: {
        count: number;
        percentile: number;
      };
    };
  },
  length: number
): string => {
  const paragraphs = new Array<string>();
  const paragraphsLength = Math.max(length, 1);
  while (paragraphs.length < paragraphsLength) {
    const sentences = new Array<string>();
    const sentencesLength =
      length === 0 ? 1 : 1 + Math.floor(Math.random() * 6);
    while (sentences.length < sentencesLength) {
      const words =
        Object.keys(model)[
          Math.floor(Math.random() * Object.keys(model).length)
        ].split(" ");
      const wordsLength =
        length === 0
          ? 1 + Math.floor(Math.random() * 7)
          : 5 + Math.floor(Math.random() * 10);
      addWord: while (words.length < wordsLength) {
        for (
          let predecessorLength = 2;
          1 <= predecessorLength;
          predecessorLength--
        ) {
          const predecessor = words.slice(-predecessorLength).join(" ");
          if (model[predecessor] === undefined) continue;
          const successorSelector = Math.random();
          for (const successor of Object.keys(model[predecessor]))
            if (successorSelector <= model[predecessor][successor].percentile) {
              words.push(successor);
              continue addWord;
            }
        }
        while (true) {
          const word =
            Object.keys(model)[
              Math.floor(Math.random() * Object.keys(model).length)
            ];
          if (word.includes(" ")) continue;
          words.push(word);
          break;
        }
      }
      sentences.push(
        words.join(" ").replace(/./, (character) => character.toUpperCase()) +
          (Math.random() < 0.8
            ? length === 0
              ? ""
              : "."
            : Math.random() < 0.8
            ? "?"
            : "!")
      );
    }
    paragraphs.push(sentences.join(" "));
  }
  return paragraphs.join("\n\n");
};
