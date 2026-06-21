# DC Way — Kapsam & Yol Haritası

`task_list.txt`'teki 33 maddenin Shopify üzerinde nasıl çözüleceğine dair sınıflandırma.
Tarih: 2026-06-16

## Sınıflandırma anahtarı
- 🟩 **THEME** — Mevcut Dawn teması içinde Liquid/CSS/JS ile yapılır (bizim işimiz).
- 🟦 **NATIVE** — Shopify'ın kutudan çıkan özelliği, sadece ayar/yapılandırma.
- 🟨 **APP** — Custom Shopify app veya Shopify Function gerektirir (geliştirme işi).
- 🟪 **3RD-PARTY** — Hazır 3. parti uygulama (Klaviyo, Matrixify vb.) — aylık ücret.
- 🟥 **ÇAKIŞMA** — Spec, standart Shopify mimarisiyle çelişiyor; alternatif/karar gerekiyor.

---

## 1) Durum Özeti

**Frontend (theme) ~%70 hazır.** Asıl iş, `task_list.txt`'in büyük kısmının theme değil
**uygulama/backend** olması. Liste fiilen bir tam SaaS spesifikasyonu.

| Kategori | Madde sayısı |
|---|---|
| 🟩 Theme'de yapılır | ~10 |
| 🟦 Native ayar | ~6 |
| 🟨 App/Function gerekir | ~9 |
| 🟪 3. parti app | ~6 |
| 🟥 Mimari çakışma (karar şart) | **3** |

---

## 2) ✅ MİMARİ KARARLAR (Faz 0 — KARAR VERİLDİ 2026-06-21)

Müşteri Shopify Plus almayacak. Kararlar:

### A. Ödeme → ✅ **Shopify Payments** (#7)
- Gömülü Stripe Elements **İPTAL** — standart Shopify checkout barındırılan/değiştirilemez.
- Shopify Payments zaten Stripe altyapısını kullanır; Apple Pay / Google Pay native gelir.

### B. Temiz URL `/summer-camp` → ✅ **VAZGEÇİLDİ** (#26)
- Shopify `/pages/`, `/products/`, `/collections/` ön ekini zorunlu kılar. Headless dışında imkansız.
- `/pages/summer-camp` formatı kabul edildi. (SEO meta/alt/sitemap kısmı geçerli kalıyor.)

### C. Checkout form → ✅ **Pre-checkout theme sayfası** (#5, #6)
- Shopify Plus YOK → checkout adımları değiştirilemez.
- Çözüm: parent/child/program-özel/waiver formu **checkout'tan ÖNCE** theme sayfasında toplanır,
  veriler **cart line item properties** olarak taşınır. (Faz 6.)

---

## 3) Madde-madde Yol Haritası

