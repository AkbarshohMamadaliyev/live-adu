import { NextRequest, NextResponse } from "next/server";
import { Camera, Subcategory, Category } from "@/lib/db";

export const dynamic = "force-dynamic";

// GET /api/admin/cameras/[id] — includes password for edit form
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  try {
    const camera = await Camera.findByPk(id, {
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
    if (!camera)
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    return NextResponse.json({ camera });
  } catch (err: any) {
    console.error("[GET /api/admin/cameras/:id]", err);
    return NextResponse.json(
      { error: "Failed to fetch camera" },
      { status: 500 },
    );
  }
}

// PUT /api/admin/cameras/[id]
export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  try {
    const camera = await Camera.findByPk(id);
    if (!camera)
      return NextResponse.json({ error: "Not found" }, { status: 404 });

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
      isActive,
    } = body;

    const normalizedUsername = (username ?? "").trim();

    if (!name?.trim())
      return NextResponse.json({ error: "Name is required" }, { status: 400 });
    if (!ipAddress?.trim())
      return NextResponse.json(
        { error: "IP address is required" },
        { status: 400 },
      );
    if (subcategoryId) {
      const sub = await Subcategory.findByPk(subcategoryId);
      if (!sub)
        return NextResponse.json(
          { error: "Subcategory not found" },
          { status: 404 },
        );
    }

    const updateData: any = {
      name: name.trim(),
      ipAddress: ipAddress.trim(),
      username: normalizedUsername,
      description: description?.trim() || null,
      ...(subcategoryId !== undefined ? { subcategoryId } : {}),
      ...(port !== undefined ? { port } : {}),
      ...(rtspPort !== undefined ? { rtspPort } : {}),
      ...(channel !== undefined ? { channel } : {}),
      ...(streamType !== undefined ? { streamType } : {}),
      ...(isActive !== undefined ? { isActive } : {}),
      // rtspPath qo'llab-quvvatlash logikasi:
      // - undefined kelsa: o'zgartirmaslik
      // - null kelsa: Hikvision default shabloni ishlatish
      // - "" (bo'sh string) kelsa: hech qanday path qo'shmaslik (universal RTSP)
      // - string kelsa: shu path ni ishlatish
      ...(rtspPath !== undefined
        ? {
            rtspPath:
              rtspPath === null
                ? null
                : typeof rtspPath === "string"
                  ? rtspPath.trim() // bo'sh string ham saqlanadi
                  : null,
          }
        : {}),
    };

    // Only update password if provided
    if (password?.trim()) {
      updateData.password = password.trim();
    }

    await camera.update(updateData);

    const result = await Camera.findByPk(id, {
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

    return NextResponse.json({ camera: result });
  } catch (err: any) {
    console.error("[PUT /api/admin/cameras/:id]", err);
    return NextResponse.json(
      { error: "Failed to update camera" },
      { status: 500 },
    );
  }
}

// DELETE /api/admin/cameras/[id]
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  try {
    const camera = await Camera.findByPk(id);
    if (!camera)
      return NextResponse.json({ error: "Not found" }, { status: 404 });

    await camera.destroy();
    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error("[DELETE /api/admin/cameras/:id]", err);
    return NextResponse.json(
      { error: "Failed to delete camera" },
      { status: 500 },
    );
  }
}
