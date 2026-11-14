/* eslint-disable react-hooks/immutability --
   three.js materials, uniforms and the shared rotation state are mutable by
   design: they are created once and then updated in effects and in the render
   loop, never during React rendering. */
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type MutableRefObject,
  type PointerEvent,
} from 'react';
import * as THREE from 'three';
import { cn } from '@/lib/cn';
import { CITIES, ROUTES } from '../cities';
import { buildLandPoints } from './landPoints';
import { arcPoints, latLngToVec3, rotationFacing, shortestAngle } from './math';
import { GLOBE_PALETTES, type GlobePalette } from './palette';

type Focus = { lat: number; lng: number } | null;

/** Rotation state shared between the pointer handlers (DOM) and the render loop (WebGL). */
type Control = {
  yaw: number;
  pitch: number;
  /** Spin speed in radians per second while coasting. */
  velocity: number;
  dragging: boolean;
  target: { yaw: number; pitch: number } | null;
  /** Clock time of the last focus change, for the pin-drop animation. */
  focusedAt: number;
  redraw: () => void;
};

const NORMAL_VERTEX = /* glsl */ `
  varying vec3 vNormal;
  void main() {
    vNormal = normalize(normalMatrix * normal);
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

// Soft top-left light plus a pale rim, so the sphere reads as round without harsh shading.
const OCEAN_FRAGMENT = /* glsl */ `
  uniform vec3 uOcean;
  uniform vec3 uShade;
  uniform vec3 uRim;
  varying vec3 vNormal;
  void main() {
    vec3 n = normalize(vNormal);
    float light = dot(n, normalize(vec3(-0.45, 0.55, 0.7))) * 0.5 + 0.5;
    vec3 base = mix(uShade, uOcean, smoothstep(0.15, 0.9, light));
    float fresnel = pow(1.0 - max(n.z, 0.0), 3.0);
    gl_FragColor = vec4(mix(base, uRim, fresnel * 0.7), 1.0);
    #include <colorspace_fragment>
  }
`;

// Drawn on the inside of a slightly larger sphere: brightest where it meets the globe.
const GLOW_FRAGMENT = /* glsl */ `
  uniform vec3 uGlow;
  uniform float uStrength;
  varying vec3 vNormal;
  void main() {
    float edge = clamp(-normalize(vNormal).z * 1.97, 0.0, 1.0);
    gl_FragColor = vec4(uGlow, pow(edge, 2.4) * uStrength);
    #include <colorspace_fragment>
  }
`;

const DOTS_VERTEX = /* glsl */ `
  uniform float uSize;
  uniform float uScale;
  varying float vAlpha;
  void main() {
    vec4 mv = modelViewMatrix * vec4(position, 1.0);
    vec3 n = normalize(normalMatrix * normalize(position));
    vAlpha = smoothstep(-0.05, 0.45, n.z);
    gl_PointSize = uSize * uScale / -mv.z;
    gl_Position = projectionMatrix * mv;
  }
`;

const DOTS_FRAGMENT = /* glsl */ `
  uniform vec3 uColor;
  varying float vAlpha;
  void main() {
    float alpha = smoothstep(0.5, 0.34, length(gl_PointCoord - 0.5)) * vAlpha;
    if (alpha < 0.02) discard;
    gl_FragColor = vec4(uColor, alpha);
    #include <colorspace_fragment>
  }
`;

const ARC_VERTEX = /* glsl */ `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

// A faint line with a bright pulse travelling along it, like a plane in flight.
const ARC_FRAGMENT = /* glsl */ `
  uniform vec3 uColor;
  uniform float uTime;
  uniform float uOffset;
  varying vec2 vUv;
  void main() {
    float head = fract(uTime * 0.16 + uOffset);
    float tail = fract(head - vUv.x);
    float ends = smoothstep(0.0, 0.06, vUv.x) * smoothstep(1.0, 0.94, vUv.x);
    gl_FragColor = vec4(uColor, (0.18 + exp(-tail * 7.0) * 0.82) * ends);
    #include <colorspace_fragment>
  }
`;

const OUTWARD = new THREE.Vector3(0, 0, 1);
const easeOutBack = (t: number) => 1 + 2.4 * (t - 1) ** 3 + 1.4 * (t - 1) ** 2;

