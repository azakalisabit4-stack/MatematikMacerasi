# Matematik Macerası

Öğrencilerin **oyun oynayarak** matematik öğrendiği, rekabet ettiği, seviye atladığı, düello yaptığı ve başarımlar kazandığı tam kapsamlı web uygulaması.

> Temel prensip:
> **Tek kişilik oyunlar → XP + Level + Toplam Puan**
> **Düellolar → Lig Puanı + Lig**
> Bu iki ilerleme sistemi birbirinden **tamamen bağımsızdır.**

---

## Hızlı Başlangıç

```bash
npm install
cp .env.example .env      # (Windows: copy .env.example .env)
npm run dev
```

Tarayıcıda → <http://localhost:3000>

Veritabanı tabloları ilk açılışta **otomatik** oluşturulur, referans veriler (başarımlar, görevler, ligler, mağaza, yasaklı kelimeler) otomatik yüklenir. Ek kurulum adımı yoktur.

### İlk Hocaefendi (yönetici) hesabı

`.env` dosyasındaki bilgilerle otomatik oluşturulur:

| Alan | Varsayılan |
| --- | --- |
| E-posta | `hocaefendi@matematikmacerasi.com` |
| Şifre | `Hoca!2026` |
| Davet kodu | `MATEMATIK-2026-HOCA` |

> **Üretime almadan önce `.env` içindeki `ADMIN_PASSWORD`, `AUTH_SECRET` ve `HOCAEFENDI_INVITE_CODE` değerlerini mutlaka değiştirin.**

Yeni bir Hocaefendi hesabı, kayıt ekranındaki *"Hocaefendi hesabı açıyorum"* seçeneği ve **davet kodu** ile açılır. Kod kontrolü tamamen sunucu tarafındadır; öğrenciler bu hesabı açamaz.

### Komutlar

