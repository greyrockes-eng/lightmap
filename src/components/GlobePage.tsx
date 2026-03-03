"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import * as THREE from "three";
import {
  supabase,
  fetchRecentLights,
  fetchRecentArcs,
  addLight,
  addArc,
  subscribeToLights,
  subscribeToArcs,
  getGlobalStats,
  type Light,
  type Arc,
} from "@/lib/supabase";

// ─── Category colors ───
const CAT_COLORS: Record<string, number> = {
  kindness: 0xffc83d,
  encouragement: 0x4ecdc4,
  peace: 0xa78bfa,
  relief: 0xff6b8a,
};

const CAT_CSS: Record<string, string> = {
  kindness: "bg-[rgba(255,200,60,0.12)] text-[#ffdb7a]",
  encouragement: "bg-[rgba(78,205,196,0.12)] text-[#4ecdc4]",
  peace: "bg-[rgba(167,139,250,0.12)] text-[#a78bfa]",
  relief: "bg-[rgba(255,107,138,0.12)] text-[#ff6b8a]",
};

const CAT_BORDER: Record<string, string> = {
  kindness: "border-l-[#ffc83d]",
  encouragement: "border-l-[#4ecdc4]",
  peace: "border-l-[#a78bfa]",
  relief: "border-l-[#ff6b8a]",
};

// ─── Seed data for demo (used when DB is empty) ───
const SEED_LIGHTS = [
  { lat: 39.28, lng: -84.28, city: "Loveland, OH", country: "USA", text: "Neighbors organized a community garden for local families in need.", cat: "kindness" },
  { lat: 48.85, lng: 2.35, city: "Paris", country: "France", text: "Students from 12 countries gathered for an interfaith peace vigil.", cat: "peace" },
  { lat: 35.68, lng: 139.69, city: "Tokyo", country: "Japan", text: "Volunteers delivered 500 care packages to elderly residents.", cat: "kindness" },
  { lat: -33.87, lng: 151.21, city: "Sydney", country: "Australia", text: "Sending strength and hope to everyone rebuilding after the floods.", cat: "encouragement" },
  { lat: 51.51, lng: -0.13, city: "London", country: "UK", text: "Free mental health counseling offered across 40 community centers.", cat: "relief" },
  { lat: -23.55, lng: -46.63, city: "São Paulo", country: "Brazil", text: "Musicians held a free concert promoting unity across favelas.", cat: "peace" },
  { lat: 28.61, lng: 77.21, city: "New Delhi", country: "India", text: "Tech workers teaching coding for free to underprivileged children.", cat: "kindness" },
  { lat: -1.29, lng: 36.82, city: "Nairobi", country: "Kenya", text: "Women-led cooperative building homes for displaced families.", cat: "relief" },
  { lat: 37.57, lng: 126.98, city: "Seoul", country: "South Korea", text: "K-pop fans raised $2M for children's hospital worldwide.", cat: "kindness" },
  { lat: 30.04, lng: 31.24, city: "Cairo", country: "Egypt", text: "Food distribution reaching 50,000 families this week.", cat: "kindness" },
  { lat: 19.43, lng: -99.13, city: "Mexico City", country: "Mexico", text: "Artists painted a 200-meter mural of unity across the city.", cat: "peace" },
  { lat: 52.52, lng: 13.41, city: "Berlin", country: "Germany", text: "Refugees and locals cooking together at weekly community dinners.", cat: "peace" },
  { lat: 40.71, lng: -74.01, city: "New York", country: "USA", text: "Strangers paying it forward — 847 coffees bought for others today.", cat: "kindness" },
  { lat: 6.52, lng: 3.38, city: "Lagos", country: "Nigeria", text: "Local businesses sponsoring scholarships for 500 girls.", cat: "encouragement" },
  { lat: 41.01, lng: 28.98, city: "Istanbul", country: "Turkey", text: "Fishermen donating daily catch to families affected by earthquake.", cat: "relief" },
  { lat: 13.76, lng: 100.50, city: "Bangkok", country: "Thailand", text: "Monks and volunteers providing free meditation for anxiety relief.", cat: "encouragement" },
];

