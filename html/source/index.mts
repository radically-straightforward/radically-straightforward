import * as sanitizeXMLCharacters from "sanitize-xml-string";
import * as entities from "entities/lib/escape.js";

export type HTML = string;

export default function html(
  templateStrings: TemplateStringsArray,
  ...substitutions: (string | string[])[]
): HTML {
  let output = "";

  for (const index of substitutions.keys()) {
    const templateString = templateStrings[index];
    const unsafeSubstitution = templateString.endsWith("$");
    output += unsafeSubstitution ? templateString.slice(0, -1) : templateString;

    const substitution = substitutions[index];
    if (Array.isArray(substitution)) {
      if (unsafeSubstitution)
        for (const substitutionPart of substitution) output += substitutionPart;
      else
        for (const substitutionPart of substitution)
          output += entities.escapeUTF8(
            sanitizeXMLCharacters.sanitize(substitutionPart)
          );
    } else {
      if (unsafeSubstitution) output += substitution;
      else
        output += entities.escapeUTF8(
          sanitizeXMLCharacters.sanitize(substitution)
        );
    }
  }

  output += templateStrings.at(-1);

  return output;
}
