import crypto from 'crypto'

/**
 * Hikvision ISAPI Digest Authentication client
 * Hikvision odatda Digest auth ishlatadi (Basic emas)
 */

interface HikvisionConfig {
  ipAddress: string
  port: number
  username: string
  password: string
}

/**
 * Digest auth header parsing
 */
function parseDigestChallenge(header: string): Record<string, string> {
  const result: Record<string, string> = {}
  const regex = /(\w+)="?([^",]+)"?/g
  let match
  while ((match = regex.exec(header)) !== null) {
    result[match[1]] = match[2]
  }
  return result
}

/**
 * MD5 hash
 */
function md5(str: string): string {
  return crypto.createHash('md5').update(str).digest('hex')
}

/**
 * Digest auth response yaratish
 */
function buildDigestAuth(
  username: string,
  password: string,
  method: string,
  uri: string,
  challenge: Record<string, string>
): string {
  const realm = challenge.realm || ''
  const nonce = challenge.nonce || ''
  const qop = challenge.qop || ''
  const nc = '00000001'
  const cnonce = crypto.randomBytes(8).toString('hex')

  const ha1 = md5(`${username}:${realm}:${password}`)
  const ha2 = md5(`${method}:${uri}`)

  let response: string
  if (qop) {
    response = md5(`${ha1}:${nonce}:${nc}:${cnonce}:${qop}:${ha2}`)
  } else {
    response = md5(`${ha1}:${nonce}:${ha2}`)
  }

  let header = `Digest username="${username}", realm="${realm}", nonce="${nonce}", uri="${uri}", response="${response}"`
  if (qop) {
    header += `, qop=${qop}, nc=${nc}, cnonce="${cnonce}"`
  }
  if (challenge.opaque) {
    header += `, opaque="${challenge.opaque}"`
  }
  return header
}

/**
 * Digest authentication bilan fetch
 */
async function digestFetch(
  url: string,
  config: HikvisionConfig,
  options: RequestInit & { timeoutMs?: number } = {}
): Promise<Response> {
  const { timeoutMs = 5000, ...fetchOptions } = options
  const method = (fetchOptions.method || 'GET').toUpperCase()
  const urlObj = new URL(url)
  const uri = urlObj.pathname + urlObj.search

  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), timeoutMs)

  try {
    // 1-urinish: auth holatda
    let res = await fetch(url, {
      ...fetchOptions,
      signal: controller.signal,
    })

    // Agar 401 kelsa — Digest challenge bilan qayta yuboramiz
    if (res.status === 401) {
      const wwwAuth = res.headers.get('www-authenticate')
      if (!wwwAuth) {
        throw new Error('Server 401 qaytardi, lekin WWW-Authenticate header yo\'q')
      }

      // Body ni o'qib tashlaymiz (connection ni bo'shatish uchun)
      await res.arrayBuffer().catch(() => {})

      if (wwwAuth.toLowerCase().startsWith('digest ')) {
        const challenge = parseDigestChallenge(wwwAuth.substring(7))
        const authHeader = buildDigestAuth(
          config.username,
          config.password,
          method,
          uri,
          challenge
        )

        res = await fetch(url, {
          ...fetchOptions,
          signal: controller.signal,
          headers: {
            ...fetchOptions.headers,
            Authorization: authHeader,
          },
        })
      } else if (wwwAuth.toLowerCase().startsWith('basic ')) {
        // Basic auth fallback
        const basicAuth = Buffer.from(`${config.username}:${config.password}`).toString('base64')
        res = await fetch(url, {
          ...fetchOptions,
          signal: controller.signal,
          headers: {
            ...fetchOptions.headers,
            Authorization: `Basic ${basicAuth}`,
          },
        })
      }
    }

    return res
  } finally {
    clearTimeout(timeout)
  }
}

/**
 * Snapshot olish (JPEG buffer qaytaradi)
 */
export async function fetchSnapshot(config: HikvisionConfig, channel = 1): Promise<Buffer> {
  const url = `http://${config.ipAddress}:${config.port}/ISAPI/Streaming/channels/${channel}01/picture`
  const res = await digestFetch(url, config, { timeoutMs: 8000 })

  if (!res.ok) {
    throw new Error(`Snapshot xato: HTTP ${res.status}`)
  }

  const arrayBuffer = await res.arrayBuffer()
  return Buffer.from(arrayBuffer)
}

/**
 * Kamera holatini tekshirish (Hikvision HTTP ISAPI orqali)
 */
export async function checkCameraStatus(
  config: HikvisionConfig
): Promise<{ online: boolean; deviceInfo?: any; error?: string }> {
  try {
    const url = `http://${config.ipAddress}:${config.port}/ISAPI/System/deviceInfo`
    const res = await digestFetch(url, config, { timeoutMs: 3000 })

    if (!res.ok) {
      return { online: false, error: `HTTP ${res.status}` }
    }

    const text = await res.text()
    // Oddiy XML parse - faqat asosiy maydonlar
    const deviceName = text.match(/<deviceName>(.*?)<\/deviceName>/)?.[1]
    const model = text.match(/<model>(.*?)<\/model>/)?.[1]
    const firmwareVersion = text.match(/<firmwareVersion>(.*?)<\/firmwareVersion>/)?.[1]

    return {
      online: true,
      deviceInfo: { deviceName, model, firmwareVersion },
    }
  } catch (err: any) {
    return {
      online: false,
      error: err.name === 'AbortError' ? 'Timeout' : err.message,
    }
  }
}

/**
 * TCP port ochiqligini tekshirish (Hikvision bo'lmagan kameralar uchun)
 * RTSP-only kameralarda HTTP ISAPI bo'lmaydi, lekin RTSP port'i ochiq bo'ladi.
 */
export async function checkTcpPort(
  host: string,
  port: number,
  timeoutMs = 3000
): Promise<boolean> {
  const net = await import("net")
  return new Promise((resolve) => {
    const socket = new net.Socket()
    let settled = false

    const finish = (ok: boolean) => {
      if (settled) return
      settled = true
      socket.destroy()
      resolve(ok)
    }

    socket.setTimeout(timeoutMs)
    socket.once("connect", () => finish(true))
    socket.once("timeout", () => finish(false))
    socket.once("error", () => finish(false))

    try {
      socket.connect(port, host)
    } catch {
      finish(false)
    }
  })
}
