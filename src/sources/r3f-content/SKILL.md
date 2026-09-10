---
name: react-three-fiber
description: >-
  Build 3D and WebGL experiences in React using react-three-fiber (R3F) —
  Canvas setup, useFrame/useThree hooks, JSX Three.js elements,
  geometry/materials/lighting, scroll-driven 3D storytelling, and the
  Drei/physics/postprocessing ecosystem. Use this skill whenever the user
  wants a 3D scene, product configurator, interactive portfolio, WebGL
  background, particle effect, 3D model viewer, scroll-linked 3D animation,
  or mentions Three.js, R3F, @react-three/fiber, @react-three/drei, WebGL,
  GLSL shaders, or "3D website" in a React/Next.js context — even if they
  just describe wanting something "immersive" or "interactive in 3D"
  without naming the library. Also consult this skill before deciding
  whether to reach for 3D at all — it includes a stack-selection and
  anti-pattern checklist for when plain Three.js, Spline, or a 2D solution
  is a better fit than R3F.
---

# React Three Fiber (R3F)

react-three-fiber is a React renderer for Three.js: `<mesh />` becomes `new THREE.Mesh()`. It has no overhead versus plain Three.js (components render outside of React's own tree) and every Three.js feature works here without exception — install a new Three.js version and it's usable immediately, no waiting on R3F to catch up.

```bash
npm install three @types/three @react-three/fiber
```

`@react-three/fiber@8` pairs with `react@18`; `@react-three/fiber@9` pairs with `react@19`. Pick the matching major version.

## Before writing any code: should this even be 3D?

Don't skip this. 3D is expensive — in bytes, battery, and dev time — and it's easy to reach for it because it's impressive rather than because it serves the page. Run through this before scaffolding a Canvas:

1. **Would a well-shot image, video, or CSS/SVG animation do the job?** If the answer is "the 3D would just look cool," that's a yellow flag, not a green light. 3D earns its place when it demonstrates *depth or spatial relationships that a flat medium can't* — a product configurator someone rotates, a real architectural walkthrough, a data structure that's genuinely 3D.
2. **Pick the right tool for the job**, not the flashiest one:

| Tool | Best for | Learning curve | Control |
|---|---|---|---|
| Plain Three.js | Fine-grained control, non-React apps, minimal bundle | Steep | Total |
| **React Three Fiber** | Anything already in React/Next.js; component-driven scenes, state-reactive 3D | Moderate (need both React + Three.js) | Full — it's just Three.js in JSX |
| Spline | Design-first teams without engineers, fast prototypes | Low | Limited outside the visual editor |
| CSS 3D transforms / `<model-viewer>` | Simple product rotations, single static models | Low | Low |

3. **Common anti-patterns to warn the user about** (or avoid yourself):
   - **3D for its own sake** — floating abstract shapes with no relation to content. Slows the site, drains mobile batteries, doesn't move the metric that matters. Ask "would an image work?" before building it.
   - **Desktop-only 3D** — most traffic is mobile. A scene that isn't budgeted for phones will drop frames or crash on low-end devices. Test on real hardware, reduce geometry/texture quality on mobile, and offer a static fallback (poster image) below a device/perf threshold.
   - **No loading state** — 3D assets take time. Without a progress indicator or skeleton, users think the page is broken and bounce. Always wrap asset loading in `<Suspense>` with a visible fallback (see Loading section below).
   - **Unbounded asset budgets** — uncompressed GLTFs, 4K textures on a hero background, no LOD/instancing for repeated meshes. See `references/architecture-decisions.md` for a fuller performance checklist.

If 3D is justified, continue below. If you're unsure, ask the user what the 3D needs to *accomplish* (showcase a product, tell a scroll-driven story, visualize data, add ambient texture) — that answer determines which reference file below to lean on.

## Quick start

```tsx
import { Canvas, useFrame } from '@react-three/fiber'
import { useRef, useState } from 'react'

function Box(props) {
  const ref = useRef()
  const [hovered, hover] = useState(false)
  const [clicked, click] = useState(false)

  // Runs every rendered frame — this is the render loop
  useFrame((state, delta) => (ref.current.rotation.x += delta))

  return (
    <mesh
      {...props}
      ref={ref}
      scale={clicked ? 1.5 : 1}
      onClick={() => click(!clicked)}
      onPointerOver={() => hover(true)}
      onPointerOut={() => hover(false)}>
      <boxGeometry args={[1, 1, 1]} />
      <meshStandardMaterial color={hovered ? 'hotpink' : 'orange'} />
    </mesh>
  )
}

export default function App() {
  return (
    <Canvas camera={{ position: [0, 0, 5], fov: 75 }}>
      <ambientLight intensity={Math.PI / 2} />
      <spotLight position={[10, 10, 10]} angle={0.15} penumbra={1} decay={0} intensity={Math.PI} />
      <pointLight position={[-10, -10, -10]} decay={0} intensity={Math.PI} />
      <Box position={[-1.2, 0, 0]} />
      <Box position={[1.2, 0, 0]} />
    </Canvas>
  )
}
```

TypeScript: install `@types/three` and type props as `ThreeElements['mesh']`. React Native: import from `@react-three/fiber/native` and configure Metro's `assetExts` for `glb`/`png`/`jpg` if using `useGLTF`/`useTexture`.

## Core concepts

### `<Canvas>`
The root component — creates the WebGL context, scene, camera, and renderer. Everything 3D goes inside it; everything 2D (UI, layout) stays outside it in normal DOM.

```tsx
<Canvas
  camera={{ position: [0, 5, 10], fov: 75, near: 0.1, far: 1000 }}
  shadows
  dpr={[1, 2]}          // clamp device pixel ratio for perf
  gl={{ antialias: true, alpha: true }}
>
  {/* scene contents */}
</Canvas>
```

### `useFrame(callback)`
Subscribes a component to the render loop. Runs on every frame with `(state, delta)` — `state` is the full R3F state object (scene, camera, gl, clock, pointer, etc.), `delta` is seconds since the last frame. Mutate refs directly here rather than using React state, or every frame will trigger a re-render.

```tsx
useFrame((state, delta) => {
  meshRef.current.rotation.y += delta
})
```

Pass a second argument to control execution order across multiple `useFrame` calls: `useFrame(callback, priority)` — higher runs later.

### `useThree()`
Read-only (unless you set it) access to the R3F state object outside `useFrame` — camera, scene, gl, size, viewport, invalidate, etc. Subscribe selectively to avoid unnecessary re-renders:

```tsx
const camera = useThree((state) => state.camera)   // only re-renders when camera changes
```

### JSX = Three.js constructors
Any Three.js class is available lowercased as a JSX tag: `<mesh>`, `<boxGeometry>`, `<meshStandardMaterial>`, `<group>`, `<ambientLight>`. Constructor arguments go in the `args` array prop: `<boxGeometry args={[width, height, depth]} />`. Non-constructor properties are just props: `<meshStandardMaterial color="hotpink" roughness={0.4} />`. Use `attach="material"` (usually automatic) when nesting isn't inferable.

### Events
Meshes accept pointer events directly: `onClick`, `onPointerOver`/`onPointerOut`, `onPointerDown`/`onPointerUp`/`onPointerMove`, `onPointerMissed` (fires on the canvas background when nothing was hit), `onWheel`, `onContextMenu`. Event objects carry `stopPropagation()`, `intersections`, `point`, `object`, and `camera` for precise hit-testing. For camera controls and drag/selection patterns, reach for `@react-three/drei`'s `OrbitControls`, `TransformControls`, or raycasting helpers rather than hand-rolling them.

### Refs
`useRef()` gives direct access to the underlying Three.js object (a `THREE.Mesh`, `THREE.Group`, etc.) for imperative mutation inside `useFrame` or event handlers — this is the normal, idiomatic way to animate in R3F, not `useState` + re-render.

## Loading assets (always with Suspense)

```tsx
import { Suspense } from 'react'
import { useGLTF, Environment } from '@react-three/drei'

function Model() {
  const { scene } = useGLTF('/model.glb')
  return <primitive object={scene} />
}

export default function Scene() {
  return (
    <Canvas>
      <Suspense fallback={<LoadingFallback />}>
        <Model />
        <Environment preset="city" />
      </Suspense>
    </Canvas>
  )
}
```

`useGLTF.preload('/model.glb')` warms the cache before the component mounts. Never ship a 3D scene without a visible loading state — see the anti-patterns list above.

## Reference files

Read these as needed rather than loading everything up front:

- **`references/geometry-and-scenes.md`** — built-in geometries, BufferGeometry, instancing for repeated meshes, materials, lighting types and shadows, and basic animation patterns (useFrame, spring physics, GLTF animation playback).
- **`references/scroll-storytelling.md`** — scroll-driven 3D: linking scroll position to camera moves, object transforms, and section-based "acts," using `@react-three/drei`'s `ScrollControls`, plus craft-level guidance (one engineered peak, avoid a cue that never fully reveals, don't let the page have "dead scroll" that changes nothing on screen).
- **`references/architecture-decisions.md`** — the fuller stack-selection framework, a mobile/performance checklist (draw calls, texture/model compression, LOD, dpr clamping), and a declarative JSON-driven-scene pattern for cases where scenes need to be generated or configured dynamically rather than hand-authored as JSX.

