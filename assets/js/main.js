// ============================================================
// FIREBASE CONFIG
// ============================================================
const firebaseConfig = {
    apiKey: "AIzaSyAvP3XWnECZe3wRyjQ4Hkxn45-_PSjOV9g",
    authDomain: "glow-beauty-8b15a.firebaseapp.com",
    databaseURL: "https://glow-beauty-8b15a-default-rtdb.asia-southeast1.firebasedatabase.app",
    projectId: "glow-beauty-8b15a",
    storageBucket: "glow-beauty-8b15a.firebasestorage.app",
    messagingSenderId: "704960864781",
    appId: "1:704960864781:web:bb3584e49e3bcd22746b44"
};

firebase.initializeApp(firebaseConfig);
const database = firebase.database();

// ============================================================
// KEY STORAGE
// ============================================================
const STORAGE_KEY = 'glowBeautyData';

// ============================================================
// DATA DEFAULT
// ============================================================
const defaultData = {
    categories: ['Skincare', 'Makeup', 'Body Care', 'Hair Care'],
    products: [],
    nextId: 1,
    testimonials: [],
    nextTestimonialId: 1,
    webSettings: {
        namaToko: 'GlowBeauty',
        heroTitle: 'Rawat Kulitmu <br/><span>Dengan Produk Terbaik</span>',
        heroDesc: 'Temukan rangkaian skincare dan kecantikan premium untuk kulit glowing dan sehat. Aman, halal, dan teruji dermatologis.',
        ctaTitle: '<i class="fas fa-heart" style="color:#f8bbd0;"></i> Siap Glowing?',
        ctaDesc: 'Konsultasikan kebutuhan kulitmu dan dapatkan rekomendasi produk terbaik!',
        whatsapp: '628179897500',
        heroImage: 'https://via.placeholder.com/500x400/d81b60/ffffff?text=Glow+Beauty'
    }
};

// ============================================================
// STATE
// ============================================================
let categories = [];
let products = [];
let testimonials = [];
let nextId = 1;
let nextTestimonialId = 1;
let webSettings = {};
let isLoggedIn = false;
let isCloudLoading = false;
let cloudSyncEnabled = true;

// ============================================================
// VALIDASI LINK GOOGLE DRIVE
// ============================================================
function isValidDriveLink(url) {
    if (!url) return false;
    return url.includes('drive.google.com/uc?export=view') || 
           url.includes('lh3.googleusercontent.com/d/') ||
           url.includes('drive.google.com/file/d/');
}

function convertDriveLink(url) {
    if (!url) return url;
    // Konversi link drive ke format embed
    if (url.includes('file/d/')) {
        const match = url.match(/\/d\/([^\/]+)/);
        if (match) {
            return 'https://drive.google.com/uc?export=view&id=' + match[1];
        }
    }
    return url;
}

// ============================================================
// PASSWORD MANAGEMENT
// ============================================================
function getPassword() {
    const saved = localStorage.getItem('adminPassword');
    return saved || 'admin123';
}

function setPassword(newPass) {
    localStorage.setItem('adminPassword', newPass);
}

function ubahPassword() {
    if (!isLoggedIn) {
        alert('⚠️ Login terlebih dahulu!');
        openLogin();
        return;
    }

    const passwordLama = prompt('Masukkan password lama:');
    if (passwordLama !== getPassword()) {
        alert('❌ Password lama salah!');
        return;
    }

    const passwordBaru = prompt('Masukkan password baru (minimal 6 karakter):');
    if (!passwordBaru || passwordBaru.length < 6) {
        alert('❌ Password minimal 6 karakter!');
        return;
    }

    const konfirmasi = prompt('Konfirmasi password baru:');
    if (passwordBaru !== konfirmasi) {
        alert('❌ Password tidak cocok!');
        return;
    }

    setPassword(passwordBaru);
    alert('✅ Password berhasil diubah!');
}

// ============================================================
// CLOUD SYNC
// ============================================================
function updateSyncStatus(status, message) {
    const el = document.getElementById('syncStatus');
    const text = document.getElementById('syncText');
    if (!el || !text) return;
    
    el.className = 'sync-status';
    if (status === 'syncing') {
        el.classList.add('syncing');
        text.textContent = message || 'Menyinkronkan...';
    } else if (status === 'offline') {
        el.classList.add('offline');
        text.textContent = message || 'Offline';
    } else {
        text.textContent = message || 'Tersinkron';
    }
}

