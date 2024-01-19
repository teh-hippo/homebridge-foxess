import {Md5} from 'ts-md5';

const domain: string = 'https://www.foxesscloud.com'
const headers: Headers = new Headers()

function calculateSignature(path : string, token: string, timestamp: string): string {
  const toCalculate = `${path}\\r\\n${token}\\r\\n${timestamp}`;
  const result = Md5.hashStr(toCalculate);
  console.debug(`[signature] ${toCalculate} = ${result}`)
  return result;
}

function createHeaders(path:string) : Headers {
  const timestamp = Date.now().toString();
  const token = 'fb625227-ebb0-4fc1-8e0f-209f69b26d32';
  const signature = calculateSignature(path, token, timestamp);
  headers.append('token', token);
  headers.append('lang', 'en');
  headers.append('timestamp', timestamp);
  headers.append('signature', signature);
  headers.append('Content-Type', 'application/json');
  headers.append('User-Agent',
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/117.0.0.0 Safari/537.36');
  return headers;
}

async function createRequest(path: string, params:any) : Promise<string> {
    const headers = createHeaders(path);
    const addr = `${domain}${path}`
    const body = JSON.stringify(params);
    console.info(`body: ${body}`)
    const request = new Request(addr, {
        method: 'POST',
        headers: headers
        //,body: '{"variables": ["pv1Power","pv2Power"]}'
        ,body: body,
    })
    
    const result = await fetch(request);
    if (result.status == 200) {
        return result.text();
    } else {
        throw new Error(`Request failed with status ${result.status}`);
    }
}

async function main() {
    const result = await createRequest('/op/v0/device/real/query', {variables: []});
    console.log(result);
}

main();