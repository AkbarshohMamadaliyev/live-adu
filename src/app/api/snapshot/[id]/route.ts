import { NextRequest, NextResponse } from "next/server";
import { spawn } from "child_process";
import { Camera } from "@/lib/db";
import { fetchSnapshot } from "@/lib/hikvision-client";

export const dynamic = "force-dynamic";

/**
 * FFmpeg orqali RTSP'dan bitta JPEG kadr olish
 * Hikvision HTTP API'si bo'lmagan kameralar uchun.
 */
async function fetchSnapshotViaFfmpeg(rtspUrl: string): Promise<Buffer> {
  const ffmpegPath = process.env.FFMPEG_PATH || "ffmpeg";
  return new Promise((resolve, reject) => {
    const args = [
      "-rtsp_transport",
      "tcp",
      "-i",
      rtspUrl,
      "-frames:v",
      "1",
      "-q:v",
      "3",
      "-update",
      "1", // FFmpeg 8.x da image2 uchun majburiy
      "-f",
      "image2",
      "-",
    ];

    const proc = spawn(ffmpegPath, args, {
      stdio: ["ignore", "pipe", "pipe"],
    });

    const chunks: Buffer[] = [];
    let stderr = "";

    proc.stdout.on("data", (c: Buffer) => chunks.push(c));
    proc.stderr.on("data", (c: Buffer) => {
      stderr += c.toString();
      if (stderr.length > 4096) stderr = stderr.slice(-4096);
    });

    const timeout = setTimeout(() => {
      proc.kill("SIGKILL");
      reject(new Error("FFmpeg snapshot timeout"));
    }, 15_000);

    proc.on("error", (err) => {
      clearTimeout(timeout);
      reject(err);
    });

    proc.on("close", (code) => {
      clearTimeout(timeout);
      const buf = Buffer.concat(chunks);
      if (code === 0 && buf.length > 0) {
        resolve(buf);
      } else {
        reject(
          new Error(
            `FFmpeg snapshot xato (code=${code}): ${stderr.slice(-300)}`,
          ),
        );
      }
    });
  });
}

function buildRtspUrlFromCamera(camera: any): string {
  const encUser = encodeURIComponent(camera.username || "");
  const encPass = encodeURIComponent(camera.password || "");
  const authPart = encUser || encPass ? `${encUser}:${encPass}@` : "";
  const base = `rtsp://${authPart}${camera.ipAddress}:${camera.rtspPort}`;

  if (camera.rtspPath !== null && camera.rtspPath !== undefined) {
    const p = camera.rtspPath.trim();
    if (p === "") return base;
    return `${base}${p.startsWith("/") ? p : `/${p}`}`;
  }
  const code = `${camera.channel}0${camera.streamType}`;
  return `${base}/Streaming/Channels/${code}`;
}

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  try {
    const camera = await Camera.findOne({
      where: { id, isActive: true },
    });

    if (!camera) {
      return NextResponse.json({ error: "Kamera topilmadi" }, { status: 404 });
    }

    let buffer: Buffer;

    // Custom RTSP kameralar uchun darhol FFmpeg
    if (camera.rtspPath !== null && camera.rtspPath !== undefined) {
      const rtspUrl = buildRtspUrlFromCamera(camera);
      buffer = await fetchSnapshotViaFfmpeg(rtspUrl);
    } else {
      // Hikvision — avval HTTP ISAPI
      try {
        buffer = await fetchSnapshot(
          {
            ipAddress: camera.ipAddress,
            port: camera.port,
            username: camera.username,
            password: camera.password,
          },
          camera.channel,
        );
      } catch (httpErr) {
        // HTTP ishlamasa, FFmpeg orqali fallback
        console.warn(
          `[API /snapshot/${id}] HTTP snapshot ishlamadi, FFmpeg fallback`,
        );
        const rtspUrl = buildRtspUrlFromCamera(camera);
        buffer = await fetchSnapshotViaFfmpeg(rtspUrl);
      }
    }

    return new NextResponse(new Uint8Array(buffer), {
      status: 200,
      headers: {
        "Content-Type": "image/jpeg",
        "Content-Disposition": `inline; filename="snapshot-${camera.name}-${Date.now()}.jpg"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (err: any) {
    console.error(`[API /snapshot/${id}] xato:`, err.message);
    return NextResponse.json(
      { error: err.message || "Snapshot olishda xato" },
      { status: 500 },
    );
  }
}
