import puppeteer from 'puppeteer';
import fs from 'fs';
import https from 'https';
import { promisify } from 'util';

const downloadDir = './download/';

function createSequences(begin, end, excludes = []) {
  const seqs = [];
  for (let seq = begin; seq <= end; seq++) {
    if (excludes.includes(seq)) continue;
    seqs.push(seq);
  }
  return seqs;
}
/**
 * @param {Electron.IpcMainInvokeEvent} event
 * 
 */
export default async function downloadImages(
  event,
  prefixURL,
  begin,
  end,
  excludeBegin = 0,
  excludeEnd = 0
) {
  const browser = await puppeteer.launch({ headless: false });
  const page = await browser.newPage();

  await page.goto(prefixURL, { waitUntil: 'networkidle2' });
  const frame = await page.waitForFrame(
    async (frame) => frame.name() === 'down'
  );
  await frame.waitForSelector('#fldlink_DZBq_337');

  const excludes = createSequences(excludeBegin, excludeEnd);
  const seqs = createSequences(begin, end, excludes);

  for (const seq of seqs) {
    await page.goto(prefixURL + '/' + seq, { waitUntil: 'networkidle2' });
    const frame = await page.waitForFrame(
      async (frame) => frame.name() === 'down'
    );
    const not_exists = await frame.$('.viewbox_info > .desc_g');

    if (not_exists) continue;

    await frame.waitForSelector('.list_type_check');
    const lists = await frame.$$eval(
      '.list_type_check[data-image-url]',
      (els) => {
        const urls = [];
        els.forEach((el) => {
          if (el.dataset.imageUrl) {
            urls.push(el.dataset.imageUrl);
          }
        });
        return urls;
      }
    );

    if (!fs.existsSync(downloadDir)) {
      fs.mkdirSync(downloadDir);
    }

    const reqs = lists.map((url, index) => {
      https.get(url, (res) => {
        const stream = fs.createWriteStream(downloadDir + `${seq}-${index}.png`);
        res.pipe(stream);
        stream.on('finish', () => {
          console.log(`download ${stream.path} finished!!!`);
          stream.close();
        });
      }).on('finish', () => {

      });
    });


  }
  
  await browser.close();
  event.sender.send('show-finished', );
}
