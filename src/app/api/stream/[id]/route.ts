import { NextRequest, NextResponse } from 'next/server'
import { Camera } from '@/lib/db'
import { streamManager } from '@/lib/stream-manager'

export const dynamic = 'force-dynamic'

/**
 * POST: Streamni boshlash (yoki mavjud bo'lsa qaytarish)
 */
export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  try {
    const camera = await Camera.findOne({
      where: { id, isActive: true },
    })

    if (!camera) {
      return NextResponse.json({ error: 'Kamera topilmadi' }, { status: 404 })
    }

    const hlsUrl = await streamManager.startStream({
      id: camera.id,
      ipAddress: camera.ipAddress,
      rtspPort: camera.rtspPort,
      username: camera.username,
      password: camera.password,
      channel: camera.channel,
      streamType: camera.streamType,
      rtspPath: camera.rtspPath,
    })

    return NextResponse.json({
      hlsUrl,
      cameraId: camera.id,
      cameraName: camera.name,
    })
  } catch (err: any) {
    console.error(`[API /stream/${id}] xato:`, err.message)
    return NextResponse.json(
      { error: err.message || 'Stream boshlashda xato' },
      { status: 500 }
    )
  }
}

/**
 * GET: Keepalive (frontend har 30 sekundda chaqiradi)
 */
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const ok = streamManager.touchStream(id)
  return NextResponse.json({ alive: ok })
}

/**
 * DELETE: Stream ni majburiy to'xtatish
 */
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  streamManager.stopStream(id)
  return NextResponse.json({ stopped: true })
}
