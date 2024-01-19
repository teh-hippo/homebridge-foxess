import type {
  PlatformAccessory,
  Service
} from 'homebridge'

import type { FoxESSPlatform } from '../platform'
import type { Inverter } from '../foxess/devices'

const minLightLevel = 0.0001

export class RealTimeUsageAccessory {
  private readonly service: Service
  private readonly inverter: Inverter
  private currentValue: number = minLightLevel

  constructor (private readonly platform: FoxESSPlatform, private readonly accessory: PlatformAccessory<Inverter>, private readonly variable: string) {
    this.service = this.accessory.getService(this.platform.Service.LightSensor) ?? this.accessory.addService(this.platform.Service.LightSensor)
    this.inverter = this.accessory.context
    this.service.setCharacteristic(this.platform.Characteristic.Name, `${this.inverter.deviceSN}-${variable}`)
    this.service.getCharacteristic(this.platform.Characteristic.CurrentAmbientLightLevel)
      .onGet(() => { return this.currentValue })

    const informationService = this.accessory.getService(this.platform.Service.AccessoryInformation)
    if (informationService === undefined) {
      throw new Error('No information service was provided.')
    }

    informationService
      .setCharacteristic(this.platform.Characteristic.Manufacturer, 'FoxESS')
      .setCharacteristic(this.platform.Characteristic.Model, `${this.inverter.deviceType} (${variable})`)
      .setCharacteristic(this.platform.Characteristic.SerialNumber, this.inverter.deviceSN)
      .setCharacteristic(this.platform.Characteristic.HardwareRevision, this.inverter.productType)

    this.platform.log.debug(`Accessory for inverter: ${JSON.stringify(this.inverter)}`)
  }

  public update (value: number): void {
    const newValue = value * 1000
    this.currentValue = Math.max(minLightLevel, newValue)
    this.platform.log.debug('Current Usage', this.variable, newValue)
    this.service.getCharacteristic(this.platform.Characteristic.CurrentAmbientLightLevel).updateValue(this.currentValue)
  }
}
