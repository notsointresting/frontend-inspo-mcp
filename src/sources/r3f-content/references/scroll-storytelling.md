# Scroll-Driven 3D Storytelling

Scroll-linked 3D — camera flying through a scene, objects assembling, materials shifting — is one of the most common asks ("scrolling website with 3D," "landing page where scroll moves the model"). Treat **scroll position as the timeline**: every visual change on screen should have exactly one cause, and that cause is where the user is on the page.

## Mechanism: `ScrollControls` (Drei)

`@react-three/drei`'s `ScrollControls` + `useScroll` gives a normalized `0–1` scroll offset you can drive anything with — camera position, object transforms, material uniforms, opacity.

```tsx
import { ScrollControls, useScroll } from '@react-three/drei'

function CameraRig() {
  const scroll = useScroll()
  useFrame((state) => {
    const offset = scroll.offset // 0 to 1 across the scrollable region
    state.camera.position.z = 10 - offset * 8
    state.camera.lookAt(0, 0, 0)
  })
  return null
}

export default function Scene() {
  return (
    <Canvas>
      <ScrollControls pages={4} damping={0.2}>
        <CameraRig />
        {/* 3D content driven by scroll.offset */}
        <ScrollHtmlOverlay /> {/* use <Scroll html> for DOM content that scrolls with the canvas */}
      </ScrollControls>
    </Canvas>
  )
}
```

For scroll-linked DOM copy layered over the canvas, `<Scroll html>` (also from Drei) keeps normal HTML in sync with the same scroll timeline — useful for headline/caption text that needs real accessible markup rather than being drawn in WebGL.

If the project isn't using R3F for the whole page (e.g., a mostly-HTML site with a 3D hero), drive the same idea with `IntersectionObserver` + `window.scrollY` mapped into a `[0,1]` progress value passed down as a prop, and feed that into `useFrame` the same way.

## Structuring the story: acts, not just an animation

Before writing scroll-tied code, write out the "acts" the way a storyboard would: one line per act — *the feeling*, then *what on screen causes it*. If two adjacent acts produce the same feeling, one of them is filler and should be cut. This keeps a scroll piece from turning into an aimless fly-through.

- **One engineered peak.** Pick a single moment as the emotional high point (peak-end rule). Give it the most build-up, the most scroll distance, and the biggest visual payoff. A page with three "peaks" reads as having none — everything blurs together.
- **A required signature move.** If this is meant to feel bespoke (a brand site, a portfolio piece), invent one interaction that exists only in this build — not a generic parallax or a recolored version of a stock effect.
- **Eight rough page grammars to choose from**, mutually exclusive so a design doesn't quietly default to the same shape every time: filmic one-shot, chaptered/sectioned editorial, live/continuous surface, continuous single-world flight (no section breaks at all, one fixed stage the camera travels through), typographic/poster-led, gallery/grid, split-stage (two things happening side by side as you scroll), rhythmic cutlist (hard cuts between distinct visual movements). Naming which grammar a build is going for up front keeps the implementation coherent.

## Self-check before shipping

Three failure modes are far more common in scroll-3D than anywhere else in R3F work, and they're all invisible in a static screenshot — you have to actually scroll through the build to catch them:

1. **Dead scroll** — stretches where scrolling changes nothing on screen. Every pixel of scroll distance should be doing something, even if subtle (nothing kills a scroll piece's pacing like several idle screens with no visible feedback).
2. **A cue that never fully resolves** — text or an object that fades/assembles in but is tied to a scroll range that ends before it reaches full opacity/position, so the user can never actually see it "arrive." Double check the interpolation range vs. the actual scrollable distance.
3. **A "stuck" state that looks intentional** — e.g., a video texture or GLTF animation that silently stopped decoding and now just looks like a still frame; easy to mistake for a deliberate pause. If a scene has any streamed/decoded media, verify it's actually still animating at the point you think it is.

If you can drive a headless browser (Playwright, Puppeteer), the most reliable check is to script it to step through scroll positions and screenshot each one — this catches dead zones and never-resolving cues far faster than manually scrolling.

## Performance notes specific to scroll scenes

- Scroll-driven scenes tend to keep the whole Canvas mounted for the full page height — budget your polygon/texture count for the *heaviest* moment, not the average, since it all has to stay resident.
- Prefer driving existing meshes' transforms/uniforms over mounting/unmounting meshes as you scroll; mount cost causes stutter mid-scroll.
- On mobile, consider capping `dpr` lower during active scroll and restoring it at rest, and reducing or disabling post-processing passes below a device-capability threshold.
