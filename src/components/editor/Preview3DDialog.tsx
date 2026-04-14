import { useMemo, useRef, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { Canvas } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import * as THREE from "three";
import { Box, X } from "lucide-react";
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

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

type PixelEntry = { x: number; y: number; color: string };

function PixelMesh({ entries, width, height }: { entries: PixelEntry[]; width: number; height: number }) {
  const meshRef = useRef<THREE.InstancedMesh>(null);
  const count = entries.length;
  const depth = 0.7;

  const dummy = useMemo(() => new THREE.Object3D(), []);
  const tmpColor = useMemo(() => new THREE.Color(), []);

  const beadGeometry = useMemo(() => {
    const geo = new THREE.CylinderGeometry(0.46, 0.46, depth, 32, 1, false);
    geo.rotateX(Math.PI / 2);
    return geo;
  }, [depth]);

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
    <instancedMesh ref={meshRef} args={[beadGeometry, undefined, count]} castShadow receiveShadow>
      <meshStandardMaterial roughness={0.45} metalness={0.05} />
    </instancedMesh>
  );
}

function Scene({ entries, width, height }: { entries: PixelEntry[]; width: number; height: number }) {
  const dist = Math.max(width, height) * 1.3;
  return (
    <>
      <ambientLight intensity={0.55} />
      <directionalLight position={[dist, dist, dist]} intensity={1.1} castShadow />
      <directionalLight position={[-dist, dist * 0.5, dist * 0.5]} intensity={0.3} />
      <PixelMesh entries={entries} width={width} height={height} />
      <OrbitControls enableDamping makeDefault />
    </>
  );
}

export default function Preview3DDialog({ open, onOpenChange }: Props) {
  const { t } = useTranslation();
  const pixels = useEditorStore((s) => s.pixels);
  const width = useEditorStore((s) => s.width);
  const height = useEditorStore((s) => s.height);

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

  const cameraDist = Math.max(width, height) * 1.4;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[980px] w-[calc(100vw-32px)] max-h-[calc(100vh-32px)] h-[85vh] p-0 overflow-hidden flex flex-col gap-0">
        <DialogHeader className="px-6 pt-6 pb-4">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <DialogTitle className="flex items-center gap-2">
                <span className="inline-flex size-7 items-center justify-center rounded-full bg-pink-500/10 text-pink-500">
                  <Box className="size-4" />
                </span>
                <span>{t("sidebar.preview3d")}</span>
              </DialogTitle>
              <DialogDescription className="mt-1">
                {t("editor.preview3d.description", { defaultValue: "Rotate, zoom and inspect your pattern in 3D." })}
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

        <div className="flex-1 min-h-0 relative bg-white p-4 sm:p-6">
          {entries.length === 0 ? (
            <div className="absolute inset-0 flex items-center justify-center text-sm text-muted-foreground">
              {t("editor.preview3d.empty", { defaultValue: "Canvas is empty" })}
            </div>
          ) : (
            <Canvas
              shadows
              gl={{ alpha: true }}
              camera={{ position: [0, 0, cameraDist], fov: 40, near: 0.1, far: cameraDist * 10 }}
              dpr={[1, 2]}
              style={{ background: "transparent" }}
            >
              <Scene entries={entries} width={width} height={height} />
            </Canvas>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
