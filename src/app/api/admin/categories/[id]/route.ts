import { NextRequest, NextResponse } from "next/server";
import { Category, Subcategory } from "@/lib/db";
import { Camera } from "@/lib/db";

export const dynamic = "force-dynamic";

// GET /api/admin/categories/[id]
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  try {
    const category = await Category.findByPk(id, {
      include: [{ model: Subcategory, as: "subcategories" }],
    });
    if (!category)
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    return NextResponse.json({ category });
  } catch (err: any) {
    console.error("[GET /api/admin/categories/:id]", err);
    return NextResponse.json(
      { error: "Failed to fetch category" },
      { status: 500 },
    );
  }
}

// PUT /api/admin/categories/[id]
export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  try {
    const category = await Category.findByPk(id);
    if (!category)
      return NextResponse.json({ error: "Not found" }, { status: 404 });

    const body = await req.json();
    const { name, description } = body;

    if (!name?.trim()) {
      return NextResponse.json({ error: "Name is required" }, { status: 400 });
    }

    await category.update({
      name: name.trim(),
      description: description?.trim() || null,
    });
    return NextResponse.json({ category });
  } catch (err: any) {
    if (err.name === "SequelizeUniqueConstraintError") {
      return NextResponse.json(
        { error: "Category name already exists" },
        { status: 409 },
      );
    }
    console.error("[PUT /api/admin/categories/:id]", err);
    return NextResponse.json(
      { error: "Failed to update category" },
      { status: 500 },
    );
  }
}

// DELETE /api/admin/categories/[id]
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  try {
    const category = await Category.findByPk(id);
    if (!category)
      return NextResponse.json({ error: "Not found" }, { status: 404 });

    await category.destroy();
    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error("[DELETE /api/admin/categories/:id]", err);
    return NextResponse.json(
      { error: "Failed to delete category" },
      { status: 500 },
    );
  }
}
