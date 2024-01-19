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
}

export { RealTimeDataRequest, RealTimeDataResponse, RealTimeDataVariables }
