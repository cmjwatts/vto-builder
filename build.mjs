/* Build step for the V/TO Builder frontend.
   Produces two static files served from the repo root (publish = ".").

   1) assets/vendor.js — React + ReactDOM, bundled, as window globals.
   2) assets/app.js    — the V/TO Builder components, JSX transpiled to
                         React.createElement calls.

   The component sources are concatenated into a single global script (the same
   shared-scope model the original Claude Design prototype used with multiple
   <script type="text/babel"> tags) and transpiled — no module rewiring, so the
   design stays easy to re-sync. */
import { build, transform } from "esbuild";
import { readFile, writeFile, mkdir } from "node:fs/promises";

await mkdir("assets", { recursive: true });

// 1) Vendor bundle — React/ReactDOM into window globals, no CDN at runtime.
await build({
  entryPoints: ["src/vendor.js"],
  bundle: true,
  format: "iife",
  outfile: "assets/vendor.js",
  minify: true,
  legalComments: "none",
  define: { "process.env.NODE_ENV": '"production"' },
});

// 2) App bundle — concatenate component sources (load order matters: data and
//    helpers before the components that reference them) and transpile JSX.
const order = [
  "src/vto-data.js",
  "src/vto-drafter.js",
  "src/vto-fields.jsx",
  "src/vto-siderail.jsx",
  "src/vto-coach.jsx",
  "src/vto-section.jsx",
  "src/vto-review.jsx",
  "src/vto-app.jsx",
];

let combined = "";
for (const file of order) {
  combined += `\n/* ===== ${file} ===== */\n` + (await readFile(file, "utf8")) + "\n";
}

const result = await transform(combined, {
  loader: "jsx",
  jsx: "transform",
  jsxFactory: "React.createElement",
  jsxFragment: "React.Fragment",
  minify: true,
  legalComments: "none",
});

await writeFile("assets/app.js", result.code);
console.log("Built assets/vendor.js and assets/app.js");