## Ecosystem

There's a large, well-maintained ecosystem around R3F — reach for these before building something from scratch:

| Package | Use for |
|---|---|
| `@react-three/drei` | Grab-bag of essential helpers (loaders, controls, environments, text, shapes) — check here first for almost anything |
| `@react-three/postprocessing` | Bloom, depth of field, vignette, color grading, custom screen-space effects |
| `@react-three/rapier` | 3D physics — rigid bodies, colliders, joints, character controllers |
| `@react-three/xr` | VR/AR controllers and events |
| `@react-three/gltfjsx` | Turns a GLTF file into a typed JSX component |
| `@react-three/uikit` | WebGL-rendered UI components inside the 3D scene |
| `@react-three/csg` | Constructive solid geometry (boolean mesh ops) |
| `@react-three/test-renderer` | Unit-testing R3F scenes in Node |
| `react-spring` | Spring-physics animation, pairs naturally with R3F |
| `zustand` / `jotai` / `valtio` | State management commonly used alongside R3F scenes |
| `leva` | Instant debug/tweak GUI panels |
| `maath` | Math helper grab-bag (easing, random, matrices) |

## Common mistakes to catch in review

- Animating via `useState` + re-render every frame instead of mutating a `ref` inside `useFrame` — kills performance at scale.
- Missing `<Suspense>` around anything that loads an asset (`useGLTF`, `useTexture`, `useLoader`).
- No mobile perf budget: full-res desktop textures/models shipped unconditionally.
- Reaching for 3D when a video or CSS animation would serve the actual goal just as well (see the checklist above).
- Building custom camera-drag/raycasting logic that `@react-three/drei` already provides.
