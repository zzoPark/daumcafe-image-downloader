import puppeteer from 'puppeteer';
import fs from 'fs';
import https from 'https';

const downloadDir = './download';

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
 * @param {string} prefixURL
 * @param {number} begin
 * @param {number} end
 * @param {number} excludeBegin
 * @param {number} excludeEnd
 * @author zzoPark
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

    const promises = lists.map((url, index) => {
      return new Promise((resolve, reject) => {
        https
          .get(url, (res) => {
            const stream = fs.createWriteStream(
              `${downloadDir}/${seq}-${index}.png`
            );
            res.pipe(stream);
            stream.on('finish', () => {
              resolve(`download ${stream.path} finished!!!`);
              stream.close();
            });
          })
          .on('error', (error) => reject(error));
      }).catch((error) => console.error(error));
    });

    Promise.allSettled(promises).then((results) => {
      event.sender.send('show-finished', results);
    });
  }

  await browser.close();
}
