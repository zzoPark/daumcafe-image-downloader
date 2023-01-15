/**
 * This file will automatically be loaded by webpack and run in the "renderer" context.
 * To learn more about the differences between the "main" and the "renderer" context in
 * Electron, visit:
 *
 * https://electronjs.org/docs/tutorial/application-architecture#main-and-renderer-processes
 *
 * By default, Node.js integration in this file is disabled. When enabling Node.js integration
 * in a renderer process, please be aware of potential security implications. You can read
 * more about security risks here:
 *
 * https://electronjs.org/docs/tutorial/security
 *
 * To enable Node.js integration in this file, open up `main.js` and enable the `nodeIntegration`
 * flag:
 *
 * ```
 *  // Create the browser window.
 *  mainWindow = new BrowserWindow({
 *    width: 800,
 *    height: 600,
 *    webPreferences: {
 *      nodeIntegration: true
 *    }
 *  });
 * ```
 */
import './index.scss';

console.log(
  '👋 This message is being logged by "renderer.js", included via webpack'
);

(() => {
  const forms = document.querySelectorAll('.needs-validation');
  const btn = document.getElementById('download');
  const spinner = btn.querySelector('.spinner-border');
  const alertPlaceholder = document.getElementById('liveAlertPlaceholder');

  const alert = (message, type) => {
    const wrapper = document.createElement('div');
    wrapper.innerHTML = [
      `<div class="alert alert-${type} alert-dismissible" role="alert">`,
      `   <div>${message}</div>`,
      '   <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>',
      '</div>',
    ].join('');

    alertPlaceholder.append(wrapper);
  };

  Array.from(forms).forEach((form) => {
    form.addEventListener(
      'submit',
      (event) => {
        event.preventDefault();
        event.stopPropagation();

        const validity = form.checkValidity();
        form.classList.add('was-validated');
        if (validity) {
          btn.disabled = true;
          spinner.classList.remove('visually-hidden');
          const { url, begin, end, excludeBegin, excludeEnd } = form.elements;
          window.electronAPI.downloadImages(
            url.value,
            begin.value,
            end.value,
            excludeBegin.value,
            excludeEnd.value
          );
          btn.disabled = false;
          spinner.classList.add('visually-hidden');
          alert(
            '이미지 다운로드가 완료되었습니다. download 폴더에서 파일을 확인하세요.\n' +
              '파일명은 [게시글 번호]-[순서].png 형식입니다.',
            'success'
          );
        }
      },
      false
    );
  });
})();
