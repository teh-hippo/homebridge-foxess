import { type API, type DynamicPlatformPlugin, type Logger, type PlatformAccessory, type PlatformConfig, type Service, type Characteristic } from 'homebridge'
import { PLATFORM_NAME, PLUGIN_NAME } from './settings'
import type { Inverter } from './foxess/devices'
import * as FoxESS from './foxess/api'
import { RealTimeUsageAccessory } from './RealTimeUsageAccessory'

export class FoxESSPlatform implements DynamicPlatformPlugin {
  public readonly apiKey: string
  public readonly interval: number
  public readonly Service: typeof Service = this.api.hap.Service
  public readonly Characteristic: typeof Characteristic = this.api.hap.Characteristic
  private readonly realTimeAccessories: RealTimeUsageAccessory[] = []

  // this is used to track restored cached accessories
  public readonly accessories: PlatformAccessory[] = []

  constructor (
    public readonly log: Logger,
    public readonly config: PlatformConfig,
    public readonly api: API
  ) {
    this.log.debug('Finished initializing platform:', this.config.name)
    this.apiKey = config.apiKey
    this.interval = config.interval ?? 60 * 1000

    this.api.on('didFinishLaunching', () => {
      log.debug('Executed didFinishLaunching callback')
      this.discoverDevices().catch((e) => { log.error(`Unable to discover: ${e}`) })
    })
  }

  configureAccessory (accessory: PlatformAccessory): void {
    this.log.info('Loading accessory from cache:', accessory.displayName)
    this.accessories.push(accessory)
  }

  async discoverDevices (): Promise<void> {
    const inverters = await FoxESS.getDeviceList(this.apiKey)

    for (const device of inverters) {
      const uuid = this.api.hap.uuid.generate(device.deviceSN)
      const existingAccessory = this.accessories.find(accessory => accessory.UUID === uuid) as PlatformAccessory<Inverter>

      if (existingAccessory != null) {
        this.log.info('Restoring existing accessory from cache:', existingAccessory.displayName)
        existingAccessory.context = device
        this.api.updatePlatformAccessories([existingAccessory])
        this.realTimeAccessories.push(new RealTimeUsageAccessory(this, existingAccessory))
      } else {
        this.log.info('Adding new accessory:', device.deviceSN)
        // eslint-disable-next-line new-cap
        const accessory = new this.api.platformAccessory<Inverter>(device.deviceSN, uuid)
        accessory.context = device
        this.realTimeAccessories.push(new RealTimeUsageAccessory(this, accessory))
        this.api.registerPlatformAccessories(PLUGIN_NAME, PLATFORM_NAME, [accessory])
      }
    }
  }
}
