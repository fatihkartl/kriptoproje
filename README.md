## Bizim İlklerimiz — Editlenebilir Aşk Galerisi

Bu proje sevgilinle paylaştığın “ilk”leri sinematik bir arka plan ve polaroid kartlar üzerinde saklaman için tasarlandı. Sayfa varsayılan olarak **düzenleme modunda** açılır; böylece başlıkları, açıklamaları ve fotoğrafları doğrudan sayfa üzerinde değiştirebilirsin.

### Nasıl Kullanılır
1. index.html dosyasını tarayıcıda aç.
2. Metinler data-editable alanlarında bulunur; düzenleme modunda yazdığın her şey tarayıcının depolamasına kaydedilir ve sayfayı yenileyince geri gelir.
3. Fotoğraflar için kart üzerindeki 📷 simgesine tıkla. Yüklediğin görseller otomatik olarak IndexedDB + localStorage kombinasyonuna kaydedilir; tarayıcıyı kapatıp açınca bile kalıcı olur.
4. Giriş ekranındaki polaroidi ssets/intro.jpg ile ya da 📷 tuşundan değiştirebilirsin; hemen altındaki **Arka Planı Değiştir** butonu ise intro ekranının bulanık fonunu seçtiğin görsele güncelliyor (bu görsel de kalıcı olarak saklanır). .hero alanını da dilersen CSS --hero-image ile güncellersin.
5. Arka plan müziği için ssets/music.mp3 dosyasını ekle (play tuşu müziği ve geçiş animasyonunu tetikler).
6. Üstteki **Kaydet** butonu tüm metin/fotoğraf durumunu ilklerimiz-state.json dosyasına indirir; **Yükle** butonu ile bu dosyayı geri alabilirsin. Büyük görseller kullanıyorsan bu yedek özellikle faydalıdır.
7. Çalışmayı bitirdiğinde “Düzenleme Modu”nu kapatarak final görünümü görebilirsin.

### Dosya Yapısı
- index.html: Giriş ekranı, hero, timeline kartları, modal ve kontrol butonları.
- styles.css: Tüm estetik, timeline düzeni, intro katmanı, butonlar.
- script.js: Düzenleme modu, fotoğraf yükleyici (IndexedDB + localStorage), lightbox ve kaydet/yükle mantığı.
- ssets/: Fotoğraflar ve music.mp3 için klasör. Varsayılan örnek görseller sample01.jpg … sample28.jpg olarak referanslandı.

### İpuçları
- Yeni kart eklemek istersen 	imeline-feed içindeki <li class="timeline-item ..."> bloklarını çoğaltıp data-edit-key / data-upload-key değerlerini benzersiz yap.
- Tema renklerini styles.css içindeki :root değişkenleriyle hızlıca değiştirebilirsin.
- Düzenleme modunu kapatınca 📷 düğmeleri gizlenir; yeniden düzenlemek için butonu tekrar aç.

Mutlu anıları bu sayfada biriktirdikten sonra dosyayı paylaşman yeterli 💛

### JSON durumunu HTML'e yazdirma
Kaydet butonundan indirdigin ilklerimiz-state.json dosyasindaki metin ve fotolari dogrudan index.html icine yazmak icin scripts/apply_state.js komut satiri aracini kullanabilirsin:

1. Bilgisayarinda guncel bir Node.js (LTS) kurulumu oldugundan emin ol; komutta kullanilan `node` calisabilir durumdaki PATH icinde olmali.
2. JSON dosyasini projenin kok klasorune kopyala veya komuta tam yolunu ver.
3. Calistir: `node scripts/apply_state.js ilklerimiz-state.json`. Gerekirse hedef HTML dosyasini `--html` ile, farkli bir cikti dosyasini da `--out` ile belirleyebilirsin.
4. `--dry-run` parametresi degisiklikleri raporlar ama dosya yazmaz; once kontrol etmek istiyorsan faydalidir.
5. Islemin ardindan data-edit-key ve data-upload-key alanlari JSON icindeki metin ve gorsellerle guncellenmis olur, boylece dosyayi direkt deploy/push edebilirsin.
