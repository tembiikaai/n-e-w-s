import React, { useEffect, useMemo, useRef, useState } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { Line, OrbitControls, Stars } from "@react-three/drei";
import * as THREE from "three";

const RADIUS = 1.6;
const MOON_RADIUS = RADIUS * 0.2727;
const MOON_DISTANCE = RADIUS * 60.3;
const SUN_RADIUS = RADIUS * 109.0;
const SUN_DISTANCE = RADIUS * 23455;
const SUN_DIRECTION = new THREE.Vector3(1, 0.2, -0.3).normalize();
const MOON_DIRECTION = new THREE.Vector3(-0.78, 0.14, 0.61).normalize();

const WORLD_ATLAS_URL =
  "https://cdn.jsdelivr.net/npm/world-atlas@2/countries-110m.json";
const D3_GEO_URL = "https://cdn.jsdelivr.net/npm/d3-geo@3/+esm";
const TOPOJSON_CLIENT_URL =
  "https://cdn.jsdelivr.net/npm/topojson-client@3/+esm";

const toRadians = (deg) => (deg * Math.PI) / 180;
const toDegrees = (rad) => (rad * 180) / Math.PI;

const latLonToVector3 = (lat, lon, radius = RADIUS) => {
  const phi = toRadians(90 - lat);
  const theta = toRadians(lon + 180);

  const x = -radius * Math.sin(phi) * Math.cos(theta);
  const z = radius * Math.sin(phi) * Math.sin(theta);
  const y = radius * Math.cos(phi);

  return new THREE.Vector3(x, y, z);
};

const vector3ToLatLon = (vec) => {
  const v = vec.clone().normalize();
  const lat = 90 - toDegrees(Math.acos(v.y));
  let lon = toDegrees(Math.atan2(v.z, -v.x)) - 180;
  if (lon < -180) lon += 360;
  if (lon > 180) lon -= 360;
  return { lat, lon };
};

const geometryToBorderRings = (geometry, id, radius = RADIUS + 0.004) => {
  if (!geometry) return [];

  if (geometry.type === "Polygon") {
    return geometry.coordinates.map((ring) => ({
      id,
      points: ring.map(([lon, lat]) => latLonToVector3(lat, lon, radius)),
    }));
  }

  if (geometry.type === "MultiPolygon") {
    return geometry.coordinates.flatMap((polygon) =>
      polygon.map((ring) => ({
        id,
        points: ring.map(([lon, lat]) => latLonToVector3(lat, lon, radius)),
      }))
    );
  }

  return [];
};

