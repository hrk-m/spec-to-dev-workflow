/** @typedef  {import("prettier").Config} PrettierConfig */
/** @typedef  {import("@ianvs/prettier-plugin-sort-imports").PluginConfig} SortImportsConfig */

/** @type { PrettierConfig | SortImportsConfig } */
const config = {
  plugins: ["@ianvs/prettier-plugin-sort-imports"],
  // FSD レイヤー順に import を整列
  importOrder: [
    "^(react/(.*)$)|^(react$)|^(react-dom(.*)$)",
    "<THIRD_PARTY_MODULES>",
    "",
    "^@/app(.*)",
    "^@/pages(.*)",
    "^@/shared(.*)",
    "^[../]",
    "^[./]",
  ],
  importOrderParserPlugins: ["typescript", "jsx", "decorators-legacy"],
  importOrderTypeScriptVersion: "5.0.0",
  arrowParens: "always",
  printWidth: 100,
  singleQuote: false,
  semi: true,
  trailingComma: "all",
  tabWidth: 2,
  proseWrap: "always",
  endOfLine: "lf",
};

export default config;