function Scene({
  palette,
  focus,
  reduced,
  control,
}: {
  palette: GlobePalette;
  focus: Focus;
  reduced: boolean;
  control: MutableRefObject<Control>;
}) {
  const group = useRef<THREE.Group>(null);
  const pin = useRef<THREE.Group>(null);
  const halo = useRef<THREE.Mesh>(null);
  const haloMaterial = useRef<THREE.MeshBasicMaterial>(null);
  const invalidate = useThree((state) => state.invalidate);
  const clock = useThree((state) => state.clock);

  const scene = useMemo(() => {
    const ocean = new THREE.ShaderMaterial({
      uniforms: {
        uOcean: { value: new THREE.Color() },
        uShade: { value: new THREE.Color() },
        uRim: { value: new THREE.Color() },
      },
      vertexShader: NORMAL_VERTEX,
      fragmentShader: OCEAN_FRAGMENT,
    });
    const glow = new THREE.ShaderMaterial({
      uniforms: { uGlow: { value: new THREE.Color() }, uStrength: { value: 0.4 } },
      vertexShader: NORMAL_VERTEX,
      fragmentShader: GLOW_FRAGMENT,
      side: THREE.BackSide,
      transparent: true,
      depthWrite: false,
    });
    const dots = new THREE.ShaderMaterial({
      uniforms: {
        uColor: { value: new THREE.Color() },
        uSize: { value: 0.0135 },
        uScale: { value: 1 },
      },
      vertexShader: DOTS_VERTEX,
      fragmentShader: DOTS_FRAGMENT,
      transparent: true,
      depthWrite: false,
    });
    const dotGeometry = new THREE.BufferGeometry();
    dotGeometry.setAttribute('position', new THREE.BufferAttribute(buildLandPoints(), 3));

    const arcs = ROUTES.map(([from, to], index) => {
      const curve = new THREE.CatmullRomCurve3(
        arcPoints(from, to).map((point) => new THREE.Vector3(...point)),
      );
      return {
        geometry: new THREE.TubeGeometry(curve, 56, 0.0042, 6, false),
        material: new THREE.ShaderMaterial({
          uniforms: {
            uColor: { value: new THREE.Color() },
            uTime: { value: 0 },
            uOffset: { value: (index * 0.37) % 1 },
          },
          vertexShader: ARC_VERTEX,
          fragmentShader: ARC_FRAGMENT,
          transparent: true,
          depthWrite: false,
        }),
      };
    });

    const sphere = new THREE.SphereGeometry(1, 64, 64);
    const marker = new THREE.SphereGeometry(0.011, 12, 12);
    const markerMaterial = new THREE.MeshBasicMaterial({ toneMapped: false });
    return { ocean, glow, dots, dotGeometry, arcs, sphere, marker, markerMaterial };
  }, []);

  // Free GPU memory when the landing page unmounts.
  useEffect(
    () => () => {
      scene.ocean.dispose();
      scene.glow.dispose();
      scene.dots.dispose();
      scene.dotGeometry.dispose();
      scene.sphere.dispose();
      scene.marker.dispose();
      scene.markerMaterial.dispose();
      scene.arcs.forEach((arc) => {
        arc.geometry.dispose();
        arc.material.dispose();
      });
    },
    [scene],
  );

  useEffect(() => {
    scene.ocean.uniforms.uOcean?.value.set(palette.ocean);
    scene.ocean.uniforms.uShade?.value.set(palette.oceanShade);
    scene.ocean.uniforms.uRim?.value.set(palette.rim);
    scene.glow.uniforms.uGlow?.value.set(palette.glow);
    if (scene.glow.uniforms.uStrength) scene.glow.uniforms.uStrength.value = palette.glowStrength;
    scene.dots.uniforms.uColor?.value.set(palette.land);
    scene.arcs.forEach((arc) => arc.material.uniforms.uColor?.value.set(palette.arc));
    scene.markerMaterial.color.set(palette.arc);
    invalidate();
  }, [palette, scene, invalidate]);

  useEffect(() => {
    const state = control.current;
    state.target = focus ? rotationFacing(focus.lat, focus.lng) : null;
    state.focusedAt = clock.elapsedTime;
    state.redraw = invalidate;
    invalidate();
  }, [focus, control, clock, invalidate]);

  const cityPositions = useMemo(
    () => Object.values(CITIES).map((city) => latLngToVec3(city.lat, city.lng, 1.006)),
    [],
  );
  const pinDirection = useMemo(
    () => (focus ? new THREE.Vector3(...latLngToVec3(focus.lat, focus.lng)) : null),
    [focus],
  );
  const pinQuaternion = useMemo(
    () => (pinDirection ? new THREE.Quaternion().setFromUnitVectors(OUTWARD, pinDirection) : null),
    [pinDirection],
  );

  useFrame((state, delta) => {
    const c = control.current;
    const dt = Math.min(delta, 0.05);

    if (!c.dragging) {
      if (c.target) {
        const ease = reduced ? 1 : 1 - Math.exp(-dt * 3.2);
        c.yaw += shortestAngle(c.yaw, c.target.yaw) * ease;
        c.pitch += (c.target.pitch - c.pitch) * ease;
        c.velocity = 0;
      } else {
        const idleSpin = reduced ? 0 : 0.07;
        c.velocity += (idleSpin - c.velocity) * (1 - Math.exp(-dt * 2));
        c.yaw += c.velocity * dt;
        c.pitch += (0.3 - c.pitch) * (1 - Math.exp(-dt * 1.2));
      }
    }
    group.current?.rotation.set(c.pitch, c.yaw, 0);

    // Keep dots the same physical size at any canvas size or pixel density.
    const camera = state.camera as THREE.PerspectiveCamera;
    const bufferHeight = state.size.height * state.viewport.dpr;
    if (scene.dots.uniforms.uScale) {
      scene.dots.uniforms.uScale.value =
        bufferHeight / (2 * Math.tan((camera.fov * Math.PI) / 360));
    }

    const time = state.clock.elapsedTime;
    scene.arcs.forEach((arc) => {
      if (arc.material.uniforms.uTime) arc.material.uniforms.uTime.value = time;
    });

    if (pin.current && pinDirection) {
      // The pin falls from above the surface and settles with a small bounce.
      const landed = reduced ? 1 : Math.min(1, (time - c.focusedAt) / 0.75);
      const radius = 1.008 + 0.38 * (1 - easeOutBack(landed));
      pin.current.position.copy(pinDirection).multiplyScalar(radius);
      const pulse = reduced ? 0.35 : (time * 0.8) % 1;
      halo.current?.scale.setScalar(1 + pulse * 2.4);
      if (haloMaterial.current) haloMaterial.current.opacity = (1 - pulse) * 0.75 * landed;
    }
  });

  return (
    <>
      <mesh geometry={scene.sphere} material={scene.glow} scale={1.16} />
      <group ref={group}>
        <mesh geometry={scene.sphere} material={scene.ocean} />
        <points geometry={scene.dotGeometry} material={scene.dots} />
        {scene.arcs.map((arc, index) => (
          <mesh key={index} geometry={arc.geometry} material={arc.material} />
        ))}
        {cityPositions.map((position, index) => (
          <mesh
            key={index}
            geometry={scene.marker}
            material={scene.markerMaterial}
            position={position}
          />
        ))}
        {pinDirection && pinQuaternion && (
          <group ref={pin} quaternion={pinQuaternion}>
            <mesh>
              <sphereGeometry args={[0.02, 16, 16]} />
              <meshBasicMaterial color={palette.pin} toneMapped={false} />
            </mesh>
            <mesh ref={halo}>
              <ringGeometry args={[0.026, 0.034, 40]} />
              <meshBasicMaterial
                ref={haloMaterial}
                color={palette.pin}
                transparent
                depthWrite={false}
                side={THREE.DoubleSide}
                toneMapped={false}
              />
            </mesh>
          </group>
        )}
      </group>
    </>
  );
}

