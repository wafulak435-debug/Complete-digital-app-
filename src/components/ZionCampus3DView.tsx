import React, { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { RoomEnvironment } from "three/examples/jsm/environments/RoomEnvironment.js";
import { Compass, Sun, Sunset, Moon, ChevronDown, ChevronUp, Volume2, VolumeX } from "lucide-react";

type CameraPresetKey = "overview" | "sanctuary" | "leadership" | "amphitheater";
type TimeOfDayKey = "day" | "golden" | "vespers";

const CAMERA_PRESETS: Record<
  CameraPresetKey,
  { label: string; pos: [number, number, number]; target: [number, number, number] }
> = {
  overview: { label: "Campus Aerial", pos: [26, 17, 28], target: [0, 2.5, 0] },
  sanctuary: { label: "Zion Sanctuary", pos: [0, 8, 22], target: [0, 4.2, -3] },
  leadership: { label: "Leadership Hall", pos: [-18, 8, 12], target: [-12, 3.8, -2] },
  amphitheater: { label: "Evangelism Arena", pos: [17, 9, 16], target: [11, 1.8, 3] },
};

function createProceduralWoodOrStoneTexture(
  baseHex: string,
  streakHex: string,
  maxAnisotropy: number,
  isPaving = false
): THREE.CanvasTexture {
  const canvas = document.createElement("canvas");
  canvas.width = 256;
  canvas.height = 256;
  const ctx = canvas.getContext("2d")!;
  ctx.fillStyle = baseHex;
  ctx.fillRect(0, 0, 256, 256);

  if (isPaving) {
    ctx.strokeStyle = streakHex;
    ctx.lineWidth = 2;
    for (let x = 0; x <= 256; x += 32) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, 256);
      ctx.stroke();
    }
    for (let y = 0; y <= 256; y += 32) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(256, y);
      ctx.stroke();
    }
  } else {
    ctx.fillStyle = streakHex;
    for (let i = 0; i < 42; i++) {
      const y = (i * 6.3) % 256;
      ctx.globalAlpha = 0.08 + ((i * 7) % 10) * 0.015;
      ctx.fillRect(0, y, 256, 2.5);
    }
    ctx.globalAlpha = 1;
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(isPaving ? 6 : 2, isPaving ? 6 : 2);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = Math.min(8, maxAnisotropy);
  return tex;
}

