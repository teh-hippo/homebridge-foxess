import type { Inverter } from './devices'
import { call } from './base'

const TodayYield = 'todayYield' // Today Yield (kW)
const PvPower = 'pvPower' // pvPower (kW)
const LoadsPower = 'loadsPower' // Load Power (kW)
const GenerationPower = 'generationPower' // Output Power (kW)
const FeedInPower = 'feedinPower' // Feed-in Power (kW)
const GridConsumptionPower = 'gridConsumptionPower' // GridConsumption Power (kW)

export class BasicRealTimeData {
  public deviceSN: string = ''
  public todayYield: number = 0
  public pvPower: number = 0
  public loadsPower: number = 0
  public generationPower: number = 0
  public feedinPower: number = 0
  public gridConsumptionPower: number = 0
}

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
  public variables: string[] = [
    TodayYield,
    PvPower,
    LoadsPower,
    GenerationPower,
    FeedInPower,
    GridConsumptionPower
  ]

  public sn: string = ''
}

class RealTimeDataResponse {
  public errno: number | undefined
  public result: RealTimeData[] | undefined
}

function toBasicData (data: RealTimeData): BasicRealTimeData {
  const result = new BasicRealTimeData()
  result.deviceSN = data.deviceSN
  data.datas.forEach(i => {
    switch (i.variable) {
      case PvPower:
        result.pvPower = i.value
        break
      case LoadsPower:
        result.loadsPower = i.value
        break
      case GenerationPower:
        result.generationPower = i.value
        break
      case FeedInPower:
        result.feedinPower = i.value
        break
      case GridConsumptionPower:
        result.gridConsumptionPower = i.value
        break
      case TodayYield:
        result.todayYield = i.value
        break
    }
  })
  return result
}

export async function getRealTimeData (apiKey: string, inverter: Inverter): Promise<BasicRealTimeData> {
  const request = new RealTimeDataRequest()
  if (inverter !== undefined) {
    request.sn = inverter.deviceSN
  }

  const response: RealTimeDataResponse = await call('/op/v0/device/real/query', apiKey, request)
  if (response.errno === 0) {
    if (response.result !== undefined && response.result.length > 0) {
      return toBasicData(response.result[0])
    } else {
      throw new Error(`No data returned for inverter: ${inverter.deviceSN}`)
    }
  } else {
    throw new Error(`Invalid response code: ${response.errno}`)
  }
}

export async function getAllRealTimeData (apiKey: string): Promise<BasicRealTimeData[]> {
  const response: RealTimeDataResponse = await call('/op/v0/device/real/query', apiKey, new RealTimeDataRequest())
  if (response.errno === 0 && response.result !== undefined) {
    const result: BasicRealTimeData[] = []
    response.result.forEach(i => {
      result.push(toBasicData(i))
    })
    return result
  } else {
    throw new Error(`Invalid response code: ${response.errno}`)
  }
}
