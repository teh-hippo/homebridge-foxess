import type {
  AccessoryPlugin,
  PlatformAccessory,
  Service
} from 'homebridge'

import type { FoxESSPlatform } from './platform'
import type { Inverter } from './foxess/devices'
import * as FoxESS from './foxess/api'

const minLightLevel = 0.0001
class RealTimeUsageAccessory implements AccessoryPlugin {
  private readonly service: Service
  private readonly informationService: Service
  private readonly inverter: Inverter
  private currentValue: number = minLightLevel

  constructor (private readonly platform: FoxESSPlatform, private readonly accessory: PlatformAccessory<Inverter>) {
    this.service = this.accessory.getService(this.platform.Service.LightSensor) ?? this.accessory.addService(this.platform.Service.LightSensor)
    this.inverter = this.accessory.context
    this.service.setCharacteristic(this.platform.Characteristic.Name, this.inverter.deviceSN)
    this.service.getCharacteristic(this.platform.Characteristic.CurrentAmbientLightLevel)
      .onGet(() => { return this.currentValue })

    this.informationService = new this.platform.Service.AccessoryInformation()
      .setCharacteristic(this.platform.Characteristic.Manufacturer, 'FoxESS')
      .setCharacteristic(this.platform.Characteristic.Model, this.inverter.deviceType)
      .setCharacteristic(this.platform.Characteristic.SerialNumber, this.inverter.deviceSN)
      .setCharacteristic(this.platform.Characteristic.HardwareRevision, this.inverter.productType)

    const interval: number = Math.max(60 * 1000, this.platform.interval)
    this.platform.log.debug(`Accessory for inverter: ${JSON.stringify(this.inverter)}`)
    this.platform.log.debug(`Updating every ${interval}ms`)
    setInterval(() => { this.updateCurrentLevel().catch((e) => { this.platform.log.error(`Unable to update levels: ${e}`) }) }, interval)
  }

  getServices (): Service[] {
    return [
      this.informationService,
      this.service
    ]
  }

  async updateCurrentLevel (): Promise<void> {
    this.platform.log.debug('Updating current level', this.inverter.deviceSN)
    const current = await FoxESS.getRealTimeData(this.platform.apiKey, this.inverter)
    this.currentValue = Math.max(minLightLevel, current.generationPower)
    this.platform.log.debug(`Current Usage: ${this.currentValue}`)
    this.service.getCharacteristic(this.platform.Characteristic.CurrentAmbientLightLevel).updateValue(this.currentValue)
  }
}

export { RealTimeUsageAccessory }
