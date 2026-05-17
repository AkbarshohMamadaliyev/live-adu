import { spawn, ChildProcess } from "child_process";
import fs from "fs";
import os from "os";
import path from "path";

export interface CameraConfig {
  id: string;
  ipAddress: string;
  rtspPort: number;
  username: string;
  password: string;
  channel: number;
  streamType: number;
  rtspPath?: string | null; // ixtiyoriy: custom RTSP path
}

interface StreamInfo {
  process: ChildProcess;
  startedAt: Date;
  lastAccessed: Date;
  lastSuccessAt: Date; // muvaffaqiyatli oxirgi ulanish vaqti
  hlsPath: string;
  useGpu: boolean;
  reconnectCount: number;
  cam: CameraConfig;
  shouldRestart: boolean;
}

class StreamManager {
  private streams = new Map<string, StreamInfo>();
  private readonly hlsBaseDir: string;
  private readonly ffmpegPath: string;
  private readonly idleTimeoutMs = 60_000;
  private cleanupInterval: NodeJS.Timeout | null = null;
  private readonly debug: boolean;
  private readonly isMac: boolean;
  private gpuFailed = false;
  private readonly maxReconnects = 10; // 5 → 10
  // Agar stream 30 sekunddan ko'p ishlagan bo'lsa, reconnect counter reset bo'ladi
  private readonly resetCounterAfterMs = 30_000;

  constructor() {
    this.hlsBaseDir =
      process.env.HLS_OUTPUT_DIR || path.join(process.cwd(), "public", "hls");
    this.ffmpegPath = process.env.FFMPEG_PATH || "ffmpeg";
    this.debug = process.env.NODE_ENV === "development";
    this.isMac = os.platform() === "darwin";

    if (!fs.existsSync(this.hlsBaseDir)) {
      fs.mkdirSync(this.hlsBaseDir, { recursive: true });
    }

    this.cleanupInterval = setInterval(() => this.cleanupIdleStreams(), 30_000);

    console.log(
      `[StreamManager] Tayyor. HLS dir: ${this.hlsBaseDir}, FFmpeg: ${this.ffmpegPath}, Platform: ${os.platform()}, Encoder: ${this.isMac ? "VideoToolbox (GPU)" : "libx264 (CPU)"}`,
    );
  }

  /**
   * RTSP URL yaratish
   *
   * - Agar `rtspPath` berilgan bo'lsa — uni ishlatadi (universal rejim).
   *   Misol: "/Streaming/Channels/101" yoki bo'sh string "" (path yo'q).
   * - Aks holda — Hikvision shabloni: /Streaming/Channels/{channel}0{streamType}
   */
  private buildRtspUrl(cam: CameraConfig): string {
    const encodedUser = encodeURIComponent(cam.username);
    const encodedPass = encodeURIComponent(cam.password);
    const authPart =
      encodedUser || encodedPass ? `${encodedUser}:${encodedPass}@` : "";
    const base = `rtsp://${authPart}${cam.ipAddress}:${cam.rtspPort}`;

    // Custom path (universal rejim)
    if (cam.rtspPath !== undefined && cam.rtspPath !== null) {
      const path = cam.rtspPath.trim();
      if (path === "") {
        return base; // hech qanday path qo'shilmaydi
      }
      // Boshida "/" yo'q bo'lsa qo'shamiz
      const normalized = path.startsWith("/") ? path : `/${path}`;
      return `${base}${normalized}`;
    }

    // Default — Hikvision shabloni (orqaga moslik)
    const channelCode = `${cam.channel}0${cam.streamType}`;
    return `${base}/Streaming/Channels/${channelCode}`;
  }

  /**
   * Loglar uchun parolsiz URL
   */
  private buildSafeRtspUrl(cam: CameraConfig): string {
    const authPart =
      cam.username || cam.password ? `${cam.username}:****@` : "";
    const base = `rtsp://${authPart}${cam.ipAddress}:${cam.rtspPort}`;

    if (cam.rtspPath !== undefined && cam.rtspPath !== null) {
      const path = cam.rtspPath.trim();
      if (path === "") return base;
      const normalized = path.startsWith("/") ? path : `/${path}`;
      return `${base}${normalized}`;
    }

    const channelCode = `${cam.channel}0${cam.streamType}`;
    return `${base}/Streaming/Channels/${channelCode}`;
  }

