import type {
  AccessoryConfig,
  AccessoryPlugin,
  API,
  CharacteristicGetCallback,
  HAP,
  Logging,
  Service
} from 'homebridge'

import {
  CharacteristicEventTypes
} from 'homebridge'

class FoxESS implements AccessoryPlugin {
  private readonly log: Logging
  private readonly contactSensorService: Service
  private readonly informationService: Service
  private detected: number
  private readonly interval: number
  private readonly hap: HAP
  private readonly timer: NodeJS.Timeout | undefined

  constructor (log: Logging, config: AccessoryConfig, api: API) {
    this.log = log
    this.hap = api.hap

    this.contactSensorService = new this.hap.Service.ContactSensor(config.name)

    this.contactSensorService.getCharacteristic(this.hap.Characteristic.ContactSensorState)
      .on(CharacteristicEventTypes.GET, this.getState.bind(this))

    this.detected = this.hap.Characteristic.ContactSensorState.CONTACT_NOT_DETECTED
    this.informationService = new this.hap.Service.AccessoryInformation()
      .setCharacteristic(this.hap.Characteristic.Manufacturer, 'Solar Usage Sensor')
      .setCharacteristic(this.hap.Characteristic.Model, `${config.name}`)

    this.interval = Math.max(60 * 1000, config.interval as number)
    this.interval = 10000
    this.timer = setInterval(() => { this.fetchState() }, this.interval)
  }

  getServices (): Service[] {
    return [
      this.informationService,
      this.contactSensorService
    ]
  }

  private getState (callback: CharacteristicGetCallback): void {
    callback(undefined, this.detected)
  }

  private getSolarReading (): number {
    return this.detected
  }

  private evaluateSolarReading (reading: number): boolean {
    return reading === 0
  }

  private fetchState (): void {
    const solar = this.getSolarReading()
    this.detected = this.evaluateSolarReading(solar) ? 1 : 0
    this.log.debug(`Current Usage: ${solar}`)

    // Update HomeKit
    this.contactSensorService.getCharacteristic(this.hap.Characteristic.ContactSensorState).updateValue(this.detected)
  }
}

export = (api: API) => {
  api.registerAccessory('FoxESS', FoxESS)
}