function saveToCloud() {
    if (!cloudSyncEnabled) return;
    updateSyncStatus('syncing');
    
    try {
        const data = {
            categories: categories,
            products: products,
            nextId: nextId,
            testimonials: testimonials,
            nextTestimonialId: nextTestimonialId,
            webSettings: webSettings,
            updatedAt: new Date().toISOString()
        };
        
        database.ref('glowBeautyData').set(data)
            .then(() => {
                console.log('✅ Data saved to Firebase');
                updateSyncStatus('synced');
            })
            .catch((error) => {
                console.warn('⚠️ Failed to save to Firebase:', error);
                updateSyncStatus('offline', 'Gagal sync');
            });
    } catch (e) {
        console.warn('⚠️ Error saving to Firebase:', e);
        updateSyncStatus('offline', 'Error');
    }
}

function loadFromCloud() {
    if (isCloudLoading) return;
    isCloudLoading = true;
    updateSyncStatus('syncing', 'Memuat data...');
    
    database.ref('glowBeautyData').once('value')
        .then((snapshot) => {
            const data = snapshot.val();
            if (data) {
                console.log('✅ Data loaded from Firebase');
                categories = data.categories || defaultData.categories;
                products = data.products || [];
                nextId = data.nextId || 1;
                testimonials = data.testimonials || [];
                nextTestimonialId = data.nextTestimonialId || 1;
                webSettings = data.webSettings || defaultData.webSettings;
                
                saveData();
                renderAll();
                applyWebSettings();
                updateSyncStatus('synced');
            } else {
                saveToCloud();
                updateSyncStatus('synced');
            }
            isCloudLoading = false;
        })
        .catch((error) => {
            console.warn('⚠️ Failed to load from Firebase:', error);
            updateSyncStatus('offline', 'Tidak terhubung');
            isCloudLoading = false;
        });
}

function listenCloudChanges() {
    database.ref('glowBeautyData').on('value', (snapshot) => {
        const data = snapshot.val();
        if (data && !isCloudLoading) {
            console.log('🔄 Real-time update from Firebase');
            
            try {
                if (typeof data !== 'object' || data === null) {
                    console.warn('⚠️ Data dari Firebase tidak valid');
                    return;
                }
                
                const localData = localStorage.getItem(STORAGE_KEY);
                if (localData) {
                    try {
                        const local = JSON.parse(localData);
                        if (data.updatedAt && (!local.updatedAt || data.updatedAt > local.updatedAt)) {
                            categories = data.categories || defaultData.categories;
                            products = data.products || [];
                            nextId = data.nextId || 1;
                            testimonials = data.testimonials || [];
                            nextTestimonialId = data.nextTestimonialId || 1;
                            webSettings = data.webSettings || defaultData.webSettings;
                            
                            saveData();
                            renderAll();
                            applyWebSettings();
                            console.log('✅ Synced from cloud');
                            updateSyncStatus('synced');
                        }
                    } catch (e) {
                        console.warn('⚠️ Error parsing local data:', e);
                    }
                }
            } catch (e) {
                console.warn('⚠️ Error processing Firebase data:', e);
            }
        }
    });
}

function manualSync() {
    if (!isLoggedIn) {
        alert('⚠️ Login terlebih dahulu!');
        openLogin();
        return;
    }
    updateSyncStatus('syncing', 'Menyinkronkan...');
    loadFromCloud();
    setTimeout(() => {
        saveToCloud();
    }, 1000);
}

// ============================================================
// CLEAR ALL DATA
// ============================================================
function clearAllData() {
    if (!isLoggedIn) {
        alert('⚠️ Login terlebih dahulu!');
        openLogin();
        return;
    }
    
    if (!confirm('⚠️ Yakin ingin menghapus SEMUA data? TINDAKAN INI TIDAK DAPAT DIBATALKAN!')) return;
    if (!confirm('Konfirmasi kedua: Hapus semua data?')) return;
    
    categories = ['Skincare', 'Makeup', 'Body Care', 'Hair Care'];
    products = [];
    testimonials = [];
    nextId = 1;
    nextTestimonialId = 1;
    webSettings = {
        namaToko: 'GlowBeauty',
        heroTitle: 'Rawat Kulitmu <br/><span>Dengan Produk Terbaik</span>',
        heroDesc: 'Temukan rangkaian skincare dan kecantikan premium untuk kulit glowing dan sehat. Aman, halal, dan teruji dermatologis.',
        ctaTitle: '<i class="fas fa-heart" style="color:#f8bbd0;"></i> Siap Glowing?',
        ctaDesc: 'Konsultasikan kebutuhan kulitmu dan dapatkan rekomendasi produk terbaik!',
        whatsapp: '628179897500',
        heroImage: 'https://via.placeholder.com/500x400/d81b60/ffffff?text=Glow+Beauty'
    };
    
    saveData();
    
    const emptyData = {
        categories: categories,
        products: [],
        nextId: 1,
        testimonials: [],
        nextTestimonialId: 1,
        webSettings: webSettings,
        updatedAt: new Date().toISOString()
    };
    
    database.ref('glowBeautyData').set(emptyData)
        .then(() => {
            console.log('✅ Data Firebase dihapus permanen!');
            renderAll();
            applyWebSettings();
            alert('🗑️ Semua data telah dihapus permanen!');
        })
        .catch((error) => {
            console.error('❌ Error clearing Firebase data:', error);
            alert('⚠️ Gagal menghapus data di Firebase. Silakan coba lagi.');
        });
}