  /**
   * FFmpeg argumentlarini yaratish
   */
  private buildFFmpegArgs(
    cam: CameraConfig,
    rtspUrl: string,
    camDir: string,
    playlistPath: string,
    useGpu: boolean,
  ): string[] {
    const inputArgs = [
      // RTSP transport: TCP — ko'p kameralar UDP'da paket yo'qotadi
      "-rtsp_transport",
      "tcp",
      "-rtsp_flags",
      "prefer_tcp",
      "-fflags",
      "+genpts+discardcorrupt+nobuffer",
      "-flags",
      "low_delay",
      "-avoid_negative_ts",
      "make_zero",
      // Tezroq start uchun
      "-probesize",
      "1000000",
      "-analyzeduration",
      "1000000",
      "-i",
      rtspUrl,
    ];

    const videoArgs = useGpu
      ? [
          "-c:v",
          "h264_videotoolbox",
          "-b:v",
          "1500k",
          "-maxrate",
          "2000k",
          "-bufsize",
          "3000k",
          "-pix_fmt",
          "yuv420p",
          "-g",
          "50",
          "-r",
          "25",
          "-allow_sw",
          "1",
        ]
      : [
          "-c:v",
          "libx264",
          "-preset",
          "ultrafast",
          "-tune",
          "zerolatency",
          "-profile:v",
          "baseline",
          "-level",
          "3.1",
          "-pix_fmt",
          "yuv420p",
          "-g",
          "50",
          "-r",
          "25",
          "-sc_threshold",
          "0",
        ];

    // AUDIO — kameralar turli kodek beradi (Hikvision pcm_mulaw, G.711, va h.k.).
    // HLS faqat AAC bilan ishonchli ishlaydi, shuning uchun audioni AAC ga
    // transkod qilamiz. Kamerada audio dorasi bo'lmasa, FFmpeg uni e'tiborsiz
    // qoldiradi va stream baribir ishlayveradi.
    const audioArgs = [
      "-c:a",
      "aac",
      "-b:a",
      "128k",
      "-ar",
      "44100",
      "-ac",
      "2",
    ];

    const hlsArgs = [
      "-f",
      "hls",
      "-hls_time",
      "2",
      "-hls_list_size",
      "10",
      "-hls_flags",
      "delete_segments+append_list+independent_segments+omit_endlist",
      "-hls_segment_type",
      "mpegts",
      "-hls_segment_filename",
      path.join(camDir, "seg_%03d.ts"),
      playlistPath,
    ];

    return [...inputArgs, ...videoArgs, ...audioArgs, ...hlsArgs];
  }

  /**
   * Stream ni boshlash
   */
  async startStream(cam: CameraConfig): Promise<string> {
    const existing = this.streams.get(cam.id);

    if (existing && !existing.process.killed) {
      existing.lastAccessed = new Date();
      console.log(
        `[StreamManager] ${cam.id} allaqachon ishlayapti — qayta ishlatish`,
      );
      return `/hls/${cam.id}/stream.m3u8`;
    }

    // FORCE_CPU_ENCODER=1 bo'lsa, GPU'ni umuman ishlatmaymiz (debug uchun)
    const forceCpu = process.env.FORCE_CPU_ENCODER === "1";
    const useGpu = this.isMac && !this.gpuFailed && !forceCpu;

    try {
      await this.spawnStream(cam, useGpu, 0);
    } catch (err) {
      if (useGpu) {
        console.warn(
          `[StreamManager] ${cam.id} GPU bilan ishlamadi, CPU ga o'tilmoqda...`,
        );
        this.gpuFailed = true;
        await this.spawnStream(cam, false, 0);
      } else {
        throw err;
      }
    }

    return `/hls/${cam.id}/stream.m3u8`;
  }

