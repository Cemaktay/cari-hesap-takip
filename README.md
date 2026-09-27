# Cari Hesap Takip Programı — kişiye özel kurulum şablonu

Bu paket, programın **kaynak kodudur**. Kullanıcı verisi, mevcut sitenin veritabanı veya giriş bilgileri içermez. Her kurulum kendi Cloudflare Worker sitesini ve ayrı, başlangıçta boş D1 veritabanını kullanır.

## Kurulum bağlantısı hazırlama

1. Paketin içeriğini **herkese açık** bir GitHub veya GitLab deposuna yükleyin. `.dev.vars` dosyasını, veritabanı dosyalarını ve `node_modules` klasörünü yüklemeyin. Paket bunları içermez.
2. Dağıtım bağlantısı şu biçimdedir: `https://deploy.workers.cloudflare.com/?url=https://github.com/HESAP/DEPO` (depo adresini değiştirin). Bağlantıyı kullanıcılarla paylaşın.
3. Kullanıcı kendi GitHub/GitLab ve Cloudflare hesaplarıyla devam eder; Worker/site ve D1 veritabanına isim verir. Cloudflare bu veritabanını **o kullanıcının hesabında** oluşturur.
4. Kurulum ekranındaki `SETUP_KEY` gizli değişkenine benzersiz ve en az 24 karakterli rastgele bir anahtar girer. Örnek üretim: `openssl rand -hex 32`. Anahtarı başkalarına vermemelidir.
5. Dağıtım tamamlandığında kendi `*.workers.dev` adresinde `/kurulum/` sayfasını açar. Aynı kurulum anahtarını girip kendine ait kullanıcı adı ve en az 12 karakterli şifre belirler.
6. Başlangıçta cari kartları, ürün/hizmet kartları ve hareketler **boştur**. Başka kurulumların verileri görünmez.

> Cloudflare düğmesi birkaç onay adımı içerir; hesapsız tek tıklama değildir. Kişisel `.com` alan adı ayrıca edinilir. Ücretsiz plan kullanım sınırları Cloudflare hesabına uygulanır.

## Yerel geliştirme

Node.js 22.13+ ve pnpm 11 gerekir.

```bash
pnpm install --frozen-lockfile
cp .dev.vars.example .dev.vars
# .dev.vars içindeki SETUP_KEY değerini benzersiz bir anahtarla değiştirin.
pnpm run db:migrations:local
pnpm dev
```

Dağıtım için `pnpm build` ve `pnpm deploy` kullanılır. `deploy` komutu D1 migrasyonlarını uygular ve Worker'ı yayımlar. Cloudflare'ın kurulum düğmesi `build`/`deploy` komutlarını otomatik önerir; kurulum sırasında bunları koruyun.

## Güvenlik ve bakım

- Pakette `Admin / Admin` varsayılan hesabı yoktur. İlk hesap yalnızca kurulum anahtarıyla oluşturulur; kurulum bitince yeni bir ilk hesap açılamaz.
- Her kurulum ayrı Cloudflare hesabı ve veritabanıyla ayrılır. Site adresi başkalarınca ziyaret edilebilir ama kayıtlar giriş gerektirir.
- Kurulum anahtarını ve şifrenizi güvenli saklayın. Bu sürümde otomatik şifre kurtarma veya düzenli yedekleme yoktur.
- Güncelleme için kullanıcı deposundaki kaynak kodunu yeni sürümle eşleştirmek ve yeniden dağıtmak gerekir. Var olan veritabanı güncelleme sırasında silinmemelidir.

Bu ZIP, **yayına hazır kaynak şablonudur**; GitHub/GitLab'a yayımlanıp gerçek bir Cloudflare hesabında uçtan uca dağıtımı ayrıca doğrulanmadan genel kurulum bağlantısı sayılmamalıdır.
