import type { Inverter } from './devices'
import { call } from './base'

class GetDeviceListRequest {
  public currentPage: number = 1
  public pageSize: number = 10
}

class GetDeviceListResponse {
  public errno: number | undefined
  public result: GetDeviceListResponsePage | undefined
}

class GetDeviceListResponsePage {
  public pageSize: number = 0
  public total: number = 0
  public data: Inverter[] = []
}

export async function getDeviceList (apiKey: string): Promise<Inverter[]> {
  const response: GetDeviceListResponse = await call('/op/v0/device/list', apiKey, new GetDeviceListRequest())
  if (response.errno === 0 && response.result !== undefined) {
    return response.result.data
  } else {
    throw new Error(`Invalid response code: ${response.errno}`)
  }
}