  /**
   * FFmpeg processni ishga tushirish
   */
  private async spawnStream(
    cam: CameraConfig,
    useGpu: boolean,
    reconnectCount: number,
  ): Promise<void> {
    const camDir = path.join(this.hlsBaseDir, cam.id);

    // Birinchi marta ishga tushishida papkani tozalaymiz
    if (reconnectCount === 0) {
      if (fs.existsSync(camDir)) {
        fs.rmSync(camDir, { recursive: true, force: true });
      }
      fs.mkdirSync(camDir, { recursive: true });
    } else {
      // Reconnect da papkani saqlab qolamiz (frontend uzilmasligi uchun)
      if (!fs.existsSync(camDir)) {
        fs.mkdirSync(camDir, { recursive: true });
      }
    }

    const rtspUrl = this.buildRtspUrl(cam);
    const safeUrl = this.buildSafeRtspUrl(cam);
    const playlistPath = path.join(camDir, "stream.m3u8");

    const reconnectLabel =
      reconnectCount > 0 ? ` (reconnect #${reconnectCount})` : "";
    console.log(
      `[StreamManager] ${cam.id} stream boshlanmoqda (${useGpu ? "GPU" : "CPU"})${reconnectLabel}`,
    );
    console.log(`[StreamManager] ${cam.id} RTSP: ${safeUrl}`);

    const args = this.buildFFmpegArgs(
      cam,
      rtspUrl,
      camDir,
      playlistPath,
      useGpu,
    );

    if (this.debug && reconnectCount === 0) {
      const safeArgs = args.map((a) => (a === rtspUrl ? safeUrl : a));
      console.log(
        `[StreamManager] ${cam.id} FFmpeg buyrug'i:\n  ${this.ffmpegPath} ${safeArgs.join(" ")}`,
      );
    }

    const ffmpeg = spawn(this.ffmpegPath, args, {
      stdio: ["ignore", "ignore", "pipe"],
    });

    let errorBuffer = "";

    ffmpeg.stderr?.on("data", (data: Buffer) => {
      const text = data.toString();
      errorBuffer += text;
      if (errorBuffer.length > 4096) {
        errorBuffer = errorBuffer.slice(-4096);
      }
      if (this.debug) {
        const lines = text.split("\n").filter((l) => l.trim());
        for (const line of lines) {
          process.stdout.write(`[FFmpeg ${cam.id}] ${line}\n`);
        }
      }
    });

    const now = new Date();
    const streamInfo: StreamInfo = {
      process: ffmpeg,
      startedAt: now,
      lastAccessed: now,
      lastSuccessAt: now,
      hlsPath: playlistPath,
      useGpu,
      reconnectCount,
      cam,
      shouldRestart: true,
    };

    this.streams.set(cam.id, streamInfo);

    ffmpeg.on("exit", (code, signal) => {
      console.log(`[FFmpeg ${cam.id}] CHIQDI: code=${code}, signal=${signal}`);
      if (code !== 0 && code !== null) {
        console.error(
          `[FFmpeg ${cam.id}] Oxirgi xato xabari:\n${errorBuffer.slice(-500)}`,
        );
      }

      const info = this.streams.get(cam.id);
      if (!info) return;

      // Agar stream qasddan to'xtatilmagan va idle bo'lmagan - qayta ulanamiz
      const idleMs = Date.now() - info.lastAccessed.getTime();
      const isStillActive = idleMs < this.idleTimeoutMs && info.shouldRestart;

      // Agar oxirgi ulanish 30 sekunddan ko'p ishlagan bo'lsa - counter reset
      const aliveMs = Date.now() - info.startedAt.getTime();
      let nextReconnectCount = info.reconnectCount + 1;
      if (aliveMs > this.resetCounterAfterMs) {
        console.log(
          `[StreamManager] ${cam.id} ${Math.round(aliveMs / 1000)}s ishladi - counter reset`,
        );
        nextReconnectCount = 1; // qayta boshlaymiz
      }

      if (isStillActive && nextReconnectCount <= this.maxReconnects) {
        // Tezroq reconnect: 500ms doimiy
        const delay = 500;
        console.log(
          `[StreamManager] ${cam.id} ${delay}ms dan keyin qayta ulanadi (${nextReconnectCount}/${this.maxReconnects})...`,
        );
        setTimeout(() => {
          this.spawnStream(info.cam, info.useGpu, nextReconnectCount).catch(
            (err) => {
              console.error(
                `[StreamManager] ${cam.id} reconnect xatosi:`,
                err.message,
              );
              this.streams.delete(cam.id);
            },
          );
        }, delay);
      } else {
        if (nextReconnectCount > this.maxReconnects) {
          console.error(
            `[StreamManager] ${cam.id} ${this.maxReconnects} marta urinib ko'rdi, to'xtatildi`,
          );
        }
        this.streams.delete(cam.id);
      }
    });

    ffmpeg.on("error", (err) => {
      console.error(`[FFmpeg ${cam.id}] SPAWN XATOSI:`, err.message);
      if ((err as any).code === "ENOENT") {
        console.error(
          `[FFmpeg ${cam.id}] FFmpeg topilmadi. PATH: ${this.ffmpegPath}`,
        );
      }
      this.streams.delete(cam.id);
    });

    // Faqat birinchi urinishda playlist ni kutamiz
    if (reconnectCount === 0) {
      try {
        await this.waitForPlaylist(playlistPath, 15_000, cam.id);
        console.log(
          `[StreamManager] ${cam.id} playlist tayyor ✓ (${useGpu ? "GPU" : "CPU"})`,
        );
      } catch (err) {
        // Playlist yaratilmadi
        streamInfo.shouldRestart = false;
        this.stopStream(cam.id);
        const lastError = errorBuffer.slice(-500).trim();

        if (
          useGpu &&
          (lastError.includes("videotoolbox") ||
            lastError.includes("VideoToolbox") ||
            lastError.includes("Function not implemented") ||
            lastError.includes("Encoder not found") ||
            lastError.includes("Unrecognized option"))
        ) {
          throw new Error(`GPU encoder ishlamadi: ${lastError}`);
        }

        throw new Error(
          `Playlist timeout. FFmpeg oxirgi xabari:\n${lastError || "(bo'sh)"}`,
        );
      }
    }
  }

