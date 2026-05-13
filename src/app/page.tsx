"use client";

import { useEffect, useState, useCallback } from "react";
import CameraList, { type Camera } from "@/components/CameraList";
import MultiViewGrid from "@/components/MultiViewGrid";
import { Loader2, AlertCircle } from "lucide-react";

export default function HomePage() {
  const [cameras, setCameras] = useState<Camera[]>([]);
  const [statuses, setStatuses] = useState<Map<string, boolean>>(new Map());
  const [selectedCameraIds, setSelectedCameraIds] = useState<Set<string>>(
    new Set(),
  );
  const [selectedSubId, setSelectedSubId] = useState<string | null>(null);
  const [subCameras, setSubCameras] = useState<Camera[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(true);

  // Kameralar ro'yxatini olish
  useEffect(() => {
    fetch("/api/cameras")
      .then((r) => r.json())
      .then((data) => {
        if (data.error) throw new Error(data.error);
        setCameras(data.cameras || []);
        // Default — select the first camera automatically
        if (data.cameras?.length > 0) {
          setSelectedCameraIds(new Set([data.cameras[0].id]));
        }
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  // Status ma'lumotlarini olish (har 30 sekundda)
  const fetchStatuses = useCallback(async () => {
    try {
      const res = await fetch("/api/status");
      const data = await res.json();
      if (data.statuses) {
        const map = new Map<string, boolean>();
        for (const s of data.statuses) {
          map.set(s.id, s.online);
        }
        setStatuses(map);
      }
    } catch (err) {
      console.error("Status fetch xato:", err);
    }
  }, []);

  useEffect(() => {
    if (cameras.length === 0) return;
    fetchStatuses();
    const interval = setInterval(fetchStatuses, 30_000);
    return () => clearInterval(interval);
  }, [cameras.length, fetchStatuses]);

  // Snapshot olish
  const handleSnapshot = useCallback(
    async (cameraId: string) => {
      try {
        const res = await fetch(`/api/snapshot/${cameraId}`);
        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          throw new Error(data.error || "Snapshot xatosi");
        }
        const blob = await res.blob();
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        const camera = cameras.find((c) => c.id === cameraId);
        a.href = url;
        a.download = `snapshot-${camera?.name || cameraId}-${Date.now()}.jpg`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      } catch (err: any) {
        alert(`Snapshot xatosi: ${err.message}`);
      }
    },
    [cameras],
  );

  const handleSelect = useCallback((id: string | null) => {
    setSelectedSubId(null);
    setSubCameras(null);
    if (id) {
      setSelectedCameraIds(new Set([id]));
    } else {
      setSelectedCameraIds(new Set());
    }
  }, []);

  const handleToggleCamera = useCallback((cam: Camera) => {
    setSelectedCameraIds((prev) => {
      const next = new Set(prev);
      if (next.has(cam.id)) {
        next.delete(cam.id);
      } else {
        next.add(cam.id);
      }
      return next;
    });
  }, []);

  const handleSelectSub = useCallback((subId: string, cams: Camera[]) => {
    setSelectedSubId(subId);
    setSubCameras(cams);
    setSelectedCameraIds(new Set());
  }, []);

  // Derive the single selectedId for sidebar highlighting
  const selectedId =
    selectedCameraIds.size === 1 ? [...selectedCameraIds][0] : null;

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#0a0a0f]">
        <Loader2 className="w-8 h-8 animate-spin text-purple-500" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#0a0a0f]">
        <div className="flex flex-col items-center gap-3 text-red-400">
          <AlertCircle className="w-12 h-12" />
          <p>{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen overflow-hidden bg-[#0a0a0f]">
      {/* Sidebar */}
      <div
        className={`flex-shrink-0 transition-all duration-300 ease-in-out overflow-hidden ${
          sidebarOpen ? "w-64" : "w-0"
        }`}
      >
        <CameraList
          cameras={cameras}
          statuses={statuses}
          selectedId={selectedId}
          onSelect={handleSelect}
          selectedSubId={selectedSubId}
          onSelectSub={handleSelectSub}
        />
      </div>

      <div className="flex-1 flex flex-col overflow-hidden bg-[#0a0a0f] min-w-0">
        <MultiViewGrid
          cameras={subCameras ?? cameras}
          statuses={statuses}
          onSnapshot={handleSnapshot}
          title={subCameras?.[0]?.subcategory?.name ?? undefined}
          selectedCameraIds={selectedCameraIds}
          onToggleCamera={handleToggleCamera}
          sidebarOpen={sidebarOpen}
          onToggleSidebar={() => setSidebarOpen((o) => !o)}
        />
      </div>
    </div>
  );
}
