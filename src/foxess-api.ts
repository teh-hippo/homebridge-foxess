/**
 * FoxESS Cloud API client.
 * Replaces the archived foxess-lib package with direct API calls
 * using native Node.js crypto and fetch (Node 18+).
 */

import { createHash } from 'node:crypto'

const BaseUrl = 'https://www.foxesscloud.com'

/* ---- Types ---- */

export interface Inverter {
  deviceSN: string
  deviceType: string
  productType: string
}

export interface RealTimeData {
  deviceSN: string
  datas: { variable: string, value: number }[]
}

export interface RealTimeDataRequest {
  variables?: string[]
  deviceSN?: string[]
}

interface ApiResponse<T> {
  errno: number
  result: T
}

interface PaginatedResult<T> {
  total: number
  data: T[] | undefined
}

/* ---- Auth ---- */

/**
 * Calculate the FoxESS API signature.
 *
 * IMPORTANT: The separator is the literal 4-character string `\r\n`,
 * NOT actual CR+LF control characters.
 *
 * Test vector:
 *   calculateSignature("/op/v0/device/list", "abcdefghij012345689", 1705809089)
 *   → "68a007c2450d6697fbe2990f92000269"
 */
export function calculateSignature(path: string, apiKey: string, timestamp: number): string {
  return createHash('md5').update(`${path}\\r\\n${apiKey}\\r\\n${timestamp.toString()}`).digest('hex')
}

function headers(path: string, apiKey: string): Record<string, string> {
  const timestamp = Date.now()
  return {
    'Content-Type': 'application/json',
    signature: calculateSignature(path, apiKey, timestamp),
    token: apiKey,
    timestamp: timestamp.toString(),
    lang: 'en'
  }
}

async function post<T>(path: string, apiKey: string, body: unknown): Promise<T> {
  const response = await fetch(`${BaseUrl}${path}`, {
    method: 'POST',
    headers: headers(path, apiKey),
    body: JSON.stringify(body)
  })

  if (!response.ok) {
    throw new Error(`FoxESS API ${path}: HTTP ${response.status.toString()} ${response.statusText}`)
  }

  const data = await response.json() as ApiResponse<T>
  if (data.errno !== 0) {
    throw new Error(`FoxESS API ${path}: errno ${data.errno.toString()}`)
  }

  return data.result
}

/* ---- Device List ---- */

const deviceListPath = '/op/v0/device/list'

/**
 * List all inverters for the account (paginated).
 */
export async function getDevices(apiKey: string): Promise<Inverter[]> {
  const results: Inverter[] = []
  let page = 0
  let total: number

  do {
    const result = await post<PaginatedResult<Inverter>>(deviceListPath, apiKey, {
      currentPage: ++page,
      pageSize: 100
    })

    total = result.total
    if (result.data !== undefined) {
      results.push(...result.data)
    }
  } while (results.length < total)

  return results
}

/* ---- Real-time Data ---- */

const realTimePath = '/op/v0/device/real/query'

/**
 * Get real-time data for inverters.
 */
export async function getRealTimeData(apiKey: string, options?: RealTimeDataRequest): Promise<RealTimeData[] | undefined> {
  return post<RealTimeData[]>(realTimePath, apiKey, options ?? {})
}
