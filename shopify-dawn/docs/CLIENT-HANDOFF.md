# DC Way Web Sitesi — Teslim ve Yapılacaklar Listesi

Bu belge üç şeyi kapsar:
1. **Yapılanlar** — temada tamamlanıp canlıya alınanlar (sizden bir işlem gerekmez).
2. **Sizin yapmanız gerekenler** — yalnızca mağaza sahibinin tamamlayabileceği içerik, katalog ve hesap ayarları.
3. **Kurmanız gereken uygulamalar (app)** — Shopify temasının tek başına yapamadığı, üçüncü parti uygulama gerektiren özellikler.

İçerik/katalog işlerini ekibinize, uygulama listesini ise Shopify faturalandırmasını yöneten kişiye yönlendirebilirsiniz.

---

## 1. ✅ Yapılanlar (tamamlandı ve canlıda)

Aşağıdakilerin tamamı bitti, test edildi ve canlıda. Bunlar **tema/tasarım** tarafında olan kısımlardır:

**Tasarım ve sayfalar**
- Ana Sayfa, Hakkımızda, Yorumlar (Testimonials), Camps, Programs, Membership, Resources, SSS (FAQ),
  Blog, Ürünler (Merchandise/shop), İletişim, Sepet — hepsi mevcut DC Way tasarımına uygun yapıldı.
- **Galeri** — admin panelinden foto & video yüklenebilir, program/camp'e göre düzenlenir, masaüstü ve
  mobilde otomatik optimize edilir. Güncellemek için geliştiriciye gerek yok.
- **Yuvarlak köşeler** tüm görsel kartları, videolar, butonlar ve kartlarda tutarlı şekilde uygulandı.
- **Footer ve İletişim haritaları** beş lokasyonunuzu gösteriyor.
- **Markalı 404 sayfası**, **çerez onayı + gizlilik politikası**, **bülten kaydı** (footer + sayfalar).

**Kayıt ve ödeme akışı**
- **Kayıt sihirbazı (Registration builder)** — 100+ butonu tek temiz sayfaya indirir: Çocuk Seç → Tip →
  Hafta → Lokasyon → Seçenek → Önce/Sonra Bakım → Ek ürünler; **canlı güncellenen toplam**, zorunlu alan
  kontrolü ve seçilen haftaya göre otomatik lokasyon griye alma ile.
- **Sepet** — birden çok kayıt tek sepette, tek ödeme.
- **Ödeme öncesi form** — veli bilgisi, çocuk bilgisi, programa özel bölümler ve waiver'lar; tamamı
  ödemeden önce **admin'den yönetilebilir** (geliştirici gerekmez).

**Üyelik fiyatı gösterimi**
- Üye fiyatı (üstü çizili orijinal + üye fiyatı) giriş yapmış üyeler için kayıt sihirbazında, **ürün
  sayfalarında ve ürün kartlarında** otomatik görünür. *(Gerçek indirimi üyelik uygulaması uygular — App
  listesine bakın.)*

**Site geneli özellikler**
- **Canlı arama** (yazdıkça anlık sonuç) üst menüde.
- **Custom tablo oluşturucu** — lig fikstürü/skorları için; admin'den düzenlenebilir, aynı sayfada birden
  çok "game day" tablosu, mobilde yatay kaydırma. (Canlı örnek: 1st–2nd Grade Boys League.)
- **Geri sayım sayacı** (tarihi admin belirler).
- **WhatsApp / sohbet butonu** her sayfada — numara, mesaj ve konum admin'den ayarlanır.
- **Sayfa hızı iyileştirmeleri** — hero görselleri preload, responsive görsel boyutları, kayma (CLS) yok.

---

## 2. 👤 Sizin (mağaza sahibi) yapmanız gerekenler

Bunlar **yalnızca sizin yapabileceğiniz içerik ve katalog işleri** — tema/şablonlar hazır, sadece
verinizi bekliyor. Hiçbiri geliştirici gerektirmez.

### A. Ürün kataloğunu oluşturun (en büyük madde)
Kayıt sistemi ile camp/program sayfaları, **Shopify Admin'de sizin oluşturacağınız ürünlerle çalışır.**
Her türden bir örnek hazırladık; siz onu çoğaltıp gerçek camp, hafta, lokasyon ve fiyatlarınızı girersiniz.

- **Kayıt ürünleri** — her camp × hafta × lokasyon; 4 Option varyantı ve doğru etiketlerle. Ürünler
  oluşunca sihirbaz kombinasyonları otomatik aktif eder. *(Rehber: `REGISTRATION-PRODUCTS.md`)*
- **Camp & program detay ürünleri** — Camps ve Programs sayfalarındaki her "Learn more" butonu bir ürün
  detay sayfasına (`/products/<camp-adı>`) gider. **Şu an bazı "Learn more" butonlarının "Page not found"
  vermesinin sebebi budur**: o camp ürünleri henüz oluşturulmadı. Çözüm: örnek camp ürününü
  (`Art & Soccer Summer Camp`) çoğaltın, uygun ad/handle, görsel, açıklama ve fiyat verin — buton otomatik
  çalışır. *(Detay sayfası düzeni — hero, "neler dahil", program, SSS — zaten hazır; siz sadece içeriği
  eklersiniz.)*

> İpucu: Her kartın "Learn more" linkini tema editöründen de değiştirebilirsiniz
> (Online Store → Customize → Camps sayfası → bir camp kartına tıkla → **Link**).

### B. Ödemeyi açın
- Settings → Payments'tan **Shopify Payments'ı etkinleştirin** (kart ödemesi + Apple Pay / Google Pay).
  *(Not: Standart Shopify'da tam gömülü Stripe Elements formu mümkün değildir; Shopify Payments aynı
  Stripe altyapısında çalışan desteklenen eşdeğeridir.)*

