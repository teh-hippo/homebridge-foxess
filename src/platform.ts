import { type API, type DynamicPlatformPlugin, type Logger, type PlatformAccessory, type PlatformConfig, type Service, type Characteristic } from 'homebridge'
import { PLATFORM_NAME, PLUGIN_NAME } from './settings'
import { InverterAccessory, Variables } from './accessories/inverterAccessory'
import { type Indicators } from './indicators'
import { inverter } from 'foxess-lib'

const minInterval: number = 60 * 1000

export class FoxESSPlatform implements DynamicPlatformPlugin {
  public readonly apiKey: string
  private readonly interval: number
  private readonly indicators: Indicators | undefined
  private failCount: number = 0
  public readonly Service: typeof Service
  public readonly Characteristic: typeof Characteristic
  private readonly inverters: Map<string, InverterAccessory> = new Map<string, InverterAccessory>()

  // this is used to track restored cached accessories
  public readonly accessories: PlatformAccessory[] = []

  constructor (
    public readonly log: Logger,
    public readonly config: PlatformConfig,
    public readonly api: API
  ) {
    this.Service = this.api.hap.Service
    this.Characteristic = this.api.hap.Characteristic
    this.log.info('Initialising platform')
    this.apiKey = config.apiKey
    this.indicators = config.createPerformanceIndicators as boolean ? config.indicators : undefined
    this.interval = Math.max(config.interval as number ?? minInterval, minInterval)
    this.api.on('didFinishLaunching', () => {
      log.debug('Executed didFinishLaunching callback')
      this.initialise()
    })
  }

  private initialise (): void {
    (async () => {
      try {
        await this.discoverDevices()
        this.log.debug(`Updating every ${this.interval}ms`)
        setInterval(this.update.bind(this), this.interval)
        this.update()
      } catch (e) {
        this.log.error(`Unable to discover.  Will retry after ${minInterval}ms`, e)
        setTimeout(this.initialise.bind(this), minInterval)
      }
    })().catch((e) => { this.log.error(`Unable to initialise: ${e}`) })
  }

  configureAccessory (accessory: PlatformAccessory): void {
    this.log.debug('Loading accessory from cache:', accessory.displayName)
    this.accessories.push(accessory)
  }

  removeAccessory (accessory: PlatformAccessory): void {
    this.log.info('Removing accessory:', accessory.displayName)
    this.api.unregisterPlatformAccessories(PLUGIN_NAME, PLATFORM_NAME, [accessory])
  }

  async discoverDevices (): Promise<void> {
    const inverters = await inverter.getDeviceList(this.apiKey)
    if (inverters === undefined) {
      // Introduce a retry approach.
      this.log.error('No result was returned.')
      return
    }

    for (const inverter of inverters) {
      this.createInverter(inverter)
    }

    for (const accessory of this.accessories) {
      const context = accessory.context as inverter.Inverter
      if (context === undefined) {
        this.log.error('Unknown context for accessory:', accessory.displayName, 'data: ', JSON.stringify(accessory.context))
      } else {
        this.log.debug('Checking:', context.deviceSN)
        if (!this.inverters.has(context.deviceSN)) {
          this.removeAccessory(accessory)
        }
      }
    }
  }

  private createInverter (inverter: inverter.Inverter): void {
    const uuid = this.api.hap.uuid.generate(inverter.deviceSN)
    this.log.debug('Looking up:', inverter.deviceSN)
    const existingAccessory = this.accessories.find(accessory => accessory.UUID === uuid) as PlatformAccessory<inverter.Inverter>
    const displayName = `Inverter ${inverter.deviceSN}`

    if (existingAccessory != null) {
      this.log.info('Restoring existing accessory from cache:', existingAccessory.displayName)
      existingAccessory.context = inverter
      existingAccessory.displayName = displayName
      this.api.updatePlatformAccessories([existingAccessory])
      this.inverters.set(inverter.deviceSN, new InverterAccessory(this, existingAccessory, this.indicators))
    } else {
      this.log.info('Adding new accessory:', displayName)
      // eslint-disable-next-line new-cap
      const accessory = new this.api.platformAccessory<inverter.Inverter>(displayName, uuid)
      accessory.context = inverter
      this.inverters.set(inverter.deviceSN, new InverterAccessory(this, accessory, this.indicators))
      this.api.registerPlatformAccessories(PLUGIN_NAME, PLATFORM_NAME, [accessory])
    }
  }

  update (): void {
    this.updateCurrentLevel()
      .then(() => { this.failCount = 0 })
      .catch((e) => {
        const message = 'Unable to update levels:'
        if (++this.failCount < 10) {
          this.log.warn(message, e)
        } else {
          this.log.error(message, e)
        }
      })
  }

  async updateCurrentLevel (): Promise<void> {
    this.log.debug('Fetching real time data')
    const results = await inverter.getRealTimeData(this.apiKey, { variables: Array.from(Variables.keys()) })
    if (results === undefined) {
      this.log.warn('No results came through.')
      return
    }
    this.log.debug('Received result(s):', results.length)
    results.forEach((result) => {
      const inverter = this.inverters.get(result.deviceSN)
      if (inverter === undefined) {
        this.log.error('Unable to find inverter:', result.deviceSN)
      } else {
        this.log.debug('Updating:', result.deviceSN)
        inverter.update(result)
      }
    })
  }
}
