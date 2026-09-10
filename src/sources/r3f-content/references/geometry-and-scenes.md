# Geometry, Materials, Lighting & Animation

## Built-in geometries

Every Three.js geometry is a JSX tag; constructor args go in `args`:

```tsx
<mesh>
  <boxGeometry args={[width, height, depth]} />
  <sphereGeometry args={[radius, widthSegments, heightSegments]} />
  <cylinderGeometry args={[radiusTop, radiusBottom, height, radialSegments]} />
  <coneGeometry args={[radius, height, radialSegments]} />
  <torusGeometry args={[radius, tube, radialSegments, tubularSegments]} />
  <planeGeometry args={[width, height]} />
  <meshStandardMaterial color="orange" />
</mesh>
```

## Custom geometry with `BufferGeometry`

For point clouds, custom meshes, or procedural shapes, build a `BufferGeometry` directly:

```tsx
function Points({ count = 5000 }) {
  const positions = useMemo(() => {
    const arr = new Float32Array(count * 3)
    for (let i = 0; i < count; i++) {
      arr[i * 3] = (Math.random() - 0.5) * 10
      arr[i * 3 + 1] = (Math.random() - 0.5) * 10
      arr[i * 3 + 2] = (Math.random() - 0.5) * 10
    }
    return arr
  }, [count])

  return (
    <points>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" count={count} array={positions} itemSize={3} />
      </bufferGeometry>
      <pointsMaterial size={0.05} color="white" />
    </points>
  )
}
```

Lines follow the same pattern with `<line>` / `<lineBasicMaterial>` (or Drei's `<Line>` helper, which is much less boilerplate).

## Instancing (repeated meshes)

Never mount hundreds of individual `<mesh>` components — use `InstancedMesh` (or Drei's `<Instances>`/`<Instance>`) so the GPU draws them in one call:

```tsx
import { Instances, Instance } from '@react-three/drei'

function Field({ count = 1000 }) {
  return (
    <Instances limit={count}>
      <boxGeometry args={[0.2, 0.2, 0.2]} />
      <meshStandardMaterial color="orange" />
      {Array.from({ length: count }).map((_, i) => (
        <Instance key={i} position={[Math.random() * 20 - 10, 0, Math.random() * 20 - 10]} />
      ))}
    </Instances>
  )
}
```

This is the single biggest lever for scenes with many repeated objects (crowds, foliage, particle fields, product-catalog grids).

## Materials

- `meshStandardMaterial` — PBR, roughness/metalness workflow, the default sane choice.
- `meshPhysicalMaterial` — adds clearcoat, transmission (glass), sheen — pricier, use sparingly.
- `meshBasicMaterial` — unlit, cheap, good for UI-like elements or stylized flat look.
- `meshToonMaterial` — cel-shaded look.
- `shaderMaterial` (custom GLSL, from Drei) — for bespoke visual effects; write vertex/fragment shaders and pass `uniforms`.

```tsx
<meshStandardMaterial color="#4444ff" roughness={0.3} metalness={0.6} />
```

Textures: `useTexture` from Drei loads and caches image maps; wrap in `<Suspense>`. PBR sets (albedo/normal/roughness/AO) map onto `map`, `normalMap`, `roughnessMap`, `aoMap` respectively. Environment/IBL lighting comes from `<Environment preset="city" />` (Drei) rather than hand-authoring reflections.

## Lighting & shadows

```tsx
<ambientLight intensity={0.3} />
<directionalLight position={[5, 10, 5]} intensity={1} castShadow />
<pointLight position={[-5, 5, -5]} intensity={0.5} decay={0} />
<spotLight position={[0, 10, 0]} angle={0.3} penumbra={0.5} castShadow />
```

Enable shadows on the Canvas (`<Canvas shadows>`), on the casting light (`castShadow`), and on any mesh that should cast/receive (`<mesh castShadow receiveShadow>`). Shadows are expensive — keep shadow map resolution and the number of shadow-casting lights low, especially on mobile.

For realistic ambient lighting without manually placing lights, prefer Drei's `<Environment>` (image-based lighting from an HDRI) over a pile of point lights.

## Animation patterns

**Procedural (useFrame):**
```tsx
useFrame((state, delta) => {
  meshRef.current.rotation.y += delta * 0.5
  meshRef.current.position.y = Math.sin(state.clock.elapsedTime) * 0.5
})
```

**Spring physics (react-spring / `@react-spring/three`):** good for interruptible, natural-feeling transitions (hover/click states) rather than linear tweens.

```tsx
import { useSpring, animated } from '@react-spring/three'

function Box({ active }) {
  const { scale } = useSpring({ scale: active ? 1.5 : 1 })
  return (
    <animated.mesh scale={scale}>
      <boxGeometry />
      <meshStandardMaterial />
    </animated.mesh>
  )
}
```

**GLTF animation playback:** use Drei's `useAnimations` alongside `useGLTF` to play baked clips (walk cycles, intro animations) exported from Blender/etc.

```tsx
const { scene, animations } = useGLTF('/character.glb')
const { actions } = useAnimations(animations, scene)
useEffect(() => { actions['Walk']?.play() }, [actions])
```

**Keyframes without a physics engine:** Drei's `useAnimations` also works with plain `AnimationClip`s built in code for scripted sequences.
