"use client";

import { useState } from "react";
import {
  Wifi,
  WifiOff,
  FolderOpen,
  Layers,
  ChevronDown,
  ChevronRight,
} from "lucide-react";

export interface Camera {
  id: string;
  name: string;
  location?: string | null;
  ipAddress: string;
  subcategoryId?: string | null;
  subcategory?: {
    id: string;
    name: string;
    categoryId: string;
    category?: { id: string; name: string };
  } | null;
}

export interface CameraStatus {
  id: string;
  online: boolean;
}

interface CameraListProps {
  cameras: Camera[];
  statuses: Map<string, boolean>;
  selectedId: string | null;
  onSelect: (id: string | null) => void;
  selectedSubId?: string | null;
  onSelectSub?: (subId: string, cameras: Camera[]) => void;
}

const MAX_SLOTS = 24;

export default function CameraList({
  cameras,
  statuses,
  selectedId,
  onSelect,
  selectedSubId,
  onSelectSub,
}: CameraListProps) {
  const totalOnline = Array.from(statuses.values()).filter(Boolean).length;

  // Build hierarchy: category → subcategory → cameras
  const categoryMap = new Map<
    string,
    {
      id: string;
      name: string;
      subs: Map<string, { id: string; name: string; cameras: Camera[] }>;
    }
  >();
  const uncategorized: Camera[] = [];

  for (const cam of cameras) {
    if (!cam.subcategory) {
      uncategorized.push(cam);
      continue;
    }
    const sub = cam.subcategory;
    const cat = sub.category;

    const catId = cat?.id ?? "__no_cat";
    const catName = cat?.name ?? "Uncategorized";
    if (!categoryMap.has(catId)) {
      categoryMap.set(catId, { id: catId, name: catName, subs: new Map() });
    }
    const catEntry = categoryMap.get(catId)!;
    if (!catEntry.subs.has(sub.id)) {
      catEntry.subs.set(sub.id, { id: sub.id, name: sub.name, cameras: [] });
    }
    catEntry.subs.get(sub.id)!.cameras.push(cam);
  }

  const [expandedCats, setExpandedCats] = useState<Set<string>>(
    new Set(categoryMap.keys()),
  );
  const [expandedSubs, setExpandedSubs] = useState<Set<string>>(
    new Set([...categoryMap.values()].flatMap((c) => [...c.subs.keys()])),
  );

  const toggleCat = (id: string) => {
    setExpandedCats((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const toggleSub = (id: string) => {
    setExpandedSubs((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const renderCamera = (cam: Camera) => {
    const isOnline = statuses.get(cam.id) ?? false;
    const isSelected = selectedId === cam.id;
    return (
      <button
        key={cam.id}
        onClick={() => onSelect(cam.id)}
        className={`w-full text-left pl-7 pr-3 py-2 rounded-lg mb-0.5 transition-all duration-150 flex items-center gap-2.5 ${
          isSelected
            ? "bg-hikpurple-900/40 border border-hikpurple-500/50 shadow-purple-glow-sm"
            : "hover:bg-neutral-800 border border-transparent"
        }`}
      >
        {isOnline ? (
          <Wifi className="w-3.5 h-3.5 text-green-500 flex-shrink-0" />
        ) : (
          <WifiOff className="w-3.5 h-3.5 text-neutral-600 flex-shrink-0" />
        )}
        <div className="min-w-0 flex-1">
          <div className="text-white text-sm font-medium truncate">
            {cam.name}
          </div>
          <div className="text-neutral-500 text-xs font-mono truncate">
            {cam.ipAddress}
          </div>
        </div>
        <span
          className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${
            isOnline
              ? "bg-green-500 shadow-[0_0_4px_rgba(34,197,94,0.6)]"
              : "bg-neutral-700"
          }`}
        />
      </button>
    );
  };

  return (
    <div className="w-72 bg-[#0d0d14] border-r border-neutral-800/70 flex flex-col h-full">
      {/* Header */}
      <div className="p-5 border-b border-neutral-800/70 bg-[#0a0a0f]">
        <div className="flex items-center gap-3">
          <div className="relative flex items-center justify-center w-8 h-8 flex-shrink-0">
            <span className="absolute inline-flex w-full h-full rounded-full bg-red-500 opacity-20 animate-ping" />
            <span className="relative w-4 h-4 rounded-full bg-red-500" />
          </div>
          <h1 className="text-red-500 text-2xl font-bold tracking-tight">
            Live ADU
          </h1>
        </div>
      </div>

      {/* Hierarchy list */}
      <div className="flex-1 overflow-y-auto px-2 pb-3 pt-2 scrollbar-thin scrollbar-track-transparent scrollbar-thumb-neutral-800">
        {cameras.length === 0 && (
          <div className="text-neutral-600 text-xs text-center py-8 px-4">
            Kameralar topilmadi
          </div>
        )}

        {[...categoryMap.values()].map((cat) => {
          const catOnline = [...cat.subs.values()].reduce(
            (sum, sub) =>
              sum +
              sub.cameras.filter((c) => statuses.get(c.id) ?? false).length,
            0,
          );
          return (
            <div key={cat.id} className="mb-1">
              {/* Category row */}
              <button
                onClick={() => toggleCat(cat.id)}
                className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-neutral-400 hover:bg-neutral-800/60 transition-colors group"
              >
                {expandedCats.has(cat.id) ? (
                  <ChevronDown className="w-4 h-4 flex-shrink-0 text-neutral-600" />
                ) : (
                  <ChevronRight className="w-4 h-4 flex-shrink-0 text-neutral-600" />
                )}
                <FolderOpen className="w-4 h-4 text-blue-500 flex-shrink-0" />
                <span className="text-xs font-semibold uppercase tracking-widest text-neutral-400 truncate">
                  {cat.name}
                </span>
                <span className="ml-auto text-xs text-neutral-600 font-mono">
                  {catOnline}
                </span>
              </button>

              {expandedCats.has(cat.id) &&
                [...cat.subs.values()].map((sub) => {
                  const subOnline = sub.cameras.filter(
                    (c) => statuses.get(c.id) ?? false,
                  ).length;
                  const isSubSelected = selectedSubId === sub.id;
                  return (
                    <div key={sub.id} className="ml-2">
                      {/* Subcategory row */}
                      <button
                        onClick={() => {
                          toggleSub(sub.id);
                          onSelectSub?.(sub.id, sub.cameras);
                        }}
                        className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg transition-all duration-150 ${
                          isSubSelected
                            ? "bg-hikpurple-900/40 border border-hikpurple-500/40 text-hikpurple-400 shadow-purple-glow-sm"
                            : "text-neutral-400 hover:bg-neutral-800/50 border border-transparent"
                        }`}
                      >
                        <Layers
                          className={`w-4 h-4 flex-shrink-0 ${
                            isSubSelected
                              ? "text-hikpurple-400"
                              : "text-neutral-600"
                          }`}
                        />
                        <span
                          className={`text-xs font-medium truncate ${
                            isSubSelected
                              ? "text-hikpurple-300"
                              : "text-neutral-400"
                          }`}
                        >
                          {sub.name}
                        </span>
                        {/* boks (2/24) badge */}
                        <span
                          className={`ml-auto text-xs font-mono flex-shrink-0 ${
                            isSubSelected
                              ? "text-hikpurple-400"
                              : "text-neutral-600"
                          }`}
                        >
                          <span
                            className={
                              subOnline > 0
                                ? "text-green-500"
                                : "text-neutral-600"
                            }
                          >
                            {subOnline}
                          </span>
                          <span className="text-neutral-700">/{MAX_SLOTS}</span>
                        </span>
                      </button>

                      {expandedSubs.has(sub.id) &&
                        sub.cameras.map(renderCamera)}
                    </div>
                  );
                })}
            </div>
          );
        })}

        {/* Uncategorized cameras */}
        {uncategorized.length > 0 && (
          <div className="mt-2">
            <div className="px-2 py-1 text-[10px] text-neutral-700 uppercase tracking-wider">
              Kategoriyasiz
            </div>
            {uncategorized.map(renderCamera)}
          </div>
        )}
      </div>
    </div>
  );
}