// ============================================================
// LOAD & SAVE DATA
// ============================================================
function loadData() {
    let hasLocalData = false;
    try {
        const saved = localStorage.getItem(STORAGE_KEY);
        if (saved) {
            const data = JSON.parse(saved);
            categories = data.categories || defaultData.categories;
            products = data.products || [];
            testimonials = data.testimonials || [];
            nextId = data.nextId || 1;
            nextTestimonialId = data.nextTestimonialId || 1;
            webSettings = data.webSettings || defaultData.webSettings;
            console.log('✅ Data loaded from LocalStorage');
            hasLocalData = true;
        }
    } catch (e) {
        console.warn('⚠️ Failed to load from LocalStorage:', e);
    }
    
    if (!hasLocalData) {
        categories = [...defaultData.categories];
        products = [];
        testimonials = [];
        nextId = 1;
        nextTestimonialId = 1;
        webSettings = JSON.parse(JSON.stringify(defaultData.webSettings));
        saveData();
    }
}

function saveData() {
    try {
        const data = { 
            categories, 
            products: products || [], 
            nextId, 
            testimonials: testimonials || [], 
            nextTestimonialId, 
            webSettings 
        };
        localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
        console.log('✅ Data saved to LocalStorage');
        updateStorageCount();
        saveToCloud();
    } catch (e) {
        console.warn('⚠️ Failed to save to LocalStorage:', e);
    }
}

function updateStorageCount() {
    const el = document.getElementById('storageCount');
    if (el) el.textContent = products?.length || 0;
}

// ============================================================
// RESET & BACKUP
// ============================================================
function resetAllData() {
    if (!isLoggedIn) {
        alert('⚠️ Login terlebih dahulu!');
        openLogin();
        return;
    }
    if (!confirm('⚠️ Yakin ingin mereset data ke default?')) return;
    if (!confirm('Konfirmasi kedua: Reset semua data?')) return;

    categories = [...defaultData.categories];
    products = [];
    testimonials = [];
    nextId = 1;
    nextTestimonialId = 1;
    webSettings = JSON.parse(JSON.stringify(defaultData.webSettings));
    saveData();
    renderAll();
    applyWebSettings();
    alert('🗑️ Semua data telah direset ke default (kosong)!');
}

