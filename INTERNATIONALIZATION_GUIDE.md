# Panduan Internasionalisasi (i18n) GMS

## Pengenalan

Sistem GMS sekarang mendukung dua bahasa:
- **Bahasa Indonesia** (default) 
- **Bahasa Inggris**

Sistem menggunakan `react-i18next` untuk mengelola terjemahan.

## Struktur File i18n

File utama terjemahan: `front/src/lib/i18n.js`

```javascript
const resources = {
  en: {
    translation: {
      // Terjemahan bahasa Inggris
    }
  },
  id: {
    translation: {
      // Terjemahan bahasa Indonesia
    }
  }
};
```

## Cara Menggunakan i18n dalam Komponen

### 1. Import Hook

```javascript
import { useTranslation } from "react-i18next";
```

### 2. Inisialisasi Hook

```javascript
const MyComponent = () => {
  const { t } = useTranslation();
  
  return (
    <div>
      <h1>{t('todos.title')}</h1>
      <p>{t('todos.subtitle')}</p>
    </div>
  );
};
```

### 3. Contoh Penggunaan

#### Teks Sederhana
```javascript
<h1>{t('dashboard.title')}</h1>
<button>{t('common.save')}</button>
```

#### Placeholder Input
```javascript
<input 
  placeholder={t('todos.searchTodos')}
  value={searchTerm}
  onChange={(e) => setSearchTerm(e.target.value)}
/>
```

#### Conditional Text
```javascript
<span>
  {editingUser ? t('users.editUser') : t('users.createUser')}
</span>
```

## Hook Khusus: useTranslatedLabels

Untuk label yang sering digunakan (status, priority, dll), gunakan hook khusus:

```javascript
import { useTranslatedLabels } from "../hooks/useTranslatedLabels";

const MyComponent = () => {
  const { formatStatusLabel, formatPriorityLabel } = useTranslatedLabels();
  
  return (
    <span>{formatStatusLabel("pending")}</span>  // Output: "Menunggu"
  );
};
```

## Struktur Terjemahan

### Common (Umum)
```javascript
common: {
  search: "Cari",
  filter: "Filter", 
  save: "Simpan",
  cancel: "Batal",
  delete: "Hapus",
  // ...
}
```

### Todos (Tugas)
```javascript
todos: {
  title: "Manajemen Tugas",
  subtitle: "Pantau dan kelola semua tugas karyawan",
  createNew: "Buat Tugas Baru",
  // ...
}
```

### Users (Pengguna)
```javascript
users: {
  title: "Manajemen Karyawan",
  subtitle: "Kelola karyawan dan peran mereka",
  addNewUser: "Tambah Pengguna Baru",
  // ...
}
```

### Meetings (Rapat)
```javascript
meetings: {
  title: "Manajemen Rapat",
  subtitle: "Pantau dan kelola semua rapat",
  // ...
}
```

### Assets (Aset)
```javascript
assets: {
  title: "Manajemen Aset",
  subtitle: "Kelola aset dan peralatan perusahaan",
  // ...
}
```

### Requests (Permintaan)
```javascript
requests: {
  title: "Manajemen Permintaan",
  subtitle: "Kirim dan pantau permintaan Anda",
  // ...
}
```

## Menambah Terjemahan Baru

### 1. Tambahkan ke file i18n.js

```javascript
// Bahasa Indonesia
id: {
  translation: {
    myModule: {
      newText: "Teks Baru",
      anotherText: "Teks Lainnya"
    }
  }
}

// Bahasa Inggris  
en: {
  translation: {
    myModule: {
      newText: "New Text",
      anotherText: "Another Text"
    }
  }
}
```

### 2. Gunakan dalam komponen

```javascript
const MyComponent = () => {
  const { t } = useTranslation();
  
  return (
    <div>
      <h1>{t('myModule.newText')}</h1>
      <p>{t('myModule.anotherText')}</p>
    </div>
  );
};
```

## Status Label yang Tersedia

Hook `useTranslatedLabels` menyediakan fungsi untuk format label:

### formatStatusLabel(status)
- `not_started` → "Belum Dimulai"
- `in_progress` → "Sedang Berlangsung" 
- `completed` → "Selesai"
- `pending` → "Menunggu"
- `approved` → "Disetujui"
- `rejected` → "Ditolak"
- Dan lainnya...

