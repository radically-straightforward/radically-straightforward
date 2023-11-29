export default function css(
  templateStrings: TemplateStringsArray,
  ...substitutions: (string | string[])[]
): string {
  let output = "";

  for (const index of substitutions.keys()) {
    const templateString = templateStrings[index];
    output += templateString;

    const substitution = substitutions[index];
    if (Array.isArray(substitution))
      for (const substitutionPart of substitution) output += substitutionPart;
    else output += substitution;
  }

  output += templateStrings.at(-1);

  return output;
}