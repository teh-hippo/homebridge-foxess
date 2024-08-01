import type { CharacteristicGetHandler, Characteristic, PlatformAccessory, Service } from 'homebridge'
import type { FoxESSPlatform } from '../platform'
import type { Indicators } from '../indicators'
import { inverter } from 'foxess-lib'
const minLightLevel = 0.0001

export const DisplayNames: Map<string, string> = new Map<string, string>([
  ['loadsPower', 'Load Power'], // Load Power (kW); House usage.
  ['generationPower', 'Output Power'], // Output Power (kW); Solar generation.
  ['feedinPower', 'Feed in Power'], // Feed-in Power (kW); Exported power.
  ['gridConsumptionPower', 'Grid Consumption Power'] // GridConsumption Power (kW); Imported power.
])

export class InverterAccessory {
  private readonly inverter: inverter.Inverter
  private readonly values: Map<string, number> = new Map<string, number>()
  private readonly gridUsageSwitchOn: Characteristic | undefined
  private readonly generationSwitchOn: Characteristic | undefined

  constructor(private readonly platform: FoxESSPlatform, private readonly accessory: PlatformAccessory<inverter.Inverter>, private readonly indicators: Indicators | undefined) {
    this.platform.log.info('Initialising inverter:', this.accessory.displayName)
    this.inverter = this.accessory.context
    const informationService = this.accessory.getService(this.platform.Service.AccessoryInformation)
    if (informationService === undefined) {
      throw new Error('No information service was provided.')
    }

    const configuredServices: Service[] = []

    informationService
      .setCharacteristic(this.platform.Characteristic.Manufacturer, 'FoxESS')
      .setCharacteristic(this.platform.Characteristic.Model, this.inverter.deviceType)
      .setCharacteristic(this.platform.Characteristic.SerialNumber, this.inverter.deviceSN)
      .setCharacteristic(this.platform.Characteristic.HardwareRevision, this.inverter.productType)

    configuredServices.push(informationService)

    DisplayNames.forEach((displayName, variable) => {
      this.platform.log.debug(`Creating light sensor for ${displayName} (${variable})`)
      const service = this.accessory.getService(variable) ?? this.accessory.addService(this.platform.Service.LightSensor, undefined, variable)
      this.values.set(variable, minLightLevel)
      service.setCharacteristic(this.platform.Characteristic.Name, displayName)
      service.setCharacteristic(this.platform.Characteristic.StatusActive, false)
      service.setCharacteristic(this.platform.Characteristic.StatusFault, false)
      service.getCharacteristic(this.platform.Characteristic.CurrentAmbientLightLevel).onGet(() => this.values.get(variable) ?? minLightLevel)
      service.getCharacteristic(this.platform.Characteristic.StatusActive).onGet(() => (this.values.get(variable) ?? minLightLevel) > minLightLevel)
      configuredServices.push(service)
    })

    if (indicators !== undefined) {
      this.generationSwitchOn = indicators.generation ? this.setupSwitch(configuredServices, 'Generation', 'generation', this.generationSwitchState.bind(this)) : undefined
      this.gridUsageSwitchOn = indicators.gridUsage ? this.setupSwitch(configuredServices, 'Grid Usage', 'gridUsage', this.gridUsageSwitchState.bind(this)) : undefined
    }

    this.platform.log.debug('Validating', this.accessory.services.length, 'service(s):', this.accessory.services.map(s => s.displayName))
    const stale = this.accessory.services.filter(s => !configuredServices.includes(s))
    this.platform.log.debug('Removing', stale.length, ' stale service(s):', stale.map(s => s.displayName))
    stale.forEach((service) => {
      this.accessory.removeService(service)
    })
  }

  private setupSwitch(configuredServices: Service[], displayName: string, variable: string, handler: CharacteristicGetHandler): Characteristic {
    this.platform.log.debug(`Creating switch '${displayName}' (${variable})`)
    const service = this.accessory.getService(variable) ?? this.accessory.addService(this.platform.Service.Switch, undefined, variable)
    service.displayName = displayName
    const characteristic = service.getCharacteristic(this.platform.Characteristic.On)
    characteristic.onSet(this.updateSwitches.bind(this))
    characteristic.onGet(handler.bind(this))
    configuredServices.push(service)
    return characteristic
  }

  private generationSwitchState(): boolean {
    return this.indicators !== undefined && (this.values.get('generationPower') ?? minLightLevel) >= this.indicators.generationThreshold
  }

  private gridUsageSwitchState(): boolean {
    return this.indicators !== undefined && (this.values.get('gridConsumptionPower') ?? minLightLevel) > this.indicators.gridUsageThreshold
  }

  private updateSwitches(): void {
    if (this.indicators === undefined) return
    this.generationSwitchOn?.updateValue(this.generationSwitchState())
    this.gridUsageSwitchOn?.updateValue(this.gridUsageSwitchState())
  }

  public update(value: inverter.RealTimeData): void {
    this.platform.log.debug('Updating', this.accessory.displayName, 'with', value.datas.length, 'value(s)')
    value.datas.forEach((data) => {
      const service = this.accessory.getService(data.variable)
      if (service === undefined) {
        this.platform.log.error('Unable to find service for', data.variable)
        return
      }
      const newValue = Math.max(data.value * 1000, minLightLevel)
      this.platform.log.debug('Updating', this.inverter.deviceSN, data.variable, '=', newValue)
      this.values.set(data.variable, Math.max(minLightLevel, newValue))
      service.updateCharacteristic(this.platform.Characteristic.CurrentAmbientLightLevel, newValue)
      service.updateCharacteristic(this.platform.Characteristic.StatusActive, newValue > minLightLevel)
    })

    this.updateSwitches()
  }
}
