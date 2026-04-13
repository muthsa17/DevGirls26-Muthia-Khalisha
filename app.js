let tasks = JSON.parse(localStorage.getItem('studytracker_tasks') || '[]');
let currentFilter = 'all';

document.addEventListener('DOMContentLoaded', () => {
    const now = new Date();
    const dateString = now.toLocaleDateString('id-ID', { 
                        day: 'numeric',
                        month: 'long',  
                        year: 'numeric'
                     });
    document.getElementById('DDate').textContent = dateString;
    
    // tema tersimpan di local
    const savedTheme = localStorage.getItem('studytracker_theme') || 'light';
    setTheme(savedTheme);
    
    renderTasks();

    //ketika tombol di klik
    document.getElementById('themeToggle').addEventListener('click', () => { 
        const currentTheme = document.documentElement.getAttribute('data-bs-theme');
        const newTheme = currentTheme === 'light' ? 'dark' : 'light';
        setTheme(newTheme);
    });

    //setiing theme to light or dark mode
    function setTheme(theme) { 
        document.documentElement.setAttribute('data-bs-theme', theme);
        document.getElementById('toggleIcon').className =
            theme === 'dark' ? 'bi bi-sun-fill' : 'bi bi-moon-fill';
        localStorage.setItem('studytracker_theme', theme);
    }

    // Event: tekan Enter di field nama tugas
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && document.getElementById('taskName') === document.activeElement) {
            addTask();
        }
    });

    // Event: pencarian real-time
    document.getElementById('searchInput').addEventListener('input', renderTasks);
});

// SIMPAN LOKAL STORAGE
function save(){
    localStorage.setItem('studytracker_tasks', JSON.stringify(tasks));
}

// TAMBAH TUGAS
function addTask(){
    const nameInput = document.getElementById('taskName');
    const name = nameInput.value.trim();
    if(name === '') return alert('Nama tugas tidak boleh kosong!');
    const newTask = {
        id: Date.now(),
        name,
        desc: document.getElementById('taskDesc').value.trim(),
        category: document.getElementById('taskCategory').value,
        deadline: document.getElementById('taskDeadline').value,
        done: false
    };
    tasks.push(newTask);
    save();
    nameInput.value = '';
    document.getElementById('taskDesc').value = '';
    document.getElementById('taskCategory').value = 'Umum';
    document.getElementById('taskDeadline').value = '';
    renderTasks();
}

function renderTasks() {
    const searchQuery = document.getElementById('searchInput').value.toLowerCase();

    const filtered = tasks.filter(task => {
        const matchFilter =
            currentFilter === 'all' ||
            (currentFilter === 'done'    && task.done) ||
            (currentFilter === 'pending' && !task.done);

        const matchSearch =
            task.name.toLowerCase().includes(searchQuery) ||
            task.desc.toLowerCase().includes(searchQuery) ||
            task.category.toLowerCase().includes(searchQuery);

        return matchFilter && matchSearch;
    });

    // Hitung statistik
    const total   = tasks.length;
    const done    = tasks.filter(t => t.done).length;
    const pending = total - done;
    const percent = total ? Math.round((done / total) * 100) : 0;

    // Update ringkasan
    document.getElementById('statTotal').textContent    = total;
    document.getElementById('statDone').textContent     = done;
    document.getElementById('statPending').textContent  = pending;
    document.getElementById('progressPct').textContent  = percent + '%';
    document.getElementById('progressBar').style.width  = percent + '%';
    document.getElementById('progressBar').setAttribute('aria-valuenow', percent);
    document.getElementById('taskCountBadge').textContent = filtered.length;

    const list = document.getElementById('taskList');

    if (filtered.length === 0) {
        list.innerHTML = `
            <div class="empty-state">
                <i class="bi bi-clipboard2-x"></i>
                <p class="text-secondary">${searchQuery
                    ? 'Tidak ada tugas yang cocok dengan pencarianmu.'
                    : 'Belum ada tugas. Yuk tambahkan tugas baru!'
                    }</p>
            </div>`;
        return;
    }

    list.innerHTML = filtered.map(task => {
        const dl = deadlineStatus(task.deadline);
        return `
            <div class="task-item card ${task.done ? 'done' : ''}" id="task-${task.id}">
                <div class="task-check ${task.done ? 'checked' : ''}" onclick="toggleDone(${task.id})">
                    ${task.done ? '<i class="bi bi-check-lg"></i>' : ''}
                </div>
                <div class="task-body">
                    <div class="task-name">${escHtml(task.name)}</div>
                    ${task.desc ? `<div class="task-desc">${escHtml(task.desc)}</div>` : ''}
                    <div class="task-meta">
                        <span class="badge-cat badge text-bg-primary">${escHtml(task.category)}</span>
                        ${dl ? `
                            <span class="badge-deadline badge ${dl.bsClass}">
                            <i class="bi bi-calendar3"></i> ${dl.label}
                            </span>` : ''
                        }
                    </div>
                </div>
                <div class="task-actions">
                    <button class="btn-icon" onclick="deleteTask(${task.id})" title="Hapus tugas">
                        <i class="bi bi-trash3"></i>
                    </button>
                </div>
            </div>`;
    }).join('');
}

// ---
// TANDAI SELESAI / BELUM
function toggleDone(id) {
    const task = tasks.find(t => t.id === id);
    if (task) {
        task.done = !task.done;
        save();
        renderTasks();
    }
}

// HAPUS TUGAS
function deleteTask(id) {
    tasks = tasks.filter(t => t.id !== id);
    save();
    renderTasks();
}

// SET FILTER
function setFilter(filterValue, clickedBtn) {
    currentFilter = filterValue;
    document.querySelectorAll('.filter-btn').forEach(btn => {
        btn.classList.remove('btn-primary');
        btn.classList.add('btn-outline-secondary');
    });
    clickedBtn.classList.remove('btn-outline-secondary');
    clickedBtn.classList.add('btn-primary');
    renderTasks();
}

// STATUS DEADLINE
function deadlineStatus(deadlineStr) {
    if (!deadlineStr) return null;

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const deadline = new Date(deadlineStr);
    deadline.setHours(0, 0, 0, 0);

    const diffDays = Math.round((deadline - today) / 86400000);

    if (diffDays < 0)   return { label: 'Lewat deadline',        bsClass: 'text-bg-danger' };
    if (diffDays === 0) return { label: 'Deadline hari ini!',    bsClass: 'text-bg-warning' };
    if (diffDays <= 3)  return { label: `${diffDays} hari lagi`, bsClass: 'text-bg-warning' };

    return {
        label: deadline.toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' }),
        bsClass: 'text-bg-secondary'
    };
}

// ESCAPE HTML (mencegah XSS)
function escHtml(str) {
    return str
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
}