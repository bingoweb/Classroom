# Classroom Profesyonel Geliştirme Araç Zinciri

**Son doğrulama:** 11 Ağustos 2026
**Platform:** macOS 26.6.1 / Apple Silicon
**Proje Node.js:** NVM `v22.23.1`
**Kapsam:** geliştirme, analiz, refactor, kalite ve güvenlik; Classroom runtime dependency sözleşmesi değildir.

Bu belge Classroom üzerinde kod yazarken kullanılabilecek yerel profesyonel geliştirme araçlarını tanımlar. Araçların amacı uygulamaya yeni runtime bağımlılıkları eklemek değil; kaynak kodu daha güvenli, ölçülebilir ve kontrollü biçimde incelemek, dönüştürmek ve doğrulamaktır.

## Bağlayıcı kurallar

- Geliştirme aracını sırf kullanabilmek için `package.json` içine runtime dependency ekleme.
- Bir analiz aracı yalnız uyarı verdi diye toplu otomatik rewrite yapma; önce bulguyu kaynak kod ve testlerle doğrula.
- AST tabanlı dönüşümlerde `ast-grep` tercih edilir; regex yalnız yapı bağımsız metin aramasında kullanılır.
- Biome şu anda repo çapında zorunlu formatter/linter rejimi değildir. Mevcut kod stilini topluca değiştirme; hedefli analiz/format doğrulaması için kullan.
- `scc` varken aynı amaçla `cloc` ayrıca kurulmaz.
- Browser performans ve runtime kabulünde Playwright MCP + Chrome DevTools MCP birincil araçlardır; CLI benchmark yalnız tamamlayıcıdır.
- Node bağımlılık güvenliğinde repo içindeki authoritative kapılar `npm audit --omit=dev` ve mevcut dependency regression testleridir.
- Global geliştirme CLI'larının transitive npm bağımlılıkları Classroom runtime paket ağacına dahil değildir.

## Kurulu ve doğrulanmış araçlar

| Araç | Sürüm | Ana kullanım |
|---|---:|---|
| Semgrep | 1.172.0 | statik analiz, bug/security pattern taraması, anti-pattern doğrulama |
| ast-grep | 0.45.1 | AST tabanlı kod arama, structural match ve kontrollü refactor |
| ripgrep | 15.2.0 | çok hızlı literal/regex kaynak araması |
| fd | 10.4.2 | hızlı dosya keşfi ve scoped file-set üretimi |
| jq | 1.8.2 | JSON sorgulama/dönüştürme |
| yq | 4.53.3 | YAML/JSON yapı sorgulama ve pipeline işlemleri |
| Biome | 2.5.8 | JS/CSS/JSON parse, format ve lint; şu anda opt-in analiz aracı |
| jscpd | 5.0.14 | copy/paste ve duplicate-code tespiti |
| lizard-analyzer | 1.23.0 | cyclomatic complexity ve karmaşıklık hotspot analizi |
| scc | 3.7.0 | hızlı dil/LOC/complexity envanteri |
| universal-ctags | 6.2.1 | symbol/tag indeksi, büyük kaynak ağaçlarında navigasyon |
| Graphviz | 15.1.1 | dependency/flow/architecture graph üretimi |
| hyperfine | 1.20.0 | tekrarlanabilir CLI benchmark karşılaştırması |
| ShellCheck | 0.11.0 | shell script statik analizi |
| shfmt | 3.13.1 | shell script format/doğrulama |
| codespell | 2.4.3 | kod, doküman ve config typo taraması |
| Gitleaks | 8.30.1 | repository secret/credential sızıntısı taraması |
| actionlint | 1.7.12 | GitHub Actions workflow statik doğrulaması |

## Homebrew kurulum komutu

Eksik bir makinede geliştirme katmanını yeniden kurmak için:

```bash
brew install \
  semgrep ast-grep ripgrep fd jq yq hyperfine \
  shellcheck shfmt graphviz scc universal-ctags codespell \
  biome jscpd lizard-analyzer gitleaks actionlint
```

## Temel smoke doğrulamaları

Kurulumdan sonra en azından:

```bash
semgrep --version
ast-grep --version
biome --version
jscpd --version
lizard --version
gitleaks version
actionlint --version
scc --version
ctags --version
dot -V
shellcheck --version
shfmt --version
```

Gerçek smoke turunda 11 Ağustos 2026 tarihinde ayrıca şunlar doğrulandı:

