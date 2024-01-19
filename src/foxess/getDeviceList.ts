import { getApiCall } from './lib'

enum InverterStatus {
  Online = 1,
  Fault = 2,
  Offline = 3
}

class Inverter {
  public deviceSN: string = ''
  public moduleSN: string = ''
  public plantID: string = ''
  public status: InverterStatus = InverterStatus.Offline
  public hasPV: boolean = false
  public hasBattery: boolean = false
  public deviceType: string = ''
  public productType: string = ''
}

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

async function getDeviceList (apiKey: string): Promise<Inverter[]> {
  const response: GetDeviceListResponse = await getApiCall('/op/v0/device/list', apiKey, new GetDeviceListRequest())
  if (response.errno === 0 && response.result !== undefined) {
    return response.result.data
  } else {
    throw new Error(`Invalid response code: ${response.errno}`)
  }
}

export { getDeviceList, Inverter }
