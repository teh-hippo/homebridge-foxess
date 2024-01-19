import type {
  PlatformAccessory,
  Service
} from 'homebridge'

import type { FoxESSPlatform } from '../platform'
import { type Inverter } from '../foxess/devices'
import { type BasicRealTimeData } from '../foxess/realTimeData'

const minLightLevel = 0.0001

export enum RealTimeType {
  LoadsPower = 1,
  GenerationPower = 2,
  FeedInPower = 3,
  GridConsumptionPower = 4
}

export class RealTimeUsageAccessory {
  private readonly service: Service
  private readonly inverter: Inverter
  private currentValue: number = minLightLevel

  constructor (private readonly platform: FoxESSPlatform, private readonly accessory: PlatformAccessory<Inverter>, private readonly type: RealTimeType) {
    this.service = this.accessory.getService(this.platform.Service.LightSensor) ?? this.accessory.addService(this.platform.Service.LightSensor)
    this.inverter = this.accessory.context
    this.service.setCharacteristic(this.platform.Characteristic.Name, `${this.inverter.deviceSN}-${RealTimeType[type]}`)
    this.service.getCharacteristic(this.platform.Characteristic.CurrentAmbientLightLevel)
      .onGet(() => { return this.currentValue })

    const informationService = this.accessory.getService(this.platform.Service.AccessoryInformation)
    if (informationService === undefined) {
      throw new Error('No information service was provided.')
    }

    informationService
      .setCharacteristic(this.platform.Characteristic.Manufacturer, 'FoxESS')
      .setCharacteristic(this.platform.Characteristic.Model, `${this.inverter.deviceType} (${RealTimeType[type]})`)
      .setCharacteristic(this.platform.Characteristic.SerialNumber, this.inverter.deviceSN)
      .setCharacteristic(this.platform.Characteristic.HardwareRevision, this.inverter.productType)

    this.platform.log.debug(`Accessory for inverter: ${JSON.stringify(this.inverter)}`)
  }

  public update (value: BasicRealTimeData): void {
    const newValue = this.getValue(value, this.type)
    this.currentValue = Math.max(minLightLevel, newValue)
    this.platform.log.debug('Current Usage', RealTimeType[this.type], newValue)
    this.service.getCharacteristic(this.platform.Characteristic.CurrentAmbientLightLevel).updateValue(this.currentValue)
  }

  private getValue (value: BasicRealTimeData, realTimeType: RealTimeType): number {
    switch (realTimeType) {
      case RealTimeType.LoadsPower:
        return value.loadsPower
      case RealTimeType.GenerationPower:
        return value.generationPower
      case RealTimeType.FeedInPower:
        return value.feedinPower
      case RealTimeType.GridConsumptionPower:
        return value.gridConsumptionPower
    }
  }
}
