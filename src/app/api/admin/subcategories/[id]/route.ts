import { NextRequest, NextResponse } from "next/server";
import { Subcategory, Category, Camera } from "@/lib/db";

export const dynamic = "force-dynamic";

// GET /api/admin/subcategories/[id]
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  try {
    const subcategory = await Subcategory.findByPk(id, {
      include: [
        { model: Category, as: "category", attributes: ["id", "name"] },
        { model: Camera, as: "cameras" },
      ],
    });
    if (!subcategory)
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    return NextResponse.json({ subcategory });
  } catch (err: any) {
    console.error("[GET /api/admin/subcategories/:id]", err);
    return NextResponse.json(
      { error: "Failed to fetch subcategory" },
      { status: 500 },
    );
  }
}

// PUT /api/admin/subcategories/[id]
export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  try {
    const subcategory = await Subcategory.findByPk(id);
    if (!subcategory)
      return NextResponse.json({ error: "Not found" }, { status: 404 });

    const body = await req.json();
    const { name, description, categoryId } = body;

    if (!name?.trim())
      return NextResponse.json({ error: "Name is required" }, { status: 400 });
    if (categoryId) {
      const category = await Category.findByPk(categoryId);
      if (!category)
        return NextResponse.json(
          { error: "Category not found" },
          { status: 404 },
        );
    }

    await subcategory.update({
      name: name.trim(),
      description: description?.trim() || null,
      ...(categoryId ? { categoryId } : {}),
    });

    const result = await Subcategory.findByPk(id, {
      include: [
        { model: Category, as: "category", attributes: ["id", "name"] },
      ],
    });

    return NextResponse.json({ subcategory: result });
  } catch (err: any) {
    console.error("[PUT /api/admin/subcategories/:id]", err);
    return NextResponse.json(
      { error: "Failed to update subcategory" },
      { status: 500 },
    );
  }
}

// DELETE /api/admin/subcategories/[id]
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  try {
    const subcategory = await Subcategory.findByPk(id);
    if (!subcategory)
      return NextResponse.json({ error: "Not found" }, { status: 404 });

    await subcategory.destroy();
    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error("[DELETE /api/admin/subcategories/:id]", err);
    return NextResponse.json(
      { error: "Failed to delete subcategory" },
      { status: 500 },
    );
  }
}
