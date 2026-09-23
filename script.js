// ============================================================
// CONFIG - GANTI BAGIAN INI
// ============================================================

// URL Web App Google Apps Script yang Anda dapatkan setelah proses "Deploy".
// Bentuknya seperti: https://script.google.com/macros/s/AKfycb.../exec
const APPS_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbzjQt2K6MRVrj3-1jvEwxCv5tihuZ8yaP6Wj4WoaR9fViiT5TO2uDo3oYJGOKM2O8YzPQ/exec';

// ============================================================
// STATE
// ============================================================

let currentPhone = '';
let currentUploadMode = 'upload'; // 'upload' atau 'replace'

// ============================================================
// HELPERS
// ============================================================

function formatRupiah(number) {
  const n = Number(number) || 0;
  return 'Rp' + n.toLocaleString('id-ID');
}

function showView(name) {
  const views = document.querySelectorAll('.view');
  views.forEach(function (v) { v.classList.add('hidden'); });
  const target = document.getElementById('view-' + name);
  if (target) target.classList.remove('hidden');
}

function setLoadingText(text) {
  document.getElementById('loading-text').textContent = text;
}

function waLink(phone, message) {
  return 'https://wa.me/' + phone + (message ? '?text=' + encodeURIComponent(message) : '');
}

// ============================================================
// SEARCH
// ============================================================

document.getElementById('search-form').addEventListener('submit', function (e) {
  e.preventDefault();
  const phoneInput = document.getElementById('phone-input').value.trim();
  if (!phoneInput) return;

  currentPhone = phoneInput;
  setLoadingText('Mencari order kamu...');
  showView('loading');

  const url = APPS_SCRIPT_URL + '?action=search&phone=' + encodeURIComponent(phoneInput);

  fetch(url, { method: 'GET', redirect: 'follow' })
    .then(function (res) { return res.json(); })
    .then(function (data) { handleSearchResult(data); })
    .catch(function () {
      showErrorView('Gagal menghubungi server. Cek koneksi internet kamu dan coba lagi.');
    });
});

function handleSearchResult(data) {
  if (data.status === 'not_found') {
    const wa = document.getElementById('wa-not-found');
    wa.href = waLink(data.adminPhone || '6282219225919', 'Halo Caki, saya mau tanya soal order pre-order kaos ICC saya (nomor: ' + currentPhone + ').');
    showView('not-found');
    return;
  }

  if (data.status === 'conflict') {
    const wa = document.getElementById('wa-conflict');
    wa.href = waLink(data.adminPhone || '6282219225919', 'Halo Caki, data order saya sepertinya bermasalah (nomor: ' + currentPhone + ').');
    showView('conflict');
    return;
  }

  if (data.status === 'found') {
    renderResult(data);
    showView('result');
    return;
  }

  showErrorView(data.message || 'Terjadi kesalahan. Silakan coba lagi.');
}

function showErrorView(message) {
  document.getElementById('error-message').textContent = message;
  showView('error');
}

// ============================================================
// RENDER RESULT
// ============================================================

function renderResult(data) {
  document.getElementById('res-name').textContent = data.name;

  let cityText = data.city;
  if (data.otherCitiesCount && data.otherCitiesCount > 0) {
    cityText += ' (+' + data.otherCitiesCount + ' order ke kota lain)';
  }
  document.getElementById('res-city').textContent = cityText;

  document.getElementById('res-qty').textContent = data.quantity + (data.quantity > 1 ? ' Shirts' : ' Shirt');

  const shippingText = data.shippingMultiplier > 1
    ? formatRupiah(data.shippingFee) + ' x' + data.shippingMultiplier + ' = ' + formatRupiah(data.totalShipping)
    : formatRupiah(data.shippingFee);
  document.getElementById('res-shipping').textContent = shippingText;
  document.getElementById('res-code').textContent = data.uniqueCodeDisplay;
  document.getElementById('res-total').textContent = formatRupiah(data.totalPayment);

  document.getElementById('bank-name').textContent = data.bank.name;
  document.getElementById('bank-account').textContent = data.bank.account;
  document.getElementById('bank-holder').textContent = data.bank.holder;
  document.getElementById('bank-total').textContent = formatRupiah(data.totalPayment);

  // reset copy button labels
  document.getElementById('copy-account').textContent = 'Copy';
  document.getElementById('copy-account').classList.remove('copied');
  document.getElementById('copy-total').textContent = 'Copy';
  document.getElementById('copy-total').classList.remove('copied');

  // reset upload error state
  const uploadError = document.getElementById('upload-error');
  uploadError.classList.add('hidden');
  uploadError.textContent = '';
  document.getElementById('file-input').value = '';

  const alreadySubmitted = document.getElementById('already-submitted');
  const paymentSection = document.getElementById('payment-section');

  if (data.paymentStatus === 'SUBMITTED') {
    alreadySubmitted.classList.remove('hidden');
    paymentSection.classList.add('hidden');
    currentUploadMode = 'replace';
  } else {
    alreadySubmitted.classList.add('hidden');
    paymentSection.classList.remove('hidden');
    currentUploadMode = 'upload';
  }
}

