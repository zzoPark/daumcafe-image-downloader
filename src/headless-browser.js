import puppeteer from 'puppeteer';
import fs from 'fs';
import https from 'https';
import { dialog } from 'electron';

function createSequences(begin, end, excludes = []) {
  const seqs = [];
  for (let seq = begin; seq <= end; seq++) {
    if (excludes.includes(seq)) continue;
    seqs.push(seq);
  }
  return seqs;
}

function getDownloadDir(window) {
  const paths = dialog.showOpenDialogSync(window, { properties: ['openDirectory'] });
  return paths ? paths[0] : undefined;
}

/**
 * @param {Electron.BrowserWindow} window
 * @param {Electron.IpcMainInvokeEvent} event
 * @param {string} prefixURL
 * @param {number} begin
 * @param {number} end
 * @param {number} excludeBegin
 * @param {number} excludeEnd
 * @author zzoPark
 */
export default async function downloadImages(
  window,
  event,
  prefixURL,
  begin,
  end,
  excludeBegin = 0,
  excludeEnd = 0
) {
  const downloadDir = getDownloadDir(window);

  if (!downloadDir) {
    event.sender.send('cancel-download');
    return;
  }

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
      const filePath = `${downloadDir}/${seq}-${index}.png`;
      return new Promise((resolve, reject) => {
        https
          .get(url, (res) => {
            const stream = fs.createWriteStream(filePath);
            res.pipe(stream);
            stream.on('finish', () => {
              stream.close();
              resolve(filePath);
            });
          })
          .on('error', (error) => reject(`${filePath}: ${error.message}`));
      }).catch((error) => console.error(error));
    });

    await Promise.allSettled(promises).then((results) => {
      event.sender.send('show-finished', results);
    });
  }

  await browser.close();
}
