"use client";

import { useState } from "react";
import CameraPlayer from "./CameraPlayer";
import type { Camera } from "./CameraList";
import {
  WifiOff,
  PanelLeftOpen,
  PanelLeftClose,
  Lock,
  Unlock,
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
  const [locked, setLocked] = useState(false);

  const onlineCount = cameras.filter((c) => statuses.get(c.id) ?? false).length;

  const slots: (Camera | null)[] = Array.from(
    { length: MAX_SLOTS },
    (_, i) => cameras[i] ?? null,
  );

  const selectedCameras = slots.filter(
    (cam): cam is Camera => cam !== null && selectedCameraIds.has(cam.id),
  );

  return (
    <div className="flex flex-col h-full overflow-hidden bg-[#111214]">
      {/* ── Header ── */}
      <div className="flex items-center justify-between px-4 py-2.5 border-b border-[#2a2a2e] flex-shrink-0 bg-[#18191c]">
        <div className="flex items-center gap-2">
          {onToggleSidebar && (
            <button
              onClick={onToggleSidebar}
              className="text-[#666] hover:text-[#ccc] transition-colors p-1 rounded"
              title={sidebarOpen ? "Close panel" : "Open panel"}
            >
              {sidebarOpen ? (
                <PanelLeftClose className="w-4 h-4" />
              ) : (
                <PanelLeftOpen className="w-4 h-4" />
              )}
            </button>
          )}
          <span className="text-[#ccc] text-xs font-medium tracking-wide">
            {title ?? "Camera View"}
          </span>
          <span className="text-[#444] text-xs">·</span>
          <span className="text-[#888] text-xs">
            <span className="text-[#4ade80]">{onlineCount}</span>
            <span className="text-[#444]"> / {MAX_SLOTS}</span>
          </span>
        </div>

        {/* Lock toggle */}
        <button
          onClick={() => setLocked((v) => !v)}
          title={locked ? "Unlock selection" : "Lock selection"}
          className={`flex items-center gap-1.5 px-2 py-1 rounded text-[10px] transition-colors border ${
            locked
              ? "bg-[#2a1f0e] border-[#7c5c2e] text-[#f59e0b] hover:bg-[#33250f]"
              : "bg-[#1a1b1e] border-[#2a2a2e] text-[#555] hover:text-[#aaa] hover:border-[#444]"
          }`}
        >
          {locked ? (
            <Lock className="w-3 h-3" />
          ) : (
            <Unlock className="w-3 h-3" />
          )}
          <span>{locked ? "Locked" : "Unlocked"}</span>
        </button>

        {/* Legend */}
        <div className="flex items-center gap-3 text-[10px] text-[#555]">
          <span className="flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-[#4ade80]" /> Online
          </span>
          <span className="flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-[#ef4444]" /> Offline
          </span>
          <span className="flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-[#333]" /> Empty
          </span>
        </div>
      </div>

      {/* ── Slot grid ── */}
      <div className="flex-shrink-0 px-3 py-2.5 border-b border-[#2a2a2e] bg-[#18191c] relative">
        {locked && (
          <div
            className="absolute inset-0 z-20 cursor-not-allowed"
            title="Selection is locked"
          />
        )}
        <div className="grid grid-cols-6 sm:grid-cols-8 md:grid-cols-12 gap-px bg-[#2a2a2e]">
          {slots.map((cam, idx) => {
            const slotNum = idx + 1;
            const isEmpty = cam === null;
            const isOnline = cam ? (statuses.get(cam.id) ?? false) : false;
            const isSelected = cam ? selectedCameraIds.has(cam.id) : false;

            if (isEmpty) {
              return (
                <div
                  key={idx}
                  className="flex flex-col items-center justify-center bg-[#131416] h-10 select-none cursor-default"
                  title={`Slot ${slotNum}`}
                >
                  <span className="text-[9px] font-mono text-[#333]">
                    {String(slotNum).padStart(2, "0")}
                  </span>
                </div>
              );
            }

            return (
              <button
                key={cam.id}
                onClick={() => !locked && onToggleCamera(cam)}
                title={
                  locked
                    ? `${cam.name} (locked)`
                    : `${cam.name} — ${cam.ipAddress}`
                }
                className={`
                  relative flex flex-col items-start justify-between h-10 px-1.5 py-1 cursor-pointer
                  transition-colors duration-100 select-none overflow-hidden text-left
                  ${
                    isSelected
                      ? "bg-[#1e3a5f] outline outline-1 outline-[#3b82f6] z-10"
                      : isOnline
                        ? "bg-[#1a1b1e] hover:bg-[#222326]"
                        : "bg-[#171819] hover:bg-[#1c1d1f] opacity-60"
                  }
                `}
              >
                <div className="flex items-center justify-between w-full">
                  <span
                    className={`text-[9px] font-mono font-semibold ${isSelected ? "text-[#60a5fa]" : "text-[#444]"}`}
                  >
                    {String(slotNum).padStart(2, "0")}
                  </span>
                  <span
                    className={`w-1 h-1 rounded-full flex-shrink-0 ${
                      isOnline ? "bg-[#4ade80]" : "bg-[#ef4444]"
                    }`}
                  />
                </div>
                <span
                  className={`text-[9px] truncate w-full leading-none ${isSelected ? "text-[#e2e8f0]" : "text-[#666]"}`}
                >
                  {cam.name}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* ── Live preview ── */}
      <div className="flex-1 overflow-auto p-3 min-h-0 bg-[#111214]">
        {selectedCameras.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center gap-2 select-none">
            <div className="grid grid-cols-2 gap-0.5 opacity-10">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="w-8 h-6 bg-[#444] rounded-sm" />
              ))}
            </div>
            <p className="text-[#444] text-xs mt-2">
              Select a camera slot to view
            </p>
          </div>
        ) : (
          <div
            className={`grid ${previewGridCols(selectedCameras.length)} gap-0.5 auto-rows-fr`}
          >
            {selectedCameras.map((cam) => {
              const isOnline = statuses.get(cam.id) ?? false;
              return (
                <div
                  key={cam.id}
                  className="relative bg-black flex flex-col min-h-0 border border-[#2a2a2e]"
                >
                  {/* Stream */}
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
                      <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-[#111214]">
                        <WifiOff className="w-6 h-6 text-[#333]" />
                        <span className="text-[10px] text-[#444] uppercase tracking-widest">
                          Offline
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Info bar */}
                  <div className="flex-shrink-0 flex items-center gap-2 px-2 py-1.5 bg-[#18191c] border-t border-[#2a2a2e]">
                    <span
                      className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${
                        isOnline ? "bg-[#4ade80]" : "bg-[#ef4444]"
                      }`}
                    />
                    <span className="text-[#ccc] text-[11px] font-medium truncate flex-1">
                      {cam.name}
                    </span>
                    <span className="text-[#444] text-[10px] font-mono flex-shrink-0">
                      {cam.ipAddress}
                    </span>
                    <button
                      onClick={() => !locked && onToggleCamera(cam)}
                      className={`ml-1 flex-shrink-0 transition-colors text-[10px] leading-none ${locked ? "text-[#2a2a2e] cursor-not-allowed" : "text-[#444] hover:text-[#888]"}`}
                      title={locked ? "Unlock to close" : "Close"}
                      disabled={locked}
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
