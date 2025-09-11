const http = require('http')
const data = JSON.stringify({
  fromLat: 12.9716,
  fromLng: 77.5946,
  toLat: 12.2958,
  toLng: 76.6394,
  fromName: 'Bengaluru',
  toName: 'Mysuru'
})

const opts = {
  hostname: '127.0.0.1',
  port: 3000,
  path: '/api/ride/plan',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Content-Length': Buffer.byteLength(data),
  },
}

const req = http.request(opts, (res) => {
  let b = ''
  res.on('data', (c) => (b += c))
  res.on('end', () => {
    const out = { status: res.statusCode, body: null }
    try {
      out.body = JSON.parse(b)
    } catch (e) {
      out.body = b
    }
    const fs = require('fs')
    fs.writeFileSync(__dirname + '/lastPlanResponse.json', JSON.stringify(out, null, 2))
    console.log('WROTE', __dirname + '/lastPlanResponse.json')
  })
})

req.on('error', (e) => console.error('ERR', e))
req.write(data)
req.end()
// keep process alive briefly to allow nodemon restarts to finish
setTimeout(() => {}, 1000)
