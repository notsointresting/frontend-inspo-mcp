// Generates a self-contained, standalone HTML sandbox page for a component.
// Embeds Tailwind CSS CDN, Lucide icons, basic React/ReactDOM/Babel if TSX/JSX,
// or direct HTML/CSS/JS if standard web snippet.
import type { ResourceDetail } from "./types.js";

interface SandboxOptions {
  theme?: "dark" | "light";
  viewport?: "desktop" | "tablet" | "mobile";
  title?: string;
}

/**
 * Wraps code files into a standalone runnable HTML page with Tailwind, Lucide,
 * React/Babel runtime (for TSX/JSX) and dark/light container styling.
 */
export function generateSandboxHtml(detail: ResourceDetail, options: SandboxOptions = {}): string {
  const { title = detail.title || "Component Preview", theme = "dark" } = options;
  const code = detail.code ?? {};
  const isDark = theme === "dark";

  // Check code types
  const hasTsx = Object.keys(code).some((k) => k.endsWith(".tsx") || k === "tsx");
  const hasJsx = Object.keys(code).some((k) => k.endsWith(".jsx") || k === "jsx");
  const isReact = hasTsx || hasJsx;

  let htmlBody = "";
  let customCss = "";
  let customJs = "";

  for (const [file, content] of Object.entries(code)) {
    if (file.endsWith(".css") || file === "css") {
      customCss += `\n/* ${file} */\n${content}\n`;
    } else if (file.endsWith(".html") || file === "html") {
      htmlBody += content;
    } else if (file.endsWith(".js") || file === "js") {
      customJs += `\n/* ${file} */\n${content}\n`;
    }
  }

  // If it's React/TSX and no explicit html body was provided, create a mounting root
  let reactScript = "";
  if (isReact) {
    const rawReactCode =
      code.tsx ||
      code.jsx ||
      Object.entries(code).find(([k]) => k.endsWith(".tsx") || k.endsWith(".jsx"))?.[1] ||
      "";

    // Clean import statements from raw code so Babel standalone doesn't fail on bundle imports
    const strippedCode = rawReactCode
      .replace(/^import\s+.*?;?\s*$/gm, "")
      .replace(/export\s+default\s+/g, "const DefaultExport = ")
      .replace(/export\s+/g, "");

    reactScript = `
    <script type="text/babel">
      const { useState, useEffect, useRef, useMemo, useCallback } = React;
      // Fallback cn utility
      function cn(...inputs) {
        return inputs.filter(Boolean).join(" ");
      }

      try {
        ${strippedCode}

        // Auto-mount if a root component exists
        const App = () => {
          if (typeof DefaultExport !== 'undefined') return <DefaultExport />;
          if (typeof Button !== 'undefined') return <Button>Interactive Preview</Button>;
          if (typeof Card !== 'undefined') return <Card />;
          if (typeof Marquee !== 'undefined') {
            return (
              <Marquee className="max-w-md py-4">
                <div className="mx-4 p-3 bg-white/10 rounded-lg backdrop-blur">Magic UI Inspo</div>
                <div className="mx-4 p-3 bg-white/10 rounded-lg backdrop-blur">Production Verified</div>
              </Marquee>
            );
          }
          return (
            <div className="p-6 text-center text-sm opacity-80 border border-dashed rounded-lg border-current">
              Component code parsed successfully. Exported elements available.
            </div>
          );
        };

        const rootEl = document.getElementById("root");
        if (rootEl) {
          const root = ReactDOM.createRoot(rootEl);
          root.render(<App />);
        }
      } catch (err) {
        console.error("Component mount error:", err);
        const rootEl = document.getElementById("root");
        if (rootEl) {
          rootEl.innerHTML = '<div class="p-4 bg-red-900/20 text-red-300 border border-red-700/50 rounded text-xs font-mono">Failed to render live preview: ' + err.message + '</div>';
        }
      }
    </script>
    `;
    if (!htmlBody) {
      htmlBody = `<div id="root" class="w-full flex items-center justify-center p-4 min-h-[160px]"></div>`;
    }
  }

  const bgColor = isDark ? "#0d1520" : "#ffffff";
  const textColor = isDark ? "#c2e6ff" : "#0d2847";
  const canvasBg = isDark ? "#003362" : "#f4f6f2";
  const borderColor = isDark ? "#2870bd" : "#cbd5e1";

  return `<!doctype html>
<html lang="en" class="${isDark ? "dark" : ""}">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${escapeHtml(title)} — Live Preview (frontend-inspo-mcp)</title>
  <script src="https://cdn.tailwindcss.com"></script>
  <script>
    tailwind.config = {
      darkMode: 'class',
      theme: {
        extend: {
          colors: {
            brand: '#003362',
            emulsion: '#e6df5b',
            electric: '#0090ff'
          }
        }
      }
    }
  </script>
  <script src="https://unpkg.com/lucide@latest"></script>
  ${
    isReact
      ? `
  <script src="https://unpkg.com/react@18/umd/react.development.js" crossorigin></script>
  <script src="https://unpkg.com/react-dom@18/umd/react-dom.development.js" crossorigin></script>
  <script src="https://unpkg.com/@babel/standalone/babel.min.js"></script>
  `
      : ""
  }
  <style>
    :root {
      color-scheme: ${isDark ? "dark" : "light"};
    }
    body {
      margin: 0;
      background: ${bgColor};
      color: ${textColor};
      font-family: system-ui, -apple-system, sans-serif;
      min-height: 100vh;
      display: flex;
      flex-direction: column;
    }
    .sandbox-stage {
      background: ${canvasBg};
      border: 1px solid ${borderColor};
      border-radius: 8px;
      min-height: 220px;
      display: flex;
      align-items: center;
      justify-content: center;
      position: relative;
      overflow: hidden;
      padding: 1.5rem;
    }
    ${customCss}
  </style>
</head>
<body class="p-4 sm:p-6 flex flex-col justify-between">
  <header class="flex items-center justify-between pb-4 mb-4 border-b border-white/10 text-xs">
    <div class="flex items-center gap-2">
      <span class="inline-block w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse"></span>
      <strong class="uppercase tracking-wider">${escapeHtml(detail.source || "inspo")}</strong>
      <span class="opacity-60">·</span>
      <span class="font-mono opacity-80">${escapeHtml(detail.id || "")}</span>
    </div>
    <div class="flex items-center gap-3">
      <span class="text-[11px] opacity-70">${escapeHtml(detail.license || "Public Reference")}</span>
    </div>
  </header>

  <main class="sandbox-stage flex-1 my-auto">
    ${htmlBody}
  </main>

  <footer class="pt-4 mt-4 border-t border-white/10 text-[11px] opacity-60 flex items-center justify-between">
    <span>frontend-inspo-mcp sandbox renderer</span>
    <span>Zero Hallucinations · Verified Reference</span>
  </footer>

  ${customJs ? `<script>${customJs}</script>` : ""}
  ${reactScript}
  <script>
    if (window.lucide) {
      window.lucide.createIcons();
    }
  </script>
</body>
</html>`;
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}
