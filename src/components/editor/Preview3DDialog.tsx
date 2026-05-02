import { useMemo, useRef, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Canvas } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import * as THREE from "three";
import { Box, X, CircleDot, Square, Play, Pause } from "lucide-react";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { useEditorStore } from "@/store/useEditorStore";
import { PREVIEW_3D_CONFIG, type BeadShape } from "@/lib/constants";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

type PixelEntry = { x: number; y: number; color: string };

function createCylinderGeometry(depth: number): THREE.ExtrudeGeometry {
  const cfg = PREVIEW_3D_CONFIG.CYLINDER;
  const shape = new THREE.Shape();
  shape.moveTo(cfg.OUTER_RADIUS, 0);
  shape.absarc(0, 0, cfg.OUTER_RADIUS, 0, Math.PI * 2, false);
  const hole = new THREE.Path();
  hole.moveTo(cfg.INNER_RADIUS, 0);
  hole.absarc(0, 0, cfg.INNER_RADIUS, 0, Math.PI * 2, true);
  shape.holes.push(hole);
  const geo = new THREE.ExtrudeGeometry(shape, {
    depth: depth,
    bevelEnabled: true,
    bevelSize: cfg.BEVEL_SIZE,
    bevelThickness: cfg.BEVEL_THICKNESS,
    bevelSegments: cfg.BEVEL_SEGMENTS,
    curveSegments: cfg.CURVE_SEGMENTS,
  });
  geo.translate(0, 0, -depth / 2);
  return geo;
}

function createRoundedCubeGeometry(depth: number): THREE.ExtrudeGeometry {
  const cfg = PREVIEW_3D_CONFIG.ROUNDED_CUBE;
  const half = cfg.SIZE / 2;
  const r = cfg.CORNER_RADIUS;

  const shape = new THREE.Shape();
  shape.moveTo(-half + r, -half);
  shape.lineTo(half - r, -half);
  shape.quadraticCurveTo(half, -half, half, -half + r);
  shape.lineTo(half, half - r);
  shape.quadraticCurveTo(half, half, half - r, half);
  shape.lineTo(-half + r, half);
  shape.quadraticCurveTo(-half, half, -half, half - r);
  shape.lineTo(-half, -half + r);
  shape.quadraticCurveTo(-half, -half, -half + r, -half);

  const geo = new THREE.ExtrudeGeometry(shape, {
    depth: depth,
    bevelEnabled: true,
    bevelSize: r,
    bevelThickness: r,
    bevelSegments: cfg.CORNER_SEGMENTS,
  });
  geo.translate(0, 0, -depth / 2);
  return geo;
}

function PixelMesh({
  entries,
  width,
  height,
  beadShape,
}: {
  entries: PixelEntry[];
  width: number;
  height: number;
  beadShape: BeadShape;
}) {
  const meshRef = useRef<THREE.InstancedMesh>(null);
  const count = entries.length;
  const depth = PREVIEW_3D_CONFIG.BEAD_DEPTH;

  const dummy = useMemo(() => new THREE.Object3D(), []);
  const tmpColor = useMemo(() => new THREE.Color(), []);

  const beadGeometry = useMemo(() => {
    if (beadShape === "cylinder") {
      return createCylinderGeometry(depth);
    }
    return createRoundedCubeGeometry(depth);
  }, [beadShape, depth]);

  useEffect(() => {
    return () => {
      beadGeometry.dispose();
    };
  }, [beadGeometry]);

  useEffect(() => {
    const mesh = meshRef.current;
    if (!mesh) return;
    const cx = (width - 1) / 2;
    const cy = (height - 1) / 2;
    for (let i = 0; i < count; i++) {
      const e = entries[i];
      dummy.position.set(e.x - cx, cy - e.y, 0);
      dummy.updateMatrix();
      mesh.setMatrixAt(i, dummy.matrix);
      tmpColor.set(e.color);
      mesh.setColorAt(i, tmpColor);
    }
    mesh.instanceMatrix.needsUpdate = true;
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
  }, [entries, count, width, height, dummy, tmpColor]);

  return (
    <instancedMesh ref={meshRef} args={[beadGeometry, undefined, count]} frustumCulled={false}>
      <meshStandardMaterial roughness={0.3} metalness={0.05} />
    </instancedMesh>
  );
}

