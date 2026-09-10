# Architecture Decisions, Performance & Declarative Scenes

## Stack selection (fuller version)

| Tool | Best for | Learning curve | Control | Skip if |
|---|---|---|---|---|
| Plain Three.js | Non-React apps, absolute minimal bundle, fine-grained imperative control | Steep | Total | You're already in React — R3F costs nothing extra |
| React Three Fiber | Any React/Next.js app; state-reactive scenes; component composition | Moderate (need React *and* Three.js fundamentals) | Full (it's Three.js) | Team has no React or no 3D background at all |
| Spline | Design-first teams without engineers; very fast prototyping | Low | Limited outside its own editor | Need tight custom logic, React state integration, or fine perf control |
| CSS 3D transforms / `<model-viewer>` | A single rotating product shot, simple parallax | Low | Low | Need real lighting, physics, multiple interacting objects, or a full scene |

Who should reach for this skill: React/Next.js developers adding interactive 3D — product configurators, immersive marketing pages, portfolios, data visualizations that are genuinely spatial. Skip R3F (favor a 2D solution, or plain Three.js/Spline) for native game development, or whenever a static image/video would satisfy the actual goal.

## Performance checklist

Work through this before calling a 3D feature "done," roughly in order of impact:

1. **Model/asset budget.**
   - Export GLTF/GLB (not OBJ/FBX) — compress with Draco or Meshopt.
   - Texture sizes matched to on-screen size — a background element doesn't need a 4K texture. Use compressed formats (KTX2/Basis) where the pipeline supports it.
   - Run `gltfjsx` on delivered models to generate typed components and strip unused nodes/materials.

2. **Draw calls.**
   - Use `InstancedMesh` (or Drei's `<Instances>`) for any repeated geometry — crowds, foliage, particle fields, grid layouts. One draw call instead of N.
   - Merge static, non-interactive geometry where possible.
   - Limit the number of shadow-casting lights; each one is a separate render pass.

3. **Mobile-first, not desktop-first.**
   - Most traffic is mobile — a scene that's only been tested on a dev desktop GPU will visibly struggle or crash on mid/low-end phones.
   - Clamp `dpr` (`<Canvas dpr={[1, 2]}>`), and consider dropping to `dpr={1}` entirely below a device-memory or GPU-tier threshold.
   - Detect low-end devices (e.g., via `navigator.deviceMemory`, WebGL renderer string, or a simple FPS probe) and serve a reduced-fidelity scene or a static poster image fallback instead of the full experience.
   - Test on real phones, not just browser dev-tools device emulation — thermal throttling and real GPU limits don't show up there.

4. **Loading states, always.**
   - Every asset load (`useGLTF`, `useTexture`, `useLoader`) must sit inside `<Suspense>` with a real fallback — a progress bar or skeleton, not a blank canvas. A silent multi-second load reads as "broken" to most users and increases bounce rate.
   - `useGLTF.preload()` / `useTexture.preload()` ahead of when the component actually mounts, if the asset is knowable early (e.g., prefetch on route hover).

5. **Post-processing budget.**
   - Bloom/DOF/color grading (`@react-three/postprocessing`) look great but cost a full-screen pass each. Stack only what the scene needs, and consider disabling expensive passes on mobile.

## Anti-patterns worth flagging to the user

- **3D for its own sake** — decorative floating shapes unconnected to the page's content or goal. Costs load time and battery for no conversion/engagement benefit. Ask: would a photo or a short video communicate this just as well?
- **Desktop-only 3D** — see mobile-first note above; this is the single most common way 3D projects ship broken.
- **No loading state** — see above; also the most common reason a 3D feature gets reported as a "bug."
- **Unbudgeted, uncompressed assets** — full-resolution scan/photogrammetry data or a hero-scene texture shipped straight from a DCC tool without any compression pass.

## Declarative / data-driven scenes (when to generate rather than hand-author)

Most R3F work is hand-authored JSX, and that's the right default. Reach for a *declarative* pattern — building the scene from a JSON/data spec instead of literal JSX — only when the scene's contents are genuinely dynamic: user-configurable products, CMS-driven 3D content, or AI-generated layouts where the shape of the scene isn't known at build time.

The shape of that pattern (seen in `@json-render/react-three-fiber`, a renderer that turns JSON component specs into R3F trees):

```tsx
import { defineCatalog } from "@json-render/core"
import { threeComponentDefinitions } from "@json-render/react-three-fiber/catalog"
import { threeComponents, ThreeCanvas } from "@json-render/react-three-fiber"

// 1. Catalog: which component *types* are allowed (schema only, no R3F import needed server-side)
const catalog = defineCatalog(schema, {
  components: {
    Box: threeComponentDefinitions.Box,
    Sphere: threeComponentDefinitions.Sphere,
    AmbientLight: threeComponentDefinitions.AmbientLight,
    OrbitControls: threeComponentDefinitions.OrbitControls,
  },
})

// 2. Registry: matching R3F implementations for each catalog entry
// 3. A JSON spec (hand-written, CMS-sourced, or LLM-generated) instantiates the catalog at runtime
```

The general lesson to carry over even without this exact library: keep a clean separation between (a) the *catalog* of component types a scene is allowed to use, (b) their concrete R3F implementations, and (c) the data that picks and configures instances — this is what makes a scene safely generatable (by a CMS or an LLM) without arbitrary code execution.

Don't reach for this pattern by default — it adds a layer of indirection that a hand-authored scene doesn't need. Use it specifically when the *set of objects in the scene* needs to change without a code deploy.
