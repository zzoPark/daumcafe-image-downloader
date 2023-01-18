import fs from 'fs';
import https from 'https';
import puppeteer from 'puppeteer';
import { dialog, app } from 'electron';
import { join, dirname } from 'path';

/**
 * 숫자 범위의 시작과 끝을 입력받아서 숫자 목록 반환
 * @param {number} begin 범위 시작
 * @param {number} end 범위 끝
 * @param {number[]} excludes 범위에서 제외할 숫자 목록
 * @returns 범위 시작과 끝을 포함하는 수열
 */
function createSequences(begin, end, excludes = []) {
  const seqs = [];
  for (let seq = begin; seq <= end; seq++) {
    if (excludes.includes(seq)) continue;
    seqs.push(seq);
  }
  return seqs;
}

/**
 * 이미지를 다운로드 받을 폴더 선택
 * @param {Electron.BrowserWindow} window 
 * @returns 선택한 폴더 경로
 */
function getDownloadDir(window) {
  try {
    const paths = dialog.showOpenDialogSync(window, {
      properties: ['openDirectory'],
    });
    return paths ? paths[0] : undefined;
  } catch (error) {
    window.webContents.send('console-log', error.message);
    return undefined;
  }
}

/**
 * puppeteer를 통해 브라우저 창 열기
 * @param {function} consoleLog console logging function
 * @returns 열린 브라우저
 */
async function getBrowser(consoleLog) {
  try {
    const browser = await puppeteer.launch({
      headless: false,
      executablePath: getChromiumExecPath(consoleLog),
    });
    return browser;
  } catch (error) {
    consoleLog(error.message);
    return undefined;
  }
}

/**
 * @param {function} consoleLog console logging function
 * @returns chromium executable path
 */
function getChromiumExecPath(consoleLog) {
  const moduleDir = dirname(app.getPath('module'));
  const executablePath = join(moduleDir, 'resources', '.cache', 'puppeteer', 'chrome', 'win64-1069273', 'chrome-win', 'chrome.exe');
  consoleLog(executablePath);
  return executablePath;
}

/**
 * Download Daum Cafe board reply image files.
 * @param {Electron.BrowserWindow} window application browser window
 * @param {Electron.IpcMainInvokeEvent} event ipcMain event
 * @param {string} prefixURL daumcafe board url
 * @param {number} begin begin of article no. range
 * @param {number} end end of article no. range
 * @param {number} excludeBegin begin of article no. exclude range
 * @param {number} excludeEnd end of article no. exclude range
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
  const consoleLog = (message) => {
    event.sender.send('console-log', message);
  };

  const cancelDownload = () => {
    event.sender.send('cancel-download');
  };

  const showFinished = (results) => {
    event.sender.send('show-finished', results);
  };

  const downloadDir = getDownloadDir(window);

  if (!downloadDir) {
    cancelDownload();
    return;
  }

  const browser = await getBrowser(consoleLog);

  if (!browser) {
    cancelDownload();
    return;
  }

  try {
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
        }).catch((error) => consoleLog(error));
      });

      await Promise.allSettled(promises).then((results) => {
        showFinished(results);
      });
    }
  } catch (error) {
    consoleLog(error.message);
    cancelDownload();
  } finally {
    await browser.close();
  }
}