  /**
   * Playlist faylini kutadi
   */
  private waitForPlaylist(
    playlistPath: string,
    timeoutMs: number,
    camId: string,
  ): Promise<void> {
    return new Promise((resolve, reject) => {
      const startTime = Date.now();
      const check = () => {
        if (fs.existsSync(playlistPath)) {
          try {
            const content = fs.readFileSync(playlistPath, "utf-8");
            if (content.includes(".ts")) {
              return resolve();
            }
          } catch {}
        }

        const elapsed = Date.now() - startTime;
        if (elapsed > timeoutMs) {
          return reject(new Error(`Playlist yaratilmadi (${timeoutMs}ms)`));
        }

        setTimeout(check, 200);
      };
      check();
    });
  }

  /**
   * Stream ni to'xtatish
   */
  stopStream(cameraId: string): void {
    const stream = this.streams.get(cameraId);
    if (!stream) return;

    // Reconnect ni o'chiramiz
    stream.shouldRestart = false;

    if (!stream.process.killed) {
      stream.process.kill("SIGTERM");
      setTimeout(() => {
        if (!stream.process.killed) {
          stream.process.kill("SIGKILL");
        }
      }, 3000);
    }

    this.streams.delete(cameraId);

    const camDir = path.join(this.hlsBaseDir, cameraId);
    if (fs.existsSync(camDir)) {
      try {
        fs.rmSync(camDir, { recursive: true, force: true });
      } catch (err) {
        console.error(
          `[StreamManager] ${cameraId} papkasini tozalashda xato:`,
          err,
        );
      }
    }

    console.log(`[StreamManager] ${cameraId} to'xtatildi`);
  }

  /**
   * lastAccessed ni yangilash
   */
  touchStream(cameraId: string): boolean {
    const stream = this.streams.get(cameraId);
    if (!stream) return false;
    stream.lastAccessed = new Date();
    return true;
  }

  /**
   * Idle streamlarni tozalash
   */
  private cleanupIdleStreams(): void {
    const now = Date.now();
    for (const [id, info] of this.streams.entries()) {
      const idleMs = now - info.lastAccessed.getTime();
      if (idleMs > this.idleTimeoutMs) {
        console.log(
          `[StreamManager] ${id} idle (${Math.round(idleMs / 1000)}s) — to'xtatilmoqda`,
        );
        this.stopStream(id);
      }
    }
  }

  /**
   * Barcha aktiv streamlar ro'yxati
   */
  getActiveStreams(): string[] {
    return Array.from(this.streams.keys());
  }

  /**
   * Cleanup on shutdown
   */
  shutdown(): void {
    if (this.cleanupInterval) clearInterval(this.cleanupInterval);
    for (const id of this.streams.keys()) {
      this.stopStream(id);
    }
  }
}

// Global singleton
const globalForStream = globalThis as unknown as {
  streamManager: StreamManager | undefined;
};

export const streamManager =
  globalForStream.streamManager ?? new StreamManager();

if (process.env.NODE_ENV !== "production") {
  globalForStream.streamManager = streamManager;
}

if (typeof process !== "undefined") {
  process.once("SIGINT", () => streamManager.shutdown());
  process.once("SIGTERM", () => streamManager.shutdown());
}