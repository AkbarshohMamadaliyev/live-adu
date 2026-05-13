"use client";

import CameraPlayer from "./CameraPlayer";
import type { Camera } from "./CameraList";
import {
  Wifi,
  WifiOff,
  Video,
  MonitorX,
  LayoutGrid,
  PanelLeftOpen,
  PanelLeftClose,
} from "lucide-react";

const MAX_SLOTS = 24;

interface MultiViewGridProps {
  cameras: Camera[];
  statuses: Map<string, boolean>;
  onSnapshot: (cameraId: string) => void;
  title?: string;
  selectedCameraIds: Set<string>;
  onToggleCamera: (cam: Camera) => void;
  sidebarOpen?: boolean;
  onToggleSidebar?: () => void;
}

function previewGridCols(count: number): string {
  if (count === 1) return "grid-cols-1";
  if (count === 2) return "grid-cols-2";
  if (count <= 4) return "grid-cols-2";
  if (count <= 6) return "grid-cols-3";
  if (count <= 9) return "grid-cols-3";
  return "grid-cols-4";
}

export default function MultiViewGrid({
  cameras,
  statuses,
  onSnapshot,
  title,
  selectedCameraIds,
  onToggleCamera,
  sidebarOpen,
  onToggleSidebar,
}: MultiViewGridProps) {
  const onlineCount = cameras.filter((c) => statuses.get(c.id) ?? false).length;

  // Fixed 24 slots
  const slots: (Camera | null)[] = Array.from(
    { length: MAX_SLOTS },
    (_, i) => cameras[i] ?? null,
  );

  // Selected cameras in insertion order (preserve slot order)
  const selectedCameras = slots.filter(
    (cam): cam is Camera => cam !== null && selectedCameraIds.has(cam.id),
  );

  return (
    <div className="flex flex-col h-full overflow-hidden bg-[#0a0a0f]">
      {/* ── Header ─────────────────────────────────────────── */}
      <div className="flex items-center justify-between px-4 pt-4 pb-2 flex-shrink-0">
        <div className="flex items-center gap-2.5">
          {onToggleSidebar ? (
            <button
              onClick={onToggleSidebar}
              className="text-neutral-500 hover:text-white transition-colors p-1 rounded-md hover:bg-neutral-800"
              title={sidebarOpen ? "Panelni yopish" : "Panelni ochish"}
            >
              {sidebarOpen ? (
                <PanelLeftClose className="w-4 h-4" />
              ) : (
                <PanelLeftOpen className="w-4 h-4" />
              )}
            </button>
          ) : (
            <LayoutGrid className="w-4 h-4 text-purple-500" />
          )}
          <div>
            <h2 className="text-white text-sm font-bold tracking-tight leading-none">
              {title ?? "Kamera tanlash"}
            </h2>
            <p className="text-neutral-600 text-[10px] mt-0.5">
              <span className="text-green-400 font-semibold">
                {onlineCount}
              </span>
              <span> / {MAX_SLOTS} slot · </span>
              {selectedCameraIds.size > 0 ? (
                <span className="text-purple-400 font-semibold">
                  {selectedCameraIds.size} ta tanlangan
                </span>
              ) : (
                <span className="text-neutral-600">
                  Ko&apos;rish uchun slot tanlang
                </span>
              )}
            </p>
          </div>
        </div>

        {/* Legend */}
        <div className="hidden sm:flex items-center gap-3 text-[10px] text-neutral-600">
          <span className="flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-green-500" /> Online
          </span>
          <span className="flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-red-600" /> Offline
          </span>
          <span className="flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-neutral-700" />{" "}
            Bo&apos;sh
          </span>
        </div>
      </div>

      {/* ── 24-slot selector ───────────────────────────────── */}
      <div className="flex-shrink-0 px-4 pb-3">
        <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 lg:grid-cols-12 gap-1">
          {slots.map((cam, idx) => {
            const slotNum = idx + 1;
            const isEmpty = cam === null;
            const isOnline = cam ? (statuses.get(cam.id) ?? false) : false;
            const isSelected = cam ? selectedCameraIds.has(cam.id) : false;

            if (isEmpty) {
              return (
                <div
                  key={idx}
                  className="relative flex items-center justify-center rounded border border-dashed border-neutral-800 bg-[#0d0d14] h-8 cursor-not-allowed opacity-40 select-none"
                  title={`Slot ${slotNum} — bo'sh`}
                >
                  <span className="text-[9px] font-mono text-neutral-700 font-bold">
                    {String(slotNum).padStart(2, "0")}
                  </span>
                </div>
              );
            }

            return (
              <div
                key={cam.id}
                role="button"
                tabIndex={0}
                onClick={() => onToggleCamera(cam)}
                onKeyDown={(e) => e.key === "Enter" && onToggleCamera(cam)}
                title={`${cam.name} — ${cam.ipAddress}`}
                className={`
                  relative flex items-center gap-1.5 rounded h-8 px-1.5 cursor-pointer
                  transition-all duration-150 select-none overflow-hidden
                  ${
                    isSelected
                      ? "bg-purple-900/60 border border-purple-500 shadow-[0_0_8px_rgba(124,58,237,0.5)]"
                      : isOnline
                        ? "bg-neutral-900 border border-neutral-700 hover:border-purple-500/50 hover:bg-neutral-800"
                        : "bg-neutral-900 border border-neutral-800 hover:border-neutral-700 opacity-70"
                  }
                `}
              >
                {/* Slot number */}
                <span
                  className={`text-[9px] font-mono font-bold flex-shrink-0 ${
                    isSelected ? "text-purple-300" : "text-neutral-600"
                  }`}
                >
                  {String(slotNum).padStart(2, "0")}
                </span>

                {/* Status dot */}
                <span
                  className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${
                    isOnline
                      ? "bg-green-500 shadow-[0_0_3px_rgba(34,197,94,0.6)]"
                      : "bg-red-700"
                  }`}
                />

                {/* Name */}
                <span
                  className={`text-[9px] font-medium truncate leading-none ${
                    isSelected ? "text-white" : "text-neutral-400"
                  }`}
                >
                  {cam.name}
                </span>

                {/* Selected tick */}
                {isSelected && (
                  <span className="absolute right-1 top-0.5 text-purple-400 text-[8px] font-bold">
                    ✓
                  </span>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Divider */}
      <div className="h-px bg-neutral-800/60 flex-shrink-0 mx-4" />

      {/* ── Live preview area ──────────────────────────────── */}
      <div className="flex-1 overflow-auto p-4 min-h-0">
        {selectedCameras.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center gap-3 text-neutral-700 select-none">
            <MonitorX className="w-12 h-12 text-neutral-800" />
            <p className="text-sm font-medium">Kamera slotini bosib tanlang</p>
            <p className="text-xs text-neutral-800">
              Bir yoki bir nechta kamerani tanlash mumkin
            </p>
          </div>
        ) : (
          <div
            className={`grid ${previewGridCols(selectedCameras.length)} gap-3 auto-rows-fr`}
          >
            {selectedCameras.map((cam) => {
              const isOnline = statuses.get(cam.id) ?? false;
              return (
                <div
                  key={cam.id}
                  className="relative rounded-xl overflow-hidden border border-purple-500/40 shadow-[0_0_0_1px_rgba(124,58,237,0.2)] bg-black flex flex-col min-h-0 animate-[fadeIn_0.2s_ease-out]"
                >
                  {/* Live stream */}
                  <div className="relative flex-1 min-h-[120px]">
                    {isOnline ? (
                      <CameraPlayer
                        cameraId={cam.id}
                        cameraName={cam.name}
                        online={true}
                        compact={true}
                        onSnapshot={() => onSnapshot(cam.id)}
                      />
                    ) : (
                      <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-[#0d0d14]">
                        <WifiOff className="w-8 h-8 text-red-800" />
                        <span className="text-xs text-red-900 font-semibold uppercase tracking-widest">
                          Offline
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Info bar */}
                  <div className="flex-shrink-0 flex items-center gap-2 px-3 py-2 bg-gradient-to-r from-[#0d0d18] to-[#0a0a14] border-t border-neutral-800/60">
                    {isOnline ? (
                      <Wifi className="w-3 h-3 text-green-500 flex-shrink-0" />
                    ) : (
                      <WifiOff className="w-3 h-3 text-red-600 flex-shrink-0" />
                    )}
                    <span className="text-white text-xs font-semibold truncate">
                      {cam.name}
                    </span>
                    <span className="ml-auto text-neutral-600 text-[10px] font-mono flex-shrink-0">
                      {cam.ipAddress}
                    </span>
                    {/* Deselect button */}
                    <button
                      onClick={() => onToggleCamera(cam)}
                      className="ml-2 flex-shrink-0 text-neutral-600 hover:text-red-400 transition-colors text-xs leading-none"
                      title="Yopish"
                    >
                      ✕
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
