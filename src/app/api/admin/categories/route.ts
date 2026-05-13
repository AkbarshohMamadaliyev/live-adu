import { NextRequest, NextResponse } from "next/server";
import { Category, Subcategory } from "@/lib/db";

export const dynamic = "force-dynamic";

// GET /api/admin/categories — list all categories with subcategory count
export async function GET() {
  try {
    const categories = await Category.findAll({
      include: [
        { model: Subcategory, as: "subcategories", attributes: ["id"] },
      ],
      order: [["name", "ASC"]],
    });
    return NextResponse.json({ categories });
  } catch (err: any) {
    console.error("[GET /api/admin/categories]", err);
    return NextResponse.json(
      { error: "Failed to fetch categories" },
      { status: 500 },
    );
  }
}

// POST /api/admin/categories — create a new category
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { name, description } = body;

    if (!name?.trim()) {
      return NextResponse.json({ error: "Name is required" }, { status: 400 });
    }

    const category = await Category.create({
      name: name.trim(),
      description: description?.trim() || null,
    });
    return NextResponse.json({ category }, { status: 201 });
  } catch (err: any) {
    if (err.name === "SequelizeUniqueConstraintError") {
      return NextResponse.json(
        { error: "Category name already exists" },
        { status: 409 },
      );
    }
    console.error("[POST /api/admin/categories]", err);
    return NextResponse.json(
      { error: "Failed to create category" },
      { status: 500 },
    );
  }
}
