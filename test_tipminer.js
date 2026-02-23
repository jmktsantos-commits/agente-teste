const https = require('https');

// Configs
const UUID = '019a7db8-22e9-7519-aa73-273bf27bb6ea'; // EsportivaBet
const COOKIE = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzZXNzaW9uIjoiMDE5Yzc3OTQtYmZmNi03NWIxLTljNWEtNThkMTYzNzI4MzZkIiwiYWNjb3VudCI6eyJ1dWlkIjoiMDE5OWE1ZDAtZDViNS03NDIzLWE1ODEtYWMyNDY5MDRiODlmIiwibmFtZSI6IkplYW4gT2xpdmVpcmEgU2FudG9zIiwidHlwZSI6IkRFRkFVTFQiLCJlbWFpbCI6ImoubWt0c2FudG9zQGdtYWlsLmNvbSIsInBob25lIjoiKzU1MzE5OTQ5MDE0MzgiLCJhdmF0YXIiOm51bGwsIm9yaWdpbiI6bnVsbCwidmVyc2lvbiI6MSwibGVnYWN5SWQiOiI2MzI5YmEzMTFkYTQxYjdkYTkwZjdjNTIiLCJ0aW1lc3RhbXBzIjp7Imluc2VydCI6IjIwMjUtMTAtMDJUMTY6NDU6NTAuOTAxWiIsInVwZGF0ZSI6IjIwMjYtMDEtMTRUMTY6NTc6NDUuNjIzWiJ9LCJjb25maXJtYXRpb24iOiIyMDI2LTAxLTE0VDE2OjU3OjQ1LjYyM1oifSwiZmVhdHVyZXMiOnsiYm90IjowLCJyb3VuZHMiOjIwMDAsImdyb3VwQm90IjowLCJ2aXAiOmZhbHNlLCJub0FkIjpmYWxzZSwicmFua2luZyI6ZmFsc2UsInN1cHBvcnQiOmZhbHNlLCJ2YWxpZGF0b3IiOmZhbHNlLCJhbmFseXRpY2FsTW9kZSI6ZmFsc2UsInBhc3RDb2xvcnNCeURheUFuZEhvdXIiOmZhbHNlfSwiaWF0IjoxNzcxNTMyNzYzLCJleHAiOjE3NzQxMjQ3NjN9.ZVOo03qonvBiddXwqI5QQIMND0ZLV8klMfHK1Eowj_s';

const options = {
    hostname: 'www.tipminer.com',
    path: `/api/v3/history/aviator/${UUID}?limit=25`,
    method: 'GET',
    headers: {
        'Cookie': `next-auth.session-token=${COOKIE}; __Secure-next-auth.session-token=${COOKIE}`,
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/133.0.0.0 Safari/537.36',
        'Referer': 'https://www.tipminer.com/br/historico/sortenabet/aviator',
        'Origin': 'https://www.tipminer.com',
        'Accept': 'application/json, text/plain, */*'
    }
};

const req = https.request(options, (res) => {
    let data = '';
    console.log(`STATUS: ${res.statusCode}`);
    res.on('data', (chunk) => { data += chunk; });
    res.on('end', () => {
        console.log('BODY:', data.substring(0, 500)); // Print first 500 chars
    });
});

req.on('error', (e) => {
    console.error(`problem with request: ${e.message}`);
});

req.end();