const SEED_ARCS = [
  { fromLat: 39.28, fromLng: -84.28, fromCountry: "USA", toLat: 50.45, toLng: 30.52, toCountry: "Ukraine", msg: "Sending love across the ocean" },
  { fromLat: 35.68, fromLng: 139.69, fromCountry: "Japan", toLat: 33.89, toLng: 35.50, toCountry: "Lebanon", msg: "You are not alone. Rebuilding together." },
  { fromLat: 6.52, fromLng: 3.38, fromCountry: "Nigeria", toLat: -23.55, toLng: -46.63, toCountry: "Brazil", msg: "Our futures are connected. Stay strong." },
  { fromLat: 51.51, fromLng: -0.13, fromCountry: "UK", toLat: -1.29, toLng: 36.82, toCountry: "Kenya", msg: "Your courage inspires the world." },
  { fromLat: -33.87, fromLng: 151.21, fromCountry: "Australia", toLat: 52.52, toLng: 13.41, toCountry: "Germany", msg: "Unity makes us unstoppable." },
];

// ─── Helper: lat/lng to 3D position ───
function latLngToVec3(lat: number, lng: number, radius = 1.01): THREE.Vector3 {
  const phi = (90 - lat) * (Math.PI / 180);
  const theta = (lng + 180) * (Math.PI / 180);
  return new THREE.Vector3(
    -radius * Math.sin(phi) * Math.cos(theta),
    radius * Math.cos(phi),
    radius * Math.sin(phi) * Math.sin(theta)
  );
}

