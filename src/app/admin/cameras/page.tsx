"use client";

import { useEffect, useState, useCallback } from "react";
import {
  Plus,
  Pencil,
  Trash2,
  Video,
  Layers,
  FolderOpen,
  Loader2,
  AlertCircle,
  Eye,
  EyeOff,
  CheckCircle2,
  XCircle,
} from "lucide-react";
import Modal from "@/components/admin/Modal";

interface Category {
  id: string;
  name: string;
}
interface Subcategory {
  id: string;
  name: string;
  categoryId: string;
  category?: Category;
}
interface CameraRow {
  id: string;
  name: string;
  ipAddress: string;
  username: string;
  description: string | null;
  isActive: boolean;
  subcategoryId: string | null;
  subcategory?: Subcategory;
}

interface FormState {
  name: string;
  ipAddress: string;
  username: string;
  password: string;
  description: string;
  subcategoryId: string;
  port: string;
  rtspPort: string;
  channel: string;
  streamType: string;
  cameraType: "hikvision" | "custom"; // YANGI: Hikvision avto yoki custom URL
  rtspPath: string;
  isActive: boolean;
}

const emptyForm: FormState = {
  name: "",
  ipAddress: "",
  username: "",
  password: "",
  description: "",
  subcategoryId: "",
  port: "80",
  rtspPort: "554",
  channel: "1",
  streamType: "1",
  cameraType: "hikvision",
  rtspPath: "",
  isActive: true,
};