function exportData() {
    const data = { 
        categories, 
        products: products || [], 
        nextId, 
        testimonials: testimonials || [], 
        nextTestimonialId, 
        webSettings, 
        exportedAt: new Date().toISOString() 
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `glow-beauty-backup-${new Date().toISOString().slice(0,10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    alert('✅ Data berhasil diekspor!');
}

function importData(event) {
    const file = event.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = function(e) {
        try {
            const data = JSON.parse(e.target.result);
            if (data.categories) {
                categories = data.categories;
                products = data.products || [];
                testimonials = data.testimonials || [];
                nextId = data.nextId || 1;
                nextTestimonialId = data.nextTestimonialId || 1;
                webSettings = data.webSettings || defaultData.webSettings;
                saveData();
                renderAll();
                applyWebSettings();
                alert('✅ Data berhasil di-restore!');
            } else {
                alert('⚠️ File backup tidak valid!');
            }
        } catch (err) {
            alert('⚠️ Gagal membaca file backup!');
        }
    };
    reader.readAsText(file);
    event.target.value = '';
}

// ============================================================
// TOGGLE MOBILE MENU
// ============================================================
function toggleMobileMenu() {
    const nav = document.getElementById('navLinks');
    nav.classList.toggle('show');
}

// ============================================================
// LOGIN
// ============================================================
function openLogin() {
    if (isLoggedIn) {
        toggleAdmin();
        return;
    }
    document.getElementById('loginModal').classList.add('active');
    document.getElementById('loginError').classList.remove('show');
}

function closeLogin() {
    document.getElementById('loginModal').classList.remove('active');
}

function login() {
    const user = document.getElementById('loginUser').value.trim();
    const pass = document.getElementById('loginPass').value.trim();

    if (user === 'admin' && pass === getPassword()) {
        isLoggedIn = true;
        closeLogin();
        document.querySelector('.admin-toggle').innerHTML = '<i class="fas fa-user-shield"></i> Admin';
        document.querySelector('.admin-toggle').style.background = 'rgba(216,27,96,0.2)';
        toggleAdmin();
        renderAll();
        applyWebSettings();
        loadFromCloud();
        listenCloudChanges();
    } else {
        document.getElementById('loginError').classList.add('show');
    }
}

function logout() {
    isLoggedIn = false;
    document.getElementById('adminPanel').classList.remove('active');
    document.querySelector('.admin-toggle').innerHTML = '<i class="fas fa-user-shield"></i> Admin';
    document.querySelector('.admin-toggle').style.background = 'rgba(216,27,96,0.12)';
}

// ============================================================
// TOGGLE ADMIN & TAB
// ============================================================
function toggleAdmin() {
    if (!isLoggedIn) {
        openLogin();
        return;
    }
    const panel = document.getElementById('adminPanel');
    panel.classList.toggle('active');
    if (panel.classList.contains('active')) {
        renderAll();
        applyWebSettings();
    }
}

function switchTab(tab) {
    document.querySelectorAll('.tab-content').forEach(el => el.classList.remove('active'));
    document.querySelectorAll('.tab-btn').forEach(el => el.classList.remove('active'));
    document.getElementById('tab-' + tab).classList.add('active');
    document.querySelector(`.tab-btn[onclick="switchTab('${tab}')"]`).classList.add('active');
}

// ============================================================
// RENDER KATEGORI
// ============================================================
function renderCategories() {
    const display = document.getElementById('kategoriDisplay');
    display.innerHTML = categories.map(k => `
        <div class="card-kategori">
            <i class="fas fa-tag"></i>
            <h3>${k}</h3>
        </div>
    `).join('');

    const chips = document.getElementById('kategoriChips');
    chips.innerHTML = categories.map(k => `
        <span class="kategori-chip">
            ${k}
            <span class="chip-edit" onclick="editKategori('${k}')" title="Edit"><i class="fas fa-pen"></i></span>
            <span class="chip-delete" onclick="hapusKategori('${k}')" title="Hapus"><i class="fas fa-times"></i></span>
        </span>
    `).join('');

    const select = document.getElementById('produkKategori');
    const currentVal = select.value;
    select.innerHTML = categories.map(k => `
        <option value="${k}" ${k === currentVal ? 'selected' : ''}>${k}</option>
    `).join('');
}

// ============================================================
// MANAJEMEN KATEGORI
// ============================================================
function tambahKategori() {
    if (!isLoggedIn) {
        alert('⚠️ Login terlebih dahulu!');
        openLogin();
        return;
    }
    const input = document.getElementById('kategoriInput');
    const nama = input.value.trim();
    if (!nama) { alert('⚠️ Masukkan nama kategori!'); return; }
    if (categories.includes(nama)) { alert('⚠️ Kategori sudah ada!'); return; }
    categories.push(nama);
    input.value = '';
    saveData();
    renderAll();
    alert('✅ Kategori berhasil ditambahkan!');
}

function hapusKategori(nama) {
    if (!isLoggedIn) {
        alert('⚠️ Login terlebih dahulu!');
        openLogin();
        return;
    }
    if (!confirm(`Yakin hapus kategori "${nama}"?`)) return;
    const used = products.some(p => p.kategori === nama);
    if (used) {
        alert('⚠️ Kategori ini masih digunakan oleh produk! Hapus produknya terlebih dahulu.');
        return;
    }
    categories = categories.filter(k => k !== nama);
    saveData();
    renderAll();
    alert('🗑️ Kategori dihapus!');
}

function editKategori(namaLama) {
    if (!isLoggedIn) {
        alert('⚠️ Login terlebih dahulu!');
        openLogin();
        return;
    }
    const namaBaru = prompt('Edit nama kategori:', namaLama);
    if (!namaBaru || namaBaru === namaLama) return;
    if (categories.includes(namaBaru) && namaBaru !== namaLama) {
        alert('⚠️ Nama kategori sudah ada!');
        return;
    }
    products = products.map(p => {
        if (p.kategori === namaLama) return { ...p, kategori: namaBaru };
        return p;
    });
    categories = categories.map(k => k === namaLama ? namaBaru : k);
    saveData();
    renderAll();
    alert('✅ Kategori berhasil diupdate!');
}

// ============================================================
// RENDER PRODUK
// ============================================================
function renderProducts() {
    const grid = document.getElementById('productGrid');
    const tbody = document.getElementById('productTableBody');
    const totalSpan = document.getElementById('totalProduk');

    if (!products || products.length === 0) {
        grid.innerHTML = `
            <div style="grid-column:1/-1;text-align:center;padding:40px;color:#6a4a5a;">
                <i class="fas fa-box-open" style="font-size:3rem;color:#d81b60;display:block;margin-bottom:16px;"></i>
                <h3 style="color:#4a1a3a;">Belum ada produk</h3>
                <p>Tambahkan produk pertama melalui panel admin</p>
            </div>
        `;
        tbody.innerHTML = `
            <tr>
                <td colspan="6" style="text-align:center;padding:20px;color:#6a4a5a;">
                    <i class="fas fa-box-open"></i> Belum ada produk
                </td>
            </tr>
        `;
        totalSpan.textContent = '0';
        return;
    }

    grid.innerHTML = products.map(p => `
        <div class="card-produk">
            <div class="img-wrapper">
                <img src="${p.gambar || 'https://via.placeholder.com/150/d81b60/ffffff?text=Produk'}" alt="${p.nama}" onerror="this.src='https://via.placeholder.com/150/d81b60/ffffff?text=${encodeURIComponent(p.nama)}'" />
            </div>
            <h4>${p.nama}</h4>
            <div class="harga">${p.harga}</div>
            <span class="kategori-badge">${p.kategori}</span>
        </div>
    `).join('');

    tbody.innerHTML = products.map((p, index) => `
        <tr>
            <td>${index + 1}</td>
            <td><img src="${p.gambar || 'https://via.placeholder.com/40/d81b60/ffffff'}" style="width:40px;height:40px;object-fit:cover;border-radius:10px;" onerror="this.src='https://via.placeholder.com/40/d81b60/ffffff'" /></td>
            <td>${p.nama}</td>
            <td>${p.harga}</td>
            <td>${p.kategori}</td>
            <td>
                <button class="btn-edit" onclick="editProduk(${p.id})"><i class="fas fa-edit"></i> Edit</button>
                <button class="btn-delete" onclick="hapusProduk(${p.id})"><i class="fas fa-trash"></i> Hapus</button>
            </td>
        </tr>
    `).join('');

    totalSpan.textContent = products.length;
    updateStorageCount();
}

// ============================================================
// TAMBAH PRODUK (HANYA LINK DRIVE)
// ============================================================
function tambahProduk() {
    if (!isLoggedIn) {
        alert('⚠️ Login terlebih dahulu!');
        openLogin();
        return;
    }

    const nama = document.getElementById('produkNama').value.trim();
    const harga = document.getElementById('produkHarga').value.trim();
    const kategori = document.getElementById('produkKategori').value;
    const linkGambar = document.getElementById('produkLinkGambar').value.trim();

    if (!nama || !harga) {
        alert('⚠️ Mohon isi Nama dan Harga produk!');
        return;
    }

    if (!linkGambar) {
        alert('⚠️ Mohon isi Link Gambar dari Google Drive!');
        return;
    }

    let finalLink = convertDriveLink(linkGambar);
    if (!isValidDriveLink(finalLink) && !finalLink.includes('https://')) {
        alert('⚠️ Link tidak valid! Gunakan link dari Google Drive.\nFormat: https://drive.google.com/uc?export=view&id=XXXX');
        return;
    }

    const newProduct = { id: nextId++, nama, harga, kategori, gambar: finalLink };
    products.push(newProduct);
    saveData();
    renderAll();
    resetFormProduk();
    alert('✅ Produk berhasil ditambahkan!');
}

// ============================================================
// EDIT PRODUK (HANYA LINK DRIVE)
// ============================================================
function editProduk(id) {
    if (!isLoggedIn) {
        alert('⚠️ Login terlebih dahulu!');
        openLogin();
        return;
    }

    const produk = products.find(p => p.id === id);
    if (!produk) {
        alert('⚠️ Produk tidak ditemukan!');
        return;
    }

    document.getElementById('editId').value = id;
    document.getElementById('editNama').value = produk.nama;
    document.getElementById('editHarga').value = produk.harga;

    const select = document.getElementById('editKategori');
    select.innerHTML = categories.map(k => `
        <option value="${k}" ${k === produk.kategori ? 'selected' : ''}>${k}</option>
    `).join('');

    const linkInput = document.getElementById('editLinkGambar');
    linkInput.value = produk.gambar || '';

    document.getElementById('editModal').classList.add('active');
}

function closeEdit() {
    document.getElementById('editModal').classList.remove('active');
    document.getElementById('editLinkGambar').value = '';
}

function simpanEdit() {
    const id = parseInt(document.getElementById('editId').value);
    const nama = document.getElementById('editNama').value.trim();
    const harga = document.getElementById('editHarga').value.trim();
    const kategori = document.getElementById('editKategori').value;
    const linkGambar = document.getElementById('editLinkGambar').value.trim();

    if (!nama || !harga) {
        alert('⚠️ Nama dan Harga harus diisi!');
        return;
    }

    if (!linkGambar) {
        alert('⚠️ Mohon isi Link Gambar dari Google Drive!');
        return;
    }

    const index = products.findIndex(p => p.id === id);
    if (index === -1) {
        alert('⚠️ Produk tidak ditemukan!');
        return;
    }

    let finalLink = convertDriveLink(linkGambar);
    if (!isValidDriveLink(finalLink) && !finalLink.includes('https://')) {
        alert('⚠️ Link tidak valid! Gunakan link dari Google Drive.');
        return;
    }

    products[index] = {
        ...products[index],
        nama: nama,
        harga: harga,
        kategori: kategori,
        gambar: finalLink
    };
    saveData();
    renderAll();
    closeEdit();
    alert('✅ Produk berhasil diupdate!');
}

// ============================================================
// HAPUS PRODUK
// ============================================================
function hapusProduk(id) {
    if (!isLoggedIn) {
        alert('⚠️ Login terlebih dahulu!');
        openLogin();
        return;
    }
    if (confirm('Yakin ingin menghapus produk ini?')) {
        products = products.filter(p => p.id !== id);
        saveData();
        renderAll();
        alert('🗑️ Produk dihapus!');
    }
}

function resetFormProduk() {
    document.getElementById('produkNama').value = '';
    document.getElementById('produkHarga').value = '';
    document.getElementById('produkLinkGambar').value = '';
}

// ============================================================
// RENDER TESTIMONI
// ============================================================
function renderTestimonials() {
    const grid = document.getElementById('testimoniGrid');
    
    if (!testimonials || testimonials.length === 0) {
        grid.innerHTML = `
            <div style="grid-column:1/-1;text-align:center;padding:40px;color:#6a4a5a;">
                <i class="fas fa-comment-slash" style="font-size:3rem;color:#d81b60;display:block;margin-bottom:16px;"></i>
                <h3 style="color:#4a1a3a;">Belum ada testimoni</h3>
                <p>Tambahkan testimoni pertama melalui panel admin</p>
            </div>
        `;
        const list = document.getElementById('testimoniList');
        list.innerHTML = '<p style="color:#6a4a5a;text-align:center;padding:20px;">Belum ada testimoni.</p>';
        return;
    }

    grid.innerHTML = testimonials.map(t => `
        <div class="card-testimoni">
            <div class="stars">${'⭐'.repeat(t.rating)}</div>
            ${t.gambar ? `<img src="${t.gambar}" class="testi-image" alt="Screenshot" />` : ''}
            <p>"${t.text}"</p>
            <div class="nama">- ${t.nama}</div>
        </div>
    `).join('');

    const list = document.getElementById('testimoniList');
    list.innerHTML = testimonials.map(t => `
        <div class="testimoni-item">
            <div class="info">
                ${t.gambar ? `<img src="${t.gambar}" alt="Screenshot" />` : '<div style="width:50px;height:50px;border-radius:12px;background:rgba(216,27,96,0.1);display:flex;align-items:center;justify-content:center;font-size:1.5rem;"><i class="fas fa-user" style="color:#d81b60;"></i></div>'}
                <div class="text">
                    <div class="nama">${t.nama}</div>
                    <div class="rating">${'⭐'.repeat(t.rating)}</div>
                    <div class="isi">"${t.text}"</div>
                </div>
            </div>
            <div class="aksi">
                <button class="btn-edit-testi" onclick="editTestimoni(${t.id})"><i class="fas fa-edit"></i> Edit</button>
                <button class="btn-delete-testi" onclick="hapusTestimoni(${t.id})"><i class="fas fa-trash"></i> Hapus</button>
            </div>
        </div>
    `).join('');
}

// ============================================================
// TAMBAH TESTIMONI (HANYA LINK DRIVE)
// ============================================================
function tambahTestimoni() {
    if (!isLoggedIn) {
        alert('⚠️ Login terlebih dahulu!');
        openLogin();
        return;
    }

    const nama = document.getElementById('testimoniNama').value.trim();
    const text = document.getElementById('testimoniText').value.trim();
    const rating = parseInt(document.getElementById('testimoniRating').value);
    const linkGambar = document.getElementById('testimoniLinkGambar').value.trim();

    if (!nama || !text) {
        alert('⚠️ Mohon isi Nama dan Isi testimoni!');
        return;
    }

    if (!linkGambar) {
        alert('⚠️ Mohon isi Link Gambar dari Google Drive!');
        return;
    }

    let finalLink = convertDriveLink(linkGambar);
    if (!isValidDriveLink(finalLink) && !finalLink.includes('https://')) {
        alert('⚠️ Link tidak valid! Gunakan link dari Google Drive.');
        return;
    }

    const newTestimonial = { id: nextTestimonialId++, nama, text, rating, gambar: finalLink };
    testimonials.push(newTestimonial);
    saveData();
    renderAll();
    resetFormTestimoni();
    alert('✅ Testimoni berhasil ditambahkan!');
}

// ============================================================
// EDIT TESTIMONI (HANYA LINK DRIVE)
// ============================================================
function editTestimoni(id) {
    if (!isLoggedIn) {
        alert('⚠️ Login terlebih dahulu!');
        openLogin();
        return;
    }

    const testi = testimonials.find(t => t.id === id);
    if (!testi) {
        alert('⚠️ Testimoni tidak ditemukan!');
        return;
    }

    document.getElementById('editTestimoniId').value = id;
    document.getElementById('editTestimoniNama').value = testi.nama;
    document.getElementById('editTestimoniText').value = testi.text;
    document.getElementById('editTestimoniRating').value = testi.rating;
    
    const linkInput = document.getElementById('editTestimoniLinkGambar');
    linkInput.value = testi.gambar || '';
    
    document.getElementById('editTestimoniModal').classList.add('active');
}

function closeEditTestimoni() {
    document.getElementById('editTestimoniModal').classList.remove('active');
    document.getElementById('editTestimoniLinkGambar').value = '';
}

function simpanEditTestimoni() {
    const id = parseInt(document.getElementById('editTestimoniId').value);
    const nama = document.getElementById('editTestimoniNama').value.trim();
    const text = document.getElementById('editTestimoniText').value.trim();
    const rating = parseInt(document.getElementById('editTestimoniRating').value);
    const linkGambar = document.getElementById('editTestimoniLinkGambar').value.trim();

    if (!nama || !text) {
        alert('⚠️ Nama dan Isi testimoni harus diisi!');
        return;
    }

    if (!linkGambar) {
        alert('⚠️ Mohon isi Link Gambar dari Google Drive!');
        return;
    }

    const index = testimonials.findIndex(t => t.id === id);
    if (index === -1) {
        alert('⚠️ Testimoni tidak ditemukan!');
        return;
    }

    let finalLink = convertDriveLink(linkGambar);
    if (!isValidDriveLink(finalLink) && !finalLink.includes('https://')) {
        alert('⚠️ Link tidak valid! Gunakan link dari Google Drive.');
        return;
    }

    testimonials[index] = {
        ...testimonials[index],
        nama: nama,
        text: text,
        rating: rating,
        gambar: finalLink
    };
    saveData();
    renderAll();
    closeEditTestimoni();
    alert('✅ Testimoni berhasil diupdate!');
}

// ============================================================
// HAPUS TESTIMONI
// ============================================================
function hapusTestimoni(id) {
    if (!isLoggedIn) {
        alert('⚠️ Login terlebih dahulu!');
        openLogin();
        return;
    }
    if (confirm('Yakin ingin menghapus testimoni ini?')) {
        testimonials = testimonials.filter(t => t.id !== id);
        saveData();
        renderAll();
        alert('🗑️ Testimoni dihapus!');
    }
}

function resetFormTestimoni() {
    document.getElementById('testimoniNama').value = '';
    document.getElementById('testimoniText').value = '';
    document.getElementById('testimoniRating').value = '5';
    document.getElementById('testimoniLinkGambar').value = '';
}

// ============================================================
// PENGATURAN WEB (HERO IMAGE PAKAI LINK DRIVE)
// ============================================================
function applyWebSettings() {
    if (webSettings.namaToko) {
        document.getElementById('webName').innerHTML = webSettings.namaToko.replace(/<[^>]*>/g, '');
        document.getElementById('footerName').textContent = webSettings.namaToko;
    }
    if (webSettings.heroTitle) {
        document.getElementById('heroTitle').innerHTML = webSettings.heroTitle;
    }
    if (webSettings.heroDesc) {
        document.getElementById('heroDesc').textContent = webSettings.heroDesc;
    }
    if (webSettings.heroImage) {
        document.getElementById('heroImage').src = webSettings.heroImage;
    }
    if (webSettings.ctaTitle) {
        document.getElementById('ctaTitle').innerHTML = webSettings.ctaTitle;
    }
    if (webSettings.ctaDesc) {
        document.getElementById('ctaDesc').textContent = webSettings.ctaDesc;
    }
    if (webSettings.whatsapp) {
        const waNumber = webSettings.whatsapp.replace(/\D/g, '');
        const waLink = document.getElementById('waLink');
        if (waLink) {
            waLink.href = `https://api.whatsapp.com/send?phone=${waNumber}`;
        }
    }

    document.getElementById('webNamaToko').value = webSettings.namaToko || '';
    document.getElementById('webHeroTitle').value = webSettings.heroTitle || '';
    document.getElementById('webHeroDesc').value = webSettings.heroDesc || '';
    document.getElementById('webCtaTitle').value = webSettings.ctaTitle || '';
    document.getElementById('webCtaDesc').value = webSettings.ctaDesc || '';
    document.getElementById('webWhatsApp').value = webSettings.whatsapp || '628179897500';
    document.getElementById('webHeroImage').value = webSettings.heroImage || '';
}