export default function GlobePage() {
  const containerRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const lightPointsRef = useRef<Array<{ point: THREE.Mesh; ring: THREE.Mesh; phase: number }>>([]);
  const arcsRef = useRef<Array<{ arc: THREE.Line; progress: number; material: THREE.LineBasicMaterial; alive: boolean }>>([]);
  const globeRef = useRef<THREE.Mesh | null>(null);
  const wireRef = useRef<THREE.Mesh | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);

  const [lights, setLights] = useState<Light[]>([]);
  const [stats, setStats] = useState({ totalLights: 0, totalArcs: 0, totalCountries: 0, brightnessPct: 0 });
  const [showModal, setShowModal] = useState(false);
  const [modalMode, setModalMode] = useState<"light" | "arc">("light");
  const [formMessage, setFormMessage] = useState("");
  const [formCategory, setFormCategory] = useState<"kindness" | "encouragement" | "peace" | "relief">("kindness");
  const [formCity, setFormCity] = useState("");
  const [formToCountry, setFormToCountry] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [arcNotif, setArcNotif] = useState("");
  const [showNotif, setShowNotif] = useState(false);
  const [useSeedData, setUseSeedData] = useState(false);

  // ─── Add a light point to the 3D scene ───
  const addLightToScene = useCallback((lat: number, lng: number, category: string) => {
    if (!sceneRef.current) return;
    const pos = latLngToVec3(lat, lng);
    const color = CAT_COLORS[category] || 0xffc83d;

    const pointGeo = new THREE.SphereGeometry(0.012, 8, 8);
    const pointMat = new THREE.MeshBasicMaterial({ color });
    const point = new THREE.Mesh(pointGeo, pointMat);
    point.position.copy(pos);
    sceneRef.current.add(point);

    const ringGeo = new THREE.RingGeometry(0.015, 0.025, 24);
    const ringMat = new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.5, side: THREE.DoubleSide });
    const ring = new THREE.Mesh(ringGeo, ringMat);
    ring.position.copy(pos);
    ring.lookAt(new THREE.Vector3(0, 0, 0));
    sceneRef.current.add(ring);

    lightPointsRef.current.push({ point, ring, phase: Math.random() * Math.PI * 2 });
  }, []);

  // ─── Create an arc between two points ───
  const createArcInScene = useCallback((fromLat: number, fromLng: number, toLat: number, toLng: number, color = 0xffc83d) => {
    if (!sceneRef.current) return;
    const from = latLngToVec3(fromLat, fromLng, 1.01);
    const to = latLngToVec3(toLat, toLng, 1.01);
    const mid = new THREE.Vector3().addVectors(from, to).multiplyScalar(0.5);
    const dist = from.distanceTo(to);
    mid.normalize().multiplyScalar(1.0 + dist * 0.4);

    const curve = new THREE.QuadraticBezierCurve3(from, mid, to);
    const geo = new THREE.BufferGeometry().setFromPoints(curve.getPoints(60));
    const mat = new THREE.LineBasicMaterial({ color, transparent: true, opacity: 0.0 });
    const arc = new THREE.Line(geo, mat);
    sceneRef.current.add(arc);
    arcsRef.current.push({ arc, progress: 0, material: mat, alive: true });
  }, []);

  // ─── Show notification ───
  const showArcNotification = useCallback((text: string) => {
    setArcNotif(text);
    setShowNotif(true);
    setTimeout(() => setShowNotif(false), 4000);
  }, []);

  // ─── Initialize Three.js scene ───
  useEffect(() => {
    if (!containerRef.current) return;

    const scene = new THREE.Scene();
    sceneRef.current = scene;

    const camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.1, 1000);
    camera.position.z = 2.8;
    cameraRef.current = camera;

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    containerRef.current.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    // Globe
    const globeGeo = new THREE.SphereGeometry(1, 64, 64);
    const globeMat = new THREE.MeshPhongMaterial({
      color: 0x0a0e1a, emissive: 0x050810, specular: 0x222244,
      shininess: 15, transparent: true, opacity: 0.9,
    });
    const globe = new THREE.Mesh(globeGeo, globeMat);
    scene.add(globe);
    globeRef.current = globe;

    // Wireframe
    const wireGeo = new THREE.SphereGeometry(1.002, 36, 36);
    const wireMat = new THREE.MeshBasicMaterial({ color: 0xffc83d, wireframe: true, transparent: true, opacity: 0.04 });
    const wireframe = new THREE.Mesh(wireGeo, wireMat);
    scene.add(wireframe);
    wireRef.current = wireframe;

    // Atmosphere
    const atmosGeo = new THREE.SphereGeometry(1.12, 64, 64);
    const atmosMat = new THREE.ShaderMaterial({
      vertexShader: "varying vec3 vN;void main(){vN=normalize(normalMatrix*normal);gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);}",
      fragmentShader: "varying vec3 vN;void main(){float i=pow(0.6-dot(vN,vec3(0,0,1)),2.5);gl_FragColor=vec4(1.0,0.78,0.24,0.15)*i;}",
      blending: THREE.AdditiveBlending, side: THREE.BackSide, transparent: true,
    });
    scene.add(new THREE.Mesh(atmosGeo, atmosMat));

    // Lights
    scene.add(new THREE.AmbientLight(0x222233, 0.8));
    const dl = new THREE.DirectionalLight(0xfff5e0, 0.6);
    dl.position.set(5, 3, 5);
    scene.add(dl);

    // Mouse/touch interaction
    let isDragging = false;
    let prevMouse = { x: 0, y: 0 };
    let rotVel = { x: 0, y: 0 };

    const onMouseDown = (e: MouseEvent) => { isDragging = true; prevMouse = { x: e.clientX, y: e.clientY }; };
    const onMouseMove = (e: MouseEvent) => {
      if (!isDragging) return;
      rotVel.x = (e.clientY - prevMouse.y) * 0.002;
      rotVel.y = (e.clientX - prevMouse.x) * 0.002;
      prevMouse = { x: e.clientX, y: e.clientY };
    };
    const onMouseUp = () => { isDragging = false; };
    const onTouchStart = (e: TouchEvent) => { isDragging = true; prevMouse = { x: e.touches[0].clientX, y: e.touches[0].clientY }; };
    const onTouchMove = (e: TouchEvent) => {
      if (!isDragging) return;
      rotVel.x = (e.touches[0].clientY - prevMouse.y) * 0.002;
      rotVel.y = (e.touches[0].clientX - prevMouse.x) * 0.002;
      prevMouse = { x: e.touches[0].clientX, y: e.touches[0].clientY };
    };
    const onTouchEnd = () => { isDragging = false; };
    const onWheel = (e: WheelEvent) => {
      camera.position.z = Math.max(1.8, Math.min(5, camera.position.z + e.deltaY * 0.001));
    };

    renderer.domElement.addEventListener("mousedown", onMouseDown);
    renderer.domElement.addEventListener("mousemove", onMouseMove);
    renderer.domElement.addEventListener("mouseup", onMouseUp);
    renderer.domElement.addEventListener("mouseleave", onMouseUp);
    renderer.domElement.addEventListener("touchstart", onTouchStart);
    renderer.domElement.addEventListener("touchmove", onTouchMove);
    renderer.domElement.addEventListener("touchend", onTouchEnd);
    renderer.domElement.addEventListener("wheel", onWheel);

    // Animation loop
    let time = 0;
    let animId: number;
    const animate = () => {
      animId = requestAnimationFrame(animate);
      time += 0.01;

      if (!isDragging) {
        globe.rotation.y += 0.0015;
        wireframe.rotation.y += 0.0015;
      }
      globe.rotation.x += rotVel.x;
      globe.rotation.y += rotVel.y;
      wireframe.rotation.x = globe.rotation.x;
      wireframe.rotation.y = globe.rotation.y;
      rotVel.x *= 0.95;
      rotVel.y *= 0.95;

      lightPointsRef.current.forEach((lp) => {
        const p = 0.8 + 0.4 * Math.sin(time * 2 + lp.phase);
        lp.point.scale.setScalar(p);
        lp.ring.scale.setScalar(1 + 0.3 * Math.sin(time * 1.5 + lp.phase));
        lp.ring.material.opacity = 0.3 + 0.2 * Math.sin(time * 2 + lp.phase);
      });

      arcsRef.current.forEach((a) => {
        if (!a.alive) return;
        if (a.progress < 1) {
          a.progress += 0.008;
          a.material.opacity = Math.sin(a.progress * Math.PI) * 0.6;
        } else {
          a.material.opacity *= 0.99;
          if (a.material.opacity < 0.01) a.alive = false;
        }
      });

      renderer.render(scene, camera);
    };
    animate();

    // Resize handler
    const onResize = () => {
      camera.aspect = window.innerWidth / window.innerHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(window.innerWidth, window.innerHeight);
    };
    window.addEventListener("resize", onResize);

    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener("resize", onResize);
      renderer.domElement.removeEventListener("mousedown", onMouseDown);
      renderer.domElement.removeEventListener("mousemove", onMouseMove);
      renderer.domElement.removeEventListener("mouseup", onMouseUp);
      renderer.domElement.removeEventListener("mouseleave", onMouseUp);
      renderer.domElement.removeEventListener("touchstart", onTouchStart);
      renderer.domElement.removeEventListener("touchmove", onTouchMove);
      renderer.domElement.removeEventListener("touchend", onTouchEnd);
      renderer.domElement.removeEventListener("wheel", onWheel);
      renderer.dispose();
      if (containerRef.current) {
        containerRef.current.removeChild(renderer.domElement);
      }
    };
  }, []);

  // ─── Load data from Supabase (or seed data) ───
  useEffect(() => {
    async function loadData() {
      try {
        const [dbLights, dbArcs, dbStats] = await Promise.all([
          fetchRecentLights(100),
          fetchRecentArcs(50),
          getGlobalStats(),
        ]);

        if (dbLights.length > 0) {
          setLights(dbLights);
          setStats(dbStats);
          dbLights.forEach((l, i) => {
            setTimeout(() => addLightToScene(l.latitude, l.longitude, l.category), i * 100);
          });
          dbArcs.forEach((a, i) => {
            setTimeout(() => {
              createArcInScene(a.from_lat, a.from_lng, a.to_lat, a.to_lng, CAT_COLORS.kindness);
            }, 2000 + i * 2000);
          });
        } else {
          // No data yet — use seed data for demo
          setUseSeedData(true);
          const seedAsLights: Light[] = SEED_LIGHTS.map((s, i) => ({
            id: `seed-${i}`,
            message: s.text,
            category: s.cat as Light["category"],
            latitude: s.lat,
            longitude: s.lng,
            city: s.city,
            country: s.country,
            country_code: null,
            user_id: null,
            is_approved: true,
            boost_count: 0,
            created_at: new Date(Date.now() - i * 300000).toISOString(),
          }));
          setLights(seedAsLights);
          setStats({ totalLights: SEED_LIGHTS.length, totalArcs: SEED_ARCS.length, totalCountries: 14, brightnessPct: 7.2 });

          SEED_LIGHTS.forEach((s, i) => {
            setTimeout(() => addLightToScene(s.lat, s.lng, s.cat), i * 200);
          });
          SEED_ARCS.forEach((a, i) => {
            setTimeout(() => {
              createArcInScene(a.fromLat, a.fromLng, a.toLat, a.toLng);
              showArcNotification(`${a.fromCountry} → ${a.toCountry}: "${a.msg}"`);
            }, 3000 + i * 5000);
          });
        }
      } catch (err) {
        console.error("Failed to load data, using seed:", err);
        setUseSeedData(true);
        SEED_LIGHTS.forEach((s, i) => {
          setTimeout(() => addLightToScene(s.lat, s.lng, s.cat), i * 200);
        });
      }
    }

    loadData();
  }, [addLightToScene, createArcInScene, showArcNotification]);

  // ─── Real-time subscriptions ───
  useEffect(() => {
    const lightsSub = subscribeToLights((newLight) => {
      setLights((prev) => [newLight, ...prev].slice(0, 100));
      addLightToScene(newLight.latitude, newLight.longitude, newLight.category);
      setStats((prev) => ({ ...prev, totalLights: prev.totalLights + 1 }));
    });

    const arcsSub = subscribeToArcs((newArc) => {
      createArcInScene(newArc.from_lat, newArc.from_lng, newArc.to_lat, newArc.to_lng);
      showArcNotification(`${newArc.from_country} → ${newArc.to_country}: "${newArc.message}"`);
      setStats((prev) => ({ ...prev, totalArcs: prev.totalArcs + 1 }));
    });

    return () => {
      lightsSub.unsubscribe();
      arcsSub.unsubscribe();
    };
  }, [addLightToScene, createArcInScene, showArcNotification]);

  // ─── Submit handler ───
  const handleSubmit = async () => {
    if (!formMessage.trim()) return;
    setIsSubmitting(true);

    try {
      // AI Moderation
      const modRes = await fetch("/api/moderate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: formMessage, category: formCategory }),
      });
      const modResult = await modRes.json();

      if (!modResult.approved) {
        alert(`Message not approved: ${modResult.reason || "Please try a more positive message."}`);
        setIsSubmitting(false);
        return;
      }

      // Get user location
      let lat = 39.28 + (Math.random() - 0.5) * 2;
      let lng = -84.28 + (Math.random() - 0.5) * 2;
      let city = formCity || "Unknown";
      let country = "Unknown";

      try {
        const pos = await new Promise<GeolocationPosition>((resolve, reject) => {
          navigator.geolocation.getCurrentPosition(resolve, reject, { timeout: 5000 });
        });
        lat = pos.coords.latitude;
        lng = pos.coords.longitude;
      } catch {
        // Use default location
      }

      if (modalMode === "light") {
        await addLight({
          message: formMessage,
          category: formCategory,
          latitude: lat,
          longitude: lng,
          city: city,
          country: country,
          country_code: null,
        });
        showArcNotification("Your light has been added to the map!");
      } else {
        // Arc mode — simplified for MVP
        const toLat = (Math.random() - 0.5) * 140;
        const toLng = (Math.random() - 0.5) * 360;
        await addArc({
          message: formMessage,
          from_lat: lat,
          from_lng: lng,
          from_city: city,
          from_country: country,
          to_lat: toLat,
          to_lng: toLng,
          to_city: null,
          to_country: formToCountry || "Someone, Somewhere",
        });
      }

      setFormMessage("");
      setFormCity("");
      setFormToCountry("");
      setShowModal(false);
    } catch (err) {
      console.error("Submit error:", err);
      alert("Something went wrong. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const timeAgo = (dateStr: string) => {
    const mins = Math.floor((Date.now() - new Date(dateStr).getTime()) / 60000);
    if (mins < 1) return "just now";
    if (mins < 60) return `${mins}m ago`;
    if (mins < 1440) return `${Math.floor(mins / 60)}h ago`;
    return `${Math.floor(mins / 1440)}d ago`;
  };

  return (
    <div className="relative w-screen h-screen overflow-hidden" style={{ background: "#05060a" }}>
      {/* Ambient background */}
      <div
        className="fixed inset-0 pointer-events-none z-0"
        style={{
          background: `
            radial-gradient(ellipse 80% 50% at 50% 50%, rgba(255,200,60,0.03) 0%, transparent 70%),
            radial-gradient(circle at 20% 80%, rgba(255,107,138,0.02) 0%, transparent 50%),
            radial-gradient(circle at 80% 20%, rgba(78,205,196,0.02) 0%, transparent 50%)
          `,
        }}
      />

      {/* Globe container */}
      <div ref={containerRef} className="fixed inset-0 z-[1]" />

      {/* ─── Top Bar ─── */}
      <div className="fixed top-0 left-0 right-0 z-[100] h-14 flex items-center justify-between px-6"
        style={{
          background: "linear-gradient(180deg, rgba(5,6,10,0.95) 0%, rgba(5,6,10,0.7) 100%)",
          backdropFilter: "blur(20px)",
          borderBottom: "1px solid rgba(255,200,60,0.08)",
        }}>
        {/* Logo */}
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full relative"
            style={{
              background: "radial-gradient(circle, #ffc83d 0%, #ff9f43 100%)",
              boxShadow: "0 0 30px rgba(255,200,60,0.3)",
              animation: "pulse 3s ease-in-out infinite",
            }} />
          <span className="text-xl font-bold"
            style={{
              background: "linear-gradient(135deg, #ffdb7a, #ffc83d, #ff9f43)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
            }}>
            LightMap
          </span>
          <span className="text-[11px] tracking-[2px] uppercase hidden sm:inline"
            style={{ color: "rgba(232,228,221,0.55)" }}>
            Light the World
          </span>
        </div>

        {/* Stats */}
        <div className="hidden md:flex gap-7 items-center">
          {[
            { value: stats.totalLights.toLocaleString(), label: "Lights Today" },
            { value: stats.totalCountries.toString(), label: "Countries" },
            { value: stats.totalArcs.toLocaleString(), label: "Connections" },
          ].map((s) => (
            <div key={s.label} className="flex flex-col items-center gap-0.5">
              <span className="font-mono text-base font-medium"
                style={{ color: "#ffdb7a", textShadow: "0 0 12px rgba(255,200,60,0.3)" }}>
                {s.value}
              </span>
              <span className="text-[9px] uppercase tracking-[1.5px]"
                style={{ color: "rgba(232,228,221,0.55)" }}>
                {s.label}
              </span>
            </div>
          ))}
        </div>

        {/* Actions */}
        <div className="flex gap-2.5 items-center">
          <button
            onClick={() => { setModalMode("arc"); setShowModal(true); }}
            className="px-4 py-2 rounded-lg text-[13px] font-medium transition-all"
            style={{
              background: "linear-gradient(135deg, rgba(255,200,60,0.15), rgba(255,200,60,0.05))",
              border: "1px solid rgba(255,200,60,0.2)",
              color: "#ffdb7a",
            }}>
            Send Arc
          </button>
          <button
            onClick={() => { setModalMode("light"); setShowModal(true); }}
            className="px-4 py-2 rounded-lg text-[13px] font-semibold transition-all hover:-translate-y-0.5"
            style={{
              background: "linear-gradient(135deg, #ffc83d, #ff9f43)",
              color: "#0a0a0a",
              boxShadow: "0 2px 20px rgba(255,200,60,0.3)",
            }}>
            + Add Light
          </button>
        </div>
      </div>

      {/* ─── Left Panel: Live Feed ─── */}
      <div className="fixed left-4 top-[72px] bottom-4 w-[320px] z-50 hidden lg:flex flex-col rounded-2xl overflow-hidden"
        style={{
          background: "rgba(12,14,22,0.85)",
          backdropFilter: "blur(24px)",
          border: "1px solid rgba(255,200,60,0.08)",
        }}>
        <div className="px-5 py-4" style={{ borderBottom: "1px solid rgba(255,200,60,0.08)" }}>
          <div className="flex items-center gap-2 text-[12px] font-semibold uppercase tracking-[2px]" style={{ color: "#ffc83d" }}>
            <span className="w-1.5 h-1.5 rounded-full" style={{ background: "#ffc83d", boxShadow: "0 0 8px #ffc83d", animation: "pulse 2s ease-in-out infinite" }} />
            Live Feed
          </div>
        </div>
        <div className="flex-1 overflow-y-auto p-3 flex flex-col gap-2.5"
          style={{ scrollbarWidth: "thin", scrollbarColor: "rgba(255,200,60,0.15) transparent" }}>
          {lights.slice(0, 20).map((light) => (
            <div
              key={light.id}
              className={`rounded-xl p-3.5 border-l-[3px] transition-all hover:translate-x-1 cursor-pointer ${CAT_BORDER[light.category]}`}
              style={{
                background: "rgba(18,22,35,0.9)",
                border: "1px solid rgba(255,200,60,0.08)",
                borderLeftWidth: "3px",
              }}>
              <div className="flex justify-between items-center mb-1.5">
                <span className="text-[11px] font-medium" style={{ color: "rgba(232,228,221,0.55)" }}>
                  {light.city ? `${light.city}, ${light.country}` : light.country}
                </span>
                <span className="font-mono text-[10px]" style={{ color: "rgba(232,228,221,0.55)" }}>
                  {timeAgo(light.created_at)}
                </span>
              </div>
              <p className="text-[13px] leading-relaxed" style={{ color: "#e8e4dd" }}>
                {light.message}
              </p>
              <span className={`inline-block mt-2 px-2 py-0.5 rounded text-[10px] font-medium uppercase tracking-[1px] ${CAT_CSS[light.category]}`}>
                {light.category}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* ─── Right Panel: Stats ─── */}
      <div className="fixed right-4 top-[72px] w-[280px] z-50 hidden lg:flex flex-col gap-3">
        {/* Brightness */}
        <div className="rounded-2xl p-5"
          style={{ background: "rgba(12,14,22,0.85)", backdropFilter: "blur(24px)", border: "1px solid rgba(255,200,60,0.08)" }}>
          <div className="text-[11px] font-semibold uppercase tracking-[2px] mb-4" style={{ color: "rgba(232,228,221,0.55)" }}>
            World Brightness
          </div>
          <div className="flex items-center justify-center h-[120px]">
            <div className="w-[100px] h-[100px] rounded-full flex flex-col items-center justify-center relative"
              style={{ border: "3px solid rgba(255,200,60,0.08)" }}>
              <div className="absolute inset-[-3px] rounded-full"
                style={{
                  border: "3px solid transparent",
                  borderTopColor: "#ffc83d",
                  borderRightColor: "#ffc83d",
                  animation: "spin 4s linear infinite",
                  filter: "drop-shadow(0 0 6px #ffc83d)",
                }} />
              <span className="font-mono text-[28px] font-bold" style={{ color: "#ffdb7a", textShadow: "0 0 20px rgba(255,200,60,0.4)" }}>
                {stats.brightnessPct.toFixed(0)}%
              </span>
              <span className="text-[9px] uppercase tracking-[1.5px] mt-0.5" style={{ color: "rgba(232,228,221,0.55)" }}>
                Lit Up
              </span>
            </div>
          </div>
        </div>

        {/* Categories */}
        <div className="rounded-2xl p-5"
          style={{ background: "rgba(12,14,22,0.85)", backdropFilter: "blur(24px)", border: "1px solid rgba(255,200,60,0.08)" }}>
          <div className="text-[11px] font-semibold uppercase tracking-[2px] mb-4" style={{ color: "rgba(232,228,221,0.55)" }}>
            Categories
          </div>
          <div className="flex flex-wrap gap-2">
            {[
              { name: "Kindness", color: "#ffc83d" },
              { name: "Encouragement", color: "#4ecdc4" },
              { name: "Peace", color: "#a78bfa" },
              { name: "Relief", color: "#ff6b8a" },
            ].map((c) => (
              <div key={c.name} className="flex items-center gap-1.5 px-2.5 py-1 rounded-md" style={{ background: "rgba(255,255,255,0.03)" }}>
                <span className="w-2 h-2 rounded-full" style={{ background: c.color }} />
                <span className="text-[11px]" style={{ color: "rgba(232,228,221,0.55)" }}>{c.name}</span>
              </div>
            ))}
          </div>
        </div>

        {useSeedData && (
          <div className="rounded-2xl p-4"
            style={{ background: "rgba(12,14,22,0.85)", backdropFilter: "blur(24px)", border: "1px solid rgba(255,200,60,0.08)" }}>
            <p className="text-[11px] text-center" style={{ color: "rgba(232,228,221,0.55)" }}>
              Showing demo data. Add a light to start building real data!
            </p>
          </div>
        )}
      </div>

      {/* ─── Bottom Bar ─── */}
      <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-[100] flex items-center gap-4 px-6 py-2.5 rounded-full"
        style={{
          background: "rgba(12,14,22,0.85)",
          backdropFilter: "blur(24px)",
          border: "1px solid rgba(255,200,60,0.08)",
        }}>
        <span className="text-[12px] italic" style={{ color: "rgba(232,228,221,0.55)" }}>
          The world is{" "}
          <span className="not-italic font-medium" style={{ color: "#ffdb7a" }}>{stats.brightnessPct.toFixed(0)}%</span>{" "}
          lit — help us reach{" "}
          <span className="not-italic font-medium" style={{ color: "#ffdb7a" }}>100%</span>
        </span>
      </div>

      {/* ─── Arc Notification ─── */}
      <div
        className={`fixed bottom-20 left-1/2 z-[90] px-5 py-2.5 rounded-xl text-[13px] pointer-events-none whitespace-nowrap transition-all duration-500 ${showNotif ? "opacity-100 -translate-x-1/2 -translate-y-1" : "opacity-0 -translate-x-1/2"}`}
        style={{
          background: "rgba(12,14,22,0.85)",
          backdropFilter: "blur(20px)",
          border: "1px solid rgba(255,200,60,0.2)",
          color: "#e8e4dd",
          boxShadow: "0 4px 30px rgba(255,200,60,0.15)",
        }}>
        {arcNotif}
      </div>

      {/* ─── Modal ─── */}
      {showModal && (
        <div
          className="fixed inset-0 z-[200] flex items-center justify-center"
          style={{ background: "rgba(0,0,0,0.7)", backdropFilter: "blur(8px)" }}
          onClick={(e) => { if (e.target === e.currentTarget) setShowModal(false); }}>
          <div className="w-[440px] max-w-[90vw] rounded-[20px] p-8"
            style={{
              background: "rgba(18,22,35,0.95)",
              border: "1px solid rgba(255,200,60,0.2)",
              boxShadow: "0 20px 60px rgba(0,0,0,0.5)",
            }}>
            <h2 className="text-xl font-bold mb-5"
              style={{
                background: "linear-gradient(135deg, #ffdb7a, #ff9f43)",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
              }}>
              {modalMode === "light" ? "Add Your Light" : "Send Encouragement"}
            </h2>

            {/* Message */}
            <div className="mb-4">
              <label className="block text-[11px] font-semibold uppercase tracking-[1.5px] mb-1.5"
                style={{ color: "rgba(232,228,221,0.55)" }}>
                Your Message
              </label>
              <textarea
                value={formMessage}
                onChange={(e) => setFormMessage(e.target.value)}
                maxLength={280}
                placeholder={modalMode === "light"
                  ? "Share an act of kindness, encouragement, or a wish for peace..."
                  : "Send encouragement to someone across the world..."}
                className="w-full p-3 rounded-xl text-sm focus:outline-none transition-all"
                style={{
                  background: "rgba(255,255,255,0.04)",
                  border: "1px solid rgba(255,200,60,0.08)",
                  color: "#e8e4dd",
                  minHeight: "80px",
                  fontFamily: "inherit",
                }}
                onFocus={(e) => e.target.style.borderColor = "#ffc83d"}
                onBlur={(e) => e.target.style.borderColor = "rgba(255,200,60,0.08)"}
              />
              <div className="text-right text-[11px] mt-1" style={{ color: "rgba(232,228,221,0.35)" }}>
                {formMessage.length}/280
              </div>
            </div>

            {/* Category */}
            <div className="mb-4">
              <label className="block text-[11px] font-semibold uppercase tracking-[1.5px] mb-1.5"
                style={{ color: "rgba(232,228,221,0.55)" }}>
                Category
              </label>
              <select
                value={formCategory}
                onChange={(e) => setFormCategory(e.target.value as Light["category"])}
                className="w-full p-3 rounded-xl text-sm focus:outline-none"
                style={{
                  background: "rgba(255,255,255,0.04)",
                  border: "1px solid rgba(255,200,60,0.08)",
                  color: "#e8e4dd",
                }}>
                <option value="kindness">Act of Kindness</option>
                <option value="encouragement">Encouragement</option>
                <option value="peace">Peace &amp; Unity</option>
                <option value="relief">Relief &amp; Aid</option>
              </select>
            </div>

            {/* Location / To Country */}
            <div className="mb-4">
              <label className="block text-[11px] font-semibold uppercase tracking-[1.5px] mb-1.5"
                style={{ color: "rgba(232,228,221,0.55)" }}>
                {modalMode === "light" ? "Your Location (Optional)" : "Send To (Country)"}
              </label>
              <input
                type="text"
                value={modalMode === "light" ? formCity : formToCountry}
                onChange={(e) => modalMode === "light" ? setFormCity(e.target.value) : setFormToCountry(e.target.value)}
                placeholder={modalMode === "light" ? "City, Country" : "e.g. Ukraine, Japan, Kenya..."}
                className="w-full p-3 rounded-xl text-sm focus:outline-none"
                style={{
                  background: "rgba(255,255,255,0.04)",
                  border: "1px solid rgba(255,200,60,0.08)",
                  color: "#e8e4dd",
                }}
                onFocus={(e) => e.target.style.borderColor = "#ffc83d"}
                onBlur={(e) => e.target.style.borderColor = "rgba(255,200,60,0.08)"}
              />
            </div>

            {/* Actions */}
            <div className="flex gap-2.5 mt-6">
              <button
                onClick={() => setShowModal(false)}
                className="flex-1 py-3 rounded-xl text-sm font-semibold transition-all"
                style={{
                  background: "rgba(255,255,255,0.05)",
                  border: "1px solid rgba(255,200,60,0.08)",
                  color: "rgba(232,228,221,0.55)",
                }}>
                Cancel
              </button>
              <button
                onClick={handleSubmit}
                disabled={isSubmitting || !formMessage.trim()}
                className="flex-1 py-3 rounded-xl text-sm font-semibold transition-all hover:-translate-y-0.5 disabled:opacity-50 disabled:cursor-not-allowed"
                style={{
                  background: "linear-gradient(135deg, #ffc83d, #ff9f43)",
                  color: "#0a0a0a",
                  boxShadow: "0 4px 20px rgba(255,200,60,0.3)",
                }}>
                {isSubmitting ? "Submitting..." : modalMode === "light" ? "Light the Map" : "Send Arc"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─── Global Styles ─── */}
      <style jsx global>{`
        @keyframes pulse {
          0%, 100% { box-shadow: 0 0 20px rgba(255,200,60,0.3); }
          50% { box-shadow: 0 0 40px rgba(255,200,60,0.5); }
        }
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
        body { margin: 0; overflow: hidden; }
        select option { background: #1a1a2e; }
      `}</style>
    </div>
  );
}
