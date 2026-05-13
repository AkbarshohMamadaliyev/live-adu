import { NextResponse } from "next/server";
import { Camera, Subcategory, Category } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const cameras = await Camera.findAll({
      where: { isActive: true },
      order: [["name", "ASC"]],
      attributes: ["id", "name", "ipAddress", "subcategoryId"],
      include: [
        {
          model: Subcategory,
          as: "subcategory",
          attributes: ["id", "name", "categoryId"],
          include: [
            { model: Category, as: "category", attributes: ["id", "name"] },
          ],
        },
      ],
    });

    return NextResponse.json({ cameras });
  } catch (err: any) {
    console.error("[API /cameras] error:", err);
    return NextResponse.json(
      { error: "Failed to fetch cameras" },
      { status: 500 },
    );
  }
}
