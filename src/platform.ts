import { type API, type DynamicPlatformPlugin, type Logger, type PlatformAccessory, type PlatformConfig, type Service, type Characteristic } from 'homebridge'
import { PLATFORM_NAME, PLUGIN_NAME } from './settings'
import type { Inverter } from './foxess/devices'
import * as FoxESS from './foxess/api'
import { RealTimeUsageAccessory, RealTimeType } from './accessories/realTimeUsage'

export class FoxESSPlatform implements DynamicPlatformPlugin {
  public readonly apiKey: string
  public readonly Service: typeof Service = this.api.hap.Service
  public readonly Characteristic: typeof Characteristic = this.api.hap.Characteristic
  private readonly realTimeAccessories: Map<string, RealTimeUsageAccessory> = new Map<string, RealTimeUsageAccessory>()

  // this is used to track restored cached accessories
  public readonly accessories: PlatformAccessory[] = []

  constructor (
    public readonly log: Logger,
    public readonly config: PlatformConfig,
    public readonly api: API
  ) {
    this.log.debug('Finished initializing platform:', this.config.name)
    this.apiKey = config.apiKey

    this.api.on('didFinishLaunching', () => {
      log.debug('Executed didFinishLaunching callback')
      this.discoverDevices()
        .then(() => {
          setInterval(this.update.bind(this), interval)
          this.update()
        })
        .catch((e) => { log.error(`Unable to discover: ${e}`) })
    })

    const interval = Math.max(config.interval as number ?? 60 * 1000, 60 * 1000)
    this.log.debug(`Updating every ${interval}ms`)
  }

  configureAccessory (accessory: PlatformAccessory): void {
    this.log.info('Loading accessory from cache:', accessory.displayName)
    this.accessories.push(accessory)
  }

  async discoverDevices (): Promise<void> {
    const inverters = await FoxESS.getDeviceList(this.apiKey)

    for (const inverter of inverters) {
      this.getRealTimeTypes().forEach((type) => {
        this.restoreDevice(inverter, type)
      })
    }
  }

  private getName (deviceSN: string, type: RealTimeType): string {
    return `${deviceSN}-${RealTimeType[type]}`
  }

  private restoreDevice (inverter: Inverter, type: RealTimeType): void {
    const name = this.getName(inverter.deviceSN, type)
    const uuid = this.api.hap.uuid.generate(name)
    this.log.debug(`Looking up: ${name}`)
    const existingAccessory = this.accessories.find(accessory => accessory.UUID === uuid) as PlatformAccessory<Inverter>

    if (existingAccessory != null) {
      this.log.info('Restoring existing accessory from cache:', existingAccessory.displayName)
      existingAccessory.context = inverter
      this.api.updatePlatformAccessories([existingAccessory])
      this.realTimeAccessories[name] = new RealTimeUsageAccessory(this, existingAccessory, type)
    } else {
      this.log.info('Adding new accessory:', name)
      // eslint-disable-next-line new-cap
      const accessory = new this.api.platformAccessory<Inverter>(name, uuid)
      accessory.context = inverter
      this.realTimeAccessories[name] = new RealTimeUsageAccessory(this, accessory, type)
      this.api.registerPlatformAccessories(PLUGIN_NAME, PLATFORM_NAME, [accessory])
    }
  }

  update (): void {
    this.updateCurrentLevel().catch((e) => { this.log.error(`Unable to update levels: ${e}`) })
  }

  private getRealTimeTypes (): RealTimeType[] {
    return Object.values(RealTimeType).filter((v) => !isNaN(Number(v))).map((v) => v as RealTimeType)
  }

  async updateCurrentLevel (): Promise<void> {
    this.log.debug('Retrieving current levels')
    const results = await FoxESS.getAllRealTimeData(this.apiKey)
    results.forEach((item) => {
      this.getRealTimeTypes().forEach((key) => {
        const name = this.getName(item.deviceSN, key)
        this.log.debug('Updating', name)
        this.realTimeAccessories[name]?.update(item)
      })
    })
  }
}
