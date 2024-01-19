import type { Inverter } from './devices'
import { call } from './base'

export class RealTimeData {
  public deviceSN: string = ''
  public datas: RealTimeDataItem[] = []
  public time: string = ''
}

class RealTimeDataItem {
  public variable: string = ''
  public unit: string = ''
  public name: string = ''
  public value: number = 0
}

class RealTimeDataRequest {
  public variables: string[] = []
  public sn: string = ''
}

class RealTimeDataResponse {
  public errno: number | undefined
  public result: RealTimeData[] | undefined
}

export async function getRealTimeData (apiKey: string, options?: { inverter?: Inverter | undefined, variables?: string[] | undefined }): Promise<RealTimeData[]> {
  const request = new RealTimeDataRequest()
  if (options !== undefined) {
    if (options.inverter !== undefined) {
      request.sn = options.inverter.deviceSN
    }
    if (options.variables !== undefined) {
      request.variables = options.variables
    }
  }

  const response: RealTimeDataResponse = await call('/op/v0/device/real/query', apiKey, request)
  if (response.errno === 0 && response.result !== undefined) {
    return response.result
  } else {
    throw new Error(`Invalid response code: ${response.errno}`)
  }
}
