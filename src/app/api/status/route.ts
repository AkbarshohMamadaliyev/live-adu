import { NextResponse } from 'next/server'
import { Camera } from '@/lib/db'
import { checkCameraStatus, checkTcpPort } from '@/lib/hikvision-client'

export const dynamic = 'force-dynamic'

// Cache - 10 sekund (har request da TCP probe qilmaslik uchun)
let cache: { timestamp: number; data: any[] } | null = null
const CACHE_TTL_MS = 10_000

export async function GET() {
  try {
    // Cache ishlatish
    if (cache && Date.now() - cache.timestamp < CACHE_TTL_MS) {
      return NextResponse.json({ statuses: cache.data, cached: true })
    }

    const cameras = await Camera.findAll({
      where: { isActive: true },
      attributes: [
        'id',
        'name',
        'ipAddress',
        'port',
        'rtspPort',
        'username',
        'password',
        'rtspPath',
      ],
    })

    // Parallel ravishda barcha kameralarni tekshiramiz.
    // Strategiya:
    //  1) Agar kamera Hikvision bo'lsa (rtspPath=null) — HTTP ISAPI orqali tekshiramiz.
    //  2) Agar HTTP javob bermasa YOKI kamera custom rtspPath bilan bo'lsa —
    //     RTSP port'ga TCP probe qilamiz.
    const statuses = await Promise.all(
      cameras.map(async (cam) => {
        // Custom RTSP kameralar uchun darhol TCP probe
        const isCustomRtsp = cam.rtspPath !== null && cam.rtspPath !== undefined

        if (isCustomRtsp) {
          const online = await checkTcpPort(cam.ipAddress, cam.rtspPort, 3000)
          return {
            id: cam.id,
            name: cam.name,
            ipAddress: cam.ipAddress,
            online,
            deviceInfo: undefined,
            error: online ? undefined : 'RTSP port javob bermayapti',
          }
        }

        // Hikvision — avval HTTP ISAPI, keyin TCP fallback
        const status = await checkCameraStatus({
          ipAddress: cam.ipAddress,
          port: cam.port,
          username: cam.username,
          password: cam.password,
        })

        // HTTP ishlamasa, RTSP port ochiqligini tekshiramiz —
        // ehtimol HTTP yopiq, lekin RTSP ishlayotgan bo'lishi mumkin.
        if (!status.online) {
          const rtspOpen = await checkTcpPort(cam.ipAddress, cam.rtspPort, 3000)
          if (rtspOpen) {
            return {
              id: cam.id,
              name: cam.name,
              ipAddress: cam.ipAddress,
              online: true,
              deviceInfo: undefined,
              error: undefined,
            }
          }
        }

        return {
          id: cam.id,
          name: cam.name,
          ipAddress: cam.ipAddress,
          online: status.online,
          deviceInfo: status.deviceInfo,
          error: status.error,
        }
      })
    )

    cache = { timestamp: Date.now(), data: statuses }

    return NextResponse.json({ statuses, cached: false })
  } catch (err: any) {
    console.error('[API /status] xato:', err)
    return NextResponse.json(
      { error: 'Statusni olishda xato' },
      { status: 500 }
    )
  }
}
