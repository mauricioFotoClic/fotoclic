const https = require('https');
https.get('https://www.fotoclic.com.br/', (res) => {
  let html = '';
  res.on('data', d => html += d);
  res.on('end', () => {
    const match = html.match(/src="(\/assets\/index-[^"]+\.js)"/);
    if(match) {
      https.get('https://www.fotoclic.com.br' + match[1], (res2) => {
        let js = '';
        res2.on('data', d => js += d);
        res2.on('end', () => {
          const urls = js.match(/https:\/\/[a-z0-9]+\.supabase\.co/g);
          console.log('PROD URLS:', [...new Set(urls)]);
        });
      });
    }
  });
});
