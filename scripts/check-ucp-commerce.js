const http = require('http');

const url = 'http://localhost:3001/api/ucp/v1/skills';

http.get(url, (res) => {
  let data = '';
  res.on('data', (chunk) => { data += chunk; });
  res.on('end', () => {
    try {
      const json = JSON.parse(data);
      const match = (json.skills || []).find((s) => s.name === 'commerce');
      if (match) {
        console.log('FOUND', JSON.stringify({ name: match.name, protocols: match.protocols }));
      } else {
        console.log('NOT_FOUND');
      }
    } catch (err) {
      console.error('PARSE_ERROR', err.message);
      process.exit(1);
    }
  });
}).on('error', (err) => {
  console.error('REQUEST_ERROR', err.message);
  process.exit(1);
});
