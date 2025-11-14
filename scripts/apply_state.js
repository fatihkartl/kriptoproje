'use strict';

const fs = require('fs');
const path = require('path');

function printUsageAndExit(message) {
  if (message) console.error(`\n${message}\n`);
  console.error('Kullanım: node scripts/apply_state.js <state.json> [index.html] [--dry-run]\n' +
    'Opsiyonlar:\n' +
    '  -s, --state   JSON dosya yolu\n' +
    '  -h, --html    Düzenlenecek HTML dosyası (varsayılan: index.html)\n' +
    '  -o, --out     Çıktı dosyası (varsayılan: HTML dosyasının kendisi)\n' +
    '      --dry-run Değişiklikleri sadece raporla, dosya yazma');
  process.exit(1);
}

function escapeRegExp(str) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function replaceEditable(html, key, value) {
  const pattern = escapeRegExp(key);
  const regex = new RegExp(`(<([a-zA-Z0-9:-]+)([^>]*?)data-edit-key="${pattern}"[^>]*>)([\\s\\S]*?)(</\\2>)`);
  const match = regex.exec(html);
  if (!match) return { updated: false, html };
  const replacement = `${match[1]}${value}${match[5]}`;
  const updated = html.slice(0, match.index) + replacement + html.slice(match.index + match[0].length);
  return { updated: true, html: updated };
}

function replacePhoto(html, key, value) {
  const pattern = escapeRegExp(key);
  const regex = new RegExp(`(<img[^>]*data-upload-key="${pattern}"[^>]*>)`, 'i');
  const match = regex.exec(html);
  if (!match) return { updated: false, html };
  const originalTag = match[1];
  let updatedTag = originalTag;

  if (/src\s*=/.test(updatedTag)) {
    updatedTag = updatedTag.replace(/src\s*=\s*"[^"]*"/i, `src="${value}"`);
  } else {
    updatedTag = updatedTag.replace('<img', `<img src="${value}"`);
  }

  if (/data-full\s*=/.test(updatedTag)) {
    updatedTag = updatedTag.replace(/data-full\s*=\s*"[^"]*"/i, `data-full="${value}"`);
  } else {
    updatedTag = updatedTag.replace(/data-upload-key="([^"]+)"/, `data-upload-key="$1" data-full="${value}"`);
  }

  const updated =
    html.slice(0, match.index) + updatedTag + html.slice(match.index + originalTag.length);
  return { updated: true, html: updated };
}

function parseArgs(rawArgs) {
  const options = {
    html: path.resolve(process.cwd(), 'index.html'),
    out: null,
    dryRun: false,
  };
  let statePath;
  let htmlExplicit = false;

  for (let i = 0; i < rawArgs.length; i += 1) {
    const arg = rawArgs[i];
    switch (arg) {
      case '-s':
      case '--state':
        statePath = rawArgs[++i];
        break;
      case '-h':
      case '--html':
        options.html = path.resolve(process.cwd(), rawArgs[++i]);
        htmlExplicit = true;
        break;
      case '-o':
      case '--out':
        options.out = path.resolve(process.cwd(), rawArgs[++i]);
        break;
      case '--dry-run':
        options.dryRun = true;
        break;
      default:
        if (!statePath) {
          statePath = arg;
        } else if (!htmlExplicit) {
          options.html = path.resolve(process.cwd(), arg);
          htmlExplicit = true;
        } else {
          printUsageAndExit(`Bilinmeyen argüman: ${arg}`);
        }
    }
  }

  if (!statePath) {
    printUsageAndExit('JSON dosyası belirtilmedi.');
  }

  options.state = path.resolve(process.cwd(), statePath);
  options.out = options.out || options.html;
  return options;
}

function safeReadJSON(filePath) {
  const raw = fs.readFileSync(filePath, 'utf8');
  try {
    return JSON.parse(raw);
  } catch (err) {
    console.error('JSON okunamadı:', err.message);
    process.exit(1);
  }
}

function main() {
  const options = parseArgs(process.argv.slice(2));
  if (!fs.existsSync(options.state)) {
    console.error(`JSON bulunamadı: ${options.state}`);
    process.exit(1);
  }
  if (!fs.existsSync(options.html)) {
    console.error(`HTML bulunamadı: ${options.html}`);
    process.exit(1);
  }

  const state = safeReadJSON(options.state);
  let html = fs.readFileSync(options.html, 'utf8');

  let textUpdates = 0;
  let photoUpdates = 0;
  const missingTexts = [];
  const missingPhotos = [];

  if (state && state.texts) {
    Object.entries(state.texts).forEach(([key, value]) => {
      const result = replaceEditable(html, key, value ?? '');
      if (result.updated) {
        html = result.html;
        textUpdates += 1;
      } else {
        missingTexts.push(key);
      }
    });
  }

  if (state && state.photos) {
    Object.entries(state.photos).forEach(([key, value]) => {
      if (typeof value !== 'string' || !value.trim()) {
        missingPhotos.push(key);
        return;
      }
      const result = replacePhoto(html, key, value);
      if (result.updated) {
        html = result.html;
        photoUpdates += 1;
      } else {
        missingPhotos.push(key);
      }
    });
  }

  if (options.dryRun) {
    console.log('[Dry Run] Güncellenecek yazı sayısı:', textUpdates);
    console.log('[Dry Run] Güncellenecek fotoğraf sayısı:', photoUpdates);
  } else {
    fs.writeFileSync(options.out, html, 'utf8');
    console.log(`Metin alanları güncellendi: ${textUpdates}`);
    console.log(`Fotoğraflar güncellendi: ${photoUpdates}`);
    console.log(`Çıktı: ${options.out}`);
  }

  if (missingTexts.length) {
    console.warn('Bulunamayan metin anahtarları:', missingTexts.join(', '));
  }
  if (missingPhotos.length) {
    console.warn('Bulunamayan fotoğraf anahtarları:', missingPhotos.join(', '));
  }
}

main();
