# Tabbycat Deployment Guide for muhittab.com

Bu rehber, projenizi VDS sunucunuzda (Ubuntu/Linux) Docker kullanarak nasıl yayına alacağınızı adım adım anlatır.

## 1. Sunucu Hazırlığı (VDS)

Sunucunuza SSH ile bağlandıktan sonra aşağıdaki komutlarla sistemi güncelleyin ve Docker'ı kurun:

```bash
# Sistemi güncelle
sudo apt-get update
sudo apt-get upgrade -y

# Docker kurulumu
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh

# Docker Compose kurulumu (Docker ile birlikte gelmediyse)
sudo apt-get install -y docker-compose-plugin
# veya eski versiyon için: sudo apt-get install docker-compose

# Docker servisini başlat
sudo systemctl start docker
sudo systemctl enable docker
```

## 2. Projeyi Sunucuya Aktarma

Projeyi sunucuya aktarmanın en kolay yolu Git kullanmaktır. Eğer proje GitHub/GitLab üzerindeyse:

```bash
git clone <REPO_ADRESINIZ> tabbycat
cd tabbycat
```

Eğer Git kullanmıyorsanız, dosyaları FTP (FileZilla) veya SCP ile sunucuya yükleyebilirsiniz.

## 3. Yapılandırma

Proje dizininde `.env` dosyası oluşturmanız gerekebilir, ancak mevcut `docker-compose.yml` dosyanızda environment değişkenleri zaten tanımlı.

**Önemli:** `tabbycat/settings/docker.py` dosyasına `muhittab.com` adresini ekledik, bu yüzden CSRF hatası almayacaksınız.

## 4. Uygulamayı Başlatma

Proje dizinindeyken aşağıdaki komutla uygulamayı başlatın:

```bash
# Production modunda başlat
docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d --build
```

Bu komut veritabanını, Redis'i ve web sunucusunu (port 8000'de) başlatacaktır.

## 5. Domain ve SSL Kurulumu (Nginx)

Sunucunuzda (Docker dışında) Nginx kurarak gelen istekleri Docker'a yönlendireceğiz ve SSL (HTTPS) sertifikası alacağız.

### Nginx Kurulumu
```bash
sudo apt-get install -y nginx certbot python3-certbot-nginx
```

### Nginx Yapılandırması
Proje içindeki `production_nginx.conf` dosyasını `/etc/nginx/sites-available/muhittab` konumuna kopyalayın:

```bash
# Dosyayı kopyala (proje dizininde olduğunuzu varsayıyoruz)
sudo cp production_nginx.conf /etc/nginx/sites-available/muhittab

# Siteyi aktif et
sudo ln -s /etc/nginx/sites-available/muhittab /etc/nginx/sites-enabled/
sudo rm /etc/nginx/sites-enabled/default

# Nginx'i test et ve yeniden başlat
sudo nginx -t
sudo systemctl restart nginx
```

Artık `http://muhittab.com` adresine girdiğinizde siteniz açılmalı.

### SSL (HTTPS) Sertifikası Alma (LetsEncrypt)
Ücretsiz SSL sertifikası için şu komutu çalıştırın ve talimatları izleyin:

```bash
sudo certbot --nginx -d muhittab.com -d www.muhittab.com
```

Certbot, Nginx ayarlarınızı otomatik olarak güncelleyerek HTTPS'i aktif edecektir.

## 6. Yönetici Hesabı Oluşturma

Siteniz çalışıyor ancak giriş yapmak için bir yönetici hesabına ihtiyacınız var.

```bash
# Çalışan web konteynerinin ID'sini bulun
docker ps

# Konteyner içinde komut çalıştırarak superuser oluşturun
# (tabbycat-web-1 konteyner adınızın varsayılan hali olabilir)
docker exec -it tabbycat-web-1 /code/manage.py createsuperuser
```

Bilgileri girerek yönetici hesabınızı oluşturun.

## Sorun Giderme

Eğer hata alırsanız logları kontrol edin:
```bash
docker compose logs -f web
```
