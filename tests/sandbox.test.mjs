import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { generateSandboxHtml } from "../dist/lib/sandbox.js";

describe("sandbox generator", () => {
  it("generates complete HTML document with Tailwind and doctype", () => {
    const detail = {
      source: "shadcn",
      id: "button",
      title: "Button Component",
      license: "MIT",
      url: "https://ui.shadcn.com/docs/components/button",
      code: {
        tsx: 'export function Button() { return <button className="bg-primary px-4 py-2">Click me</button>; }',
        css: ".button { cursor: pointer; }",
      },
    };

    const html = generateSandboxHtml(detail, { theme: "dark" });
    assert.match(html, /<!doctype html>/i);
    assert.match(html, /cdn\.tailwindcss\.com/);
    assert.match(html, /Button Component/);
    assert.match(html, /MIT/);
    assert.match(html, /sandbox-stage/);
    assert.match(html, /lucide/);
    assert.match(html, /react/);
  });

  it("handles standard HTML and CSS snippets without React", () => {
    const detail = {
      source: "uiverse",
      id: "tiger-button",
      title: "Tiger Wave Button",
      license: "MIT",
      url: "https://uiverse.io",
      code: {
        html: '<button class="wave-btn">Hover me</button>',
        css: ".wave-btn { background: royalblue; }",
      },
    };

    const html = generateSandboxHtml(detail, { theme: "light" });
    assert.match(html, /<button class="wave-btn">Hover me<\/button>/);
    assert.match(html, /\.wave-btn \{ background: royalblue; \}/);
    assert.doesNotMatch(html, /babel/);
  });
});