### formatPriorityLabel(priority)
- `high` → "Tinggi"
- `medium` → "Sedang"
- `low` → "Rendah"

### formatRoleLabel(role)
- `admin` → "Admin"
- `user` → "Karyawan"
- `procurement` → "Pengadaan"

### formatCategoryLabel(category)
- `general` → "Umum"
- `equipment` → "Peralatan"
- `maintenance` → "Pemeliharaan"
- Dan lainnya...

## Mengganti Bahasa

Bahasa disimpan di localStorage dan akan diingat saat user reload halaman.

```javascript
// Untuk mengganti bahasa programmatically
import i18n from '../lib/i18n';

i18n.changeLanguage('id'); // Bahasa Indonesia
i18n.changeLanguage('en'); // Bahasa Inggris
```

## Best Practices

### 1. Gunakan namespace yang jelas
```javascript
// ✅ Baik
t('todos.createNew')
t('users.addNewUser')

// ❌ Buruk  
t('create')
t('add')
```

### 2. Gunakan hook useTranslatedLabels untuk label standar
```javascript
// ✅ Baik
const { formatStatusLabel } = useTranslatedLabels();
formatStatusLabel(status)

// ❌ Buruk - hardcode
status === 'pending' ? 'Menunggu' : 'Lainnya'
```

### 3. Konsisten dengan penamaan key
```javascript
// ✅ Baik - konsisten
todos: {
  title: "...",
  subtitle: "...",
  createNew: "..."
}

// ❌ Buruk - tidak konsisten
todos: {
  pageTitle: "...", 
  desc: "...",
  newButton: "..."
}
```

### 4. Gunakan placeholder yang jelas
```javascript
// ✅ Baik
placeholder={t('todos.searchTodos')}

// ❌ Buruk
placeholder="Cari..."
```

## Contoh Implementasi Lengkap

```javascript
import React, { useState } from "react";
import { useTranslation } from "react-i18next";
import { useTranslatedLabels } from "../hooks/useTranslatedLabels";

const TodoComponent = () => {
  const { t } = useTranslation();
  const { formatStatusLabel, formatPriorityLabel } = useTranslatedLabels();
  const [todos, setTodos] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold">{t('todos.title')}</h1>
        <p className="text-gray-600">{t('todos.subtitle')}</p>
      </div>

      {/* Search */}
      <div>
        <input
          type="text"
          placeholder={t('todos.searchTodos')}
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full p-2 border rounded"
        />
      </div>

      {/* Create Button */}
      <button className="btn-primary">
        {t('todos.createNew')}
      </button>

      {/* Todo List */}
      <div className="space-y-2">
        {todos.map(todo => (
          <div key={todo.id} className="p-4 border rounded">
            <h3>{todo.title}</h3>
            <div className="flex gap-2 mt-2">
              <span className="badge">
                {formatStatusLabel(todo.status)}
              </span>
              <span className="badge">
                {formatPriorityLabel(todo.priority)}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default TodoComponent;
```

## Debugging

Jika terjemahan tidak muncul:

1. **Periksa key terjemahan**
   ```javascript
   console.log(t('todos.title')); // Debug output
   ```

2. **Periksa bahasa aktif**
   ```javascript
   import i18n from '../lib/i18n';
   console.log(i18n.language); // 'id' atau 'en'
   ```

3. **Periksa file i18n.js** - pastikan key ada di kedua bahasa

4. **Periksa import** - pastikan sudah import useTranslation dengan benar

## Kesimpulan

Dengan sistem i18n ini, semua teks dalam aplikasi GMS dapat dengan mudah diterjemahkan ke bahasa Indonesia dan Inggris. Sistem ini memungkinkan:

- ✅ Terjemahan otomatis berdasarkan preferensi user
- ✅ Manajemen terjemahan terpusat
- ✅ Hook khusus untuk label yang sering digunakan  
- ✅ Mudah menambah bahasa baru di masa depan
- ✅ Performa yang baik dengan lazy loading

Selamat menggunakan sistem internasionalisasi GMS! 🎉





