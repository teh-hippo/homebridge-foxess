import type {
  PlatformAccessory,
  Service
} from 'homebridge'

import type { FoxESSPlatform } from '../platform'
import * as FoxESS from '../foxess/api'

const minLightLevel = 0.0001

export class RealTimeUsageAccessory {
  private readonly service: Service
  private readonly inverter: FoxESS.Inverter
  private currentValue: number = minLightLevel

  constructor (private readonly platform: FoxESSPlatform, private readonly accessory: PlatformAccessory<FoxESS.Inverter>) {
    this.service = this.accessory.getService(this.platform.Service.LightSensor) ?? this.accessory.addService(this.platform.Service.LightSensor)
    this.inverter = this.accessory.context
    this.service.setCharacteristic(this.platform.Characteristic.Name, this.inverter.deviceSN)
    this.service.getCharacteristic(this.platform.Characteristic.CurrentAmbientLightLevel)
      .onGet(() => { return this.currentValue })

    const informationService = this.accessory.getService(this.platform.Service.AccessoryInformation)
    if (informationService === undefined) {
      throw new Error('No information service was provided.')
    }

    informationService
      .setCharacteristic(this.platform.Characteristic.Manufacturer, 'FoxESS')
      .setCharacteristic(this.platform.Characteristic.Model, this.inverter.deviceType)
      .setCharacteristic(this.platform.Characteristic.SerialNumber, this.inverter.deviceSN)
      .setCharacteristic(this.platform.Characteristic.HardwareRevision, this.inverter.productType)

    const interval: number = Math.max(60 * 1000, this.platform.interval)
    this.platform.log.debug(`Accessory for inverter: ${JSON.stringify(this.inverter)}`)
    this.platform.log.debug(`Updating every ${interval}ms`)
    setInterval(this.update.bind(this), interval)
    this.update()
  }

  update (): void {
    this.updateCurrentLevel().catch((e) => { this.platform.log.error(`Unable to update levels: ${e}`) })
  }

  async updateCurrentLevel (): Promise<void> {
    this.platform.log.debug('Updating current level for', this.inverter.deviceSN)
    const current = await FoxESS.getRealTimeData(this.platform.apiKey, this.inverter)
    this.platform.log.debug('Received', JSON.stringify(current))
    this.currentValue = Math.max(minLightLevel, current.generationPower)
    this.platform.log.debug('Current Usage:', this.currentValue)
    this.service.getCharacteristic(this.platform.Characteristic.CurrentAmbientLightLevel).updateValue(this.currentValue)
  }
}