function Globe({
  onPick,
  onHover,
  onHoverLeave,
  clickedCoord,
  mapTexture,
  borderRings,
  hoveredCountryId,
}) {
  const globeRef = useRef(null);
  const pointerStateRef = useRef({
    isDown: false,
    startX: 0,
    startY: 0,
    dragged: false,
  });
  const highlightRefs = useRef([]);
  const highlightOpacityRef = useRef(0);

  const markerPosition = useMemo(() => {
    if (
      !clickedCoord ||
      typeof clickedCoord.lat !== "number" ||
      typeof clickedCoord.lon !== "number"
    ) {
      return null;
    }

    return latLonToVector3(clickedCoord.lat, clickedCoord.lon, RADIUS);
  }, [clickedCoord]);
  const pinGeometry = useMemo(() => {
    const profile = [
      new THREE.Vector2(0, 0),
      new THREE.Vector2(0.008, 0.016),
      new THREE.Vector2(0.015, 0.038),
      new THREE.Vector2(0.02, 0.062),
      new THREE.Vector2(0.024, 0.085),
      new THREE.Vector2(0.018, 0.108),
      new THREE.Vector2(0, 0.126),
    ];

    return new THREE.LatheGeometry(profile, 36);
  }, []);
  const markerTransform = useMemo(() => {
    if (!markerPosition) return null;

    const normal = markerPosition.clone().normalize();
    const pinRoot = markerPosition.clone().addScaledVector(normal, 0.004);
    const quaternion = new THREE.Quaternion().setFromUnitVectors(
      new THREE.Vector3(0, 1, 0),
      normal
    );

    return { position: pinRoot, quaternion };
  }, [markerPosition]);

  const hoveredRings = useMemo(() => {
    if (hoveredCountryId == null) return [];
    return borderRings.filter((ring) => ring.id === hoveredCountryId);
  }, [borderRings, hoveredCountryId]);

  useFrame((_, delta) => {
    if (globeRef.current) {
      globeRef.current.rotation.y += 0.0008;
    }

    const targetOpacity = hoveredCountryId == null ? 0 : 0.9;
    highlightOpacityRef.current = THREE.MathUtils.damp(
      highlightOpacityRef.current,
      targetOpacity,
      8,
      delta
    );

    for (const line of highlightRefs.current) {
      if (!line?.material) continue;
      line.material.opacity = highlightOpacityRef.current;
      line.material.needsUpdate = true;
    }
  });

  return (
    <group ref={globeRef}>
      <mesh
        onPointerDown={(event) => {
          const { clientX, clientY } = event.nativeEvent;
          pointerStateRef.current = {
            isDown: true,
            startX: clientX,
            startY: clientY,
            dragged: false,
          };
        }}
        onPointerOut={() => {
          pointerStateRef.current.isDown = false;
          pointerStateRef.current.dragged = false;
          onHoverLeave();
        }}
        onPointerMove={(event) => {
          if (pointerStateRef.current.isDown) {
            const { clientX, clientY } = event.nativeEvent;
            const dx = clientX - pointerStateRef.current.startX;
            const dy = clientY - pointerStateRef.current.startY;
            if (dx * dx + dy * dy > 36) {
              pointerStateRef.current.dragged = true;
            }
          }

          const localPoint = event.object.worldToLocal(event.point.clone());
          const { lat, lon } = vector3ToLatLon(localPoint);
          onHover(lat, lon);
        }}
        onPointerUp={(event) => {
          if (!pointerStateRef.current.isDown) return;
          const wasDragged = pointerStateRef.current.dragged;
          pointerStateRef.current.isDown = false;
          if (wasDragged) return;

          event.stopPropagation();
          const localPoint = event.object.worldToLocal(event.point.clone());
          const { lat, lon } = vector3ToLatLon(localPoint);
          onPick(lat, lon);
        }}
        onPointerCancel={() => {
          pointerStateRef.current.isDown = false;
          pointerStateRef.current.dragged = false;
        }}
      >
        <sphereGeometry args={[RADIUS, 64, 64]} />
        <meshStandardMaterial
          color="#a7cde3"
          map={mapTexture ?? null}
          roughness={0.78}
          metalness={0.01}
        />
      </mesh>

      {borderRings.map((ring, index) => (
        <Line
          key={`border-${ring.id}-${index}`}
          points={ring.points}
          color="#c78da0"
          transparent
          opacity={0.55}
          lineWidth={0.8}
          raycast={() => null}
        />
      ))}

      {hoveredRings.map((ring, index) => (
        <Line
          key={`hover-${ring.id}-${index}`}
          ref={(line) => {
            highlightRefs.current[index] = line;
          }}
          points={ring.points}
          color="#f7d8b7"
          transparent
          opacity={0}
          lineWidth={1.5}
          raycast={() => null}
        />
      ))}

      {markerTransform && (
        <group
          position={markerTransform.position}
          quaternion={markerTransform.quaternion}
        >
          <mesh geometry={pinGeometry} position={[0, 0.004, 0]}>
            <meshStandardMaterial color="#d64237" roughness={0.46} metalness={0.03} />
          </mesh>
        </group>
      )}
    </group>
  );
}

function CelestialBodies() {
  const sunPosition = useMemo(
    () => SUN_DIRECTION.clone().multiplyScalar(SUN_DISTANCE),
    []
  );
  const moonPosition = useMemo(
    () => MOON_DIRECTION.clone().multiplyScalar(MOON_DISTANCE),
    []
  );

  return (
    <group>
      <mesh position={sunPosition}>
        <sphereGeometry args={[SUN_RADIUS, 48, 48]} />
        <meshBasicMaterial color="#ffe8b3" toneMapped={false} />
      </mesh>
      <mesh position={moonPosition}>
        <sphereGeometry args={[MOON_RADIUS, 32, 32]} />
        <meshStandardMaterial color="#c8ccd5" roughness={0.92} metalness={0.02} />
      </mesh>
    </group>
  );
}