document.getElementById('btn-show-replace').addEventListener('click', function () {
  currentUploadMode = 'replace';
  document.getElementById('already-submitted').classList.add('hidden');
  document.getElementById('payment-section').classList.remove('hidden');
});

// ============================================================
// COPY BUTTONS
// ============================================================

function copyText(text, buttonEl) {
  function markCopied() {
    buttonEl.textContent = 'Copied!';
    buttonEl.classList.add('copied');
    setTimeout(function () {
      buttonEl.textContent = 'Copy';
      buttonEl.classList.remove('copied');
    }, 1500);
  }

  if (navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard.writeText(text).then(markCopied).catch(function () {
      fallbackCopy(text);
      markCopied();
    });
  } else {
    fallbackCopy(text);
    markCopied();
  }
}

function fallbackCopy(text) {
  const temp = document.createElement('textarea');
  temp.value = text;
  temp.style.position = 'fixed';
  temp.style.opacity = '0';
  document.body.appendChild(temp);
  temp.focus();
  temp.select();
  try { document.execCommand('copy'); } catch (e) { /* ignore */ }
  document.body.removeChild(temp);
}

document.getElementById('copy-account').addEventListener('click', function () {
  copyText(document.getElementById('bank-account').textContent, this);
});

document.getElementById('copy-total').addEventListener('click', function () {
  const raw = document.getElementById('bank-total').textContent.replace(/[^\d]/g, '');
  copyText(raw, this);
});

// ============================================================
// UPLOAD BUKTI TRANSFER
// ============================================================

document.getElementById('upload-form').addEventListener('submit', function (e) {
  e.preventDefault();

  const fileInput = document.getElementById('file-input');
  const file = fileInput.files[0];
  const errorBox = document.getElementById('upload-error');
  const uploadBtn = document.getElementById('upload-btn');

  errorBox.classList.add('hidden');
  errorBox.textContent = '';

  if (!file) {
    errorBox.textContent = 'Pilih file bukti transfer terlebih dahulu.';
    errorBox.classList.remove('hidden');
    return;
  }

  const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'application/pdf'];
  if (allowedTypes.indexOf(file.type) === -1) {
    errorBox.textContent = 'Format file harus JPG, PNG, atau PDF.';
    errorBox.classList.remove('hidden');
    return;
  }

  const maxBytes = 5 * 1024 * 1024;
  if (file.size > maxBytes) {
    errorBox.textContent = 'Ukuran file maksimal 5 MB.';
    errorBox.classList.remove('hidden');
    return;
  }

  uploadBtn.disabled = true;
  uploadBtn.textContent = 'Mengupload...';

  const reader = new FileReader();
  reader.onload = function () {
    const base64Data = reader.result.split(',')[1];

    const payload = {
      action: currentUploadMode,
      phone: currentPhone,
      filename: file.name,
      mimeType: file.type,
      base64Data: base64Data
    };

    fetch(APPS_SCRIPT_URL, {
      method: 'POST',
      // PENTING: gunakan text/plain, JANGAN application/json.
      // Ini untuk menghindari CORS preflight (OPTIONS) yang tidak didukung Google Apps Script.
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify(payload),
      redirect: 'follow'
    })
      .then(function (res) { return res.json(); })
      .then(function (data) {
        uploadBtn.disabled = false;
        uploadBtn.textContent = 'Upload Bukti Transfer';

        if (data.status === 'success') {
          showView('success');
        } else {
          errorBox.textContent = data.message || 'Upload gagal. Silakan coba lagi.';
          errorBox.classList.remove('hidden');
        }
      })
      .catch(function () {
        uploadBtn.disabled = false;
        uploadBtn.textContent = 'Upload Bukti Transfer';
        errorBox.textContent = 'Gagal menghubungi server. Cek koneksi internet kamu dan coba lagi.';
        errorBox.classList.remove('hidden');
      });
  };

  reader.onerror = function () {
    uploadBtn.disabled = false;
    uploadBtn.textContent = 'Upload Bukti Transfer';
    errorBox.textContent = 'Gagal membaca file. Coba pilih ulang file.';
    errorBox.classList.remove('hidden');
  };

  reader.readAsDataURL(file);
});
