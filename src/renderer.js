/**
 * This file will automatically be loaded by webpack and run in the "renderer" context.
 * To learn more about the differences between the "main" and the "renderer" context in
 * Electron, visit:
 *
 * https://electronjs.org/docs/tutorial/application-architecture#main-and-renderer-processes
 */
import './index.scss';
import * as bootstrap from 'bootstrap';

(() => {
  const form = document.getElementById('form');
  const btn = document.getElementById('download');
  const spinner = btn.querySelector('.spinner-border');
  const modalEl = document.getElementById('modal');
  const modal = new bootstrap.Modal(modalEl);
  const alertPlaceholder = document.getElementById('alertPlaceholder');

  const createListItem = ({ value, reason }) => {
    const li = document.createElement('li');
    li.className = 'list-group-item';
    li.textContent = value || reason;
    return li;
  };

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

  form.addEventListener(
    'submit',
    (event) => {
      event.preventDefault();
      event.stopPropagation();
      
      const validity = form.checkValidity();
      form.classList.add('was-validated');

      const { url, begin, end, excludeBegin, excludeEnd } = form.elements;

      if (begin.value > end.value) {
        alert('게시글 범위 시작 번호는 끝 번호보다 작아야 합니다.', 'danger');
        begin.focus();
      } else if (excludeBegin.value > excludeEnd.value) {
        alert('게시글 범위 시작 번호는 끝 번호보다 작아야 합니다.', 'danger');
        excludeBegin.focus();
      } else if (validity) {
        btn.disabled = true;
        spinner.classList.remove('visually-hidden');
        

        // window.electronAPI.downloadImages(
        //   url.value,
        //   begin.value,
        //   end.value,
        //   excludeBegin.value,
        //   excludeEnd.value
        // );
      }
    },
    false
  );

  modalEl.addEventListener('shown.bs.modal', () => {
    const navSuccessTab = document.getElementById('nav-success-tab');
    bootstrap.Tab.getInstance(navSuccessTab).show();
  });

  modalEl.addEventListener('hide.bs.modal', () => {
    document.querySelectorAll('#modal .list-group').forEach((element) => {
      element.innerHTML = '';
    });
    document.querySelectorAll('#modal .badge').forEach((element) => {
      element.textContent = 0;
    });
  });

  window.electronAPI.onShowFinished((_event, results) => {
    btn.disabled = false;
    spinner.classList.add('visually-hidden');
    const successList = document.querySelector('#nav-success .list-group');
    const dangerList = document.querySelector('#nav-danger .list-group');
    results.forEach((res) => {
      if (res.status === 'fulfilled') {
        successList.append(createListItem(res));
      } else {
        dangerList.append(createListItem(res));
      }
    });
    const successBadge = document.querySelector('#modal .badge.text-bg-success');
    const dangerBadge = document.querySelector('#modal .badge.text-bg-danger');
    successBadge.textContent = successList.childElementCount;
    dangerBadge.textContent = dangerList.childElementCount;
    modal.show();
  });

  window.electronAPI.onDownloadCanceled(() => {
    btn.disabled = false;
    spinner.classList.add('visually-hidden');
  });

  window.electronAPI.onConsoleLog((_event, message) => {
    console.log('electron ===', message);
  });
})();