### Bölüm 1 — Tasarım & Sayfalar
| # | Madde | Sınıf | Durum |
|---|---|---|---|
| 1 | Home, Programs, Camps, Registration, About, Testimonials, FAQ | 🟩 | ✅ Bitti |
| 1 | Gallery (admin'den kolay güncellenir, program bazlı) | 🟩 | 🟡 `gallery-grid` var, bitirilecek (metaobject/koleksiyon bazlı düzen) |
| 1 | Membership, Resources, Blog, Merch, Contact, Cart, Account sayfaları | 🟩/🟦 | 🟡 Kısmi |
| 1 | Footer + Contact harita pin'leri (5 lokasyon) | 🟩 | ❌ Yapılacak |
| 1 | Yuvarlak köşe stili (kart/buton/görsel/video) site geneli | 🟩 | 🟡 Kısmen (`dcway-base.css` token'ı netleştirilecek) |

### Bölüm 2 — Hesap (#2)
| Alt-iş | Sınıf | Not |
|---|---|---|
| Children: DOB → yaş otomatik, School Start Year → grade otomatik, Emergency Contact | 🟨 | Customer metafields + **Customer Account UI Extension** |
| Order History: başlık & kolon yeniden adlandırma | 🟨 | Account extension |
| Membership tab (status/tarih/tasarruf/yenileme butonu) | 🟨 | #14 ile bağlı |
> Şu an `customers/account.json` Dawn default. Tamamı app işi.

### Bölüm 3 — Registration (#3)
| Alt-iş | Sınıf | Durum |
|---|---|---|
| Drilldown UI (tab→hafta→lokasyon→opsiyon) | 🟩 | ✅ `dcway-registration-filter` |
| Gerçek zamanlı fiyat, zorunlu alanlar, hafta→lokasyon kilidi | 🟩 (JS) | 🟡 Genişletilecek |
| Add-on / Before-After care çoklu seçim → satıra ekleme | 🟩+🟨 | Line item properties; fiyat farkı için Function |
| "Choose Your Child" (hesaptan) | 🟨 | Account verisi gerekir |

### Bölüm 4–7 — Cart / Checkout / Ödeme
| # | Madde | Sınıf |
|---|---|---|
| 4 | Çok-program tek sepet, satır düzenle/sil, canlı toplam | 🟦+🟩 | Native cart + theme; "edit option" custom |
| 5 | Guest + login + checkout'ta hesap oluşturma | 🟦 | Native (çocuk seçici hariç → 🟥 B/C) |
| 6 | Checkout form (parent/child/waiver, admin'den yönetilir) | 🟥 C | Pre-checkout theme sayfası (Plus'sız) |
| 7 | Stripe Elements ödeme | 🟥 A | Shopify Payments'a yönlendir |

### Bölüm 8–13 — Sipariş sonrası & operasyon
| # | Madde | Sınıf |
|---|---|---|
| 8 | Post-purchase öneriler (yaş/geçmiş bazlı) | 🟨/🟪 | Post-purchase extension veya Search&Discovery |
| 9 | Tüm siparişler tek Excel + filtre, refund kolonu | 🟪 | Matrixify / Mechanic |
| 10 | Refund (tam/kısmi) | 🟦 | Shopify admin native; export'a yansıma 🟪 |
| 11 | Waitlist + e-posta | 🟨/🟪 | Back-in-Stock app veya custom |
| 12 | Kapasite yönetimi → otomatik waitlist butonu | 🟨 | Inventory native + Function/app |
| 13 | Receipt indir/gönder, sipariş düzenle | 🟦+🟪 | Native order editing + receipt app |

### Bölüm 14 — Membership (#14)
| Sınıf | Not |
|---|---|
| 🟨 | $100/yıl ürün + %10 otomatik indirim **Shopify Function (discount)** + üyelik durumu metafield. Appstle/Seal gibi 🟪 app de seçenek. Renewal e-postaları #15 ile. |

### Bölüm 15–21 — E-posta & admin otomasyon
| # | Madde | Sınıf |
|---|---|---|
| 15 | E-posta otomasyonu (confirmation/receipt/reminder/follow-up) | 🟪 | Klaviyo / Shopify Email + Flow |
| 16 | Segmentli parent iletişim aracı | 🟪 | Klaviyo segments |
| 17 | Pending ödeme hatırlatıcı | 🟪/🟨 | Flow / Klaviyo |
| 18 | Abandoned cart (tek e-posta, 24s) | 🟦/🟪 | Native abandoned checkout / Klaviyo |
| 19 | Analytics dashboard (revenue/orders/enrollment, mobil) | 🟪/🟨 | Shopify Analytics + Polar/custom app |
| 20 | Rapor e-postaları (günlük/haftalık/aylık/yıllık) | 🟨/🟪 | Shopify Flow / custom |
| 21 | Discount code yönetimi (limit/expiry/stacking) | 🟦 | Native discounts; membership ile stack → Function ayarı |

### Bölüm 22–33 — Site geneli özellikler
| # | Madde | Sınıf | Not |
|---|---|---|---|
| 22 | Custom table builder (lig fikstürü) | 🟩 | Metaobject + theme section |
| 23 | Canlı arama (predictive) | 🟦/🟩 | Dawn predictive search var; analytics 🟪 |
| 24 | Countdown timer (admin'den tarih) | 🟩 | Theme section |
| 25 | Newsletter signup (footer + welcome mail) | 🟦/🟪 | Native form + Klaviyo welcome |
| 26 | SEO: meta/alt/sitemap | 🟦 | Native sitemap + theme meta. **Temiz URL → 🟥 B** |
| 27 | Cookie consent + privacy | 🟦 | Shopify Customer Privacy banner native |
| 28 | Custom 404 | 🟩 | `404.json` markalanacak |
| 29 | Sayfa hızı (PageSpeed 90+) | 🟩 | Theme optim + Shopify CDN auto-resize |
| 30 | GA4 | 🟦/🟩 | Google channel / theme |
| 31 | Facebook Pixel (admin'den ID) | 🟦 | Meta channel native |
| 32 | Live chat / WhatsApp widget | 🟩/🟪 | Theme snippet veya Tidio |
| 33 | Referral programı | 🟪 | Referral Candy vb. |

---

## 4) Önerilen Sıralama (faz planı)

**Faz 0 — Karar (kod yok):** 🟥 A/B/C çakışmalarını müşteriyle netleştir. Shopify Plus alınacak mı? Stripe yerine Shopify Payments OK mi?

**Faz 1 — Theme bitirme (bizim hızlı kazanımlar):** Gallery, Contact+footer harita, 404, countdown, search, cookie banner, newsletter footer, yuvarlak köşe tutarlılığı, SEO meta. (🟩/🟦)

**Faz 2 — Registration + Cart mantığı:** Canlı fiyat, line item properties, add-on/care çoklu seçim, native multi-cart. (🟩+🟨)

**Faz 3 — Membership + Discount (Function):** $100 ürün, %10 otomatik indirim Function, üyelik metafield. (🟨)

**Faz 4 — Hesap (Account UI Extension):** Children DOB/grade otomatik, Emergency Contact, Order History, Membership tab. (🟨)

**Faz 5 — Operasyon/3rd-party:** Klaviyo (e-posta #15–18), Matrixify (export #9), Waitlist #11, Analytics #19, Referral #33. (🟪)

**Faz 6 — Pre-checkout form + waiver:** Plus'sız hybrid yaklaşım (#6). (🟥 C)
