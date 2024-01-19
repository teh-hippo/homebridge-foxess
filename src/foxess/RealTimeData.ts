import { getApiCall } from './lib'

const RealTimeDataVariables: string[] = [
  /* Today Yield (kW) */
  'todayYield',
  /* pvPower (kW) */
  'pvPower',
  /* Load Power (kW). */
  'loadsPower',
  /* Output Power (kW) */
  'generationPower',
  /* Feed-in Power (kW) */
  'feedinPower',
  /* GridConsumption Power (kW) */
  'gridConsumptionPower'
]

class RealTimeData {
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
  public variables: string[] = RealTimeDataVariables
  public sn: string = ''
}

class RealTimeDataResponse {
  public errno: number | undefined
  public result: RealTimeData[] | undefined
}

async function getRealTimeData (apiKey: string): Promise<RealTimeData[]> {
  const response: RealTimeDataResponse = await getApiCall('/op/v0/device/real/query', apiKey, new RealTimeDataRequest())
  if (response.errno === 0 && response.result !== undefined) {
    return response.result
  } else {
    throw new Error(`Invalid response code: ${response.errno}`)
  }
}

export { getRealTimeData, RealTimeData }
