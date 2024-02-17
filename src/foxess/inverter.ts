import { BaseUrl, header } from './base'
import createClient from 'openapi-fetch'
import { type paths } from './lib/api/v1'

/* **************** GET DEVICE LIST **************** */
export type Inverter = paths['/op/v0/device/list']['post']['responses']['200']['content']['application/json']['result']['data'][0]

/**
 * Obtain the list of inverters owned by this account
 * @param apiKey Account API key
 * @returns All inverters
 */
export async function getDeviceList (apiKey: string): Promise<Inverter[]> {
  const path: keyof paths = '/op/v0/device/list'
  const results: Inverter[] = []
  let page = 0
  while (true) {
    const { data, error } = await createClient<paths>({ baseUrl: BaseUrl }).POST(path, {
      params: {
        header: header(path, apiKey)
      },
      body: {
        currentPage: ++page,
        pageSize: 100
      }
    })
    if (data?.errno !== 0 || data.result === undefined) throw new Error(`Invalid response code: ${data?.errno}: ${error} (page: ${page})`)

    // Append the results.  Return if at the end of pagination.
    results.push(...data.result.data)
    if (results.length === data.result.total) return results
  }
}

/* **************** GET REALTIME DATA **************** */
export type GetDeviceRealTimeDataRequest = paths['/op/v0/device/real/query']['post']['requestBody']['content']['application/json']
export type RealTimeData = paths['/op/v0/device/real/query']['post']['responses']['200']['content']['application/json']['result'][0]

/**
 * Get realtime data for the account.
 * @param apiKey Account API key
 * @param options (Optional) Specific variables and/or inverters to query. All inverters if not specified.
 * @returns All requested real-time data.
 */
export async function getRealTimeData (apiKey: string, options?: GetDeviceRealTimeDataRequest): Promise<RealTimeData[] | undefined> {
  const path: keyof paths = '/op/v0/device/real/query'
  const { data, error } = await createClient<paths>({ baseUrl: BaseUrl }).POST(path, {
    params: { header: header(path, apiKey) },
    body: options ?? {}
  })
  if (data?.errno !== 0 || data.result === undefined) throw new Error(`Invalid response code: ${data?.errno}: ${error}`)
  return data.result
}
