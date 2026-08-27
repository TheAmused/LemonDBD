import { Project, SyntaxKind } from "ts-morph";

const project = new Project();
project.addSourceFilesAtPaths("src/**/*.{tsx,jsx}");

let hasErrors = false;

for (const sourceFile of project.getSourceFiles()) {
  const jsxTexts = sourceFile.getDescendantsOfKind(SyntaxKind.JsxText);

  for (const textNode of jsxTexts) {
    const text = textNode.getText().trim();
    // Ignore empty whitespace, purely punctuation, or numeric strings
    if (text && !/^[\d\s.,!?:;()/#&_–—\-]+$/.test(text)) {
      console.error(
        `❌ Raw string found: "${text}" in ${sourceFile.getFilePath()}:${textNode.getStartLineNumber()}`
      );
      hasErrors = true;
    }
  }
}

if (hasErrors) {
  process.exit(1);
} else {
  console.log("✅ No hardcoded JSX strings found.");
}