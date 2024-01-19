import type {
  AccessoryPlugin,
  PlatformAccessory,
  Service
} from 'homebridge'

import type { FoxESSPlatform } from './platform'
import type { Inverter } from './foxess/getDeviceList'
import { getRealTimeData } from './foxess/realTimeData'

class RealTimeUsageAccessory implements AccessoryPlugin {
  private readonly service: Service
  private readonly informationService: Service
  private readonly interval: number
  private currentValue: number = 0.0000

  constructor (private readonly platform: FoxESSPlatform, private readonly accessory: PlatformAccessory<Inverter>) {
    this.service = this.accessory.getService(this.platform.Service.LightSensor) ?? this.accessory.addService(this.platform.Service.LightSensor)
    const inverter: Inverter = this.accessory.context
    this.service.setCharacteristic(this.platform.Characteristic.Name, inverter.deviceSN)
    this.service.getCharacteristic(this.platform.Characteristic.CurrentAmbientLightLevel)
      .onGet(() => { return this.currentValue })

    this.informationService = new this.platform.Service.AccessoryInformation()
      .setCharacteristic(this.platform.Characteristic.Manufacturer, 'FoxESS')
      .setCharacteristic(this.platform.Characteristic.Model, inverter.deviceType)
      .setCharacteristic(this.platform.Characteristic.SerialNumber, inverter.deviceSN)
      .setCharacteristic(this.platform.Characteristic.HardwareRevision, inverter.productType)

    this.interval = Math.max(60 * 1000, this.platform.interval)
    setInterval(() => { this.updateCurrentLevel().catch((e) => { this.platform.log.error(`Unable to update levels: ${e}`) }) }, this.interval)
  }

  getServices (): Service[] {
    return [
      this.informationService,
      this.service
    ]
  }

  async updateCurrentLevel (): Promise<void> {
    this.platform.log.debug('Updating Current Level')
    const current = await getRealTimeData(this.platform.apiKey)
    this.currentValue = current[0].datas[2].value
    this.platform.log.debug(`Current Usage: ${this.currentValue}`)
    this.service.getCharacteristic(this.platform.Characteristic.CurrentAmbientLightLevel).updateValue(this.currentValue)
  }
}

export { RealTimeUsageAccessory }
