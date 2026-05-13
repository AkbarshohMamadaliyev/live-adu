"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { FolderOpen, Layers, Video, ArrowRight } from "lucide-react";

interface Stats {
  categories: number;
  subcategories: number;
  cameras: number;
  activeCameras: number;
}

export default function AdminDashboard() {
  const [stats, setStats] = useState<Stats | null>(null);

  useEffect(() => {
    Promise.all([
      fetch("/api/admin/categories").then((r) => r.json()),
      fetch("/api/admin/subcategories").then((r) => r.json()),
      fetch("/api/admin/cameras").then((r) => r.json()),
    ]).then(([cats, subs, cams]) => {
      setStats({
        categories: cats.categories?.length ?? 0,
        subcategories: subs.subcategories?.length ?? 0,
        cameras: cams.cameras?.length ?? 0,
        activeCameras: cams.cameras?.filter((c: any) => c.isActive).length ?? 0,
      });
    });
  }, []);

  const cards = [
    {
      label: "Categories",
      value: stats?.categories,
      icon: FolderOpen,
      href: "/admin/categories",
      color: "text-blue-400",
    },
    {
      label: "Subcategories",
      value: stats?.subcategories,
      icon: Layers,
      href: "/admin/subcategories",
      color: "text-purple-400",
    },
    {
      label: "Total Cameras",
      value: stats?.cameras,
      icon: Video,
      href: "/admin/cameras",
      color: "text-hikred",
    },
    {
      label: "Active Cameras",
      value: stats?.activeCameras,
      icon: Video,
      href: "/admin/cameras",
      color: "text-green-400",
    },
  ];

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-white">Dashboard</h1>
        <p className="text-neutral-400 text-sm mt-1">
          Overview of your camera surveillance system
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-10">
        {cards.map(({ label, value, icon: Icon, href, color }) => (
          <Link
            key={label}
            href={href}
            className="bg-neutral-900 border border-neutral-800 rounded-xl p-5 hover:border-neutral-600 transition-colors group"
          >
            <div className="flex items-center justify-between mb-4">
              <Icon className={`w-6 h-6 ${color}`} />
              <ArrowRight className="w-4 h-4 text-neutral-600 group-hover:text-neutral-400 transition-colors" />
            </div>
            <div className="text-3xl font-bold text-white mb-1">
              {value ?? <span className="text-neutral-600 text-lg">—</span>}
            </div>
            <div className="text-neutral-400 text-sm">{label}</div>
          </Link>
        ))}
      </div>

      {/* Hierarchy diagram */}
      <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-6">
        <h2 className="text-white font-semibold mb-4">Hierarchy Structure</h2>
        <div className="flex items-center gap-3 flex-wrap">
          <div className="flex items-center gap-2 bg-blue-500/10 border border-blue-500/30 rounded-lg px-4 py-2">
            <FolderOpen className="w-4 h-4 text-blue-400" />
            <span className="text-blue-300 text-sm font-medium">Category</span>
          </div>
          <ArrowRight className="w-4 h-4 text-neutral-600" />
          <div className="flex items-center gap-2 bg-purple-500/10 border border-purple-500/30 rounded-lg px-4 py-2">
            <Layers className="w-4 h-4 text-purple-400" />
            <span className="text-purple-300 text-sm font-medium">
              Subcategory
            </span>
          </div>
          <ArrowRight className="w-4 h-4 text-neutral-600" />
          <div className="flex items-center gap-2 bg-red-500/10 border border-red-500/30 rounded-lg px-4 py-2">
            <Video className="w-4 h-4 text-hikred" />
            <span className="text-red-300 text-sm font-medium">Camera</span>
          </div>
        </div>
        <p className="text-neutral-500 text-xs mt-4">
          Each camera must be linked to a subcategory, which in turn belongs to
          a category.
        </p>
      </div>
    </div>
  );
}