function simpanPengaturanWeb() {
    if (!isLoggedIn) {
        alert('⚠️ Login terlebih dahulu!');
        openLogin();
        return;
    }

    const namaToko = document.getElementById('webNamaToko').value.trim();
    const heroTitle = document.getElementById('webHeroTitle').value.trim();
    const heroDesc = document.getElementById('webHeroDesc').value.trim();
    const ctaTitle = document.getElementById('webCtaTitle').value.trim();
    const ctaDesc = document.getElementById('webCtaDesc').value.trim();
    const whatsapp = document.getElementById('webWhatsApp').value.trim();
    const heroImage = document.getElementById('webHeroImage').value.trim();

    if (!namaToko) {
        alert('⚠️ Nama Toko harus diisi!');
        return;
    }

    // Validasi link hero image
    let finalHeroImage = webSettings.heroImage;
    if (heroImage) {
        let finalLink = convertDriveLink(heroImage);
        if (isValidDriveLink(finalLink) || finalLink.includes('https://')) {
            finalHeroImage = finalLink;
        } else {
            alert('⚠️ Link Hero Image tidak valid! Gunakan link dari Google Drive.\nFormat: https://drive.google.com/uc?export=view&id=XXXX');
            return;
        }
    }

    webSettings.namaToko = namaToko;
    webSettings.heroTitle = heroTitle || defaultData.webSettings.heroTitle;
    webSettings.heroDesc = heroDesc || defaultData.webSettings.heroDesc;
    webSettings.ctaTitle = ctaTitle || defaultData.webSettings.ctaTitle;
    webSettings.ctaDesc = ctaDesc || defaultData.webSettings.ctaDesc;
    webSettings.whatsapp = whatsapp || '628179897500';
    webSettings.heroImage = finalHeroImage;

    saveData();
    applyWebSettings();
    alert('✅ Pengaturan web berhasil disimpan!');
}