- Semgrep JavaScript structural pattern buldu.
- `ast-grep run` JavaScript AST pattern buldu.
- `jq` ve `yq` sentetik JSON/YAML verisini doğru sorguladı.
- `fd` sentetik dosyayı buldu.
- `hyperfine` kısa benchmark çalıştırdı.
- ShellCheck temiz sentetik shell scriptini kabul etti.
- `shfmt -d` temiz scriptte fark üretmedi.
- Graphviz sentetik DOT grafiğini SVG'ye render etti.
- `scc` sentetik kaynak ağacını taradı.
- Universal Ctags executable/version doğrulaması geçti.
- codespell kasıtlı typo'yu yakaladı.
- Biome sentetik JavaScript'i `--write` ile formatladı.
- jscpd sentetik duplicate dosya setini işledi.
- lizard sentetik JavaScript karmaşıklık taramasını tamamladı.
- Gitleaks binary smoke geçti.
- actionlint sentetik GitHub Actions workflow'unu kabul etti.

## Hangi problemde hangi araç?

### Kaynak kodu hızlı bulma

- Dosya adı/path: `fd`
- Metin/regex: `rg`
- AST yapısı: `ast-grep`
- Symbol/tag indeksi: `ctags`

### Güvenli refactor / modernization

Öncelik sırası:

1. `ast-grep` ile structural eşleşmeyi kanıtla.
2. Gerekirse Semgrep kuralı ile anti-pattern kapsamını ölç.
3. Minimal rewrite uygula.
4. Hedef testleri ve komşu regression testlerini çalıştır.

Regex tabanlı kitlesel kod rewrite son seçenek olmalıdır.

### JS/CSS kalite ve stil

Biome güçlü bir parser/formatter/linter olarak kullanılabilir; ancak mevcut Classroom kod tabanına bugün otomatik bir repo-wide Biome config dayatılmamıştır. Büyük format churn üretmeden önce ayrı karar verilmelidir.

ESLint/Prettier bugün sırf toolchain'i büyütmek için proje bağımlılığı yapılmamıştır. Gelecekte kural seti gerçekten gerektirirse ayrı tasarım ve regression kapısı ile değerlendirilebilir.

### Duplicate / dead-code adayı / karmaşıklık

- duplicate bloklar: `jscpd`
- complexity hotspot: `lizard`
- dosya/dil/LOC envanteri: `scc`
- structural kullanım araması: `ast-grep` + `rg`
- Node dependency ağacı: `npm ls`, `npm explain`, `npm outdated`

Dead-code kararı tek bir scanner çıktısıyla verilmez. Özellikle `window.*`, HTML inline referansları veya dinamik route registration kullanan legacy yüzeylerde gerçek kullanım ayrıca aranmalıdır.

### Güvenlik

- code/security pattern: Semgrep
- yanlışlıkla commit edilmiş secret: Gitleaks
- package vulnerability: `npm audit --omit=dev`
- GitHub Actions syntax/semantics: actionlint
- shell güvenliği: ShellCheck

### Performans / profiling

- CLI benchmark: hyperfine
- Node CPU profiling: `node --prof`, `node --cpu-prof`
- browser runtime/layout/network/GPU: Chrome DevTools MCP
- gerçek browser davranışı ve regression: Playwright MCP

Classroom kiosk görsel kalitesinde performans optimizasyonu görsel doğruluğu bozacak biçimde yapılmaz.

## Bilinçli olarak eklenmeyen tekrarlar

- `cloc`: `scc` aynı envanter ihtiyacını daha hızlı karşıladığı için kurulmadı.
- repo-wide ESLint/Prettier dependency'si: mevcut kod stilini ve package yüzeyini gereksiz değiştirmemek için eklenmedi.
- birden fazla secret scanner: Gitleaks + Semgrep mevcut ihtiyaç için yeterli.
- ayrı generic dependency GUI/CLI'ları: npm'in kendi `ls/explain/outdated/audit` araçları authoritative kaldı.

## Node/Homebrew PATH notu

SVGO kurulumu Homebrew üzerinden `node 26.7.0` formülünü kendi bağımlılığı olarak kurmuştur. Classroom'ın aktif shell'i NVM üzerinden `v22.23.1` kullanmaktadır:

```text
/Users/bingoweb/.nvm/versions/node/v22.23.1/bin/node
```

Bu nedenle Homebrew Node 26 Classroom runtime'ını devralmamaktadır. Yeni oturumlarda Node engine sözleşmesi açısından `command -v node && node -v` kontrolü yapılabilir.