export default function CamerasPage() {
  const [cameras, setCameras] = useState<CameraRow[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [subcategories, setSubcategories] = useState<Subcategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const [filterCat, setFilterCat] = useState("");
  const [filterSub, setFilterSub] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  const [showModal, setShowModal] = useState(false);
  const [editTarget, setEditTarget] = useState<CameraRow | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [deleteTarget, setDeleteTarget] = useState<CameraRow | null>(null);

  const fetchAll = useCallback(async () => {
    try {
      const [camRes, catRes, subRes] = await Promise.all([
        fetch("/api/admin/cameras"),
        fetch("/api/admin/categories"),
        fetch("/api/admin/subcategories"),
      ]);
      const camData = await camRes.json();
      const catData = await catRes.json();
      const subData = await subRes.json();
      if (camData.error) throw new Error(camData.error);
      setCameras(camData.cameras ?? []);
      setCategories(catData.categories ?? []);
      setSubcategories(subData.subcategories ?? []);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  const availableSubs = filterCat
    ? subcategories.filter((s) => s.categoryId === filterCat)
    : subcategories;

  const formSubs = form.subcategoryId ? subcategories : subcategories;

  const filtered = cameras.filter((c) => {
    if (filterSub && c.subcategoryId !== filterSub) return false;
    if (filterCat && c.subcategory?.categoryId !== filterCat) return false;
    return true;
  });

  const openCreate = () => {
    setEditTarget(null);
    setForm({ ...emptyForm, subcategoryId: filterSub });
    setFormError(null);
    setShowPassword(false);
    setShowModal(true);
  };

  const openEdit = async (cam: CameraRow) => {
    // Fetch full camera with password
    const res = await fetch(`/api/admin/cameras/${cam.id}`);
    const data = await res.json();
    const c = data.camera;
    setEditTarget(cam);
    // Mavjud rtsp_path bo'yicha cameraType ni aniqlaymiz
    const existingRtspPath = c.rtspPath;
    const cameraType: "hikvision" | "custom" =
      existingRtspPath === null || existingRtspPath === undefined
        ? "hikvision"
        : "custom";
    setForm({
      name: c.name,
      ipAddress: c.ipAddress,
      username: c.username,
      password: c.password ?? "",
      description: c.description ?? "",
      subcategoryId: c.subcategoryId ?? "",
      port: String(c.port ?? 80),
      rtspPort: String(c.rtspPort ?? 554),
      channel: String(c.channel ?? 1),
      streamType: String(c.streamType ?? 1),
      cameraType,
      rtspPath: existingRtspPath ?? "",
      isActive: c.isActive ?? true,
    });
    setFormError(null);
    setShowPassword(false);
    setShowModal(true);
  };

  const handleSave = async () => {
    setFormError(null);
    if (!form.name.trim()) {
      setFormError("Name is required");
      return;
    }
    if (!form.ipAddress.trim()) {
      setFormError("IP address is required");
      return;
    }
    if (!form.subcategoryId) {
      setFormError("Subcategory is required");
      return;
    }
    setSaving(true);
    try {
      const url = editTarget
        ? `/api/admin/cameras/${editTarget.id}`
        : "/api/admin/cameras";
      const method = editTarget ? "PUT" : "POST";
      // rtspPath qiymati:
      // - hikvision rejimida: null (DB'da Hikvision shabloni avtomatik ishlatiladi)
      // - custom rejimida: form.rtspPath (bo'sh string ham yaroqli — IP:Port'dan keyin path yo'q)
      const rtspPathValue =
        form.cameraType === "hikvision" ? null : form.rtspPath;

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.name,
          ipAddress: form.ipAddress,
          username: form.username,
          ...(form.password.trim() ? { password: form.password } : {}),
          description: form.description,
          subcategoryId: form.subcategoryId,
          port: Number(form.port) || 80,
          rtspPort: Number(form.rtspPort) || 554,
          channel: Number(form.channel) || 1,
          streamType: Number(form.streamType) || 1,
          rtspPath: rtspPathValue,
          isActive: form.isActive,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setFormError(data.error || "Save failed");
        return;
      }
      setShowModal(false);
      fetchAll();
    } catch {
      setFormError("Network error");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/admin/cameras/${deleteTarget.id}`, {
        method: "DELETE",
      });
      if (!res.ok) {
        const d = await res.json();
        setError(d.error);
        return;
      }
      setDeleteTarget(null);
      fetchAll();
    } catch {
      setError("Delete failed");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-48">
        <Loader2 className="w-6 h-6 animate-spin text-neutral-400" />
      </div>
    );
  }

  // Subcategories filtered by selected form category
  const formFilteredSubs = form.subcategoryId ? subcategories : subcategories;

  const formCategoryId = subcategories.find(
    (s) => s.id === form.subcategoryId,
  )?.categoryId;
  const catFilteredSubs = subcategories; // show all in form (user picks category via sub)

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-white">Cameras</h1>
          <p className="text-neutral-400 text-sm mt-1">
            {filtered.length} of {cameras.length} total
          </p>
        </div>
        <button
          onClick={openCreate}
          className="flex items-center gap-2 bg-hikred hover:bg-red-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
        >
          <Plus className="w-4 h-4" />
          New Camera
        </button>
      </div>

      {/* Filters */}
      <div className="flex gap-3 mb-4 flex-wrap">
        <select
          value={filterCat}
          onChange={(e) => {
            setFilterCat(e.target.value);
            setFilterSub("");
          }}
          className="bg-neutral-800 border border-neutral-700 text-white text-sm rounded-lg px-3 py-2 focus:outline-none focus:border-hikred"
        >
          <option value="">All categories</option>
          {categories.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
        <select
          value={filterSub}
          onChange={(e) => setFilterSub(e.target.value)}
          className="bg-neutral-800 border border-neutral-700 text-white text-sm rounded-lg px-3 py-2 focus:outline-none focus:border-hikred"
        >
          <option value="">All subcategories</option>
          {availableSubs.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name}
            </option>
          ))}
        </select>
      </div>

      {error && (
        <div className="flex items-center gap-2 text-red-400 bg-red-400/10 border border-red-400/20 rounded-lg px-4 py-3 mb-4 text-sm">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          {error}
        </div>
      )}

      {/* Table */}
      <div className="bg-neutral-900 border border-neutral-800 rounded-xl overflow-hidden">
        {filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-neutral-500">
            <Video className="w-10 h-10 mb-3" />
            <p className="text-sm">No cameras found.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm min-w-[700px]">
              <thead>
                <tr className="border-b border-neutral-800 text-neutral-400 text-xs uppercase tracking-wider">
                  <th className="text-left px-5 py-3">Camera</th>
                  <th className="text-left px-5 py-3">IP Address</th>
                  <th className="text-left px-5 py-3">Hierarchy</th>
                  <th className="text-left px-5 py-3">Login</th>
                  <th className="text-center px-5 py-3">Status</th>
                  <th className="text-right px-5 py-3">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-800">
                {filtered.map((cam) => (
                  <tr
                    key={cam.id}
                    className="hover:bg-neutral-800/50 transition-colors"
                  >
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-2">
                        <Video className="w-4 h-4 text-hikred flex-shrink-0" />
                        <div>
                          <div className="font-medium text-white">
                            {cam.name}
                          </div>
                          {cam.description && (
                            <div className="text-xs text-neutral-500 truncate max-w-[160px]">
                              {cam.description}
                            </div>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-4 text-neutral-300 font-mono">
                      {cam.ipAddress}
                    </td>
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-1 text-xs">
                        <span className="text-blue-400 flex items-center gap-1">
                          <FolderOpen className="w-3 h-3" />
                          {cam.subcategory?.category?.name ?? "—"}
                        </span>
                        <span className="text-neutral-600">/</span>
                        <span className="text-purple-400 flex items-center gap-1">
                          <Layers className="w-3 h-3" />
                          {cam.subcategory?.name ?? "—"}
                        </span>
                      </div>
                    </td>
                    <td className="px-5 py-4 text-neutral-400">
                      {cam.username}
                    </td>
                    <td className="px-5 py-4 text-center">
                      {cam.isActive ? (
                        <span className="inline-flex items-center gap-1 text-green-400 text-xs">
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          Active
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-neutral-500 text-xs">
                          <XCircle className="w-3.5 h-3.5" />
                          Inactive
                        </span>
                      )}
                    </td>
                    <td className="px-5 py-4">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => openEdit(cam)}
                          className="p-1.5 rounded-lg text-neutral-400 hover:text-white hover:bg-neutral-700 transition-colors"
                        >
                          <Pencil className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => setDeleteTarget(cam)}
                          className="p-1.5 rounded-lg text-neutral-400 hover:text-red-400 hover:bg-red-400/10 transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Create / Edit Modal */}
      {showModal && (
        <Modal
          title={editTarget ? "Edit Camera" : "New Camera"}
          onClose={() => setShowModal(false)}
          size="lg"
        >
          <div className="grid grid-cols-2 gap-4">
            {/* Subcategory - full width */}
            <div className="col-span-2">
              <label className="block text-xs text-neutral-400 mb-1.5">
                Subcategory <span className="text-red-400">*</span>
              </label>
              <select
                value={form.subcategoryId}
                onChange={(e) =>
                  setForm({ ...form, subcategoryId: e.target.value })
                }
                className="w-full bg-neutral-800 border border-neutral-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-hikred"
              >
                <option value="">Select subcategory…</option>
                {categories.map((cat) => {
                  const subs = subcategories.filter(
                    (s) => s.categoryId === cat.id,
                  );
                  if (subs.length === 0) return null;
                  return (
                    <optgroup key={cat.id} label={cat.name}>
                      {subs.map((s) => (
                        <option key={s.id} value={s.id}>
                          {s.name}
                        </option>
                      ))}
                    </optgroup>
                  );
                })}
              </select>
            </div>

            {/* Name */}
            <div>
              <label className="block text-xs text-neutral-400 mb-1.5">
                Camera Name <span className="text-red-400">*</span>
              </label>
              <input
                autoFocus
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                className="w-full bg-neutral-800 border border-neutral-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-hikred"
                placeholder="e.g. Entrance Cam 1"
              />
            </div>

            {/* IP */}
            <div>
              <label className="block text-xs text-neutral-400 mb-1.5">
                IP Address <span className="text-red-400">*</span>
              </label>
              <input
                value={form.ipAddress}
                onChange={(e) =>
                  setForm({ ...form, ipAddress: e.target.value })
                }
                className="w-full bg-neutral-800 border border-neutral-700 rounded-lg px-3 py-2 text-white text-sm font-mono focus:outline-none focus:border-hikred"
                placeholder="192.168.1.100"
              />
            </div>

            {/* Login */}
            <div>
              <label className="block text-xs text-neutral-400 mb-1.5">
                Login
              </label>
              <input
                value={form.username}
                onChange={(e) => setForm({ ...form, username: e.target.value })}
                className="w-full bg-neutral-800 border border-neutral-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-hikred"
                placeholder="Optional"
                autoComplete="off"
              />
            </div>

            {/* Password */}
            <div>
              <label className="block text-xs text-neutral-400 mb-1.5">
                Password
                {editTarget && (
                  <span className="text-neutral-600 ml-1">
                    (leave blank to keep)
                  </span>
                )}
              </label>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  value={form.password}
                  onChange={(e) =>
                    setForm({ ...form, password: e.target.value })
                  }
                  className="w-full bg-neutral-800 border border-neutral-700 rounded-lg px-3 py-2 pr-9 text-white text-sm focus:outline-none focus:border-hikred"
                  placeholder={editTarget ? "Optional" : "Optional (no auth)"}
                  autoComplete="new-password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-neutral-500 hover:text-neutral-300"
                >
                  {showPassword ? (
                    <EyeOff className="w-4 h-4" />
                  ) : (
                    <Eye className="w-4 h-4" />
                  )}
                </button>
              </div>
            </div>

            {/* Port */}
            <div>
              <label className="block text-xs text-neutral-400 mb-1.5">
                HTTP Port
              </label>
              <input
                value={form.port}
                onChange={(e) => setForm({ ...form, port: e.target.value })}
                className="w-full bg-neutral-800 border border-neutral-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-hikred"
                placeholder="80"
                type="number"
              />
            </div>

            {/* RTSP Port */}
            <div>
              <label className="block text-xs text-neutral-400 mb-1.5">
                RTSP Port
              </label>
              <input
                value={form.rtspPort}
                onChange={(e) => setForm({ ...form, rtspPort: e.target.value })}
                className="w-full bg-neutral-800 border border-neutral-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-hikred"
                placeholder="554"
                type="number"
              />
            </div>

            {/* Camera Type — Hikvision avto yoki custom RTSP URL */}
            <div className="col-span-2">
              <label className="block text-xs text-neutral-400 mb-1.5">
                Camera Type
              </label>
              <select
                value={form.cameraType}
                onChange={(e) =>
                  setForm({
                    ...form,
                    cameraType: e.target.value as "hikvision" | "custom",
                  })
                }
                className="w-full bg-neutral-800 border border-neutral-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-hikred"
              >
                <option value="hikvision">
                  Hikvision (auto: /Streaming/Channels/...)
                </option>
                <option value="custom">Custom RTSP URL (universal)</option>
              </select>
              <p className="text-xs text-neutral-500 mt-1">
                {form.cameraType === "hikvision"
                  ? "Hikvision shabloni avtomatik ishlatiladi"
                  : "Custom RTSP URL — IP:Port'dan keyin path siz aytgan ko'rinishda bo'ladi"}
              </p>
            </div>

            {/* Channel va Stream Type — faqat Hikvision uchun */}
            {form.cameraType === "hikvision" && (
              <>
                <div>
                  <label className="block text-xs text-neutral-400 mb-1.5">
                    Channel
                  </label>
                  <input
                    value={form.channel}
                    onChange={(e) =>
                      setForm({ ...form, channel: e.target.value })
                    }
                    className="w-full bg-neutral-800 border border-neutral-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-hikred"
                    placeholder="1"
                    type="number"
                    min="1"
                  />
                </div>
                <div>
                  <label className="block text-xs text-neutral-400 mb-1.5">
                    Stream Type
                  </label>
                  <select
                    value={form.streamType}
                    onChange={(e) =>
                      setForm({ ...form, streamType: e.target.value })
                    }
                    className="w-full bg-neutral-800 border border-neutral-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-hikred"
                  >
                    <option value="1">Main (1 — yuqori sifat)</option>
                    <option value="2">Sub (2 — past sifat)</option>
                  </select>
                </div>
              </>
            )}

            {/* RTSP Path — faqat Custom uchun */}
            {form.cameraType === "custom" && (
              <div className="col-span-2">
                <label className="block text-xs text-neutral-400 mb-1.5">
                  RTSP Path
                  <span className="text-neutral-600 ml-1">
                    (IP:Port'dan keyingi qism — bo'sh bo'lishi mumkin)
                  </span>
                </label>
                <input
                  value={form.rtspPath}
                  onChange={(e) =>
                    setForm({ ...form, rtspPath: e.target.value })
                  }
                  className="w-full bg-neutral-800 border border-neutral-700 rounded-lg px-3 py-2 text-white text-sm font-mono focus:outline-none focus:border-hikred"
                  placeholder="(bo'sh qoldiring) yoki: /cam/realmonitor?channel=1&subtype=0"
                />
                <p className="text-xs text-neutral-500 mt-1 leading-relaxed">
                  Misollar:
                  <br />
                  <code className="text-neutral-400">(bo'sh)</code> —{" "}
                  <code className="text-neutral-400">
                    rtsp://user:pass@IP:PORT
                  </code>{" "}
                  (sizning kameraga to'g'ri keladi)
                  <br />
                  <code className="text-neutral-400">
                    /cam/realmonitor?channel=1&subtype=0
                  </code>{" "}
                  (Dahua)
                  <br />
                  <code className="text-neutral-400">
                    /h264Preview_01_main
                  </code>{" "}
                  (Reolink)
                </p>
              </div>
            )}

            {/* Description - full width */}
            <div className="col-span-2">
              <label className="block text-xs text-neutral-400 mb-1.5">
                Description
              </label>
              <textarea
                rows={2}
                value={form.description}
                onChange={(e) =>
                  setForm({ ...form, description: e.target.value })
                }
                className="w-full bg-neutral-800 border border-neutral-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-hikred resize-none"
                placeholder="Optional notes about this camera"
              />
            </div>

            {/* Active toggle */}
            <div className="col-span-2">
              <label className="flex items-center gap-3 cursor-pointer select-none">
                <div
                  onClick={() => setForm({ ...form, isActive: !form.isActive })}
                  className={`relative w-10 h-5 rounded-full transition-colors ${form.isActive ? "bg-green-500" : "bg-neutral-700"}`}
                >
                  <div
                    className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform ${form.isActive ? "translate-x-5" : "translate-x-0.5"}`}
                  />
                </div>
                <span className="text-sm text-neutral-300">Active camera</span>
              </label>
            </div>
          </div>

          {formError && (
            <p className="text-red-400 text-xs mt-3">{formError}</p>
          )}

          <div className="flex justify-end gap-3 mt-5">
            <button
              onClick={() => setShowModal(false)}
              className="px-4 py-2 text-sm text-neutral-400 hover:text-white transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={saving}
              className="px-4 py-2 text-sm bg-hikred hover:bg-red-700 disabled:opacity-50 text-white rounded-lg font-medium transition-colors flex items-center gap-2"
            >
              {saving && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
              {editTarget ? "Save Changes" : "Create Camera"}
            </button>
          </div>
        </Modal>
      )}

      {/* Delete confirm */}
      {deleteTarget && (
        <Modal
          title="Delete Camera"
          onClose={() => setDeleteTarget(null)}
          size="sm"
        >
          <p className="text-neutral-300 text-sm mb-5">
            Delete{" "}
            <span className="font-semibold text-white">
              {deleteTarget.name}
            </span>
            ?
          </p>
          <div className="flex justify-end gap-3">
            <button
              onClick={() => setDeleteTarget(null)}
              className="px-4 py-2 text-sm text-neutral-400 hover:text-white transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleDelete}
              disabled={saving}
              className="px-4 py-2 text-sm bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white rounded-lg font-medium transition-colors flex items-center gap-2"
            >
              {saving && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
              Delete
            </button>
          </div>
        </Modal>
      )}
    </div>
  );
}