// ============================================================
// RENDER ALL
// ============================================================
function renderAll() {
    renderCategories();
    renderProducts();
    renderTestimonials();
}

// ============================================================
// INIT
// ============================================================
loadData();
renderAll();
applyWebSettings();

// ============================================================
// MODAL CLOSE ON OUTSIDE CLICK
// ============================================================
document.getElementById('loginModal').addEventListener('click', function(e) {
    if (e.target === this) closeLogin();
});

document.getElementById('editModal').addEventListener('click', function(e) {
    if (e.target === this) closeEdit();
});

document.getElementById('editTestimoniModal').addEventListener('click', function(e) {
    if (e.target === this) closeEditTestimoni();
});

// ============================================================
// ENTER KEY HANDLERS
// ============================================================
document.getElementById('loginPass').addEventListener('keydown', function(e) {
    if (e.key === 'Enter') login();
});
document.getElementById('loginUser').addEventListener('keydown', function(e) {
    if (e.key === 'Enter') login();
});
document.getElementById('kategoriInput').addEventListener('keydown', function(e) {
    if (e.key === 'Enter') tambahKategori();
});

// Close mobile menu on link click
document.querySelectorAll('.nav-links a').forEach(link => {
    link.addEventListener('click', function() {
        document.getElementById('navLinks').classList.remove('show');
    });
});