function Scene({
  entries,
  width,
  height,
  beadShape,
  autoRotate,
}: {
  entries: PixelEntry[];
  width: number;
  height: number;
  beadShape: BeadShape;
  autoRotate: boolean;
}) {
  const dist = Math.max(width, height) * 1.3;
  return (
    <>
      <ambientLight intensity={0.9} />
      <hemisphereLight intensity={0.6} groundColor="#ffffff" />
      <directionalLight position={[dist, dist, dist]} intensity={1.3} />
      <directionalLight position={[-dist, dist * 0.5, -dist * 0.5]} intensity={0.7} />
      <PixelMesh entries={entries} width={width} height={height} beadShape={beadShape} />
      <OrbitControls enableDamping makeDefault minDistance={dist * 0.03} maxDistance={dist * 4} autoRotate={autoRotate} autoRotateSpeed={3.5} zoomToCursor={true} />
    </>
  );
}

export default function Preview3DDialog({ open, onOpenChange }: Props) {
  const { t } = useTranslation();
  const pixels = useEditorStore((s) => s.pixels);
  const width = useEditorStore((s) => s.width);
  const height = useEditorStore((s) => s.height);
  const [beadShape, setBeadShape] = useState<BeadShape>("cylinder");
  const [autoRotate, setAutoRotate] = useState(true);

  const entries = useMemo<PixelEntry[]>(() => {
    const list: PixelEntry[] = [];
    for (const [key, color] of Object.entries(pixels)) {
      const [xs, ys] = key.split(",");
      const x = Number(xs);
      const y = Number(ys);
      if (Number.isNaN(x) || Number.isNaN(y)) continue;
      list.push({ x, y, color });
    }
    return list;
  }, [pixels]);

  const cameraDist = Math.max(width, height) * 2;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[980px] w-[calc(100vw-32px)] max-h-[calc(100vh-32px)] h-[85vh] p-0 overflow-hidden flex flex-col gap-0">
        <DialogHeader className="px-6 pt-6 pb-4">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <DialogTitle className="flex items-center gap-2">
                <span className="inline-flex size-7 items-center justify-center rounded-full bg-primary/10 text-primary">
                  <Box className="size-4" />
                </span>
                <span>{t("sidebar.preview3d")}</span>
              </DialogTitle>
              <DialogDescription className="mt-1">
                {t("editor.preview3d.description")}
              </DialogDescription>
            </div>
            <DialogClose asChild>
              <Button variant="ghost" size="icon" className="rounded-full">
                <X className="size-4" />
              </Button>
            </DialogClose>
          </div>
        </DialogHeader>

        <Separator />

        <div className="flex-1 min-h-0 relative bg-white">
          {entries.length === 0 ? (
            <div className="absolute inset-0 flex items-center justify-center text-sm text-muted-foreground">
              {t("editor.preview3d.empty")}
            </div>
          ) : (
            <>
              <div className="absolute top-4 left-1/2 z-10 flex -translate-x-1/2 items-center gap-2">
                <div className="flex items-center rounded-lg border bg-background/80 p-0.5 shadow-sm backdrop-blur-sm">
                  <Button
                    variant={beadShape === "cylinder" ? "secondary" : "ghost"}
                    size="sm"
                    className="h-7 gap-1.5 rounded-md px-2.5 text-xs"
                    onClick={() => setBeadShape("cylinder")}
                  >
                    <CircleDot className="size-3.5" />
                    {t("editor.preview3d.shapeCylinder")}
                  </Button>
                  <Button
                    variant={beadShape === "roundedCube" ? "secondary" : "ghost"}
                    size="sm"
                    className="h-7 gap-1.5 rounded-md px-2.5 text-xs"
                    onClick={() => setBeadShape("roundedCube")}
                  >
                    <Square className="size-3.5" />
                    {t("editor.preview3d.shapeRoundedCube")}
                  </Button>
                </div>
                <div className="flex items-center rounded-lg border bg-background/80 p-0.5 shadow-sm backdrop-blur-sm">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 w-[76px] justify-center gap-1.5 rounded-md px-2.5 text-xs"
                    onClick={() => setAutoRotate((v) => !v)}
                  >
                    {autoRotate ? <Pause className="size-3.5" /> : <Play className="size-3.5" />}
                    {t(autoRotate ? "editor.preview3d.pauseRotation" : "editor.preview3d.resumeRotation")}
                  </Button>
                </div>
              </div>
              <Canvas
              key={beadShape}
              gl={{ alpha: true, antialias: true, powerPreference: "high-performance" }}
              camera={{ position: [0, 0, cameraDist], fov: 40, near: 0.01, far: cameraDist * 10 }}
              dpr={[1, 1.5]}
              style={{ background: "transparent" }}
            >
              <Scene entries={entries} width={width} height={height} beadShape={beadShape} autoRotate={autoRotate} />
            </Canvas>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
