"use client";

import { useEffect, useState, useCallback } from "react";
import {
  Plus,
  Pencil,
  Trash2,
  Layers,
  Video,
  Loader2,
  AlertCircle,
  FolderOpen,
} from "lucide-react";
import Modal from "@/components/admin/Modal";

interface Category {
  id: string;
  name: string;
}

interface Subcategory {
  id: string;
  name: string;
  description: string | null;
  categoryId: string;
  category?: Category;
  cameras?: { id: string }[];
  createdAt: string;
}

interface FormState {
  name: string;
  description: string;
  categoryId: string;
}

const emptyForm: FormState = { name: "", description: "", categoryId: "" };

export default function SubcategoriesPage() {
  const [subcategories, setSubcategories] = useState<Subcategory[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const [filterCat, setFilterCat] = useState<string>("");
  const [showModal, setShowModal] = useState(false);
  const [editTarget, setEditTarget] = useState<Subcategory | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [deleteTarget, setDeleteTarget] = useState<Subcategory | null>(null);

  const fetchAll = useCallback(async () => {
    try {
      const [subsRes, catsRes] = await Promise.all([
        fetch("/api/admin/subcategories"),
        fetch("/api/admin/categories"),
      ]);
      const subsData = await subsRes.json();
      const catsData = await catsRes.json();
      if (subsData.error) throw new Error(subsData.error);
      setSubcategories(subsData.subcategories);
      setCategories(catsData.categories ?? []);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  const openCreate = () => {
    setEditTarget(null);
    setForm({ ...emptyForm, categoryId: filterCat });
    setFormError(null);
    setShowModal(true);
  };

  const openEdit = (sub: Subcategory) => {
    setEditTarget(sub);
    setForm({
      name: sub.name,
      description: sub.description ?? "",
      categoryId: sub.categoryId,
    });
    setFormError(null);
    setShowModal(true);
  };

  const handleSave = async () => {
    setFormError(null);
    if (!form.name.trim()) {
      setFormError("Name is required");
      return;
    }
    if (!form.categoryId) {
      setFormError("Category is required");
      return;
    }
    setSaving(true);
    try {
      const url = editTarget
        ? `/api/admin/subcategories/${editTarget.id}`
        : "/api/admin/subcategories";
      const method = editTarget ? "PUT" : "POST";
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.name,
          description: form.description,
          categoryId: form.categoryId,
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
      const res = await fetch(`/api/admin/subcategories/${deleteTarget.id}`, {
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

  const filtered = filterCat
    ? subcategories.filter((s) => s.categoryId === filterCat)
    : subcategories;

  if (loading) {
    return (
      <div className="flex items-center justify-center h-48">
        <Loader2 className="w-6 h-6 animate-spin text-neutral-400" />
      </div>
    );
  }

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-white">Subcategories</h1>
          <p className="text-neutral-400 text-sm mt-1">
            {filtered.length} of {subcategories.length} total
          </p>
        </div>
        <button
          onClick={openCreate}
          className="flex items-center gap-2 bg-hikred hover:bg-red-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
        >
          <Plus className="w-4 h-4" />
          New Subcategory
        </button>
      </div>

      {/* Filter */}
      <div className="mb-4">
        <select
          value={filterCat}
          onChange={(e) => setFilterCat(e.target.value)}
          className="bg-neutral-800 border border-neutral-700 text-white text-sm rounded-lg px-3 py-2 focus:outline-none focus:border-hikred"
        >
          <option value="">All categories</option>
          {categories.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
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
            <Layers className="w-10 h-10 mb-3" />
            <p className="text-sm">No subcategories found.</p>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-neutral-800 text-neutral-400 text-xs uppercase tracking-wider">
                <th className="text-left px-5 py-3">Name</th>
                <th className="text-left px-5 py-3">Category</th>
                <th className="text-left px-5 py-3">Description</th>
                <th className="text-center px-5 py-3">Cameras</th>
                <th className="text-right px-5 py-3">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-800">
              {filtered.map((sub) => (
                <tr
                  key={sub.id}
                  className="hover:bg-neutral-800/50 transition-colors"
                >
                  <td className="px-5 py-4">
                    <div className="flex items-center gap-2">
                      <Layers className="w-4 h-4 text-purple-400 flex-shrink-0" />
                      <span className="font-medium text-white">{sub.name}</span>
                    </div>
                  </td>
                  <td className="px-5 py-4">
                    <div className="flex items-center gap-1.5 text-blue-400">
                      <FolderOpen className="w-3.5 h-3.5" />
                      <span>{sub.category?.name ?? "—"}</span>
                    </div>
                  </td>
                  <td className="px-5 py-4 text-neutral-400 max-w-xs truncate">
                    {sub.description || (
                      <span className="text-neutral-600">—</span>
                    )}
                  </td>
                  <td className="px-5 py-4 text-center">
                    <span className="inline-flex items-center gap-1 text-red-400">
                      <Video className="w-3.5 h-3.5" />
                      {sub.cameras?.length ?? 0}
                    </span>
                  </td>
                  <td className="px-5 py-4">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        onClick={() => openEdit(sub)}
                        className="p-1.5 rounded-lg text-neutral-400 hover:text-white hover:bg-neutral-700 transition-colors"
                      >
                        <Pencil className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => setDeleteTarget(sub)}
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
        )}
      </div>

      {/* Create / Edit modal */}
      {showModal && (
        <Modal
          title={editTarget ? "Edit Subcategory" : "New Subcategory"}
          onClose={() => setShowModal(false)}
        >
          <div className="space-y-4">
            <div>
              <label className="block text-xs text-neutral-400 mb-1.5">
                Category <span className="text-red-400">*</span>
              </label>
              <select
                value={form.categoryId}
                onChange={(e) =>
                  setForm({ ...form, categoryId: e.target.value })
                }
                className="w-full bg-neutral-800 border border-neutral-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-hikred"
              >
                <option value="">Select category…</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs text-neutral-400 mb-1.5">
                Name <span className="text-red-400">*</span>
              </label>
              <input
                autoFocus
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleSave();
                }}
                className="w-full bg-neutral-800 border border-neutral-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-hikred"
                placeholder="e.g. Floor 1"
              />
            </div>
            <div>
              <label className="block text-xs text-neutral-400 mb-1.5">
                Description
              </label>
              <textarea
                rows={3}
                value={form.description}
                onChange={(e) =>
                  setForm({ ...form, description: e.target.value })
                }
                className="w-full bg-neutral-800 border border-neutral-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-hikred resize-none"
                placeholder="Optional description"
              />
            </div>
            {formError && <p className="text-red-400 text-xs">{formError}</p>}
            <div className="flex justify-end gap-3 pt-2">
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
                {editTarget ? "Save Changes" : "Create"}
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* Delete confirm */}
      {deleteTarget && (
        <Modal
          title="Delete Subcategory"
          onClose={() => setDeleteTarget(null)}
          size="sm"
        >
          <p className="text-neutral-300 text-sm mb-2">
            Delete{" "}
            <span className="font-semibold text-white">
              {deleteTarget.name}
            </span>
            ?
          </p>
          <p className="text-neutral-500 text-xs mb-5">
            All cameras in this subcategory will be unlinked.
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
