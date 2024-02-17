import { Md5 } from 'ts-md5'
import type { paths } from './lib/api/v1'

/**
 * Primary API connection endpoint.
 */
export const BaseUrl = 'https://www.foxesscloud.com'

/**
 * Standard header for FoxESS requests.
 */
export type Header = paths['/op/v0/device/list']['post']['parameters']['header'] | paths['/op/v0/device/real/query']['post']['parameters']['header']

/**
 * Calculates the signature for the request
 * @param path Path being called
 * @param apiKey Account API key
 * @param timestamp Current timestamp
 * @returns MD5-based signature
 */
export function calculateSignature (path: keyof paths, apiKey: string, timestamp: number): string {
  if (apiKey.length === 0) throw new Error('API key is required')
  return Md5.hashStr(`${path}\\r\\n${apiKey}\\r\\n${timestamp.toString()}`)
}

/**
 * Obtain the list of inverters owned by this account
 * @param path Path being called
 * @param apiKey Account API key
 * @returns Header formatted for the request
 */
export function header (path: keyof paths, apiKey: string): Header {
  if (apiKey.length === 0) throw new Error('API key is required')
  const timestamp = Date.now()
  const signature = calculateSignature(path, apiKey, timestamp)
  return {
    'Content-Type': 'application/json',
    signature,
    token: apiKey,
    timestamp: timestamp.toString(),
    lang: 'en'
  }
}