type GlobeProps = {
  /** The place to rotate to and pin, or null to drift freely. */
  focus: Focus;
  theme: 'light' | 'dark';
  /** Honour prefers-reduced-motion: no spin, no pulses, instant moves. */
  reduced: boolean;
  className?: string;
};

/**
 * Interactive 3D Earth: dotted continents, flight arcs between cities, and a
 * pin that drops on the chosen destination. Drag to spin it.
 */
export default function Globe({ focus, theme, reduced, className }: GlobeProps) {
  const wrapper = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(true);
  const control = useRef<Control>({
    yaw: -1.75, // start over the Indian Ocean: India and Malaysia both in view
    pitch: 0.3,
    velocity: 0.07,
    dragging: false,
    target: null,
    focusedAt: 0,
    redraw: () => undefined,
  });
  const last = useRef({ x: 0, y: 0, time: 0 });

  // Stop rendering when the globe is scrolled out of view.
  useEffect(() => {
    const element = wrapper.current;
    if (!element || !('IntersectionObserver' in window)) return;
    const observer = new IntersectionObserver(([entry]) =>
      setVisible(Boolean(entry?.isIntersecting)),
    );
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  function handlePointerDown(event: PointerEvent<HTMLDivElement>) {
    event.currentTarget.setPointerCapture(event.pointerId);
    control.current.dragging = true;
    control.current.target = null;
    last.current = { x: event.clientX, y: event.clientY, time: event.timeStamp };
  }

  function handlePointerMove(event: PointerEvent<HTMLDivElement>) {
    const c = control.current;
    if (!c.dragging) return;
    const dx = event.clientX - last.current.x;
    const dy = event.clientY - last.current.y;
    const elapsed = Math.max(1, event.timeStamp - last.current.time) / 1000;
    c.yaw += dx * 0.006;
    c.pitch = Math.max(-1.1, Math.min(1.1, c.pitch + dy * 0.006));
    c.velocity = Math.max(-3, Math.min(3, (dx * 0.006) / elapsed));
    last.current = { x: event.clientX, y: event.clientY, time: event.timeStamp };
    c.redraw();
  }

  function handlePointerUp() {
    control.current.dragging = false;
    control.current.redraw();
  }

  return (
    <div
      ref={wrapper}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerUp}
      className={cn(
        'size-full cursor-grab touch-pan-y select-none active:cursor-grabbing',
        className,
      )}
      aria-hidden="true"
    >
      <Canvas
        flat
        dpr={[1, 2]}
        frameloop={reduced ? 'demand' : visible ? 'always' : 'never'}
        camera={{ fov: 34, position: [0, 0, 4], near: 0.1, far: 20 }}
        gl={{ antialias: true, alpha: true, powerPreference: 'high-performance' }}
        resize={{ scroll: false }}
      >
        <Scene palette={GLOBE_PALETTES[theme]} focus={focus} reduced={reduced} control={control} />
      </Canvas>
    </div>
  );
}
