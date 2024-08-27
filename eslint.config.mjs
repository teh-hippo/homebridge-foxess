// @ts-check

import eslint from "@eslint/js";
import tseslint from "typescript-eslint";
import stylistic from "@stylistic/eslint-plugin";

export default [
  ...tseslint.config(
    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
    eslint.configs.recommended,
    ...tseslint.configs.stylisticTypeChecked,
    ...tseslint.configs.strictTypeChecked,
    {
      languageOptions: {
        parserOptions: {
          project: true,
          tsconfigRootDir: import.meta.dirname
        }
      }
    }
  ),
  stylistic.configs.customize({
    indent: 2,
    quotes: "single",
    commaDangle: "never",
    quoteProps: "as-needed",
    arrowParens: false,
    blockSpacing: true,
    braceStyle: "1tbs",
    flat: true,
    semi: false
  })
];