### C. Düzenlenebilir içerikleri doldurun
- **Waiver'lar, programa özel checkout bölümleri, galeri albümleri, lig tabloları, yorumlar, koçlar,
  lokasyonlar** — hepsi **Admin → Content → Metaobjects** ve tema editöründen düzenlenebilir; geliştirici
  gerekmez.
- **SEO**: sayfa başına meta başlık/açıklama ve görsel alt metni düzenlenebilir. Sitemap otomatik üretilir.
  *(Not: `dcway.com/summer-camp` gibi "klasörsüz" URL'ler Shopify'da mümkün değildir — `/pages/` veya
  `/products/` ön eki zorunludur. Bu bir hata değil, Shopify platform sınırıdır.)*

### D. Analitik ve reklamları bağlayın (ID'leri siz verirsiniz)
- **Google Analytics 4** — Google & YouTube satış kanalı üzerinden bağlanır.
- **Facebook/Meta Pixel** — Meta satış kanalı üzerinden bağlanır.
  *(Bunlar, dönüşümlerin çift sayılmaması için temaya yapıştırılmak yerine Shopify'ın yerel kanalları
  üzerinden yapılır. Kanalı kurar ve ID'lerinizi yapıştırırsınız.)*

---

## 3. 🔌 Kurmanız gereken uygulamalar (app)

Bu özellikler **Shopify temasında tek başına mümkün değildir** — bir uygulama kurulması gerekir. Tema
bunlarla çalışacak şekilde önceden hazırlandı (ör. `member` etiketini, üye indirim yüzdesini okur). Her
satır için bir uygulama seçin; ücretler yaklaşıktır ve bizim değil, uygulamanın aylık faturasıdır.

| Özellik (madde #) | Neden uygulama gerekiyor | Önerilen uygulama(lar) |
|---|---|---|
| **Üyelik indiriminin uygulanması (#14)** | Shopify'ın yerel otomatik indirimleri, kupon olmadan **yalnızca üyelere** hedeflenemez. Uygulama aktif üyeleri etiketler, 12 aylık bitiş tarihi koyar ve camp/programlara otomatik %10 uygular. | **Appstle Memberships** (veya Seal Subscriptions / Regios) |
| **Hesap sayfaları: Membership sekmesi, Children sekmesi (DT→Yaş, Okul‑Yılı→Sınıf), Sipariş Geçmişi sütun adları (#2)** | Yeni Shopify müşteri hesapları temadan **özelleştirilemez**. Bu sekme ve alanlar için müşteri‑hesap/alan uygulaması gerekir. | **Helium Customer Fields** + Customer Account UI eklentisi |
| **Siparişleri filtreli Excel'e aktarma + iade sütunu (#9)** | Shopify'ın yerel dışa aktarımı sınırlıdır; uygulama tüm programları kapsayan tek dosya + filtre sağlar. | **Matrixify** |
| **Kontenjan dolunca bekleme listesi (#11) + kapasite yönetimi (#12)** | "Bekleme listesine katıl" + sıradaki veliyi otomatik bilgilendirme, uygulamanın sağladığı stok otomasyonu gerektirir. | **Back in Stock** (veya Notify Me) |
| **E‑posta otomasyonu (#15–18): onay, makbuz, hatırlatma, terk edilmiş sepet, üyelik yenileme** | Düzenli/tetiklemeli, şablonu düzenlenebilir e‑postalar bir e‑posta platformu gerektirir. | **Klaviyo** (veya Shopify Email + Flow) |
| **Veli iletişim aracı — filtreli gruba e‑posta (#16)** | Velileri hafta/lokasyon/yaşa göre segmentleyip e‑posta atmak bir pazarlama platformu gerektirir. | **Klaviyo** segmentleri |
| **Analitik panosu + zamanlanmış rapor e‑postaları (#19, #20)** | Shopify'ın yerel analizinin ötesinde özel gelir/kayıt panosu uygulama gerektirir. | **Polar Analytics** (veya Shopify Analytics + Flow) |
| **Referans (referral) programı (#33)** | Benzersiz referans linkleri + ödül takibi referans uygulaması gerektirir. | **ReferralCandy** (veya UpPromote) |
| **Satın alma sonrası program önerileri (#8)** | Onay sayfasında kurala dayalı öneriler bir uygulama/eklenti gerektirir. | satın alma sonrası upsell uygulaması (ör. **AfterSell**) |

> **Yerel (uygulama gerekmez, ama siz yapılandırırsınız):** tam & kısmi iadeler (#10), makbuz/sipariş
> düzenleme (#13) ve indirim kodları (#21) doğrudan Shopify Admin'den yönetilir. Üyelik indirimiyle
> **birlikte kullanılabilen** (stack) indirim kodları, üyelik uygulamasının kurallarına bağlıdır.

---

## Özet

- **Web sitesi teması tamam.** Temada yapılabilecek her şey yapıldı, test edildi ve canlıda.
- **Sıradaki adımınız** esas olarak **katalog doldurma** (camp/program/kayıt ürünlerini oluşturmak); bu
  aynı zamanda bugün görebileceğiniz "Learn more → Page not found" sorununu da çözer.
- **Yukarıdaki uygulamalar için bütçe ayırın**: üyelik indirimi, hesap sekmeleri, dışa aktarım, bekleme
  listesi, e‑posta otomasyonu, analitik ve referans programını açmak için gereklidir.

*Herhangi bir madde hakkında soru olursa, katalog kurulumunda ekibinize yol göstermekten veya önerilen
uygulamalar arasında seçim yapmanıza yardımcı olmaktan memnuniyet duyarız.*
