/* eslint-disable no-extend-native */
import { parse, type HTMLElement } from 'node-html-parser'
import { rmSync, existsSync } from 'fs'
import * as fs from 'fs'
import { get } from 'https'
import { type OpenAPIV3 } from 'openapi-types'

interface FoxESSField {
  name: string
  type: string
  required: boolean
  defaultValue: string | undefined
  remark: string | undefined
  additionalInfo: string | undefined
  index: number
  isArray: boolean
  arrayType: string | undefined
  child: FoxESSField[] | undefined
}

declare global {
  interface String {
    trimToUndefined: () => string | undefined
    tidy: () => string
  }
}

String.prototype.trimToUndefined = function (): string | undefined {
  const trimmed = this.trim()
  if (trimmed.length === 0) return undefined
  return trimmed
}

String.prototype.tidy = function (): string {
  return this
    ?.replace(/\r\n/g, ' ')
    .replace(/\n/g, ' ')
    .replace('  ', ' ')
    .replace('├─', '')
    .replace(/（/g, ' (')
    .replace(/）/g, ') ')
    .replace(/：/g, ': ')
    .replace(/，/g, ', ')
    .replace(/；/g, ', ')
    .replace(/"/g, '\\"')
    .trim()
}

function yesNoToBool (value: string): boolean {
  return value.trim() === 'Yes'
}

function extractTable (element: HTMLElement, topic: string, extractDepth: boolean, columns: number): string[][] {
  const results: string[][] = []
  const body = element.querySelector('tbody')
  if (body === undefined || body === null) throw new Error(`No table body found for: ${topic}`)
  body.querySelectorAll('tr').forEach((tr) => {
    const items = tr.querySelectorAll('td')
    if (items.length === 0) return
    if (items.length !== columns) throw new Error(`Expected ${columns} columns, but got ${items.length}. (${topic})`)
    const result: string[] = items.map((content) => {
      if (content === undefined) throw new Error(`No content found for: ${topic}`)
      return content.textContent.tidy()
    })
    if (extractDepth) {
      const key = tr.attributes.key
      if (key === undefined) throw new Error(`No key found for: ${topic}`)
      // '/op/v0/device/variable/get' doesn't seem to have rendered right in the OpenAPI HTML; possibly due to how the original is formatted.
      // The 'key' is '0', instead of the '0-0' style others follow, where nesting becomes '0-0-0'.
      // This is a hack to fix that.
      const index = Math.max(0, (key.length - 3) / 2)
      if ((key.length - 3) / 2 >= 0) {
        result.push(index.toString())
      }
    }
    results.push(result)
  })
  return results
}

function orErr (text: string): string {
  throw new Error(`Expected to be defined: ${text}`)
}

async function downloadApi (): Promise<string> {
  return await new Promise<string>((resolve, reject) => {
    get('https://www.foxesscloud.com/public/i18n/en/OpenApiDocument.html', (response) => {
      let body = ''
      response.on('data', (chunk) => (body += chunk.toString()))
      response.on('error', reject)
      response.on('end', () => {
        if (response.statusCode === undefined) {
          reject(new Error('No status code'))
          return
        }
        if (response.statusCode >= 200 && response.statusCode <= 299) {
          resolve(body)
        } else {
          reject(new Error(`Request failed. status: ${response.statusCode}, body: ${body}`))
        }
      })
    })
  })
}

function addParameters (table: HTMLElement, path: string, type: string, columns: { count: number, name: number, required: number, description: number, example: number, default?: number}): OpenAPIV3.ParameterObject[] {
  return extractTable(table, path, false, columns.count)
    .map((d) => {
      const h: OpenAPIV3.ParameterObject = {
        in: type,
        description: d[columns.description]?.trimToUndefined(),
        name: String(d[columns.name]),
        required: Boolean(d[columns.required]),
        example: d[columns.example]?.trimToUndefined(),
        schema: {
          type: 'string',
          default: columns.default === undefined ? undefined : d[columns.default]?.trimToUndefined()
        }
      }
      return h
    })
}

function indent (table: HTMLElement, path: string): FoxESSField[] {
  const parameters = extractTable(table, path, true, 6).map<FoxESSField>((d) => {
    const type = String(d[1])
    const isArray = type.endsWith(' []')

    return {
      name: String(d[0]),
      type: isArray ? 'array' : type,
      required: yesNoToBool(String(d[2])),
      defaultValue: d[3]?.trimToUndefined(),
      remark: d[4]?.trimToUndefined(),
      additionalInfo: d[5]?.trimToUndefined(),
      index: Number(d[6]),
      isArray,
      arrayType: isArray ? type.substring(0, type.length - 3) : undefined,
      child: undefined
    }
  })

  parameters.forEach((p, i) => {
    let j = i
    while (++j < parameters.length) {
      const itemJ = parameters[j]
      if (itemJ === undefined) throw new Error('Unable to find itemJ')
      if (itemJ.index <= p.index) return
      if (p.index + 1 === itemJ.index) {
        if (p.child === undefined) p.child = []
        p.child.push(itemJ)
      }
    }
  })

  return parameters.filter((p) => p.index === 0)
}

(async () => {
  const fileName = 'dist/foxess-api.json'
  if (existsSync(fileName)) rmSync(fileName)
  const data = await downloadApi()
  const root = parse(data)

  const doc: OpenAPIV3.Document = {
    openapi: '3.0.3',
    info: { version: '', title: 'FoxESS OpenAPI' },
    servers: [
      {
        url: 'https://www.foxesscloud.com'
      }
    ],
    paths: {}
  }

  if (root === undefined) throw new Error('Unable to parse data')
  const right = root.querySelector('#right')
  if (right === null) throw new Error('Unable to find right')

  doc.info.version = right.querySelector('table')?.querySelector('tbody')?.querySelectorAll('tr').pop()?.querySelectorAll('td')[1]?.textContent?.trimToUndefined()?.slice(1) ?? orErr('version')

  right.querySelectorAll('h2').forEach((element) => {
    function getNextElement (tagName: string, skip: number = 0): HTMLElement {
      do {
        if (element.nextElementSibling === undefined || element.nextElementSibling === null) throw new Error(`Could not find ${tagName} after ${element.tagName}`)
        element = element.nextElementSibling
      } while (element.tagName !== tagName)
      return skip === 0 ? element : getNextElement(tagName, skip - 1)
    }

    const pathItem: OpenAPIV3.PathItemObject = {}
    const methodId = element.attributes.id ?? orErr('id')

    const responseRoot: OpenAPIV3.SchemaObject = {
      type: 'object'
    }

    // Basics
    pathItem.summary = element.childNodes[0]?.textContent?.trim() ?? orErr('name')
    const path = (getNextElement('P', 1)).childNodes[1]?.textContent?.trim() ?? orErr('path')
    doc.paths[path] = pathItem
    const operation: OpenAPIV3.OperationObject = {
      responses: {
        200: {
          description: 'OK',
          content: {
            'application/json': {
              schema: responseRoot
            }
          }
        }
      },
      externalDocs: {
        url: 'https://www.foxesscloud.com/public/i18n/en/OpenApiDocument.html#' + methodId
      }
    }

    const method = ((getNextElement('P')).childNodes[1]?.textContent?.trim() ?? orErr('method')).toLowerCase() as OpenAPIV3.HttpMethods
    pathItem[method] = operation

    pathItem.description = getNextElement('P', 1).childNodes[0]?.textContent.replace('request body example:', '').tidy().trimToUndefined()
    pathItem.parameters = addParameters(getNextElement('TABLE'), path, 'header', { count: 5, name: 0, default: 1, required: 2, example: 3, description: 4})

    if (getNextElement('P').childNodes[0]?.textContent?.trim() === 'Query') {
      pathItem.parameters = pathItem.parameters.concat(addParameters(getNextElement('TABLE'), path, 'query', { count: 4, name: 0, required: 1, example: 2, description: 3}))
    }

    const bodyRoot: OpenAPIV3.SchemaObject = {
      type: 'object'
    }

    function processParam (field: FoxESSField, parent: OpenAPIV3.SchemaObject): void {
      if (field.required) {
        if (parent.required === undefined) parent.required = []
        parent.required?.push(field.name)
      }

      if (parent.properties === undefined) parent.properties = {}
      if (field.isArray) {
        const schema: OpenAPIV3.SchemaObject = {
          type: field.type as OpenAPIV3.ArraySchemaObjectType,
          items: {
            type: field.arrayType as OpenAPIV3.NonArraySchemaObjectType
          },
          description: field.remark,
          default: field.defaultValue
        }
        parent.properties[field.name] = schema
        field.child?.forEach((c) => {
          if (schema === undefined) throw new Error('bob')
          const i = schema.items as OpenAPIV3.SchemaObject
          if (i === undefined) throw new Error('bob')
          processParam(c, i)
        })
      } else {
        const schema: OpenAPIV3.SchemaObject = {
          type: field.type as OpenAPIV3.NonArraySchemaObjectType,
          description: field.remark,
          default: field.defaultValue
        }
        parent.properties[field.name] = schema
        field.child?.forEach((c) => {
          if (schema === undefined) throw new Error('bob')
          processParam(c, schema)
        })
      }
    }

    const requestBody = getNextElement('TABLE')
    if (method !== 'get') {
      operation.requestBody = {
        required: true,
        content: {
          'application/json': {
            schema: bodyRoot
          }
        }
      }
      indent(requestBody, path).forEach((p) => { processParam(p, bodyRoot) })
    }
    indent(getNextElement('TABLE'), path).forEach((p) => { processParam(p, responseRoot) })
  })

  fs.writeFileSync(fileName, JSON.stringify(doc, null, 2))
})().catch((e) => { console.error(e) })
