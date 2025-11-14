const PHOTO_STORAGE_PREFIX = 'photo:';
let photoDBPromise;

function photoStorageKey(key) {
  return `${PHOTO_STORAGE_PREFIX}${key}`;
}

function openPhotoDB() {
  if (photoDBPromise) return photoDBPromise;
  if (!('indexedDB' in window)) {
    photoDBPromise = Promise.resolve(null);
    return photoDBPromise;
  }
  photoDBPromise = new Promise((resolve, reject) => {
    const request = indexedDB.open('ilklerimiz-media', 1);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains('photos')) {
        db.createObjectStore('photos', { keyPath: 'key' });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
  return photoDBPromise;
}

async function readPhotoData(key) {
  const storageKey = photoStorageKey(key);
  const db = await openPhotoDB();
  if (db) {
    const value = await new Promise((resolve, reject) => {
      const tx = db.transaction('photos', 'readonly');
      const store = tx.objectStore('photos');
      const req = store.get(storageKey);
      req.onsuccess = () => resolve(req.result?.data || null);
      req.onerror = () => reject(req.error);
    }).catch(() => null);
    if (value) return value;
  }
  return localStorage.getItem(storageKey);
}

async function storePhotoData(key, dataUrl) {
  const storageKey = photoStorageKey(key);
  try {
    localStorage.setItem(storageKey, dataUrl);
  } catch (_) {
    // ignore quota issues
  }
  const db = await openPhotoDB();
  if (!db) return;
  return new Promise((resolve, reject) => {
    const tx = db.transaction('photos', 'readwrite');
    const store = tx.objectStore('photos');
    const req = store.put({ key: storageKey, data: dataUrl });
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
  }).catch(() => {});
}

function setupIntro() {
  const audio = document.getElementById('bg-audio');
  const intro = document.getElementById('intro-screen');
  const playBtn = document.getElementById('intro-play');
  if (!audio || !intro || !playBtn) return;

  playBtn.addEventListener('click', async () => {
    try {
      await audio.play();
    } catch (err) {
      console.warn('Müzik başlatılamadı:', err);
    }
    document.body.classList.add('intro-leaving');
    setTimeout(() => {
      document.body.classList.remove('intro-active', 'intro-leaving');
      intro.setAttribute('hidden', 'hidden');
      document.querySelector('.hero')?.scrollIntoView({ behavior: 'smooth' });
    }, 750);
  });
}

function setupEditing() {
  const toggle = document.getElementById('edit-toggle');
  if (!toggle) return;
  const editableNodes = Array.from(document.querySelectorAll('[data-editable]'));
  editableNodes.forEach((node, idx) => {
    if (!node.dataset.editKey) {
      node.dataset.editKey = node.dataset.editableKey || `edit-${idx}`;
    }
    const stored = localStorage.getItem(`editable-${node.dataset.editKey}`);
    if (stored !== null) node.innerHTML = stored;
    const persist = () => localStorage.setItem(`editable-${node.dataset.editKey}`, node.innerHTML);
    node.addEventListener('input', persist);
    node.addEventListener('blur', persist);
  });

  let isEditing = true;
  const apply = (state) => {
    document.body.classList.toggle('editing', state);
    editableNodes.forEach(node => {
      if (state) node.setAttribute('contenteditable', 'true');
      else node.removeAttribute('contenteditable');
    });
    toggle.setAttribute('aria-pressed', String(state));
    toggle.textContent = `Düzenleme Modu: ${state ? 'Açık' : 'Kapalı'}`;
  };

  toggle.addEventListener('click', () => {
    isEditing = !isEditing;
    apply(isEditing);
  });

  apply(isEditing);
}

function setupUploader() {
  const buttons = document.querySelectorAll('.upload-btn');
  if (!buttons.length) return;
  const fileInput = document.createElement('input');
  fileInput.type = 'file';
  fileInput.accept = 'image/*';
  fileInput.style.display = 'none';
  document.body.appendChild(fileInput);

  const imageNodes = document.querySelectorAll('img[data-upload-key]');
  imageNodes.forEach(async (img) => {
    const key = img.dataset.uploadKey;
    const stored = await readPhotoData(key);
    if (stored) {
      img.src = stored;
      img.setAttribute('data-full', stored);
    }
  });

  let currentKey = null;

  buttons.forEach(btn => {
    btn.addEventListener('click', () => {
      currentKey = btn.dataset.uploadKey;
      fileInput.click();
    });
  });

  fileInput.addEventListener('change', () => {
    if (!currentKey || !fileInput.files?.length) return;
    const target = document.querySelector(`img[data-upload-key="${currentKey}"]`);
    if (!target) return;
    const file = fileInput.files[0];
    const reader = new FileReader();
    reader.onload = async (e) => {
      const url = e.target?.result;
      if (typeof url === 'string') {
        target.src = url;
        target.setAttribute('data-full', url);
        await storePhotoData(currentKey, url);
      }
    };
    reader.readAsDataURL(file);
    fileInput.value = '';
  });
}

function setupLightbox() {
  const lb = document.getElementById('lightbox');
  const lbImg = document.getElementById('lightbox-img');
  if (!lb || !lbImg) return;
  const triggers = document.querySelectorAll('.timeline-card img, #intro-photo');

  const open = (src, alt) => {
    lbImg.src = src;
    lbImg.alt = alt || 'Büyük fotoğraf';
    lb.setAttribute('aria-hidden', 'false');
  };

  const close = () => {
    lb.setAttribute('aria-hidden', 'true');
    lbImg.removeAttribute('src');
  };

  triggers.forEach(img => {
    img.addEventListener('click', () => {
      const full = img.getAttribute('data-full') || img.src;
      open(full, img.alt);
    });
  });

  lb.querySelector('.lightbox-close')?.addEventListener('click', close);
  lb.addEventListener('click', (e) => { if (e.target === lb) close(); });
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape') close(); });
}

function setupYear() {
  const yearSpan = document.getElementById('year');
  if (yearSpan) yearSpan.textContent = new Date().getFullYear();
}

function collectState() {
  const state = { texts: {}, photos: {} };
  document.querySelectorAll('[data-editable]').forEach(node => {
    const key = node.dataset.editKey;
    if (key) state.texts[key] = node.innerHTML;
  });
  document.querySelectorAll('img[data-upload-key]').forEach(img => {
    const key = img.dataset.uploadKey;
    if (key) state.photos[key] = img.src;
  });
  return state;
}

function applyState(state) {
  if (!state) return;
  if (state.texts) {
    Object.entries(state.texts).forEach(([key, value]) => {
      const node = document.querySelector(`[data-edit-key="${key}"]`);
      if (node) {
        node.innerHTML = value;
        localStorage.setItem(`editable-${key}`, value);
      }
    });
  }
  if (state.photos) {
    Object.entries(state.photos).forEach(([key, value]) => {
      const img = document.querySelector(`img[data-upload-key="${key}"]`);
      if (img) {
        img.src = value;
        img.setAttribute('data-full', value);
        storePhotoData(key, value);
      }
    });
  }
}

function setupStateControls() {
  const saveBtn = document.getElementById('save-state');
  const loadBtn = document.getElementById('load-state');
  const loadInput = document.getElementById('load-input');
  if (!saveBtn || !loadBtn || !loadInput) return;

  saveBtn.addEventListener('click', () => {
    const state = collectState();
    const blob = new Blob([JSON.stringify(state)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'ilklerimiz-state.json';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  });

  loadBtn.addEventListener('click', () => loadInput.click());
  loadInput.addEventListener('change', () => {
    const file = loadInput.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = JSON.parse(e.target?.result);
        applyState(data);
      } catch (err) {
        console.error('Kaydı yüklerken hata:', err);
        alert('Geçerli bir JSON dosyası seçmelisin.');
      }
    };
    reader.readAsText(file);
    loadInput.value = '';
  });
}

document.addEventListener('DOMContentLoaded', () => {
  setupIntro();
  setupEditing();
  setupLightbox();
  setupUploader();
  setupStateControls();
  setupYear();
});