| Komut | Açıklama |
| --- | --- |
| `npm run dev` | Geliştirme sunucusu (http://localhost:3000) |
| `npm run build` | Üretim derlemesi |
| `npm run start` | Üretim sunucusu |
| `npm run selftest` | **Uçtan uca otomatik test** (sunucu açıkken çalıştırın) |
| `npm run typecheck` | TypeScript tip kontrolü |
| `npm run db:generate` | Şema değiştiyse yeni migration üretir |
| `npm run db:studio` | Veritabanı görsel arayüzü |
| `npm run db:demo` | (İsteğe bağlı) örnek öğrenci hesapları oluşturur |
| `npm run db:reset` | Veritabanını siler (yeniden oluşturulur) |

---

## 1. Teknik Mimari ve Teknoloji Gerekçeleri

| Katman | Seçim | Neden |
| --- | --- | --- |
| Frontend | **Next.js 15 (App Router) + React 19 + TypeScript** | Tek projede hem arayüz hem API; sunucu bileşenleriyle hızlı ilk yükleme; tek komutla deploy. |
| Stil | **Tailwind CSS v4** | Açık temalı, tutarlı ve responsive tasarım sistemi; ek CSS dosyası/derleme karmaşası yok. |
| Backend | **Next.js Route Handlers (Node.js runtime)** | Ayrı bir sunucu projesi gerekmez; oyun/düello mantığı sunucuda çalışır. |
| Veritabanı | **SQLite (WAL) + Drizzle ORM** | Sıfır kurulum, tek dosya, kolay yedekleme. Hedeflenen 30–100 eşzamanlı kullanıcı için fazlasıyla yeterli. Drizzle saf TypeScript'tir; tip güvenliği sorgulara yansır. |
| Kimlik doğrulama | **bcrypt + imzalı (JWT) httpOnly çerez + veritabanı oturumu** | Harici servis/bedel yok; oturum veritabanında tutulduğu için anında iptal edilebilir. |
| Gerçek zamanlı | **Server-Sent Events (SSE)** | Ek port/servis gerektirmez, serverless dahil her yerde çalışır, tek yönlü bildirim akışı için ideal. Düelloda ayrıca yedek yoklama vardır. |
| İkon/görsel | **Elle çizilmiş SVG + lucide-react** | Tüm görseller vektörel; **hiçbir yerde klavye emojisi kullanılmaz.** |

### Neden SQLite?

- Öngörülen eşzamanlı kullanıcı sayısı ~30 (100'e kadar rahat çıkar).
- Kurulum, kullanıcı/parola yönetimi, bağlantı havuzu derdi yok.
- Yedekleme = `data/matematik.db` dosyasını kopyalamak.
- İleride büyürse: Drizzle şeması `drizzle-orm/pg-core`'a taşınarak PostgreSQL'e geçilir; uygulama kodu aynı kalır.

---

## 2. Dosya / Klasör Yapısı

```
matematik-macerasi/
├── drizzle/                       # Otomatik üretilen SQL migration'ları
├── data/                          # SQLite veritabanı dosyası (çalışma anında oluşur)
├── public/                        # Statik dosyalar (uygulama ikonu)
├── scripts/
│   ├── selftest.ts                # Uçtan uca otomatik test paketi
│   ├── screenshots.mjs            # Arayüz ekran görüntüsü aracı
│   └── seed-demo.ts               # İsteğe bağlı demo hesapları
└── src/
    ├── app/
    │   ├── (auth)/                # Giriş / kayıt (görsel panelli düzen)
    │   ├── (app)/                 # Öğrenci uygulaması (kenar menü + üst bar)
    │   │   ├── panel/             # Ana sayfa (dashboard)
    │   │   ├── oyunlar/           # Matematik haritası
    │   │   ├── oyna/[gameKey]/    # Oyun oynatıcı
    │   │   ├── duello/            # Düello arenası + [id] arena ekranı
    │   │   ├── arkadaslar/  gorevler/  basarimlar/
    │   │   ├── siralamalar/  lig/  magaza/  profil/  ayarlar/
    │   ├── hocaefendi/            # Yönetici paneli (ayrı düzen)
    │   └── api/                   # Tüm REST uçları + SSE
    ├── components/
    │   ├── app/                   # Kabuk, oturum sağlayıcı, logo
    │   ├── admin/                 # Yönetici kabuğu
    │   ├── game/                  # Oyun oynatıcı + tüm oyun tahtaları
    │   ├── profile/               # Profil görünümü
    │   ├── visuals/               # Avatar, lig rozeti, ikon seti, sahneler (SVG)
    │   └── ui.tsx                 # Buton, kart, alan, modal, ilerleme çubuğu
    └── lib/
        ├── db/                    # Drizzle şeması + bağlantı
        ├── games/                 # Soru üreticileri + oyun motoru
        ├── catalog/               # Başarım, görev ve mağaza katalogları
        ├── auth/                  # Şifre ve oturum yönetimi
        ├── constants.ts           # Ligler, XP eğrisi, oyun kataloğu, harita
        ├── duels.ts  progress.ts  tasks.ts  social.ts  leaderboards.ts
        ├── usernames.ts  moderation.ts  admin.ts  shop.ts  profiles.ts
        └── realtime.ts  notifications.ts  summary.ts  boot.ts
```

---

## 3. Veritabanı Şeması

`src/lib/db/schema.ts` (24 tablo)

| Tablo | Amaç |
| --- | --- |
| `roles`, `users`, `auth_sessions` | Kimlik, rol, oturum |
| `profiles` | XP, level, toplam puan, jeton, lig puanı, düello ve oyun istatistikleri |
| `game_sessions`, `game_questions`, `game_results`, `game_records` | Oyun motoru ve rekorlar |
| `achievements`, `user_achievements` | Başarım sistemi |
| `daily_tasks`, `user_daily_tasks` | Günlük görevler |
| `duels`, `duel_players`, `duel_answers` | Düello, skor ve hile denetim kaydı |
| `league_seasons`, `league_point_events` | Lig ve sezon altyapısı |
| `friendships`, `notifications` | Sosyal katman |
| `shop_items`, `user_items` | Mağaza |
| `banned_words`, `reserved_usernames`, `admin_actions`, `system_settings` | Moderasyon ve yönetim |

**Puan türleri kesinlikle ayrıdır:**

| Değer | Nereden gelir | Nereyi etkiler |
| --- | --- | --- |
| `profiles.xp` / `level` | Tek kişilik oyunlar, görevler, başarımlar | Seviye ilerlemesi |
| `profiles.totalPoints` | Tek kişilik oyunlar | **Global Puan Sıralaması** |
| `profiles.leaguePoints` / `leagueKey` | **Yalnızca düellolar** | **Global Lig Sıralaması** |
| `game_records` | Her oyun + varyant | Kişisel rekorlar |

---

## 4. Kullanıcı Rolleri

| Rol | Yetkiler |
| --- | --- |
| **ÖĞRENCİ** | Oyun oynar, düello yapar, arkadaş ekler, mağazadan alışveriş yapar. Puanını/ligini **gizleyemez**. |
| **HOCAEFENDİ** | Öğrencileri **yalnızca izler** (view-only). Kullanıcı adı düzenler, yasaklı kelime ve rezerve ad yönetir, hesabı devre dışı bırakır, sistem ayarlarını değiştirir. Düello yapabilir, lig puanı kazanır/kaybeder ama **global sıralamalarda asla görünmez**. Öğrenciler onun çevrimiçi durumunu göremez. |

---

## 5. API Yapısı

| Uç | Metot | Açıklama |
| --- | --- | --- |
| `/api/auth/register` `/login` `/logout` | POST | Kimlik doğrulama |
| `/api/me` | GET | Oturum özeti (profil, görevler, arkadaşlar, sıralar) |
| `/api/games` | GET | Oyun kataloğu + rekorlar |
| `/api/games/prepare` | POST | Tırmanma oyunlarında 4 başlangıç seçeneği |
| `/api/games/start` | POST | Oturum açar, ilk soruyu döner |
| `/api/games/[id]` | GET | Geçerli soru |
| `/api/games/[id]/answer` | POST | **Sunucu taraflı** cevap doğrulama ve puanlama |
| `/api/games/[id]/finish` | POST | Oyunu bitir, ödülleri dağıt |
| `/api/duels` | GET/POST | Davetler, geçmiş, istatistik / yeni düello |
| `/api/duels/[id]` | GET | Canlı düello durumu |
| `/api/duels/[id]/action` | POST | kabul / red / iptal / cevap / çekilme |
| `/api/friends` | GET/POST | Arkadaşlar, istekler, çevrimiçi liste |
| `/api/users/search` `/api/users/[username]` | GET | Arama ve herkese açık profil |
| `/api/notifications` | GET/POST | Bildirimler ve okundu işaretleme |
| `/api/leaderboards?type=points\|league` | GET | Global sıralamalar (Hocaefendi hariç) |
| `/api/tasks` | GET | Günlük görevler |
| `/api/shop` | GET/POST | Mağaza, satın alma, kuşanma |
| `/api/settings` | PATCH | Kullanıcı adı, şifre, görünürlük |
| `/api/events` | GET (SSE) | Gerçek zamanlı bildirim ve düello akışı |
| `/api/admin/*` | GET/POST/PATCH | Yönetici uçları (403 ile korunur) |

---

## 6. Güvenlik Modeli

- **İstemciye asla güvenilmez.** Puan, XP, lig puanı ve oyun/düello sonucu istemciden kabul edilmez; sunucuda hesaplanır.
- Doğru cevap indeksleri veritabanında tutulur, soruyla birlikte **istemciye gönderilmez**.
- Her cevap için soru indeksi, seçilen şık, doğruluk, geçen süre ve **sunucu zaman damgası** kaydedilir.
- Aynı soru iki kez cevaplanamaz; sıra dışı soru indeksi reddedilir (409).
- Oyun süresi sunucu saatiyle denetlenir; süre dolduysa oturum otomatik kapanır.
- Şifreler `bcrypt` ile saklanır; oturumlar imzalı httpOnly çerez + veritabanı kaydı ile doğrulanır ve anında iptal edilebilir.
- Hocaefendi yetkileri **sunucu tarafında** doğrulanır (`requireAdmin`), arayüzde gizleme ile yetinilmez.
- Öğrenci hesapları admin uçlarına eriştiğinde **403** alır; yasaklı kelime listesi öğrenciye asla dönmez.

### Kullanıcı adı moderasyonu

Filtre, kanonik biçim üzerinden çalışır:

`küçük harf (Türkçe duyarlı) → homoglif eşleme (0→o, 1→i, 3→e, @→a, Kiril/Yunan) → aksan temizliği → yalnızca a-z0-9 → ardışık harf tekrarlarını sadeleştirme`

Böylece `APTAL`, `4pt4l`, `а&#1088;taI`, `aappttaall` gibi varyasyonlar da yakalanır.
Öğrenci **yalnızca** *"Bu kullanıcı adı uygun değil."* mesajını görür; hangi kelimenin yasaklı olduğu bilgisi sızmaz.
Hocaefendi bir adı değiştirdiğinde **eski ad rezerve edilir** ve bir daha kimse tarafından alınamaz.

---

## 7. Oyun Motoru

Sunucu, oyun başlarken tüm soruları üretip veritabanına yazar. İstemciye yalnızca soru metni, şıklar ve görsel veri gider.

| Oyun | Süre | Soru | Doğru | Yanlış |
| --- | --- | --- | --- | --- |
| Bulut Tırmanışı (1 basamaklı ileri, 2–9) | 75 sn | 20 | +adım | −2×adım |
| Yüksek Tırmanış (2 basamaklı ileri, 15/25/35/45) | 90 sn | 20 | +adım | −2×adım |
| İniş Yolu (1 basamaklı geri, 2–9) | 75 sn | 20 | +adım | −2×adım |
| Derin İniş (2 basamaklı geri, 15/25/35/45) | 90 sn | 20 | +adım | −2×adım |
| Çarpım Dağı (1–9, 45 benzersiz işlem) | 55 sn | 45 | +5 | −5 |
| Hızlı İşlem | 60 sn | 30 | +6 | −6 |
| Eksik Sayıyı Bul | 60 sn | 20 | +7 | −7 |
| Sayı Dizisi | 60 sn | 15 | +8 | −8 |
| İşlem Eşleştirme | 70 sn | 16 (4 grup) | +10 | −5 |
| Hedefi Vur | 60 sn | 20 | +7 | −7 |
| Matematik Parkuru | 75 sn | 25 | +6 | −6 |
| Matematik Marketi | 90 sn | 15 | +10 | −8 |
| Matematik Bankası | 90 sn | 15 | +10 | −8 |
| Boss Savaşı (Level 5) | 120 sn | 25 | +9 | −9 |

Kurallar:

- **Puan asla 0'ın altına düşmez.**
- **Süre bonusu:** kalan saniye puana eklenir — yalnızca tüm sorular bitirildiğinde (erken çıkışta verilmez, istismarı önler).
- **Yanlış cevapta:** ekran sarsılır, kısa kırmızı efekt verilir, karakter 3 basamak aşağı iner.
- **Oyunu Bitir:** öğrenci istediği an bırakabilir; o ana kadarki puan **kaybolmaz**.
- Süre biterse oyun otomatik sona erer ve o anki puan kaydedilir.
- **Ritmik sayma:** başlangıç sayısı 4 seçenek olarak sunulur; ileri saymada başlangıç asla ritmik sayıya eşit olmaz. Geriye saymada başlangıç `adım × 20 + (0–9)` olarak seçilir; böylece 20 sorunun hiçbirinde **negatif sonuç oluşmaz** ve son sonuç 10'un altında kalır.
- **Çarpım tablosu:** 6×5 sorulduysa 5×6 tekrar sorulmaz; her oyunda sıra rastgeledir, aynı soru iki kez gelmez.

---

## 8. Düello Mimarisi

1. Öğrenci rakip seçer ve türü belirler: **Puan Takaslı** veya **Takassız**.
2. Rakip kabul ettiğinde sunucu **10 soruyu tek seferde üretir**; iki oyuncuya **aynı sorular aynı sırayla** gösterilir.
3. Skor sunucuda hesaplanır: doğru **+10**, hız bonusu **+0…5** (2 sn'den hızlı cevaplar tam bonus).
4. Her iki oyuncu bitirdiğinde ya da süre dolduğunda düello sonuçlanır.
   Kazanan: yüksek skor → eşitse doğru sayısı → eşitse toplam süre → hepsi eşitse **beraberlik**.
5. **Puan Takaslı:** kazanan `12–60` arası lig puanı kazanır, kaybeden **aynı miktarı** kaybeder. Puan **0'ın altına düşmez** (5 puanı olan 20 puan kaybetse 0'da kalır).
6. **Takassız:** lig puanları değişmez; sonuç ve istatistikler yine işlenir.
7. Galibiyet serisi takip edilir; kaybedince sıfırlanır, en uzun seri ayrıca saklanır.

Gerçek zamanlılık: SSE (`/api/events?duel=<id>`) + 2,5 sn'lik yedek yoklama.

---

## 9. Lig Sistemi

| Lig | Aralık |
| --- | --- |
| Pirinç | 0 – 249 |
| Tuğla | 250 – 499 |
| Bronz | 500 – 999 |
| Gümüş | 1.000 – 1.999 |
| Altın | 2.000 – 2.999 |
| Elmas | 3.000 – 4.499 |
| Taç | 4.500 – 6.999 |
| Şampiyon Ligi | 7.000+ |

Lig puanı yalnızca düellolardan değişir; yükselme/düşme otomatiktir ve bildirim üretir. `league_seasons` tablosu sezon sistemi için hazırdır (ilk sürümde tek aktif sezon açıktır).

## 10. XP / Level Sistemi

- `L → L+1` için gereken XP: `200 + 150 × L` (Level 12 → 2.000 XP).
- XP kaynakları: doğru cevaplar, oyun tamamlama bonusu, hatasız oyun bonusu, süre bonusu, günlük görevler, başarımlar.
- XP ve level **düellolardan etkilenmez**.

## 11. Bildirim Sistemi

Uygulama içi bildirimler (zil menüsü + anlık bildirim baloncuğu): arkadaş çevrimiçi oldu, arkadaşlık isteği/kabulü, düello daveti/sonucu, yeni başarım, lig yükselme/düşme, seviye atlama, günlük görev, yeni rekor, yönetici işlemleri.

## 12. Hocaefendi Paneli

`/hocaefendi` altında: Dashboard · Öğrenciler · Öğrenci profili · Oyun İstatistikleri · Düellolar · Moderasyon (yasaklı kelimeler + rezerve adlar) · Sistem Ayarları · denetim kaydı.

Hocaefendi **oyunlara müdahale edemez**; puan/XP değiştiremez. Panelde yalnızca moderasyon ve ayar yazma yetkisi vardır.

---

## 13. Kendi Kendine Test

```bash
npm run build && npm run start     # bir terminalde
npm run selftest                   # başka bir terminalde
```

126 kontrol; kapsam:

authentication · kayıt kuralları · yasaklı kelime varyasyonları · oturum güvenliği · profil ·
oyun motoru (puan formülü birebir doğrulanır) · negatif sonuç üretilmemesi · benzersiz çarpım tablosu ·
süre bonusu kuralları · erken çıkışta puan koruma · XP/level · günlük görevler · başarımlar ·
düello (takaslı + takassız) · lig puanı 0 tabanı · düello serisi · sıralamalar · Hocaefendi'nin
sıralamalarda ve çevrimiçi listesinde görünmemesi · arkadaşlık · bildirimler · admin yetkilendirmesi ·
kullanıcı adı moderasyonu ve rezervasyonu · mağaza · hile denemeleri (çift cevap, sıra dışı soru,
başkasının oturumu, seviye kilidi).

---

## 14. Responsive Tasarım

Masaüstü (kenar menü), tablet ve telefon (üst bar + alt sekme menüsü) için ayrı düzenler. Oyun ekranları, düello arenası, sıralama tabloları ve yönetici tabloları mobilde dokunmatik kullanıma uygundur. Tasarım baştan itibaren açık temalıdır; koyu arka plan yalnızca navigasyon ve vurgulu butonlarda kontrast için kullanılır.

## 15. Deploy

- **Vercel / Netlify:** doğrudan çalışır. SQLite dosyası kalıcı disk gerektirdiğinden, kalıcı veri için `DATABASE_URL`'i kalıcı bir birime yönlendirin veya PostgreSQL'e geçin.
- **VPS / Raspberry Pi / okul sunucusu (önerilen):**
  ```bash
  npm ci && npm run build && npm run start
  ```
  `data/matematik.db` dosyasını düzenli yedekleyin.
- Ortam değişkenleri: `.env.example` dosyasına bakın.
