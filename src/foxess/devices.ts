enum InverterStatus {
  Online = 1,
  Fault = 2,
  Offline = 3
}

export class Inverter {
  public deviceSN: string = ''
  public moduleSN: string = ''
  public plantID: string = ''
  public status: InverterStatus = InverterStatus.Offline
  public hasPV: boolean = false
  public hasBattery: boolean = false
  public deviceType: string = ''
  public productType: string = ''
}
