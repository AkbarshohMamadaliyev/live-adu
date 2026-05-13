import { NextRequest, NextResponse } from "next/server";
import { Camera, Subcategory, Category } from "@/lib/db";

export const dynamic = "force-dynamic";

// GET /api/admin/cameras?subcategoryId=xxx
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const subcategoryId = searchParams.get("subcategoryId");

    const where = subcategoryId ? { subcategoryId } : {};

    const cameras = await Camera.findAll({
      where,
      include: [
        {
          model: Subcategory,
          as: "subcategory",
          attributes: ["id", "name"],
          include: [
            { model: Category, as: "category", attributes: ["id", "name"] },
          ],
        },
      ],
      order: [["name", "ASC"]],
      // Do NOT expose passwords in list view
      attributes: { exclude: ["password"] },
    });
    return NextResponse.json({ cameras });
  } catch (err: any) {
    console.error("[GET /api/admin/cameras]", err);
    return NextResponse.json(
      { error: "Failed to fetch cameras" },
      { status: 500 },
    );
  }
}

// POST /api/admin/cameras
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      name,
      ipAddress,
      username,
      password,
      description,
      subcategoryId,
      port,
      rtspPort,
      channel,
      streamType,
      rtspPath,
    } = body;

    const normalizedUsername = (username ?? "").trim();
    const normalizedPassword = (password ?? "").trim();

    if (!name?.trim())
      return NextResponse.json({ error: "Name is required" }, { status: 400 });
    if (!ipAddress?.trim())
      return NextResponse.json(
        { error: "IP address is required" },
        { status: 400 },
      );
    if (!subcategoryId)
      return NextResponse.json(
        { error: "subcategoryId is required" },
        { status: 400 },
      );

    const subcategory = await Subcategory.findByPk(subcategoryId);
    if (!subcategory)
      return NextResponse.json(
        { error: "Subcategory not found" },
        { status: 404 },
      );

    const camera = await Camera.create({
      name: name.trim(),
      ipAddress: ipAddress.trim(),
      username: normalizedUsername,
      password: normalizedPassword,
      description: description?.trim() || null,
      subcategoryId,
      location: null,
      port: port ?? 80,
      rtspPort: rtspPort ?? 554,
      channel: channel ?? 1,
      streamType: streamType ?? 1,
      // rtspPath logikasi:
      // - null/undefined: Hikvision default shabloni
      // - "" (bo'sh string): hech qanday path yo'q (universal RTSP)
      // - string: shu path ishlatiladi
      rtspPath:
        rtspPath === null || rtspPath === undefined
          ? null
          : typeof rtspPath === "string"
            ? rtspPath.trim()
            : null,
    });

    const result = await Camera.findByPk(camera.id, {
      attributes: { exclude: ["password"] },
      include: [
        {
          model: Subcategory,
          as: "subcategory",
          attributes: ["id", "name"],
          include: [
            { model: Category, as: "category", attributes: ["id", "name"] },
          ],
        },
      ],
    });

    return NextResponse.json({ camera: result }, { status: 201 });
  } catch (err: any) {
    console.error("[POST /api/admin/cameras]", err);
    return NextResponse.json(
      { error: "Failed to create camera" },
      { status: 500 },
    );
  }
}