export default function ZionCampus3DView() {
  const canvasMountRef = useRef<HTMLDivElement>(null);
  const [preset, setPreset] = useState<CameraPresetKey>("overview");
  const [timeOfDay, setTimeOfDay] = useState<TimeOfDayKey>("day");
  const [dockCollapsed, setDockCollapsed] = useState(false);
  const [chimeOn, setChimeOn] = useState(false);
  const [selectedLandmark, setSelectedLandmark] = useState<string>(
    "Zion Bungoma Sanctuary, Leadership Academy & Outdoor Evangelism Amphitheater"
  );

  const presetRef = useRef<CameraPresetKey>("overview");
  const timeOfDayRef = useRef<TimeOfDayKey>("day");
  const cameraAnimatingRef = useRef<boolean>(false);
  const requestDrawRef = useRef<(() => void) | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);

  useEffect(() => {
    presetRef.current = preset;
    cameraAnimatingRef.current = true;
    if (preset === "sanctuary") {
      setSelectedLandmark("Main Sanctuary Cathedral · Worship & Chapel Auditorium (1,200 seats)");
    } else if (preset === "leadership") {
      setSelectedLandmark("Leadership & Bible School Hall · Digital Labs & Theology Wing");
    } else if (preset === "amphitheater") {
      setSelectedLandmark("Outdoor Evangelism Amphitheater · Crusade & Music Stage");
    } else {
      setSelectedLandmark("Zion Bungoma Global Headquarters · Full Architectural Overview");
    }
    requestDrawRef.current?.();
  }, [preset]);

  useEffect(() => {
    timeOfDayRef.current = timeOfDay;
    requestDrawRef.current?.();
  }, [timeOfDay]);

  const toggleSanctuaryChime = () => {
    if (chimeOn) {
      setChimeOn(false);
      return;
    }
    try {
      const Ctx = window.AudioContext || (window as any).webkitAudioContext;
      if (!audioCtxRef.current) audioCtxRef.current = new Ctx();
      const ctx = audioCtxRef.current;
      if (ctx.state === "suspended") void ctx.resume();
      const freqs = [261.63, 329.63, 392.0, 523.25];
      freqs.forEach((f, idx) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = "sine";
        osc.frequency.value = f;
        gain.gain.setValueAtTime(0.0001, ctx.currentTime + idx * 0.14);
        gain.gain.exponentialRampToValueAtTime(0.05, ctx.currentTime + idx * 0.14 + 0.05);
        gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + idx * 0.14 + 1.5);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(ctx.currentTime + idx * 0.14);
        osc.stop(ctx.currentTime + idx * 0.14 + 1.6);
      });
      setChimeOn(true);
      setTimeout(() => setChimeOn(false), 1800);
    } catch {}
  };

  useEffect(() => {
    const mount = canvasMountRef.current;
    if (!mount) return;

    const width = mount.clientWidth || 960;
    const height = mount.clientHeight || 540;

    const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: "high-performance" });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.setSize(width, height);
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.05;
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    mount.appendChild(renderer.domElement);

    const gl = renderer.getContext();
    const debugInfo = gl.getExtension("WEBGL_debug_renderer_info");
    const glRenderer = debugInfo ? String(gl.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL) || "") : "";
    const isSoftwareGl = /SwiftShader|llvmpipe|Software/i.test(glRenderer);

    const maxAniso = renderer.capabilities.getMaxAnisotropy();
    const scene = new THREE.Scene();
    scene.background = new THREE.Color("#dbeafe");
    scene.fog = new THREE.Fog("#dbeafe", 48, 120);

    const pmrem = new THREE.PMREMGenerator(renderer);
    const envTarget = pmrem.fromScene(new RoomEnvironment(), 0.04);
    scene.environment = envTarget.texture;
    scene.environmentIntensity = 0.72;

    const camera = new THREE.PerspectiveCamera(44, width / height, 0.25, 220);
    camera.position.set(...CAMERA_PRESETS.overview.pos);

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.07;
    controls.maxPolarAngle = Math.PI * 0.47;
    controls.minDistance = 8;
    controls.maxDistance = 68;
    controls.target.set(...CAMERA_PRESETS.overview.target);
    controls.update();

    // Lighting Rig
    const hemiLight = new THREE.HemisphereLight("#ffffff", "#5c4d3c", 0.65);
    scene.add(hemiLight);

    const sunLight = new THREE.DirectionalLight("#fff7ed", 2.4);
    sunLight.position.set(22, 30, 18);
    sunLight.castShadow = true;
    sunLight.shadow.mapSize.set(1024, 1024);
    sunLight.shadow.camera.near = 2;
    sunLight.shadow.camera.far = 90;
    sunLight.shadow.camera.left = -28;
    sunLight.shadow.camera.right = 28;
    sunLight.shadow.camera.top = 28;
    sunLight.shadow.camera.bottom = -28;
    sunLight.shadow.bias = -0.0005;
    scene.add(sunLight);

    // Procedural Materials
    const stoneTex = createProceduralWoodOrStoneTexture("#e7e5e4", "#a8a29e", maxAniso, true);
    const timberTex = createProceduralWoodOrStoneTexture("#7c2d12", "#451a03", maxAniso, false);
    const lawnTex = createProceduralWoodOrStoneTexture("#3f6212", "#365314", maxAniso, false);
    lawnTex.repeat.set(8, 8);

    const groundMat = new THREE.MeshStandardMaterial({ map: lawnTex, roughness: 0.92, metalness: 0.0 });
    const plazaMat = new THREE.MeshStandardMaterial({ map: stoneTex, roughness: 0.8, metalness: 0.05 });
    const wallMat = new THREE.MeshStandardMaterial({ color: "#f8fafc", roughness: 0.68, metalness: 0.04 });
    const navyMat = new THREE.MeshStandardMaterial({ color: "#0b254d", roughness: 0.45, metalness: 0.25 });
    const goldMat = new THREE.MeshStandardMaterial({
      color: "#f5b82e",
      roughness: 0.26,
      metalness: 0.85,
      emissive: "#b45309",
      emissiveIntensity: 0.15,
    });
    const woodMat = new THREE.MeshStandardMaterial({ map: timberTex, roughness: 0.6, metalness: 0.05 });
    const glassMat = new THREE.MeshStandardMaterial({
      color: "#38bdf8",
      roughness: 0.15,
      metalness: 0.2,
      emissive: "#0284c7",
      emissiveIntensity: 0.25,
    });

    const disposables: Array<{ dispose: () => void }> = [
      stoneTex,
      timberTex,
      lawnTex,
      groundMat,
      plazaMat,
      wallMat,
      navyMat,
      goldMat,
      woodMat,
      glassMat,
    ];

    // Ground & Central Plaza
    const groundGeo = new THREE.CircleGeometry(72, 48);
    const ground = new THREE.Mesh(groundGeo, groundMat);
    ground.rotation.x = -Math.PI / 2;
    ground.receiveShadow = true;
    scene.add(ground);

    const plazaGeo = new THREE.BoxGeometry(36, 0.28, 28);
    const plaza = new THREE.Mesh(plazaGeo, plazaMat);
    plaza.position.set(0, 0.12, 0);
    plaza.receiveShadow = true;
    scene.add(plaza);
    disposables.push(groundGeo, plazaGeo);

    // 1. Main Zion Sanctuary Cathedral (Composite Group: 11 parts)
    const sanctuaryGroup = new THREE.Group();
    sanctuaryGroup.position.set(0, 0.26, -3);

    const plinthGeo = new THREE.BoxGeometry(13.5, 0.6, 15.5);
    const plinth = new THREE.Mesh(plinthGeo, plazaMat);
    plinth.position.y = 0.28;
    plinth.castShadow = true;
    plinth.receiveShadow = true;
    sanctuaryGroup.add(plinth);

    const naveGeo = new THREE.BoxGeometry(11.6, 5.2, 13.2);
    const nave = new THREE.Mesh(naveGeo, wallMat);
    nave.position.y = 3.1;
    nave.castShadow = true;
    nave.receiveShadow = true;
    sanctuaryGroup.add(nave);

    const roofBaseGeo = new THREE.ConeGeometry(9.2, 3.2, 4);
    const roof = new THREE.Mesh(roofBaseGeo, navyMat);
    roof.position.y = 7.2;
    roof.rotation.y = Math.PI / 4;
    roof.scale.set(1.0, 1.0, 1.12);
    roof.castShadow = true;
    sanctuaryGroup.add(roof);

    const towerGeo = new THREE.BoxGeometry(2.8, 4.4, 2.8);
    const tower = new THREE.Mesh(towerGeo, wallMat);
    tower.position.set(0, 8.2, 4.5);
    tower.castShadow = true;
    sanctuaryGroup.add(tower);

    const spireGeo = new THREE.ConeGeometry(2.1, 3.4, 4);
    const spire = new THREE.Mesh(spireGeo, goldMat);
    spire.position.set(0, 12.0, 4.5);
    spire.rotation.y = Math.PI / 4;
    spire.castShadow = true;
    sanctuaryGroup.add(spire);

    const crossVertGeo = new THREE.BoxGeometry(0.28, 2.2, 0.28);
    const crossHorizGeo = new THREE.BoxGeometry(1.2, 0.26, 0.26);
    const crossV = new THREE.Mesh(crossVertGeo, goldMat);
    crossV.position.set(0, 14.3, 4.5);
    const crossH = new THREE.Mesh(crossHorizGeo, goldMat);
    crossH.position.set(0, 14.7, 4.5);
    sanctuaryGroup.add(crossV, crossH);

    // Front Porch Columns + Doors + Rose Window
    const colGeo = new THREE.CylinderGeometry(0.28, 0.34, 4.6, 12);
    [-3.6, -1.6, 1.6, 3.6].forEach((xPos) => {
      const col = new THREE.Mesh(colGeo, wallMat);
      col.position.set(xPos, 2.8, 7.1);
      col.castShadow = true;
      sanctuaryGroup.add(col);
    });
    const doorGeo = new THREE.BoxGeometry(2.6, 3.1, 0.3);
    const door = new THREE.Mesh(doorGeo, woodMat);
    door.position.set(0, 2.1, 6.55);
    const roseGeo = new THREE.CylinderGeometry(1.15, 1.15, 0.25, 24);
    const roseWindow = new THREE.Mesh(roseGeo, glassMat);
    roseWindow.rotation.x = Math.PI / 2;
    roseWindow.position.set(0, 4.7, 6.58);
    sanctuaryGroup.add(door, roseWindow);

    scene.add(sanctuaryGroup);
    disposables.push(plinthGeo, naveGeo, roofBaseGeo, towerGeo, spireGeo, crossVertGeo, crossHorizGeo, colGeo, doorGeo, roseGeo);

    // 2. Leadership & Bible School Academic Hall (Left Wing, 6 parts)
    const schoolGroup = new THREE.Group();
    schoolGroup.position.set(-12.2, 0.26, -1.8);

    const schBaseGeo = new THREE.BoxGeometry(7.8, 4.6, 9.6);
    const schBase = new THREE.Mesh(schBaseGeo, wallMat);
    schBase.position.y = 2.3;
    schBase.castShadow = true;
    schBase.receiveShadow = true;
    const schUpperGeo = new THREE.BoxGeometry(6.8, 2.8, 8.2);
    const schUpper = new THREE.Mesh(schUpperGeo, navyMat);
    schUpper.position.y = 5.9;
    schUpper.castShadow = true;
    const schTrimGeo = new THREE.BoxGeometry(7.2, 0.35, 8.6);
    const schTrim = new THREE.Mesh(schTrimGeo, goldMat);
    schTrim.position.y = 7.4;
    const schWinGeo = new THREE.BoxGeometry(5.2, 1.4, 8.35);
    const schWin = new THREE.Mesh(schWinGeo, glassMat);
    schWin.position.y = 5.9;
    const schBandGeo = new THREE.BoxGeometry(8.0, 0.35, 9.8);
    const schBand = new THREE.Mesh(schBandGeo, goldMat);
    schBand.position.y = 4.6;
    schoolGroup.add(schBase, schUpper, schTrim, schWin, schBand);
    scene.add(schoolGroup);
    disposables.push(schBaseGeo, schUpperGeo, schTrimGeo, schWinGeo, schBandGeo);

    // 3. Outdoor Evangelism Amphitheater (Right Wing, 5 parts)
    const arenaGroup = new THREE.Group();
    arenaGroup.position.set(11.4, 0.26, 2.8);

    for (let ring = 0; ring < 3; ring++) {
      const rGeo = new THREE.CylinderGeometry(5.6 - ring * 1.1, 5.9 - ring * 1.1, 0.45, 28, 1, false, 0, Math.PI * 1.35);
      const step = new THREE.Mesh(rGeo, ring === 2 ? navyMat : plazaMat);
      step.position.y = 0.22 + (2 - ring) * 0.42;
      step.rotation.y = Math.PI * 0.85;
      step.castShadow = true;
      step.receiveShadow = true;
      arenaGroup.add(step);
      disposables.push(rGeo);
    }

    const stageGeo = new THREE.CylinderGeometry(2.6, 2.8, 0.55, 24);
    const stage = new THREE.Mesh(stageGeo, woodMat);
    stage.position.set(0, 0.27, 0);
    stage.receiveShadow = true;
    const podiumGeo = new THREE.BoxGeometry(0.85, 1.15, 0.6);
    const podium = new THREE.Mesh(podiumGeo, goldMat);
    podium.position.set(0, 1.05, 0.4);
    arenaGroup.add(stage, podium);
    scene.add(arenaGroup);
    disposables.push(stageGeo, podiumGeo);

    // 4. Instanced Acacia Trees around Campus Perimeter
    const treePositions: Array<[number, number]> = [
      [-18, -11],
      [-16, 10],
      [-9, 13],
      [9, 13],
      [19, -7],
      [18, 11],
      [-5, -14],
      [7, -14],
      [-21, 2],
      [21, 2],
    ];
    const trunkGeo = new THREE.CylinderGeometry(0.18, 0.28, 2.6, 8);
    const trunkInst = new THREE.InstancedMesh(trunkGeo, woodMat, treePositions.length);
    const canopyGeo = new THREE.ConeGeometry(1.9, 1.2, 10);
    const canopyMat = new THREE.MeshStandardMaterial({ color: "#ffffff", roughness: 0.82 });
    const canopyInst = new THREE.InstancedMesh(canopyGeo, canopyMat, treePositions.length);
    trunkInst.castShadow = true;
    canopyInst.castShadow = true;

    const dummy = new THREE.Object3D();
    const shadeColor = new THREE.Color();
    treePositions.forEach(([tx, tz], i) => {
      const s = 0.88 + ((i * 17) % 30) * 0.01;
      dummy.position.set(tx, 1.3 * s, tz);
      dummy.scale.set(s, s, s);
      dummy.updateMatrix();
      trunkInst.setMatrixAt(i, dummy.matrix);

      dummy.position.set(tx, 2.85 * s, tz);
      dummy.scale.set(s * 1.2, s, s * 1.2);
      dummy.updateMatrix();
      canopyInst.setMatrixAt(i, dummy.matrix);

      shadeColor.setHSL(0.28 + ((i * 3) % 7) * 0.01, 0.55, 0.28 + (i % 3) * 0.04);
      canopyInst.setColorAt(i, shadeColor);
    });
    trunkInst.instanceMatrix.needsUpdate = true;
    canopyInst.instanceMatrix.needsUpdate = true;
    if (canopyInst.instanceColor) canopyInst.instanceColor.needsUpdate = true;
    scene.add(trunkInst, canopyInst);
    disposables.push(trunkGeo, canopyGeo, canopyMat);

    // Apply Lighting Theme Helper
    const applyMood = (mood: TimeOfDayKey) => {
      if (mood === "day") {
        scene.background = new THREE.Color("#dbeafe");
        (scene.fog as THREE.Fog).color.set("#dbeafe");
        sunLight.color.set("#fffbeb");
        sunLight.intensity = 2.4;
        sunLight.position.set(22, 30, 18);
        hemiLight.intensity = 0.7;
        glassMat.emissiveIntensity = 0.2;
      } else if (mood === "golden") {
        scene.background = new THREE.Color("#fed7aa");
        (scene.fog as THREE.Fog).color.set("#fed7aa");
        sunLight.color.set("#fb923c");
        sunLight.intensity = 2.1;
        sunLight.position.set(-26, 12, 20);
        hemiLight.intensity = 0.52;
        glassMat.emissiveIntensity = 0.55;
      } else {
        scene.background = new THREE.Color("#0b172a");
        (scene.fog as THREE.Fog).color.set("#0b172a");
        sunLight.color.set("#93c5fd");
        sunLight.intensity = 0.75;
        sunLight.position.set(-14, 24, -18);
        hemiLight.intensity = 0.3;
        glassMat.emissiveIntensity = 1.35;
      }
    };

    // Animation & Render Control
    let rafId = 0;
    const clock = new THREE.Clock();
    const targetPos = new THREE.Vector3(...CAMERA_PRESETS.overview.pos);
    const targetLook = new THREE.Vector3(...CAMERA_PRESETS.overview.target);

    const drawFrame = () => {
      applyMood(timeOfDayRef.current);
      if (cameraAnimatingRef.current) {
        const dt = Math.min(clock.getDelta(), 0.05);
        const p = CAMERA_PRESETS[presetRef.current];
        targetPos.set(p.pos[0], p.pos[1], p.pos[2]);
        targetLook.set(p.target[0], p.target[1], p.target[2]);
        camera.position.x = THREE.MathUtils.damp(camera.position.x, targetPos.x, 5.5, dt);
        camera.position.y = THREE.MathUtils.damp(camera.position.y, targetPos.y, 5.5, dt);
        camera.position.z = THREE.MathUtils.damp(camera.position.z, targetPos.z, 5.5, dt);
        controls.target.x = THREE.MathUtils.damp(controls.target.x, targetLook.x, 6.0, dt);
        controls.target.y = THREE.MathUtils.damp(controls.target.y, targetLook.y, 6.0, dt);
        controls.target.z = THREE.MathUtils.damp(controls.target.z, targetLook.z, 6.0, dt);

        if (camera.position.distanceTo(targetPos) < 0.08 && controls.target.distanceTo(targetLook) < 0.05) {
          cameraAnimatingRef.current = false;
        }
      }
      controls.update();
      renderer.render(scene, camera);
    };

    const scheduleRender = () => {
      if (rafId) return;
      rafId = requestAnimationFrame(() => {
        rafId = 0;
        drawFrame();
        if (!isSoftwareGl || cameraAnimatingRef.current) {
          scheduleRender();
        }
      });
    };

    requestDrawRef.current = () => {
      clock.getDelta();
      scheduleRender();
    };

    const onControlsChange = () => {
      if (isSoftwareGl && !rafId) {
        scheduleRender();
      }
    };
    const onControlStart = () => {
      cameraAnimatingRef.current = false;
    };
    controls.addEventListener("change", onControlsChange);
    controls.addEventListener("start", onControlStart);

    const resizeObserver = new ResizeObserver(() => {
      const w = mount.clientWidth || 800;
      const h = mount.clientHeight || 500;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
      scheduleRender();
    });
    resizeObserver.observe(mount);

    // Initial render
    drawFrame();
    if (!isSoftwareGl) {
      scheduleRender();
    }

    return () => {
      cancelAnimationFrame(rafId);
      resizeObserver.disconnect();
      controls.removeEventListener("change", onControlsChange);
      controls.removeEventListener("start", onControlStart);
      controls.dispose();
      envTarget.dispose();
      pmrem.dispose();
      disposables.forEach((d) => d.dispose());
      renderer.dispose();
      if (renderer.domElement.parentNode === mount) {
        mount.removeChild(renderer.domElement);
      }
    };
  }, []);

  return (
    <div className="relative w-full h-[74vh] min-h-[480px] rounded-2xl overflow-hidden border border-slate-200 dark:border-slate-800 bg-[#0B254D] select-none">
      {/* Dedicated WebGL Canvas Container */}
      <div ref={canvasMountRef} className="w-full h-full" />

      {/* Top HUD (Opaque solid surfaces — zero backdrop-blur over WebGL) */}
      <div className="pointer-events-none absolute top-3 inset-x-3 flex flex-wrap items-start justify-between gap-2">
        <div className="pointer-events-auto rounded-xl bg-[#0B254D] border border-white/15 px-3.5 py-2 text-white shadow-md max-w-md text-left">
          <div className="flex items-center gap-2 text-[10px] font-mono uppercase tracking-wider text-[#F5B82E] font-bold">
            <Compass className="h-3.5 w-3.5" />
            <span>3D Campus Architectural Tour</span>
          </div>
          <p className="text-xs font-semibold text-white mt-0.5 leading-snug">
            {selectedLandmark}
          </p>
        </div>

        <div className="pointer-events-auto flex items-center gap-1.5 rounded-xl bg-[#0B254D] border border-white/15 p-1 shadow-md">
          {[
            { id: "day", label: "Day", icon: Sun },
            { id: "golden", label: "Golden", icon: Sunset },
            { id: "vespers", label: "Night", icon: Moon },
          ].map((m) => {
            const Icon = m.icon;
            const active = timeOfDay === m.id;
            return (
              <button
                key={m.id}
                type="button"
                onClick={() => setTimeOfDay(m.id as TimeOfDayKey)}
                className={`inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[11px] font-bold cursor-pointer transition ${
                  active ? "bg-[#F5B82E] text-[#0B254D]" : "text-blue-100 hover:bg-white/10"
                }`}
              >
                <Icon className="h-3.5 w-3.5" />
                <span>{m.label}</span>
              </button>
            );
          })}

          <button
            type="button"
            onClick={toggleSanctuaryChime}
            className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[11px] font-bold text-blue-100 hover:bg-white/10 cursor-pointer"
            title="Play sanctuary bell chime"
          >
            {chimeOn ? <Volume2 className="h-3.5 w-3.5 text-[#F5B82E]" /> : <VolumeX className="h-3.5 w-3.5" />}
            <span>Chime</span>
          </button>
        </div>
      </div>

      {/* Collapsible Bottom Controls Dock */}
      <div className="pointer-events-none absolute bottom-3 inset-x-3 flex flex-col items-center">
        <div className="pointer-events-auto rounded-2xl bg-[#0B254D] border border-white/15 px-3 py-2 shadow-lg flex flex-wrap items-center justify-center gap-1.5 max-w-2xl">
          <button
            type="button"
            onClick={() => setDockCollapsed(!dockCollapsed)}
            className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-white/10 text-[10px] font-mono font-bold text-[#F5B82E] uppercase cursor-pointer"
          >
            {dockCollapsed ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
            <span>Views</span>
          </button>

          {!dockCollapsed &&
            (Object.keys(CAMERA_PRESETS) as CameraPresetKey[]).map((key) => (
              <button
                key={key}
                type="button"
                onClick={() => setPreset(key)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                  preset === key
                    ? "bg-[#155EEF] text-white"
                    : "bg-white/10 text-blue-100 hover:bg-white/20"
                }`}
              >
                {CAMERA_PRESETS[key].label}
              </button>
            ))}

          {!dockCollapsed && (
            <span className="text-[10px] text-blue-200/80 font-mono pl-2 hidden sm:inline">
              Drag to orbit · Scroll to zoom
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
