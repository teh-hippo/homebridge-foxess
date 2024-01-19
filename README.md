![node](https://img.shields.io/node/v/homebridge-foxess)
[![npm](https://img.shields.io/npm/dt/homebridge-foxess.svg)](https://www.npmjs.com/package/homebridge-foxess)
[![npm version](https://badge.fury.io/js/homebridge-foxess.svg)](https://badge.fury.io/js/homebridge-foxess)
![Node.js CI](https://github.com/teh-hippo/homebridge-foxess/workflows/Node.js%20CI/badge.svg)

# Homebridge FoxESS

*This plugin is still in early development.*

Example `config.json`:

```json
    "platforms": [
        {
            "name": "FoxESS",
            "platform": "HomebridgeFoxESS",
            "apiKey": "<your-api-key>",
            "interval": "60000"
        }
    ]
```

This plugin exposes HomeKit to solar data, provided by FoxESS.

Currently, only a real-time usage service is available and will be exposed by default.
The purpose of the plugin as it stands is to indicate when current solar generation exceeds usage.

## Parameters

| Parameter | Description | Required | Default
| --------- | ----- | ------- | ------ |
| `apiKey`| API Key provided by FoxESS Cloud. | `true` | |
| `interval`| How often to update current usage | `false` | `300000` (5 minutes) |

## Obtaining an API Key

1. Login to [FoxESS Cloud](https://www.foxesscloud.com)
1. Click on the top-right user icon, and select [User Profile](https://www.foxesscloud.com/user/center)
1. Under 'API Management', hit 'Generate API Key'.

Note: There is currently a limit of 1440 calls per day for an API Key, equating to once per minute.
