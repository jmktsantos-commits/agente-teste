const https = require('https');

const cookies = "next-auth.session-token=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzZXNzaW9uIjoiMDE5YzRhNzYtNDA1NC03MWRmLWJlYjEtODQ3NjdmYmVjYTM2IiwiYWNjb3VudCI6eyJ1dWlkIjoiMDE5OWE1ZDAtZDViNS03NDIzLWE1ODEtYWMyNDY5MDRiODlmIiwibmFtZSI6IkplYW4gT2xpdmVpcmEgU2FudG9zIiwidHlwZSI6IkRFRkFVTFQiLCJlbWFpbCI6ImoubWt0c2FudG9zQGdtYWlsLmNvbSIsInBob25lIjoiKzU1MzE5OTQ5MDE0MzgiLCJhdmF0YXIiOm51bGwsIm9yaWdpbiI6bnVsbCwidmVyc2lvbiI6MSwibGVnYWN5SWQiOiI2MzI5YmEzMTFkYTkwZjdjNTIiLCJ0aW1lc3RhbXBzIjp7Imluc2VydCI6IjIwMjUtMTAtMDJUMTY6NDU6NTAuOTAxWiIsInVwZGF0ZSI6IjIwMjYtMDEtMTRUMTY6NTc6NDUuNjIzWiJ9LCJjb25maXJtYXRpb24iOiIyMDI2LTAxLTE0VDE2OjU3OjQ1LjYyM1oifSwiZmVhdHVyZXMiOnsiYm90IjowLCJyb3VuZHMiOjIwMDAsImdyb3VwQm90IjowLCJ2aXAiOmZhbHNlLCJub0FkIjpmYWxzZSwicmFua2luZyI6ZmFsc2UsInN1cHBvcnQiOmZhbHNlLCJ2YWxpZGF0b3IiOmZhbHNlLCJhbmFseXRpY2FsTW9kZSI6ZmFsc2UsInBhc3RDb2xvcnNCeURheUFuZEhvdXIiOmZhbHNlfSwiaWF0IjoxNzcwNzc1Nzg5LCJleHAiOjE3NzMzNjc3ODl9.xFZHY4MSfgZfQEV4E96GiSLr4qjYx3wwNJbs7GEqLwY";

const options = {
    hostname: 'www.tipminer.com',
    path: '/api/v3/history/aviator/0194b476-2c3a-7548-8b2a-222e76916592?limit=5',
    method: 'GET',
    headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36',
        'Accept': '*/*',
        'Cookie': cookies,
        'Referer': 'https://www.tipminer.com/'
    }
};

const req = https.request(options, (res) => {
    console.log(`STATUS: ${res.statusCode}`);
    console.log(`HEADERS: ${JSON.stringify(res.headers)}`);

    let data = '';
    res.on('data', (chunk) => {
        data += chunk;
    });

    res.on('end', () => {
        console.log('BODY:', data.substring(0, 500)); // Print first 500 chars
    });
});

req.on('error', (e) => {
    console.error(`problem with request: ${e.message}`);
});

req.end();
