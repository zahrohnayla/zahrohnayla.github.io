console.log("Memulai inisialisasi Firebase...");

// PERBAIKAN: Import writeBatch untuk fitur Drag & Drop Save
import { initializeApp } from "https://www.gstatic.com/firebasejs/12.13.0/firebase-app.js";
import { getAuth, signInWithEmailAndPassword, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/12.13.0/firebase-auth.js";
import { getFirestore, collection, addDoc, getDocs, doc, deleteDoc, setDoc, getDoc, updateDoc, writeBatch } from "https://www.gstatic.com/firebasejs/12.13.0/firebase-firestore.js";

const firebaseConfig = {
    apiKey: "AIzaSyBGar7phwH-JUUVACZ8S0UKNJmE9yBsIFY",
    authDomain: "portofolio-znr.firebaseapp.com",
    projectId: "portofolio-znr",
    messagingSenderId: "661865450622",
    appId: "1:661865450622:web:9534f504ac5f6ecfb49c2"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

let globalNamaBiodata = "Memuat...";
let editStateId = { edu: null, skill: null, exp: null };

// --- FUNGSI FORMAT TANGGAL INDONESIA ---
function formatTanggalIndo(dateString) {
    if (!dateString || dateString === "Sekarang") return dateString;
    const months = ["Januari", "Februari", "Maret", "April", "Mei", "Juni", "Juli", "Agustus", "September", "Oktober", "November", "Desember"];
    const d = new Date(dateString);
    if(isNaN(d)) return dateString;
    return `${d.getDate()} ${months[d.getMonth()]} ${d.getFullYear()}`;
}

// --- DOM ELEMENTS UNTUK TOGGLE VIEW ---
const publicLayout = document.getElementById('public-layout');
const adminLayout = document.getElementById('admin-layout');
const btnToggleAdmin = document.getElementById('btn-toggle-admin');
const btnCloseAdmin = document.getElementById('btn-close-admin');
const btnLogout = document.getElementById('btn-logout');
const loginOverlay = document.getElementById('login-overlay');
const btnShowLoginModal = document.getElementById('btn-show-login-modal');
const btnCloseLoginModal = document.getElementById('btn-login-close');
const topbarFoto = document.getElementById('topbar-foto');
const profileDropdown = document.getElementById('profile-dropdown');

// --- SISTEM AUTENTIKASI ---
onAuthStateChanged(auth, (user) => {
    if (user) {
        btnToggleAdmin.classList.remove('hidden');
        btnLogout.classList.remove('hidden');
        document.body.classList.add('is-admin');
        profileDropdown.classList.add('hidden');
    } else {
        btnToggleAdmin.classList.add('hidden');
        btnLogout.classList.add('hidden');
        adminLayout.classList.add('hidden');
        publicLayout.classList.remove('hidden');
        document.body.classList.remove('is-admin');
    }
});

// LOGIKA OVERLAY LOGIN
topbarFoto.addEventListener('click', () => {
    if(!document.body.classList.contains('is-admin')) {
        profileDropdown.classList.toggle('hidden');
    }
});
btnShowLoginModal.addEventListener('click', () => {
    profileDropdown.classList.add('hidden');
    loginOverlay.classList.remove('hidden');
});
btnCloseLoginModal.addEventListener('click', () => loginOverlay.classList.add('hidden'));

document.getElementById('toggle-password').addEventListener('click', function() {
    const passInput = document.getElementById('login-password');
    if(passInput.type === 'password') {
        passInput.type = 'text'; this.innerText = '🙈';
    } else {
        passInput.type = 'password'; this.innerText = '👁️';
    }
});

document.getElementById('btn-login-submit').addEventListener('click', () => {
    const email = document.getElementById('login-email').value;
    const pass = document.getElementById('login-password').value;
    signInWithEmailAndPassword(auth, email, pass)
        .then(() => {
            alert("Login Berhasil!");
            document.getElementById('login-email').value = '';
            document.getElementById('login-password').value = '';
            loginOverlay.classList.add('hidden');
            publicLayout.classList.add('hidden');
            adminLayout.classList.remove('hidden');
            window.scrollTo(0,0);
        })
        .catch((error) => alert("Gagal Login."));
});

btnLogout.addEventListener('click', () => signOut(auth));
btnToggleAdmin.addEventListener('click', () => { publicLayout.classList.add('hidden'); adminLayout.classList.remove('hidden'); window.scrollTo(0,0);});
btnCloseAdmin.addEventListener('click', () => { adminLayout.classList.add('hidden'); publicLayout.classList.remove('hidden'); window.scrollTo(0,0);});

function resetForm(type) {
    if (type === 'edu') {
        editStateId.edu = null;
        document.getElementById('edu-instansi').value = ''; document.getElementById('edu-gelar').value = '';
        document.getElementById('edu-lokasi').value = ''; document.getElementById('edu-jurusan').value = '';
        document.getElementById('edu-ipk').value = ''; document.getElementById('edu-mulai').value = '';
        document.getElementById('edu-lulus').value = ''; document.getElementById('edu-masih-belajar').checked = false;
        document.getElementById('edu-lulus').disabled = false; document.getElementById('edu-file').value = '';
        document.getElementById('btn-tambah-edu').innerText = '+ Tambah / Simpan Data';
        document.getElementById('btn-batal-edit-edu').classList.add('hidden');
    } else if (type === 'skill') {
        editStateId.skill = null;
        document.getElementById('skill-judul').value = ''; document.getElementById('skill-desc').value = '';
        document.getElementById('btn-tambah-skill').innerText = '+ Tambah / Simpan Skill';
        document.getElementById('btn-batal-edit-skill').classList.add('hidden');
    } else if (type === 'exp') {
        editStateId.exp = null;
        document.getElementById('exp-judul').value = ''; document.getElementById('exp-desc').value = '';
        document.getElementById('exp-link').value = ''; document.getElementById('exp-file').value = '';
        document.getElementById('exp-tipe-desc').value = 'paragraf'; document.getElementById('exp-poin-container').innerHTML = '';
        document.getElementById('exp-desc').classList.remove('hidden'); document.getElementById('exp-poin-wrapper').classList.add('hidden');
        document.getElementById('btn-tambah-exp').innerText = '+ Tambah / Simpan Pengalaman';
        document.getElementById('btn-batal-edit-exp').classList.add('hidden');
    }
}
document.getElementById('btn-batal-edit-edu').onclick = () => resetForm('edu');
document.getElementById('btn-batal-edit-skill').onclick = () => resetForm('skill');
document.getElementById('btn-batal-edit-exp').onclick = () => resetForm('exp');

// ==========================================
// FUNGSI DRAG AND DROP (Ubah Urutan)
// ==========================================
function enableDragAndDrop(containerId, collectionName, reloadFunction) {
    const container = document.getElementById(containerId);
    let draggedItem = null;

    container.addEventListener('dragstart', (e) => {
        if (e.target.classList.contains('admin-list-item')) {
            draggedItem = e.target;
            setTimeout(() => e.target.classList.add('dragging'), 0);
        }
    });

    container.addEventListener('dragover', (e) => {
        e.preventDefault();
        const afterElement = getDragAfterElement(container, e.clientY);
        if (draggedItem) {
            if (afterElement == null) {
                container.appendChild(draggedItem);
            } else {
                container.insertBefore(draggedItem, afterElement);
            }
        }
    });

    container.addEventListener('dragend', async (e) => {
        if (draggedItem) {
            draggedItem.classList.remove('dragging');
            draggedItem = null;
            
            // Simpan urutan baru ke Firebase
            const batch = writeBatch(db);
            const items = container.querySelectorAll('.admin-list-item');
            items.forEach((item, index) => {
                const docId = item.getAttribute('data-id');
                const ref = doc(db, collectionName, docId);
                batch.update(ref, { order: index });
            });
            await batch.commit();
            // Panggil ulang data untuk mensinkronkan tampilan publik
            reloadFunction();
        }
    });

    function getDragAfterElement(container, y) {
        const draggableElements = [...container.querySelectorAll('.admin-list-item:not(.dragging)')];
        return draggableElements.reduce((closest, child) => {
            const box = child.getBoundingClientRect();
            const offset = y - box.top - box.height / 2;
            if (offset < 0 && offset > closest.offset) {
                return { offset: offset, element: child };
            } else { return closest; }
        }, { offset: Number.NEGATIVE_INFINITY }).element;
    }
}


// ==========================================
// 1. BIODATA
// ==========================================
document.getElementById('btn-tambah-link').addEventListener('click', () => {
    const container = document.getElementById('link-dinamis-container');
    const div = document.createElement('div');
    div.style.marginBottom = "5px";
    div.innerHTML = `
        <input type="text" class="link-nama" placeholder="Teks Link" style="width:30%; display:inline-block;">
        <input type="url" class="link-url" placeholder="URL Lengkap" style="width:50%; display:inline-block;">
        <button class="btn-hapus" style="margin:0;" onclick="this.parentElement.remove()">X</button>
    `;
    container.appendChild(div);
});

document.getElementById('btn-simpan-biodata').addEventListener('click', async () => {
    const payload = {
        nama: document.getElementById('bio-nama').value || "",
        email: document.getElementById('bio-email').value || "",
        wa: document.getElementById('bio-wa').value || "",
        foto_profil: document.getElementById('bio-foto-profil').value || "",
        foto_full: document.getElementById('bio-foto-full').value || "",
        bg1: document.getElementById('color-bg1').value,
        bg2: document.getElementById('color-bg2').value,
        text_color: document.getElementById('color-text').value,
        nav_color: document.getElementById('color-nav').value,
        btn_color: document.getElementById('color-btn').value
    };

    const linkNamas = document.querySelectorAll('.link-nama');
    const linkUrls = document.querySelectorAll('.link-url');
    let linksArray = [];
    for(let i = 0; i < linkNamas.length; i++) {
        if(linkNamas[i].value.trim() !== "" && linkUrls[i].value.trim() !== "") {
            linksArray.push({ nama: linkNamas[i].value, url: linkUrls[i].value });
        }
    }
    payload.links = linksArray;

    try {
        await setDoc(doc(db, "profil", "biodata_utama"), payload, { merge: true });
        alert("Biodata disimpan!"); loadBiodata();
    } catch (e) { alert("Error: " + e.message); }
});

document.getElementById('btn-simpan-desc').addEventListener('click', async () => {
    try {
        await setDoc(doc(db, "profil", "deskripsi_utama"), { teks: document.getElementById('desc-text').value || "" });
        alert("Deskripsi tersimpan!"); loadBiodata();
    } catch (e) { alert("Error: " + e.message); }
});

async function loadBiodata() {
    try {
        const docBio = await getDoc(doc(db, "profil", "biodata_utama"));
        if (docBio.exists()) {
            const data = docBio.data();
            globalNamaBiodata = data.nama || "Nama User"; 
            
            document.getElementById('topbar-name').innerText = globalNamaBiodata;
            if(data.foto_profil) document.getElementById('topbar-foto').src = data.foto_profil;
            if(data.foto_full) document.getElementById('tampil-foto-full').src = data.foto_full;
            
            // PERBAIKAN: Render Kontak Tanpa Ikon
            let subInfoHTML = [];
            if(data.email) subInfoHTML.push(data.email);
            if(data.wa) subInfoHTML.push(data.wa);
            if(data.links && data.links.length > 0) {
                data.links.forEach(l => {
                    subInfoHTML.push(`<a href="${l.url}" target="_blank" style="color: var(--text-color);">${l.nama}</a>`);
                });
            }
            document.getElementById('tampil-kontak-link').innerHTML = subInfoHTML.join(' &nbsp;|&nbsp; ');

            document.documentElement.style.setProperty('--bg-color-1', data.bg1 || '#e0f2fe');
            document.documentElement.style.setProperty('--bg-color-2', data.bg2 || '#4fc3f7');
            document.documentElement.style.setProperty('--text-color', data.text_color || '#1a252f');
            document.documentElement.style.setProperty('--nav-color', data.nav_color || '#0277bd');
            document.documentElement.style.setProperty('--btn-color', data.btn_color || '#00b4d8');
        }

        const docDesc = await getDoc(doc(db, "profil", "deskripsi_utama"));
        if (docDesc.exists()) {
            document.getElementById('tampil-deskripsi').innerText = docDesc.data().teks || "Belum ada deskripsi.";
        }
        
        loadPendidikan(); // Panggil ini agar gelar tersisip ke nama
    } catch (e) { console.error(e); }
}

// ==========================================
// 2. PENDIDIKAN
// ==========================================
document.getElementById('edu-masih-belajar').addEventListener('change', function() {
    document.getElementById('edu-lulus').disabled = this.checked;
});

document.getElementById('btn-tambah-edu').addEventListener('click', async () => {
    const instansi = document.getElementById('edu-instansi').value;
    if (!instansi) return alert("Asal Sekolah wajib diisi!");
    
    const payload = {
        instansi: instansi, gelar: document.getElementById('edu-gelar').value || "",
        lokasi: document.getElementById('edu-lokasi').value || "", jurusan: document.getElementById('edu-jurusan').value || "",
        ipk: document.getElementById('edu-ipk').value || "", mulai: document.getElementById('edu-mulai').value || "",
        lulus: document.getElementById('edu-masih-belajar').checked ? "Sekarang" : document.getElementById('edu-lulus').value,
        bukti_file_url: document.getElementById('edu-file').value || "",
        timestamp: Date.now()
    };

    try {
        if (editStateId.edu) {
            await updateDoc(doc(db, "pendidikan", editStateId.edu), payload);
        } else {
            // Document baru diletakkan paling akhir (order = timestamp)
            payload.order = Date.now();
            await addDoc(collection(db, "pendidikan"), payload);
        }
        resetForm('edu'); loadPendidikan();
    } catch (e) { alert("Error: " + e.message); }
});

async function loadPendidikan() {
    const pubContainer = document.getElementById('tampil-pendidikan');
    const adminContainer = document.getElementById('admin-list-edu');
    
    try {
        const querySnapshot = await getDocs(collection(db, "pendidikan"));
        pubContainer.innerHTML = ""; adminContainer.innerHTML = "";
        
        // Sorting Lokal Berdasarkan field 'order' atau 'timestamp'
        let dataArray = [];
        querySnapshot.forEach(doc => dataArray.push({ id: doc.id, ...doc.data() }));
        dataArray.sort((a, b) => (a.order || a.timestamp) - (b.order || b.timestamp));

        let arrGelar = [];

        dataArray.forEach((data) => {
            if(data.gelar && data.gelar.trim() !== "") arrGelar.push(data.gelar);

            // --- PUBLIC UI ---
            const tglMulai = formatTanggalIndo(data.mulai);
            const tglLulus = formatTanggalIndo(data.lulus);

            const div = document.createElement('div'); div.className = "edu-card";
            div.innerHTML = `
                <div class="edu-row-1">
                    <span class="edu-row-1-kiri">${data.instansi} <small style="font-size:0.75em; font-weight:normal; opacity:0.8;">${data.lokasi ? `| ${data.lokasi}` : ''}</small></span>
                    <span class="edu-row-1-kanan">${tglMulai} - ${tglLulus}</span>
                </div>
                <div class="edu-row-2">
                    <span class="edu-row-2-kiri">${data.jurusan || ""}</span>
                    <div class="edu-row-2-kanan">
                        ${data.ipk ? `<span>IPK: <strong>${data.ipk}</strong></span>` : ''}
                        ${data.bukti_file_url ? `<a href="${data.bukti_file_url}" target="_blank" class="btn-pdf">Transkrip</a>` : ''}
                    </div>
                </div>
            `;
            pubContainer.appendChild(div);

            // --- ADMIN UI ---
            const adm = document.createElement('div');
            adm.className = "admin-list-item"; adm.setAttribute('draggable', true); adm.setAttribute('data-id', data.id);
            adm.innerHTML = `
                <div class="admin-list-content">
                    <div class="drag-handle">☰</div>
                    <div><strong>${data.instansi}</strong> <br> <small>${data.jurusan || "-"}</small></div>
                </div>
                <div>
                    <button class="btn-edit" style="margin-right:5px;">Edit</button>
                    <button class="btn-hapus">Hapus</button>
                </div>
            `;
            adm.querySelector('.btn-edit').onclick = () => {
                document.getElementById('edu-instansi').value = data.instansi; document.getElementById('edu-gelar').value = data.gelar || "";
                document.getElementById('edu-lokasi').value = data.lokasi || ""; document.getElementById('edu-jurusan').value = data.jurusan || "";
                document.getElementById('edu-ipk').value = data.ipk || ""; document.getElementById('edu-mulai').value = data.mulai || "";
                if(data.lulus === "Sekarang") {
                    document.getElementById('edu-masih-belajar').checked = true; document.getElementById('edu-lulus').disabled = true;
                } else {
                    document.getElementById('edu-masih-belajar').checked = false; document.getElementById('edu-lulus').disabled = false;
                    document.getElementById('edu-lulus').value = data.lulus || "";
                }
                document.getElementById('edu-file').value = data.bukti_file_url || "";
                editStateId.edu = data.id;
                document.getElementById('btn-tambah-edu').innerText = 'Simpan Perubahan Data';
                document.getElementById('btn-batal-edit-edu').classList.remove('hidden');
            };
            adm.querySelector('.btn-hapus').onclick = async () => { if(confirm(`Hapus ${data.instansi}?`)) { await deleteDoc(doc(db, "pendidikan", data.id)); loadPendidikan(); } };
            adminContainer.appendChild(adm);
        });

        // Tempel gelar
        let teksNamaBawah = globalNamaBiodata;
        if(arrGelar.length > 0) teksNamaBawah += ", " + arrGelar.join(", ");
        document.getElementById('tampil-nama-besar').innerText = teksNamaBawah;
        
        // Aktifkan Drag & Drop
        enableDragAndDrop('admin-list-edu', 'pendidikan', loadPendidikan);

    } catch (e) { console.error(e); }
}

// ==========================================
// 3. SKILL
// ==========================================
document.getElementById('btn-tambah-skill').addEventListener('click', async () => {
    const judul = document.getElementById('skill-judul').value;
    if (!judul) return alert("Nama skill wajib diisi!");
    const payload = { judul: judul, deskripsi: document.getElementById('skill-desc').value || "", timestamp: Date.now() };

    try {
        if (editStateId.skill) {
            await updateDoc(doc(db, "skills", editStateId.skill), payload);
        } else {
            payload.order = Date.now();
            await addDoc(collection(db, "skills"), payload);
        }
        resetForm('skill'); loadSkills(); 
    } catch (e) {}
});

async function loadSkills() {
    const pubList = document.getElementById('tampil-skill');
    const adminList = document.getElementById('admin-list-skill');
    try {
        const querySnapshot = await getDocs(collection(db, "skills"));
        pubList.innerHTML = ""; adminList.innerHTML = "";
        
        let dataArray = [];
        querySnapshot.forEach(doc => dataArray.push({ id: doc.id, ...doc.data() }));
        dataArray.sort((a, b) => (a.order || a.timestamp) - (b.order || b.timestamp));

        dataArray.forEach((data) => {
            // PERBAIKAN: Public UI Tanpa Deskripsi
            const li = document.createElement('li');
            li.className = "skill-card";
            li.innerHTML = `${data.judul}`;
            pubList.appendChild(li);

            // Admin UI
            const adm = document.createElement('div');
            adm.className = "admin-list-item"; adm.setAttribute('draggable', true); adm.setAttribute('data-id', data.id);
            adm.innerHTML = `
                <div class="admin-list-content">
                    <div class="drag-handle">☰</div>
                    <div><strong>${data.judul}</strong></div>
                </div>
                <div>
                    <button class="btn-edit" style="margin-right:5px;">Edit</button>
                    <button class="btn-hapus">Hapus</button>
                </div>
            `;
            adm.querySelector('.btn-edit').onclick = () => {
                document.getElementById('skill-judul').value = data.judul;
                document.getElementById('skill-desc').value = data.deskripsi || "";
                editStateId.skill = data.id;
                document.getElementById('btn-tambah-skill').innerText = 'Simpan Perubahan Skill';
                document.getElementById('btn-batal-edit-skill').classList.remove('hidden');
            };
            adm.querySelector('.btn-hapus').onclick = async () => { if(confirm(`Hapus skill ${data.judul}?`)) { await deleteDoc(doc(db, "skills", data.id)); loadSkills(); } };
            adminList.appendChild(adm);
        });

        enableDragAndDrop('admin-list-skill', 'skills', loadSkills);
    } catch (e) { console.error(e); }
}

// ==========================================
// 4. PENGALAMAN & PROJEK
// ==========================================
document.getElementById('exp-tipe-desc').addEventListener('change', function() {
    if(this.value === 'poin') {
        document.getElementById('exp-desc').classList.add('hidden'); document.getElementById('exp-poin-wrapper').classList.remove('hidden');
    } else {
        document.getElementById('exp-desc').classList.remove('hidden'); document.getElementById('exp-poin-wrapper').classList.add('hidden');
    }
});

document.getElementById('btn-add-poin-input').addEventListener('click', () => {
    const container = document.getElementById('exp-poin-container'); const wrap = document.createElement('div');
    wrap.style.display = "flex"; wrap.style.marginBottom = "5px";
    wrap.innerHTML = `<input type="text" class="input-poin-item" placeholder="Isi poin..."><button class="btn-hapus" style="margin:5px 0 15px 5px;" onclick="this.parentElement.remove()">X</button>`;
    container.appendChild(wrap);
});

document.getElementById('btn-tambah-exp').addEventListener('click', async () => {
    const judul = document.getElementById('exp-judul').value;
    if (!judul) return alert("Nama pengalaman wajib diisi!");
    
    const tipe = document.getElementById('exp-tipe-desc').value;
    let descText = ""; let arrPoin = [];
    if (tipe === 'paragraf') { descText = document.getElementById('exp-desc').value || ""; } 
    else { document.querySelectorAll('.input-poin-item').forEach(inp => { if(inp.value.trim() !== "") arrPoin.push(inp.value.trim()); }); }

    const payload = {
        judul: judul, tipe: tipe, deskripsi: descText, poin_array: arrPoin,
        link: document.getElementById('exp-link').value || "", bukti_file_url: document.getElementById('exp-file').value || "", 
        timestamp: Date.now()
    };

    try {
        if (editStateId.exp) {
            await updateDoc(doc(db, "pengalaman", editStateId.exp), payload);
        } else {
            payload.order = Date.now();
            await addDoc(collection(db, "pengalaman"), payload);
        }
        resetForm('exp'); loadPengalaman();
    } catch (e) { alert("Error: " + e.message); }
});

async function loadPengalaman() {
    const pubGrid = document.getElementById('tampil-pengalaman');
    const adminList = document.getElementById('admin-list-exp');
    
    try {
        const querySnapshot = await getDocs(collection(db, "pengalaman"));
        pubGrid.innerHTML = ""; adminList.innerHTML = "";
        
        let dataArray = [];
        querySnapshot.forEach(doc => dataArray.push({ id: doc.id, ...doc.data() }));
        dataArray.sort((a, b) => (a.order || a.timestamp) - (b.order || b.timestamp));

        dataArray.forEach((data) => {
            // --- PUBLIC UI GRID ---
            const card = document.createElement('div'); card.className = "exp-card";
            const imgUrl = data.bukti_file_url ? data.bukti_file_url : "https://via.placeholder.com/300x160?text=Tanpa+Gambar";
            let contentHTML = "";
            if (data.tipe === 'poin' && data.poin_array) {
                contentHTML = `<ul class="exp-desc-list">${data.poin_array.map(p => `<li>${p}</li>`).join('')}</ul>`;
            } else { contentHTML = `<p class="exp-desc-text">${data.deskripsi || ""}</p>`; }

            card.innerHTML = `
                <div class="exp-frame"><img src="${imgUrl}" onerror="this.src='https://via.placeholder.com/300x160?text=No+Image'"></div>
                <div class="exp-content">
                    <h3 style="font-size: 16px; margin-bottom: 10px; color:var(--nav-color);">${data.judul}</h3>
                    ${contentHTML}
                </div>
                ${data.link ? `<div style="text-align:center; margin-top:auto;"><a href="${data.link}" target="_blank" style="color: var(--btn-color); text-decoration: none; font-weight: bold;">[Lihat Projek]</a></div>` : ''}
            `;
            pubGrid.appendChild(card);

            // --- ADMIN UI ---
            const adm = document.createElement('div');
            adm.className = "admin-list-item"; adm.setAttribute('draggable', true); adm.setAttribute('data-id', data.id);
            adm.innerHTML = `
                <div class="admin-list-content">
                    <div class="drag-handle">☰</div>
                    <div><strong>${data.judul}</strong> <br> <small>Tipe: ${data.tipe}</small></div>
                </div>
                <div>
                    <button class="btn-edit" style="margin-right:5px;">Edit</button>
                    <button class="btn-hapus">Hapus</button>
                </div>
            `;
            adm.querySelector('.btn-edit').onclick = () => {
                resetForm('exp'); 
                document.getElementById('exp-judul').value = data.judul; document.getElementById('exp-link').value = data.link || "";
                document.getElementById('exp-file').value = data.bukti_file_url || ""; document.getElementById('exp-tipe-desc').value = data.tipe || "paragraf";
                if(data.tipe === 'poin') {
                    document.getElementById('exp-desc').classList.add('hidden'); document.getElementById('exp-poin-wrapper').classList.remove('hidden');
                    const cont = document.getElementById('exp-poin-container');
                    if(data.poin_array) {
                        data.poin_array.forEach(pt => {
                            const wrap = document.createElement('div'); wrap.style.display = "flex"; wrap.style.marginBottom = "5px";
                            wrap.innerHTML = `<input type="text" class="input-poin-item" value="${pt}"><button class="btn-hapus" style="margin:5px 0 15px 5px;" onclick="this.parentElement.remove()">X</button>`;
                            cont.appendChild(wrap);
                        });
                    }
                } else { document.getElementById('exp-desc').value = data.deskripsi || ""; }
                
                editStateId.exp = data.id;
                document.getElementById('btn-tambah-exp').innerText = 'Simpan Perubahan';
                document.getElementById('btn-batal-edit-exp').classList.remove('hidden');
            };
            adm.querySelector('.btn-hapus').onclick = async () => { if(confirm(`Hapus ${data.judul}?`)) { await deleteDoc(doc(db, "pengalaman", data.id)); loadPengalaman(); } };
            adminList.appendChild(adm);
        });

        enableDragAndDrop('admin-list-exp', 'pengalaman', loadPengalaman);

    } catch (e) { console.error(e); }
}

// INIT SEMUA
window.onload = () => {
    loadBiodata();
    loadSkills();
    loadPengalaman(); 
};