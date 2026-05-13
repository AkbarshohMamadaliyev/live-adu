import { NextRequest, NextResponse } from "next/server";
import { Subcategory, Category, Camera } from "@/lib/db";

export const dynamic = "force-dynamic";

// GET /api/admin/subcategories?categoryId=xxx
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const categoryId = searchParams.get("categoryId");

    const where = categoryId ? { categoryId } : {};

    const subcategories = await Subcategory.findAll({
      where,
      include: [
        { model: Category, as: "category", attributes: ["id", "name"] },
        { model: Camera, as: "cameras", attributes: ["id"] },
      ],
      order: [["name", "ASC"]],
    });
    return NextResponse.json({ subcategories });
  } catch (err: any) {
    console.error("[GET /api/admin/subcategories]", err);
    return NextResponse.json(
      { error: "Failed to fetch subcategories" },
      { status: 500 },
    );
  }
}

// POST /api/admin/subcategories
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { name, description, categoryId } = body;

    if (!name?.trim())
      return NextResponse.json({ error: "Name is required" }, { status: 400 });
    if (!categoryId)
      return NextResponse.json(
        { error: "categoryId is required" },
        { status: 400 },
      );

    const category = await Category.findByPk(categoryId);
    if (!category)
      return NextResponse.json(
        { error: "Category not found" },
        { status: 404 },
      );

    const subcategory = await Subcategory.create({
      name: name.trim(),
      description: description?.trim() || null,
      categoryId,
    });

    const result = await Subcategory.findByPk(subcategory.id, {
      include: [
        { model: Category, as: "category", attributes: ["id", "name"] },
      ],
    });

    return NextResponse.json({ subcategory: result }, { status: 201 });
  } catch (err: any) {
    console.error("[POST /api/admin/subcategories]", err);
    return NextResponse.json(
      { error: "Failed to create subcategory" },
      { status: 500 },
    );
  }
}
