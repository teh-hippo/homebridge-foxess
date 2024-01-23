import type { PlatformAccessory } from 'homebridge'
import type { FoxESSPlatform } from '../platform'
import type { Inverter } from '../foxess/devices'
import type { RealTimeData } from '../foxess/realTimeData'

const minLightLevel = 0.0001

export const Variables: Map<string, string> = new Map<string, string>([
  ['loadsPower', 'Load Power'], // Load Power (kW)
  ['generationPower', 'Output Power'], // Output Power (kW)
  ['feedinPower', 'Feed-in Power'], // Feed-in Power (kW)
  ['gridConsumptionPower', 'Grid Consumption Power'] // GridConsumption Power (kW)
])

export class InverterAccessory {
  private readonly inverter: Inverter
  private readonly values: Map<string, number> = new Map<string, number>()

  constructor (private readonly platform: FoxESSPlatform, private readonly accessory: PlatformAccessory<Inverter>) {
    this.platform.log.info('Initialising inverter:', this.accessory.displayName)
    this.inverter = this.accessory.context
    const informationService = this.accessory.getService(this.platform.Service.AccessoryInformation)
    if (informationService === undefined) {
      throw new Error('No information service was provided.')
    }
    informationService
      .setCharacteristic(this.platform.Characteristic.Manufacturer, 'FoxESS')
      .setCharacteristic(this.platform.Characteristic.Model, this.inverter.deviceType)
      .setCharacteristic(this.platform.Characteristic.SerialNumber, this.inverter.deviceSN)
      .setCharacteristic(this.platform.Characteristic.HardwareRevision, this.inverter.productType)

    Variables.forEach((displayName, variable) => {
      this.platform.log.debug('Creating service for', displayName)
      const service = this.accessory.getService(displayName) ?? this.accessory.addService(this.platform.Service.LightSensor, displayName, variable)
      this.values.set(variable, minLightLevel)
      service.setCharacteristic(this.platform.Characteristic.Name, displayName)
      // TODO: Call the inverter APIs to update the status and fault characteristics.
      service.setCharacteristic(this.platform.Characteristic.StatusActive, true)
      service.setCharacteristic(this.platform.Characteristic.StatusFault, false)
      service.getCharacteristic(this.platform.Characteristic.CurrentAmbientLightLevel).onGet(() => this.values.get(variable) ?? minLightLevel)
    })

    this.platform.log.debug('Validating', this.accessory.services.length, 'service(s):', this.accessory.services.map((s) => s.displayName))
    const stale = this.accessory.services.filter((s) => s !== informationService && (s.subtype === undefined || Variables.get(s.subtype) !== s.displayName))
    this.platform.log.debug('Removing', stale.length, ' stale service(s):', stale.map((s) => s.displayName))
    stale.forEach((service) => {
      this.accessory.removeService(service)
    })
  }

  public update (value: RealTimeData): void {
    this.platform.log.debug('Updating', this.accessory.displayName, 'with', value.datas.length, 'value(s)')
    value.datas.forEach((data) => {
      const serviceName = Variables.get(data.variable)
      if (serviceName === undefined) {
        this.platform.log.error('Received real-time data for an unknown variable:', data.variable)
        return
      }
      const service = this.accessory.getService(serviceName)
      if (service === undefined) {
        this.platform.log.error('Unable to find service for', serviceName)
        return
      }
      const newValue = Math.max(data.value * 1000, minLightLevel)
      this.platform.log.debug('Updating', this.inverter.deviceSN, data.variable, '=', newValue)
      this.values.set(data.variable, Math.max(minLightLevel, newValue))
      service.getCharacteristic(this.platform.Characteristic.CurrentAmbientLightLevel).updateValue(newValue)
    })
  }
}
