// Input allowlists (src/lib/validate.ts): everything an MCP client may send.
import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { categorySchema, idSchema, querySchema, techSchema } from "../dist/lib/validate.js";

const accepts = (schema, values) => {
  for (const v of values)
    assert.equal(schema.safeParse(v).success, true, `should accept ${JSON.stringify(v)}`);
};
const rejects = (schema, values) => {
  for (const v of values)
    assert.equal(schema.safeParse(v).success, false, `should reject ${JSON.stringify(v)}`);
};

describe("idSchema", () => {
  it("accepts every id shape the sources really produce", () => {
    accepts(idSchema, [
      "button",
      "animated-gradient-with-svg",
      "components/button",
      "blocks/auth-01",
      "css-hover-effects::2026-07-23-expanding-css-grid-notched-accordion-gallery",
      "/src/core/Html.tsx",
      "/examples/jsm/controls/OrbitControls.js",
      "/packages/web/src/index.ts",
      "03e0e30c-4c0f-4879-948a-9b501e530207",
      "a@b+c~d.e_f",
      "/packages/docs/src/routes/(routes)/components/button/+page.md",
    ]);
  });

  it("rejects path traversal, URL metacharacters, whitespace and oversize input", () => {
    rejects(idSchema, [
      "../../etc/passwd",
      "a/../b",
      "/..",
      "a/./b",
      "button?x=1",
      "button#frag",
      "100%",
      "a b",
      "a\nb",
      "a\\b",
      "https://evil.example/x",
      "",
      "-leading-dash",
      "x".repeat(301),
      "<script>",
    ]);
  });
});

describe("categorySchema", () => {
  it("accepts collection ids and display labels seen in the live sources", () => {
    accepts(categorySchema, [
      "forms",
      "css-hover-effects",
      "css-@property",
      "Canvas 2D + DOM/CSS",
      "registry:ui",
      "a.b_c",
    ]);
  });

  it("rejects control characters, markup and oversize input", () => {
    rejects(categorySchema, ["a\nb", "<b>", "x?y", "a#b", "y".repeat(101), "", "_lead"]);
  });
});

describe("techSchema and querySchema", () => {
  it("techSchema allows simple technology hints only", () => {
    accepts(techSchema, ["css", "js", "react", "tailwind css", "c++", "three.js"]);
    rejects(techSchema, ["<script>", "a/b", "x".repeat(51), "", "a\nb"]);
  });

  it("querySchema is free text with a length cap", () => {
    accepts(querySchema, ["", "glassmorphism card", "héllo wörld", "a".repeat(200)]);
    rejects(querySchema, ["a".repeat(201)]);
  });
});