export default function App() {
  const [clickedCoord, setClickedCoord] = useState(null);
  const [selectedCountry, setSelectedCountry] = useState(null);
  const [hoveredCountryId, setHoveredCountryId] = useState(null);
  const [countryFeatures, setCountryFeatures] = useState([]);
  const [borderRings, setBorderRings] = useState([]);
  const [surfaceTexture, setSurfaceTexture] = useState(null);
  const geoContainsRef = useRef(null);

  useEffect(() => {
    return () => {
      if (surfaceTexture) surfaceTexture.dispose();
    };
  }, [surfaceTexture]);

  useEffect(() => {
    let cancelled = false;

    const loadGeoData = async () => {
      try {
        const [{ geoContains, geoEquirectangular, geoPath }, topojsonModule, atlasResponse] =
          await Promise.all([
            import(/* @vite-ignore */ D3_GEO_URL),
            import(/* @vite-ignore */ TOPOJSON_CLIENT_URL),
            fetch(WORLD_ATLAS_URL),
          ]);

        if (!atlasResponse.ok) return;
        const atlas = await atlasResponse.json();
        const featureCollection = topojsonModule.feature(atlas, atlas.objects.countries);
        const features = featureCollection.features ?? [];

        const projection = geoEquirectangular().fitExtent(
          [
            [0, 0],
            [4096, 2048],
          ],
          { type: "Sphere" }
        );

        const canvas = document.createElement("canvas");
        canvas.width = 4096;
        canvas.height = 2048;
        const ctx = canvas.getContext("2d");
        if (!ctx) return;

        const path = geoPath(projection, ctx);

        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.fillStyle = "#97d7ff";
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        ctx.beginPath();
        features.forEach((feature) => path(feature));
        ctx.fillStyle = "#d6eac9";
        ctx.fill();
        ctx.lineWidth = 1.4;
        ctx.strokeStyle = "#e7a2b8";
        ctx.stroke();

        const generatedTexture = new THREE.CanvasTexture(canvas);
        generatedTexture.colorSpace = THREE.SRGBColorSpace;
        generatedTexture.anisotropy = 16;
        generatedTexture.needsUpdate = true;

        const generatedRings = features.flatMap((feature) =>
          geometryToBorderRings(feature.geometry, Number(feature.id))
        );

        if (cancelled) return;
        geoContainsRef.current = geoContains;
        setCountryFeatures(features);
        setBorderRings(generatedRings);
        setSurfaceTexture(generatedTexture);
      } catch {
        if (!cancelled) {
          setCountryFeatures([]);
          setBorderRings([]);
          setSurfaceTexture(null);
        }
      }
    };

    loadGeoData();

    return () => {
      cancelled = true;
    };
  }, []);

  const findCountryAt = (lat, lon) => {
    const geoContains = geoContainsRef.current;
    if (!geoContains || countryFeatures.length === 0) return null;

    const matched = countryFeatures.find((feature) => geoContains(feature, [lon, lat]));
    if (!matched) return null;

    return {
      code: Number(matched.id),
      name: matched.properties?.name ?? `Country ${matched.id}`,
      headlines: [],
    };
  };

  const handlePick = (lat, lon) => {
    setClickedCoord({ lat, lon });
    const matched = findCountryAt(lat, lon);
    setSelectedCountry(matched);
    setHoveredCountryId(matched ? matched.code : null);
  };

  const handleHover = (lat, lon) => {
    const matched = findCountryAt(lat, lon);
    const nextId = matched ? matched.code : null;
    setHoveredCountryId((prev) => (prev === nextId ? prev : nextId));
  };

  return (
    <div className={`app ${selectedCountry ? "panel-open" : "panel-closed"}`}>
      <Canvas
        className="globe-canvas"
        camera={{ position: [0, 0, 4.4], fov: 40, near: 0.1, far: SUN_DISTANCE * 1.5 }}
        onPointerMissed={() => {
          setSelectedCountry(null);
          setHoveredCountryId(null);
        }}
      >
        <ambientLight intensity={1.42} />
        <Stars radius={50} depth={30} count={900} factor={4} fade />
        <CelestialBodies />
        <Globe
          onPick={handlePick}
          onHover={handleHover}
          onHoverLeave={() => setHoveredCountryId(null)}
          clickedCoord={clickedCoord}
          mapTexture={surfaceTexture}
          borderRings={borderRings}
          hoveredCountryId={hoveredCountryId}
        />
        <OrbitControls
          enablePan={false}
          minDistance={3.2}
          maxDistance={6}
          rotateSpeed={0.7}
        />
      </Canvas>

      <header className="topbar">
        <div>
          <p className="eyebrow brand-mark" role="img" aria-label="N E W S">
            <span className="brand-letter north">N</span>
            <span className="brand-sep" aria-hidden="true" />
            <span className="brand-letter">E</span>
            <span className="brand-sep" aria-hidden="true" />
            <span className="brand-letter">W</span>
            <span className="brand-sep" aria-hidden="true" />
            <span className="brand-letter">S</span>
          </p>
          <h1>Headlines by place</h1>
          <p className="subhead">
            Spin the globe, tap a country, and preview the top stories.
          </p>
        </div>
      </header>

      <div className="globe-footer">
        <p>Click any point on Earth. Coordinates are shown relative to Null Island (0°, 0°).</p>
        <p className="coords">
          Last click: {clickedCoord ? `${clickedCoord.lat.toFixed(4)}° / ${clickedCoord.lon.toFixed(4)}°` : "—"}
        </p>
      </div>

      <p className="prototype-note">
        <span className="prototype-label">Prototype mode</span> | News API not connected yet
      </p>

      <section className={`news-panel ${selectedCountry ? "is-open" : "is-closed"}`}>
        {selectedCountry && (
          <>
            <div className="panel-header">
              <div>
                <p className="eyebrow">Selected</p>
                <h2>{selectedCountry.name}</h2>
              </div>
              <span className="pill">{selectedCountry.code}</span>
            </div>
            <ul className="headline-list">
              <li className="empty-headlines">
                No headlines available for {selectedCountry.name}
              </li>
            </ul>
            <div className="panel-footer">
              <button type="button">Connect news API</button>
              <p>
                Country selection and coordinate mapping are ready. Next step is wiring the live headline provider.
              </p>
            </div>
          </>
        )}
      </section>
    </div>
  );
}
