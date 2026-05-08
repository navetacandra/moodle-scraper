# moodle-scraper

Pustaka TypeScript untuk melakukan scraping dan interaksi dengan platform Moodle. Proyek ini diekstraksi dari proyek PNJ untuk menyediakan cara yang mudah dalam mengakses data kursus dan manajemen sesi Moodle.

## Keunggulan

- Otentikasi Mudah: Mendukung login dengan username dan password serta manajemen session cookie secara otomatis.
- Manajemen Kursus: Memungkinkan pengambilan daftar kursus yang diikuti (enrolled courses) dengan detail lengkap.
- Pencarian Kursus: Dilengkapi dengan fungsi pencarian kursus di seluruh platform.
- Berbasis TypeScript: Memberikan dukungan tipe data yang kuat untuk pengembangan yang lebih aman dan terstruktur.

## Instalasi

Pastikan Anda telah menginstal Node.js dan npm di sistem Anda.

```bash
npm install
```

Untuk membangun proyek dari sumber:

```bash
npm run build
```

## Penggunaan

Berikut adalah contoh dasar cara menggunakan `MoodleClient` untuk melakukan login dan mengambil daftar kursus:

```typescript
import { MoodleClient } from './src';

async function main() {
  const client = new MoodleClient('https://moodle.example.com');

  try {
    // Login ke platform Moodle
    const auth = await client.login('your_username', 'your_password');
    console.log('Login berhasil');

    // Mengambil daftar kursus yang diikuti
    const courses = await client.courses.list();
    
    courses.forEach((course) => {
      console.log(`Nama Kursus: ${course.name}`);
      console.log(`Kategori: ${course.category}`);
    });
  } catch (error) {
    console.error('Terjadi kesalahan:', error);
  }
}

main();
```
