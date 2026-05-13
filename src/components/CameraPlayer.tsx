'use client'

import { useEffect, useRef, useState } from 'react'
import Hls from 'hls.js'
import { Camera as CameraIcon, Loader2, AlertCircle, Maximize2 } from 'lucide-react'

interface CameraPlayerProps {
  cameraId: string
  cameraName: string
  online?: boolean
  onSnapshot?: () => void
  compact?: boolean
}

export default function CameraPlayer({
  cameraId,
  cameraName,
  online = true,
  onSnapshot,
  compact = false,
}: CameraPlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const hlsRef = useRef<Hls | null>(null)
  const keepaliveRef = useRef<NodeJS.Timeout | null>(null)
  const retryTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const [status, setStatus] = useState<'idle' | 'loading' | 'playing' | 'error'>('idle')
  const [errorMsg, setErrorMsg] = useState<string>('')

  useEffect(() => {
    if (!online) {
      setStatus('error')
      setErrorMsg('Kamera offline')
      return
    }

    let cancelled = false
    let retryCount = 0
    const maxRetries = 15 // ko'paytirildi

    const cleanup = () => {
      if (keepaliveRef.current) {
        clearInterval(keepaliveRef.current)
        keepaliveRef.current = null
      }
      if (retryTimeoutRef.current) {
        clearTimeout(retryTimeoutRef.current)
        retryTimeoutRef.current = null
      }
      if (hlsRef.current) {
        hlsRef.current.destroy()
        hlsRef.current = null
      }
      if (videoRef.current) {
        videoRef.current.pause()
        videoRef.current.removeAttribute('src')
        videoRef.current.load()
      }
    }

    const startStream = async () => {
      if (cancelled) return
      setStatus('loading')
      setErrorMsg('')

      try {
        // Backend dan stream URL olish (FFmpeg ishga tushadi)
        const res = await fetch(`/api/stream/${cameraId}`, { method: 'POST' })
        const data = await res.json()

        if (!res.ok) {
          throw new Error(data.error || 'Stream xatosi')
        }

        if (cancelled) return

        // Playlist tayyor bo'lishini kutamiz
        await new Promise((r) => setTimeout(r, 500))

        if (cancelled) return

        const video = videoRef.current
        if (!video) return

        // Native HLS support (Safari)
        if (video.canPlayType('application/vnd.apple.mpegurl')) {
          video.src = data.hlsUrl
          video.play().catch(() => {})
          setStatus('playing')
        } else if (Hls.isSupported()) {
          const hls = new Hls({
            // Buffer sozlamalari - katta buffer reconnect paytida video to'xtamasligi uchun
            lowLatencyMode: false,            // false = ko'proq buffer
            liveSyncDurationCount: 3,         // 3 segment orqasidan ergashish
            liveMaxLatencyDurationCount: 10,  // 10 segmentgacha kechikish ruxsat
            maxBufferLength: 30,              // 30s buffer
            maxMaxBufferLength: 60,           // maks 60s
            backBufferLength: 30,             // 30s eski videoni saqlab qolish

            // Reconnect parametrlari - yumshoq, ko'p marta urinish
            manifestLoadingMaxRetry: 10,
            manifestLoadingRetryDelay: 500,
            manifestLoadingMaxRetryTimeout: 8000,
            levelLoadingMaxRetry: 10,
            levelLoadingRetryDelay: 500,
            levelLoadingMaxRetryTimeout: 8000,
            fragLoadingMaxRetry: 10,
            fragLoadingRetryDelay: 500,
            fragLoadingMaxRetryTimeout: 8000,

            // Live stream uchun
            liveDurationInfinity: true,
          })
          hlsRef.current = hls
          hls.loadSource(data.hlsUrl)
          hls.attachMedia(video)

          hls.on(Hls.Events.MANIFEST_PARSED, () => {
            if (!cancelled) {
              video.play().catch(() => {})
              setStatus('playing')
              retryCount = 0 // Muvaffaqiyatli ulanish - reset
            }
          })

          // Buffer to'lganda yana video oqyaptimi tekshirish
          hls.on(Hls.Events.FRAG_LOADED, () => {
            if (!cancelled && status !== 'playing') {
              setStatus('playing')
            }
          })

          hls.on(Hls.Events.ERROR, (_event, errData) => {
            if (cancelled) return

            // Non-fatal xatolarni jim ushlash (HLS.js o'zi qayta urinadi)
            if (!errData.fatal) {
              return
            }

            console.warn(`[Camera ${cameraId}] HLS fatal xato:`, errData.type, errData.details)

            switch (errData.type) {
              case Hls.ErrorTypes.NETWORK_ERROR:
                // 404 yoki tarmoq xatosi - HLS.js o'zi qayta urinadi
                // Lekin agar bu fatal bo'lsa - to'liq qayta boshlaymiz
                if (retryCount < maxRetries) {
                  retryCount++
                  console.log(`[Camera ${cameraId}] Network qayta ulanish ${retryCount}/${maxRetries}...`)

                  if (hlsRef.current) {
                    hlsRef.current.destroy()
                    hlsRef.current = null
                  }

                  retryTimeoutRef.current = setTimeout(() => {
                    if (!cancelled) startStream()
                  }, 1500)
                } else {
                  setStatus('error')
                  setErrorMsg('Stream ulanmadi. Sahifani yangilang.')
                }
                break

              case Hls.ErrorTypes.MEDIA_ERROR:
                console.log(`[Camera ${cameraId}] Media recovery...`)
                try {
                  hls.recoverMediaError()
                } catch {
                  // Recovery ishlamasa - to'liq restart
                  if (retryCount < maxRetries) {
                    retryCount++
                    if (hlsRef.current) {
                      hlsRef.current.destroy()
                      hlsRef.current = null
                    }
                    retryTimeoutRef.current = setTimeout(() => {
                      if (!cancelled) startStream()
                    }, 1500)
                  }
                }
                break

              default:
                if (retryCount < maxRetries) {
                  retryCount++
                  if (hlsRef.current) {
                    hlsRef.current.destroy()
                    hlsRef.current = null
                  }
                  retryTimeoutRef.current = setTimeout(() => {
                    if (!cancelled) startStream()
                  }, 1500)
                } else {
                  setStatus('error')
                  setErrorMsg('Video xatosi')
                }
                break
            }
          })
        } else {
          throw new Error('Brauzer HLS ni qo\'llab-quvvatlamaydi')
        }

        // Keepalive — har 20 sekundda backend ga signal beramiz (idle timeout - 60s)
        if (!keepaliveRef.current) {
          keepaliveRef.current = setInterval(() => {
            fetch(`/api/stream/${cameraId}`).catch(() => {})
          }, 20_000)
        }
      } catch (err: any) {
        if (cancelled) return

        // POST xatolari - qayta urinamiz
        if (retryCount < maxRetries) {
          retryCount++
          console.log(`[Camera ${cameraId}] Stream POST xatosi, ${retryCount}/${maxRetries} qayta urinish...`)
          retryTimeoutRef.current = setTimeout(() => {
            if (!cancelled) startStream()
          }, 2000)
        } else {
          setStatus('error')
          setErrorMsg(err.message)
        }
      }
    }

    startStream()

    return () => {
      cancelled = true
      cleanup()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cameraId, online])

  const handleFullscreen = () => {
    videoRef.current?.requestFullscreen?.()
  }

  return (
    <div className="relative bg-black rounded-lg overflow-hidden border border-neutral-800 group">
      {/* Header */}
      <div className="absolute top-0 left-0 right-0 z-10 bg-gradient-to-b from-black/80 to-transparent p-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className={`w-2 h-2 rounded-full ${online && status === 'playing' ? 'bg-green-500 animate-pulse' : 'bg-red-500'}`} />
          <span className="text-white text-sm font-medium">{cameraName}</span>
        </div>
      </div>

      {/* Video */}
      <video
        ref={videoRef}
        muted
        playsInline
        autoPlay
        className={`w-full ${compact ? 'aspect-video' : 'aspect-video max-h-[70vh]'} object-contain`}
      />

      {/* Loader / Error overlay */}
      {status !== 'playing' && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/60">
          {status === 'loading' && (
            <div className="flex flex-col items-center gap-2 text-neutral-300">
              <Loader2 className="w-8 h-8 animate-spin" />
              <span className="text-sm">Ulanmoqda...</span>
            </div>
          )}
          {status === 'error' && (
            <div className="flex flex-col items-center gap-2 text-red-400 px-4 text-center">
              <AlertCircle className="w-8 h-8" />
              <span className="text-sm">{errorMsg}</span>
            </div>
          )}
        </div>
      )}

      {/* Controls */}
      {status === 'playing' && (
        <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-3 flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
          {onSnapshot && (
            <button
              onClick={onSnapshot}
              className="bg-white/10 hover:bg-white/20 text-white p-2 rounded-md transition-colors"
              title="Snapshot olish"
            >
              <CameraIcon className="w-4 h-4" />
            </button>
          )}
          <button
            onClick={handleFullscreen}
            className="bg-white/10 hover:bg-white/20 text-white p-2 rounded-md transition-colors"
            title="To'liq ekran"
          >
            <Maximize2 className="w-4 h-4" />
          </button>
        </div>
      )}
    </div>
  )
}