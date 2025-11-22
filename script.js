// --- 1. Supabase初期化 ---
const SUPABASE_URL = 'https://dsuiaaaxwwvhiqktgvoi.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRzdWlhYWF4d3d2aGlxa3Rndm9pIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjMxODcxODQsImV4cCI6MjA3ODc2MzE4NH0.ng7SlvSE25Ef_EZZeTe5F2tGcHNco1x1iZ_Nx4ewohg';
const { createClient } = supabase;
const supabaseClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// --- 1. データ管理 (簡易Store) ---
dayjs.locale('ja');
dayjs.extend(window.dayjs_plugin_relativeTime);
dayjs.extend(window.dayjs_plugin_isBetween);


let store = {
  clients: [],
  projects: [],
  majorCats: [],
  minorCats: [],
  tasks: []
};

let currentClientId = null;
let currentProjectId = null;

// --- 3. Supabase CRUD操作 ---
async function loadAllData() {
  try {
    const [clients, projects, majors, minors, tasks] = await Promise.all([
      supabaseClient.from('clients').select('*').order('created_at'),
      supabaseClient.from('projects').select('*').order('created_at'),
      supabaseClient.from('major_cats').select('*').order('sort_order'),
      supabaseClient.from('minor_cats').select('*').order('sort_order'),
      supabaseClient.from('tasks').select('*').order('created_at')
    ]);

    store.clients = clients.data || [];
    store.projects = projects.data || [];
    store.majorCats = majors.data || [];
    store.minorCats = minors.data || [];
    store.tasks = tasks.data || [];

    renderApp();
  } catch (error) {
    console.error('データ読み込みエラー:', error);
    alert('データの読み込みに失敗しました');
  }
}

async function saveClient(name) {
  const { data, error } = await supabaseClient.from('clients').insert({ name }).select();
  if (error) throw error;
  return data[0];
}

async function saveProject(clientId, name) {
  const { data, error } = await supabaseClient.from('projects')
    .insert({ client_id: clientId, name }).select();
  if (error) throw error;
  return data[0];
}

async function saveMajorCat(projectId, name) {
  const { data, error } = await supabaseClient.from('major_cats')
    .insert({ project_id: projectId, name }).select();
  if (error) throw error;
  return data[0];
}

async function saveMinorCat(majorId, name) {
  const { data, error } = await supabaseClient.from('minor_cats')
    .insert({ major_id: majorId, name }).select();
  if (error) throw error;
  return data[0];
}

async function saveTask(task) {
  const { data, error } = await supabaseClient.from('tasks')
    .insert({
      minor_id: task.minorId,
      name: task.name,
      start_date: task.startDate,
      end_date: task.endDate,
      status: task.status,
      memo: task.memo
    }).select();
  if (error) throw error;
  return data[0];
}

async function updateTask(id, updates) {
  const dbUpdates = {};
  if (updates.name) dbUpdates.name = updates.name;
  if (updates.startDate) dbUpdates.start_date = updates.startDate;
  if (updates.endDate) dbUpdates.end_date = updates.endDate;
  if (updates.status !== undefined) dbUpdates.status = updates.status;
  if (updates.memo !== undefined) dbUpdates.memo = updates.memo;
  if (updates.minorId) dbUpdates.minor_id = updates.minorId;

  const { error } = await supabaseClient.from('tasks').update(dbUpdates).eq('id', id);
  if (error) throw error;
}

async function updateMajorCat(id, name, sortOrder) {
  const updates = {};
  if (name) updates.name = name;
  if (sortOrder !== undefined) updates.sort_order = sortOrder;
  const { error } = await supabaseClient.from('major_cats').update(updates).eq('id', id);
  if (error) throw error;
}

async function updateMinorCat(id, name, sortOrder) {
  const updates = {};
  if (name) updates.name = name;
  if (sortOrder !== undefined) updates.sort_order = sortOrder;
  const { error } = await supabaseClient.from('minor_cats').update(updates).eq('id', id);
  if (error) throw error;
}

async function updateProjectInfo(id, overview, stakeholders) {
  const { error } = await supabaseClient.from('projects')
    .update({ overview, stakeholders }).eq('id', id);
  if (error) throw error;
}

async function resetData() {
  if (!confirm('全データを削除して初期化しますか？')) return;

  try {
    await Promise.all([
      supabaseClient.from('tasks').delete().neq('id', '00000000-0000-0000-0000-000000000000'),
      supabaseClient.from('minor_cats').delete().neq('id', '00000000-0000-0000-0000-000000000000'),
      supabaseClient.from('major_cats').delete().neq('id', '00000000-0000-0000-0000-000000000000'),
      supabaseClient.from('projects').delete().neq('id', '00000000-0000-0000-0000-000000000000'),
      supabaseClient.from('clients').delete().neq('id', '00000000-0000-0000-0000-000000000000')
    ]);
    location.reload();
  } catch (error) {
    console.error('削除エラー:', error);
    alert('削除に失敗しました');
  }
}

// --- 4. 初期化 ---
window.onload = async () => {
  await loadAllData();
  renderClientSelect();
  setupEventListeners();

  // URL共有機能削除



  // 初期履歴の設定
  history.replaceState({ view: 'home' }, '', '#home');
  showHome(false); // 履歴追加なしで表示
};

// ブラウザの戻る/進むボタンのハンドリング
window.addEventListener('popstate', (event) => {
  if (!event.state) {
    showHome(false);
    return;
  }

  if (event.state.view === 'home') {
    showHome(false);
  } else if (event.state.view === 'gantt' && event.state.projectId) {
    loadProject(event.state.projectId, false);
  }
});

function displayTodayDate() {
  const today = dayjs();
  document.getElementById('todayDate').textContent = today.format('YYYY年M月D日 (dd)');
}

function setupEventListeners() {
  document.getElementById('clientSelect').addEventListener('change', (e) => {
    currentClientId = e.target.value;
    currentProjectId = null;
    renderProjectSelect();
    toggleGanttView(false);
  });

  document.getElementById('projectSelect').addEventListener('change', (e) => {
    currentProjectId = e.target.value;
    toggleGanttView(!!currentProjectId);
    if (currentProjectId) renderGantt();
  });

  // Enter support for modals (IME対応)
  const inputs = document.querySelectorAll('#inputModal input, #inputModal textarea');
  inputs.forEach(input => {
    let isComposing = false;

    input.addEventListener('compositionstart', () => {
      isComposing = true;
    });

    input.addEventListener('compositionend', () => {
      isComposing = false;
    });

    input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && !e.shiftKey && !isComposing) {
        e.preventDefault();
        submitModal();
      }
    });
  });
}

function showHome(addHistory = true) {
  document.getElementById('homeView').classList.remove('hidden');
  document.getElementById('ganttView').classList.add('hidden');
  document.getElementById('projectInfoArea').classList.add('hidden');
  currentProjectId = null;
  renderClientProjectList();
  updateDashboard(); // ダッシュボード更新

  if (addHistory) {
    history.pushState({ view: 'home' }, '', '#home');
  }
}

function showGantt() {
  document.getElementById('homeView').classList.add('hidden');
  document.getElementById('mainArea').classList.remove('hidden');
  document.getElementById('navControls').classList.remove('hidden');
}

// --- 5. 今日のタスクレコメンド ---
function renderTodayRecommendations() {
  const today = dayjs();
  const container = document.getElementById('recommendationsList');

  const todayTasks = store.tasks.filter(t => {
    const start = dayjs(t.start_date);
    const end = dayjs(t.end_date);
    return today.isBetween(start, end, 'day', '[]') && t.status !== 2;
  });

  if (todayTasks.length === 0) {
    container.innerHTML = '<div class="text-gray-400 text-sm">今日のタスクはありません</div>';
    return;
  }

  container.innerHTML = '';
  todayTasks.slice(0, 5).forEach(task => {
    const minor = store.minorCats.find(m => m.id === task.minor_id);
    const major = minor ? store.majorCats.find(maj => maj.id === minor.major_id) : null;
    const project = major ? store.projects.find(p => p.id === major.project_id) : null;

    const card = document.createElement('div');
    card.className = 'task-recommendation cursor-pointer';
    card.onclick = () => {
      if (project) loadProject(project.client_id, project.id);
    };
    card.innerHTML = `
      <div class="flex justify-between items-start">
        <div class="flex-1">
          <div class="font-bold text-lg">${task.name}</div>
          <div class="text-xs opacity-90 mt-1">
            ${project ? project.name : ''} → ${major ? major.name : ''} → ${minor ? minor.name : ''}
          </div>
        </div>
        <div class="text-xs opacity-75">
          ${task.status === 0 ? '未着手' : '進行中'}
        </div>
      </div>
    `;
    container.appendChild(card);
  });
}

// --- 6. 描画ロジック ---
function renderClientSelect() {
  const select = document.getElementById('clientSelect');
  select.innerHTML = '<option value="">クライアント選択...</option>';
  store.clients.forEach(c => {
    const op = document.createElement('option');
    op.value = c.id;
    op.innerText = c.name;
    if (c.id === currentClientId) op.selected = true;
    select.appendChild(op);
  });
}

function renderProjectSelect() {
  const select = document.getElementById('projectSelect');
  const addBtn = document.getElementById('addProjectBtn');
  select.innerHTML = '<option value="">案件を選択...</option>';

  if (!currentClientId) {
    select.disabled = true;
    addBtn.classList.add('cursor-not-allowed', 'text-gray-400');
    addBtn.disabled = true;
    return;
  }

  select.disabled = false;
  addBtn.classList.remove('cursor-not-allowed', 'text-gray-400');
  addBtn.classList.add('text-indigo-600');
  addBtn.disabled = false;

  const projects = store.projects.filter(p => p.client_id === currentClientId);
  projects.forEach(p => {
    const op = document.createElement('option');
    op.value = p.id;
    op.innerText = p.name;
    select.appendChild(op);
  });
}

// --- ダッシュボード機能 ---
function updateDashboard() {
  updateClock();
  fetchWeather();
  fetchNews();
  renderUpcomingTasks();

  // 時計は1分ごとに更新
  if (window.clockInterval) clearInterval(window.clockInterval);
  window.clockInterval = setInterval(updateClock, 60000);
}

function updateClock() {
  const now = dayjs();
  const clockEl = document.getElementById('digitalClock');
  const dateEl = document.getElementById('todayDate');

  if (clockEl) clockEl.textContent = now.format('HH:mm');
  if (dateEl) dateEl.textContent = now.format('YYYY年M月D日 (ddd)');
}

async function fetchWeather() {
  const weatherEl = document.getElementById('weatherInfo');
  if (!weatherEl) return;

  try {
    // 仙台市の座標
    const lat = 38.2682;
    const lon = 140.8694;
    const res = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current_weather=true`);
    const data = await res.json();
    const temp = data.current_weather.temperature;
    const code = data.current_weather.weathercode;

    // WMO Weather interpretation codes (simplified)
    let icon = '☀️';
    if (code >= 1 && code <= 3) icon = '⛅';
    if (code >= 45 && code <= 48) icon = '🌫️';
    if (code >= 51 && code <= 67) icon = '🌧️';
    if (code >= 71 && code <= 77) icon = '❄️';
    if (code >= 95) icon = '⚡';

    weatherEl.innerHTML = `<span class="text-2xl mr-2">${icon}</span><span class="text-lg font-bold">${temp}°C</span><span class="text-xs text-gray-500 ml-1">仙台市</span>`;
  } catch (e) {
    console.error('Weather error:', e);
    weatherEl.innerHTML = '<span class="text-sm text-gray-400">Weather unavailable</span>';
  }
}

async function fetchNews() {
  const newsList = document.getElementById('newsList');
  if (!newsList) return;

  try {
    // Google News RSS (Japan) -> rss2json
    const res = await fetch('https://api.rss2json.com/v1/api.json?rss_url=https%3A%2F%2Fnews.google.com%2Frss%3Fhl%3Dja%26gl%3DJP%26ceid%3DJP%3Aja');
    const data = await res.json();

    if (data.status !== 'ok') throw new Error('RSS API error');

    const items = data.items.slice(0, 5);
    let html = '<ul class="space-y-3">';
    items.forEach(item => {
      const img = item.thumbnail || item.enclosure?.link || '';
      const descImgMatch = item.description.match(/<img[^>]+src="([^">]+)"/);
      const finalImg = img || (descImgMatch ? descImgMatch[1] : null);

      const imgHtml = finalImg
        ? `<img src="${finalImg}" class="w-16 h-16 object-cover rounded-md mr-3 flex-shrink-0 bg-gray-200" onerror="this.style.display='none'">`
        : `<div class="w-16 h-16 rounded-md mr-3 flex-shrink-0 bg-indigo-50 flex items-center justify-center text-indigo-200"><i class="fas fa-newspaper"></i></div>`;

      html += `
        <li class="flex items-start group cursor-pointer hover:bg-gray-50 p-2 rounded transition-colors border-b border-gray-100 last:border-0" onclick="window.open('${item.link}', '_blank')">
          <div class="flex-1 min-w-0">
            <a class="text-sm text-gray-700 group-hover:text-indigo-600 font-medium line-clamp-2 transition-colors leading-snug">${item.title}</a>
            <span class="text-[10px] text-gray-400 block mt-1">${dayjs(item.pubDate).fromNow()}</span>
          </div>
        </li>
      `;
    });
    html += '</ul>';

    html += `
      <div class="mt-4 text-center">
        <button onclick="openLocalNewsModal()" class="text-xs text-indigo-600 hover:text-indigo-800 font-medium border border-indigo-200 rounded-full px-3 py-1 hover:bg-indigo-50 transition-colors">
          <i class="fas fa-newspaper mr-1"></i> もっとニュースを見る
        </button>
      </div>
    `;

    newsList.innerHTML = html;
  } catch (e) {
    console.error('News error:', e);
    newsList.innerHTML = '<div class="text-center py-4 text-gray-400 text-sm">ニュースを読み込めませんでした</div>';
  }
}

// マウスエフェクト
document.addEventListener('mousemove', (e) => {
  // Global glow
  document.body.style.setProperty('--mouse-x', `${e.clientX}px`);
  document.body.style.setProperty('--mouse-y', `${e.clientY}px`);

  // Element specific glow
  document.querySelectorAll('.mouse-glow').forEach(el => {
    const rect = el.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    el.style.setProperty('--x', `${x}px`);
    el.style.setProperty('--y', `${y}px`);
  });
});

function openLocalNewsModal() {
  const modal = document.getElementById('localNewsModal');
  modal.classList.remove('hidden');
  modal.classList.add('flex');
  fetchLocalNews();
}

async function fetchLocalNews() {
  const container = document.getElementById('localNewsList');
  container.innerHTML = '<div class="text-center py-8"><div class="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600 mx-auto"></div></div>';

  try {
    const rssUrl = encodeURIComponent('https://news.google.com/rss?hl=ja&gl=JP&ceid=JP:ja');
    const res = await fetch(`https://api.rss2json.com/v1/api.json?rss_url=${rssUrl}`);
    const data = await res.json();

    if (data.status !== 'ok') throw new Error('RSS API error');

    let html = '<ul class="space-y-4">';
    data.items.slice(0, 15).forEach(item => {
      html += `
        <li class="flex items-start group cursor-pointer hover:bg-gray-50 p-2 rounded transition-colors border-b border-gray-100 last:border-0 mouse-glow" onclick="window.open('${item.link}', '_blank')">
          <div class="flex-1">
            <h4 class="text-sm font-bold text-gray-800 group-hover:text-indigo-600 mb-1 leading-snug">${item.title}</h4>
            <p class="text-xs text-gray-500 line-clamp-2 mb-1">${item.description.replace(/<[^>]+>/g, '').substring(0, 100)}...</p>
            <span class="text-[10px] text-gray-400">${dayjs(item.pubDate).format('YYYY/MM/DD HH:mm')}</span>
          </div>
        </li>
      `;
    });
    html += '</ul>';
    container.innerHTML = html;

  } catch (e) {
    console.error('Local news error:', e);
    container.innerHTML = '<div class="text-center py-8 text-red-500">ニュースの取得に失敗しました</div>';
  }
}

function renderUpcomingTasks() {
  const list = document.getElementById('upcomingTasksList');
  const countEl = document.getElementById('upcomingCount');
  if (!list) return;

  list.classList.add('max-h-80', 'overflow-y-auto', 'scrollbar-hide');

  const today = dayjs();

  // タスクの重複排除とフィルタリング
  // タスクIDをキーにして完全に重複を排除
  const uniqueTasksMap = new Map();
  store.tasks.forEach(t => {
    const end = dayjs(t.end_date);
    // 完了しておらず、終了日が今日以降のもの
    if (t.status !== 2 && end.isAfter(today.subtract(1, 'day'))) {
      // タスクIDをキーとして使用し、完全に重複を排除
      if (!uniqueTasksMap.has(t.id)) {
        uniqueTasksMap.set(t.id, t);
      }
    }
  });

  const tasks = Array.from(uniqueTasksMap.values()).sort((a, b) => dayjs(a.end_date).diff(dayjs(b.end_date)));

  if (countEl) countEl.textContent = `${tasks.length} tasks`;

  if (tasks.length === 0) {
    list.innerHTML = `<div class="text-center py-8 text-gray-400"><p>No upcoming tasks</p></div>`;
    return;
  }

  let html = '';
  tasks.forEach(t => {
    const minor = store.minorCats.find(m => m.id === t.minor_id);
    const major = minor ? store.majorCats.find(m => m.id === minor.major_id) : null;
    const project = major ? store.projects.find(p => p.id === major.project_id) : null;
    const client = project ? store.clients.find(c => c.id === project.client_id) : null;

    const daysLeft = dayjs(t.end_date).diff(today, 'day');
    let timeClass = 'text-gray-500';
    if (daysLeft < 0) { timeClass = 'text-red-500 font-bold'; timeText = 'Overdue'; }
    else if (daysLeft === 0) { timeClass = 'text-orange-500 font-bold'; timeText = 'Today'; }
    else if (daysLeft === 1) { timeClass = 'text-indigo-500'; timeText = 'Tomorrow'; }
    let timeText = `${daysLeft} days left`;

    html += `
      <div class="flex items-center p-3 bg-gray-50 rounded-lg hover:bg-indigo-50 transition-colors group cursor-pointer border-b border-gray-100 last:border-0 mouse-glow" onclick="loadProject('${project?.id}')">
        <div class="w-2 h-2 rounded-full ${t.status === 0 ? 'bg-gray-300' : 'bg-blue-500'} mr-3 flex-shrink-0"></div>
        <div class="flex-1 min-w-0">
          <h4 class="text-sm font-bold text-gray-800 truncate">${t.name}</h4>
          <p class="text-xs text-gray-500 truncate">
            <span class="font-medium text-indigo-600">${client?.name || '?'}</span> / ${project?.name || '?'}
          </p>
          <p class="text-[10px] text-gray-400 truncate mt-0.5">
            ${major?.name || '?'} > ${minor?.name || '?'}
          </p>
        </div>
        <div class="text-xs ${timeClass} whitespace-nowrap ml-2 flex-shrink-0 text-right">
          <div>${timeText}</div>
          <div class="text-[10px] text-gray-300 font-normal">${dayjs(t.end_date).format('MM/DD')}</div>
        </div>
      </div>
    `;
  });

  list.innerHTML = html;
}

function renderClientProjectList() {
  const container = document.getElementById('clientProjectList');
  if (!container) return;

  if (store.clients.length === 0 && store.projects.length === 0) {
    document.getElementById('emptyState').classList.remove('hidden');
    document.getElementById('emptyState').classList.add('flex');
    container.innerHTML = '';
    return;
  }

  document.getElementById('emptyState').classList.add('hidden');
  document.getElementById('emptyState').classList.remove('flex');

  let html = '';

  store.clients.forEach((client, index) => {
    const clientProjects = store.projects.filter(p => p.client_id === client.id);
    const delay = index * 100;

    html += `
      <div class="glass rounded-2xl shadow-sm overflow-hidden hover-card group animate-fade-in mouse-glow" style="animation-delay: ${delay}ms">
        <div class="p-5 border-b border-gray-100/50 bg-gradient-to-r from-gray-50/50 to-white/50 flex justify-between items-center">
          <h3 class="font-bold text-gray-800 truncate flex items-center text-lg cursor-pointer hover:text-indigo-600 transition-colors" onclick="openClientEditModal('${client.id}')" title="クリックして編集">
            <div class="w-8 h-8 rounded-lg bg-indigo-100 text-indigo-600 flex items-center justify-center mr-3 shadow-sm">
              <i class="fas fa-building text-sm"></i>
            </div>
            ${client.name}
            <i class="fas fa-pen text-xs text-gray-300 ml-2 opacity-0 group-hover:opacity-100 transition-opacity"></i>
          </h3>
          <span class="text-xs font-bold bg-white/80 backdrop-blur text-indigo-600 px-3 py-1 rounded-full shadow-sm border border-indigo-50">
            ${clientProjects.length} Projects
          </span>
        </div>
        
        <div class="p-5 bg-white/60">
          ${clientProjects.length > 0 ? `
            <div class="space-y-3">
              ${clientProjects.map(project => {
      const pTasks = store.tasks.filter(t => {
        const minor = store.minorCats.find(m => m.id === t.minor_id);
        const major = minor ? store.majorCats.find(maj => maj.id === minor.major_id) : null;
        return major && major.project_id === project.id;
      });
      const done = pTasks.filter(t => t.status === 2).length;
      const progress = pTasks.length > 0 ? Math.round((done / pTasks.length) * 100) : 0;

      return `
                <div onclick="loadProject('${project.id}')" 
                     class="group/item flex items-center justify-between p-3 rounded-xl hover:bg-white hover:shadow-md transition-all cursor-pointer border border-transparent hover:border-indigo-100 mouse-glow">
                  <div class="flex-1 min-w-0 mr-4">
                    <div class="font-bold text-gray-700 text-sm truncate group-hover/item:text-indigo-600 transition-colors">
                      ${project.name}
                    </div>
                    <div class="flex items-center mt-2 space-x-3">
                      <div class="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                        <div class="h-full bg-gradient-to-r from-indigo-400 to-purple-400 rounded-full transition-all duration-500" style="width: ${progress}%"></div>
                      </div>
                      <span class="text-[10px] font-bold text-gray-400 font-mono">${progress}%</span>
                    </div>
                  </div>
                  <div class="w-6 h-6 rounded-full bg-gray-50 group-hover/item:bg-indigo-50 flex items-center justify-center transition-colors">
                    <i class="fas fa-chevron-right text-gray-300 text-xs group-hover/item:text-indigo-500 transition-colors"></i>
                  </div>
                </div>
                `;
    }).join('')}
            </div>
          ` : `
            <div class="text-center py-8">
              <div class="w-12 h-12 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-3 text-gray-300">
                <i class="fas fa-folder-open"></i>
              </div>
              <p class="text-xs text-gray-400 mb-4 font-medium">No projects yet</p>
              <button onclick="currentClientId='${client.id}'; openModal('project')" 
                      class="text-xs bg-white border border-indigo-200 text-indigo-600 px-4 py-2 rounded-lg hover:bg-indigo-50 font-bold transition-all shadow-sm hover:shadow">
                <i class="fas fa-plus mr-1"></i>Add Project
              </button>
            </div>
          `}
        </div>
      </div>
    `;
  });

  container.innerHTML = html;
}

function loadProject(pId, addHistory = true) {
  const project = store.projects.find(p => p.id === pId);
  if (!project) {
    console.error('Project not found:', pId);
    return;
  }

  currentProjectId = pId;
  currentClientId = project.client_id;

  renderClientSelect();
  renderProjectSelect();
  showGantt();
  toggleGanttView(true);
  renderGantt();

  if (addHistory) {
    history.pushState({ view: 'gantt', projectId: pId }, '', `#project / ${pId} `);
  }
}

function toggleGanttView(show) {
  const empty = document.getElementById('emptyState');
  const gantt = document.getElementById('ganttView');
  const info = document.getElementById('projectInfoArea');

  if (show) {
    empty.classList.add('hidden');
    gantt.classList.remove('hidden');
    info.classList.remove('hidden');
    updateProjectInfoArea();
  } else {
    empty.classList.remove('hidden');
    gantt.classList.add('hidden');
    info.classList.add('hidden');
  }
}

function updateProjectInfoArea() {
  const p = store.projects.find(x => x.id === currentProjectId);
  if (!p) return;
  document.getElementById('infoProjectName').innerText = p.name;
  document.getElementById('infoOverview').innerText = p.overview || '案件の概要は未設定です。';
  document.getElementById('infoStakeholders').innerText = p.stakeholders || '未設定';
}

async function openProjectInfoModal() {
  const p = store.projects.find(x => x.id === currentProjectId);
  if (!p) return;
  document.getElementById('editProjectOverview').value = p.overview || '';
  document.getElementById('editProjectStakeholders').value = p.stakeholders || '';

  const m = document.getElementById('projectInfoModal');
  m.classList.remove('hidden');
  m.classList.add('flex');
}

async function saveProjectInfo() {
  const p = store.projects.find(x => x.id === currentProjectId);
  if (!p) return;

  const overview = document.getElementById('editProjectOverview').value;
  const stakeholders = document.getElementById('editProjectStakeholders').value;

  try {
    await updateProjectInfo(p.id, overview, stakeholders);
    p.overview = overview;
    p.stakeholders = stakeholders;
    updateProjectInfoArea();
  } catch (error) {
    console.error('保存エラー:', error);
    alert('保存に失敗しました');
  }

  document.getElementById('projectInfoModal').classList.add('hidden');
  document.getElementById('projectInfoModal').classList.remove('flex');
}

let CELL_WIDTH = 28; // 1日の幅(px) - 可変 (旧40pxの70%)
let CELL_HEIGHT = 34; // 1行の高さ(px) - 可変 (旧48pxの70%)
let currentZoom = 100;

function changeZoom(delta) {
  const newZoom = currentZoom + delta;
  if (newZoom < 50 || newZoom > 200) return;
  currentZoom = newZoom;

  document.getElementById('zoomLevelDisplay').innerText = `${currentZoom}%`;

  // ズーム率に合わせてセル幅と高さを変更
  CELL_WIDTH = Math.floor(28 * (currentZoom / 100));
  CELL_HEIGHT = Math.floor(34 * (currentZoom / 100));

  // フォントサイズも調整
  const container = document.getElementById('ganttView');
  if (container) {
    if (currentZoom < 80) container.style.fontSize = '10px';
    else if (currentZoom < 100) container.style.fontSize = '11px';
    else container.style.fontSize = '';
  }

  renderGantt();
}

function scrollToToday() {
  const container = document.getElementById('ganttView');
  if (!container || !ganttStartDate) return;

  const today = dayjs();
  const diffDays = today.diff(ganttStartDate, 'day');

  // 画面中央より少し左にするため、画面幅の1/3くらいを引く
  const offset = container.clientWidth / 3;
  const scrollPos = (diffDays * CELL_WIDTH) - offset;

  container.scrollTo({
    left: Math.max(0, scrollPos),
    behavior: 'smooth'
  });
}
window.scrollToToday = scrollToToday;

// --- 7. ガントチャート描画 ---
let ganttStartDate; // グローバル変数

// タスクの期間が重なっているかチェック
function tasksOverlap(task1, task2) {
  const start1 = dayjs(task1.start_date);
  const end1 = dayjs(task1.end_date);
  const start2 = dayjs(task2.start_date);
  const end2 = dayjs(task2.end_date);

  // 重なっている条件: task1の開始がtask2の終了より前 AND task1の終了がtask2の開始より後
  return start1.isSameOrBefore(end2, 'day') && end1.isSameOrAfter(start2, 'day');
}

// タスクを複数のレーンに配置（重ならないように）
function assignTasksToLanes(tasks) {
  if (tasks.length === 0) return { taskLanes: new Map(), laneCount: 1 };

  // タスクを開始日でソート
  const sortedTasks = [...tasks].sort((a, b) =>
    dayjs(a.start_date).diff(dayjs(b.start_date))
  );

  const taskLanes = new Map(); // taskId -> laneIndex
  const lanes = []; // 各レーンの最後のタスクの終了日

  sortedTasks.forEach(task => {
    const taskStart = dayjs(task.start_date);

    // このタスクを配置できるレーンを探す
    let assignedLane = -1;
    for (let i = 0; i < lanes.length; i++) {
      // レーンの最後のタスクの終了日より後に開始するなら配置可能
      if (taskStart.isAfter(lanes[i], 'day')) {
        assignedLane = i;
        break;
      }
    }

    // 配置できるレーンがなければ新しいレーンを作成
    if (assignedLane === -1) {
      assignedLane = lanes.length;
      lanes.push(dayjs(task.end_date));
    } else {
      lanes[assignedLane] = dayjs(task.end_date);
    }

    taskLanes.set(task.id, assignedLane);
  });

  return { taskLanes, laneCount: lanes.length };
}

function renderGantt() {
  const container = document.getElementById('ganttView');
  if (!container) return;
  container.innerHTML = '';

  const majors = store.majorCats.filter(m => m.project_id === currentProjectId);
  const minorsMap = {};
  majors.forEach(m => {
    minorsMap[m.id] = store.minorCats.filter(mi => mi.major_id === m.id);
  });

  const today = dayjs();
  const startDate = today.subtract(1, 'month').startOf('week');
  const endDate = today.add(1, 'month').endOf('week');

  ganttStartDate = startDate;

  const totalDays = endDate.diff(startDate, 'day') + 1;

  setTimeout(() => {
    if (container.scrollLeft === 0) {
      const diffDays = today.diff(startDate, 'day') - 7;
      if (diffDays > 0) {
        container.scrollLeft = diffDays * CELL_WIDTH;
      }
    }
  }, 100);

  const corner = document.createElement('div');
  corner.className = 'sticky-corner p-2 flex items-center justify-between font-bold text-sm text-gray-600 border-r border-gray-200';
  corner.style.height = `${CELL_HEIGHT}px`;
  corner.innerHTML = `
      <span>工程一覧</span>
      <div class="flex items-center space-x-1">
        <button onclick="scrollToToday()" class="text-xs bg-indigo-50 text-indigo-600 px-2 py-1 rounded hover:bg-indigo-100 mr-2 mouse-glow" title="今日へ移動">今日</button>
        <button onclick="openModal('major')" class="text-indigo-600 hover:bg-indigo-100 p-1 rounded mouse-glow"><i class="fas fa-plus"></i></button>
      </div>
    `;
  container.appendChild(corner);

  const dateHeader = document.createElement('div');
  dateHeader.className = 'sticky-header flex';
  dateHeader.style.width = `${totalDays * CELL_WIDTH}px`;

  for (let i = 0; i < totalDays; i++) {
    const d = startDate.add(i, 'day');
    const cell = document.createElement('div');
    cell.style.width = `${CELL_WIDTH}px`;
    cell.style.height = `${CELL_HEIGHT}px`;
    cell.className = `flex-shrink-0 text-center text-xs border-r border-gray-200 flex flex-col justify-center items-center ${getDateColorClass(d)}`;

    const showMonth = (i === 0 || d.date() === 1);
    const monthText = showMonth ? d.format('M月') : '&nbsp;';
    const monthClass = showMonth ? 'text-indigo-600' : 'invisible';

    cell.innerHTML = `
      <div class="text-[10px] ${monthClass} font-bold leading-none mb-0.5">${monthText}</div>
      <div class="font-bold leading-none text-gray-700">${d.format('D')}</div>
      <div class="text-[10px] text-gray-500 leading-none mt-0.5">${d.format('dd')}</div>
    `;
    dateHeader.appendChild(cell);
  }
  container.appendChild(dateHeader);

  majors.forEach(major => {
    const minors = minorsMap[major.id];

    const majorRowLeft = document.createElement('div');
    majorRowLeft.className = 'sticky-col bg-gray-100 border-b border-gray-300 p-2 font-bold text-gray-700 flex justify-between items-center cursor-move';
    majorRowLeft.style.height = `${CELL_HEIGHT}px`;
    majorRowLeft.innerHTML = `
      <div class="flex-1 cursor-pointer hover:text-indigo-600 flex items-center group/edit" onclick="openMajorEditModal('${major.id}')">
        <span>${major.name}</span>
        <i class="fas fa-pen text-[10px] text-gray-400 ml-2 opacity-0 group-hover/edit:opacity-100 transition-opacity"></i>
      </div>
      <button onclick="openModal('minor', '${major.id}')" class="text-xs bg-white border border-gray-300 px-1 rounded text-gray-500 hover:text-indigo-600 ml-2"><i class="fas fa-plus"></i> 小分類</button>
    `;

    majorRowLeft.draggable = true;
    majorRowLeft.ondragstart = (e) => handleRowDragStart(e, 'major', major.id);
    majorRowLeft.ondragover = (e) => e.preventDefault();
    majorRowLeft.ondrop = (e) => handleRowDrop(e, 'major', major.id);

    container.appendChild(majorRowLeft);

    const majorRowRight = document.createElement('div');
    majorRowRight.className = 'border-b border-gray-300 bg-gray-100 flex';
    majorRowRight.style.height = `${CELL_HEIGHT}px`;
    majorRowRight.style.width = `${totalDays * CELL_WIDTH}px`;

    for (let i = 0; i < totalDays; i++) {
      const d = startDate.add(i, 'day');
      const cell = document.createElement('div');
      cell.style.width = `${CELL_WIDTH}px`;
      cell.className = `flex-shrink-0 h-full border-r border-gray-200 ${getDateColorClass(d)}`;
      majorRowRight.appendChild(cell);
    }

    container.appendChild(majorRowRight);

    minors.forEach(minor => {
      const tasks = store.tasks.filter(t => String(t.minor_id) === String(minor.id));

      // タスクをレーンに配置して、必要なレーン数を取得
      const { taskLanes, laneCount } = assignTasksToLanes(tasks);

      // レーン数に応じて行の高さを計算
      const rowHeight = CELL_HEIGHT * laneCount;

      const minorLeft = document.createElement('div');
      minorLeft.className = 'sticky-col border-b border-gray-200 p-2 pl-6 text-sm flex items-center justify-between cursor-move bg-white text-gray-600';
      minorLeft.style.height = `${rowHeight}px`;
      minorLeft.innerHTML = `
        <div class="flex-1 cursor-pointer hover:text-indigo-600 flex items-center group/edit" onclick="openMinorEditModal('${minor.id}')">
          <span>${minor.name}</span>
          <i class="fas fa-pen text-[10px] text-gray-300 ml-2 opacity-0 group-hover/edit:opacity-100 transition-opacity"></i>
        </div>
        <i class="fas fa-chevron-right text-gray-300 text-xs"></i>
      `;

      minorLeft.draggable = true;
      minorLeft.ondragstart = (e) => handleRowDragStart(e, 'minor', minor.id);
      minorLeft.ondragover = (e) => e.preventDefault();
      minorLeft.ondrop = (e) => handleRowDrop(e, 'minor', minor.id);

      container.appendChild(minorLeft);

      const rowRight = document.createElement('div');
      rowRight.className = 'relative flex border-b border-gray-200';
      rowRight.style.height = `${rowHeight}px`;
      rowRight.style.width = `${totalDays * CELL_WIDTH}px`;

      for (let i = 0; i < totalDays; i++) {
        const d = startDate.add(i, 'day');
        const cell = document.createElement('div');
        cell.style.width = `${CELL_WIDTH}px`;
        cell.className = `flex-shrink-0 h-full border-r border-gray-100 ${getDateColorClass(d)} hover:bg-indigo-50 transition-colors cursor-pointer`;
        cell.onclick = () => openTaskModal(null, minor.id, d.format('YYYY-MM-DD'));
        rowRight.appendChild(cell);
      }

      tasks.forEach(task => {
        const tStart = dayjs(task.start_date);
        const tEnd = dayjs(task.end_date);

        if (tEnd.isBefore(startDate) || tStart.isAfter(endDate)) return;

        const diffDays = tStart.diff(startDate, 'day');
        const duration = tEnd.diff(tStart, 'day') + 1;

        const leftPos = diffDays * CELL_WIDTH;
        const widthPos = duration * CELL_WIDTH;

        let bgClass = 'bg-gray-400';
        if (task.status == 1) bgClass = 'bg-blue-500';
        if (task.status == 2) bgClass = 'bg-green-500';

        // 各レーンのタスク高さとマージン
        const taskHeight = Math.floor(CELL_HEIGHT * 0.65);
        const laneIndex = taskLanes.get(task.id) || 0;
        const taskTop = Math.floor((CELL_HEIGHT - taskHeight) / 2) + (laneIndex * CELL_HEIGHT);

        const taskBar = document.createElement('div');
        taskBar.className = `absolute rounded shadow task-bar ${bgClass} text-white text-xs flex items-center px-2 overflow-hidden whitespace-nowrap group`;
        taskBar.style.left = `${leftPos}px`;
        taskBar.style.top = `${taskTop}px`;
        taskBar.style.height = `${taskHeight}px`;
        taskBar.style.width = `${Math.max(widthPos - 2, 4)}px`;
        taskBar.dataset.taskId = task.id;

        // 担当者の抽出（memo から @username を探す）
        const assigneeMatch = task.memo ? task.memo.match(/@(\w+)/) : null;
        const assignee = assigneeMatch ? assigneeMatch[1] : null;
        const assigneeInitial = assignee ? assignee.charAt(0).toUpperCase() : null;

        taskBar.innerHTML = `
          <div class="resize-handle resize-handle-left" data-direction="left"></div>
          ${assigneeInitial ? `<div class="w-5 h-5 rounded-full bg-white/30 flex items-center justify-center text-[10px] font-bold mr-1 flex-shrink-0">${assigneeInitial}</div>` : ''}
          <span class="task-bar-content pointer-events-none select-none flex-1 text-center truncate">${task.name}</span>
          <div class="resize-handle resize-handle-right" data-direction="right"></div>
        `;
        if (task.memo) taskBar.title = task.memo;

        const leftHandle = taskBar.querySelector('[data-direction="left"]');
        const rightHandle = taskBar.querySelector('[data-direction="right"]');

        leftHandle.addEventListener('mousedown', (e) => startResize(e, task.id, 'left'));
        rightHandle.addEventListener('mousedown', (e) => startResize(e, task.id, 'right'));

        taskBar.addEventListener('mousedown', (e) => {
          if (e.target.classList.contains('resize-handle')) return;
          if (e.detail === 2) {
            openTaskModal(task.id);
          } else {
            startDrag(e, task);
          }
        });

        rowRight.appendChild(taskBar);
      });

      container.appendChild(rowRight);
    });
  });

  // 依存関係の矢印を描画
  renderDependencies(container);
}

// 依存関係の矢印描画
function renderDependencies(container) {
  // 既存のSVGレイヤーを削除
  const existingSvg = document.getElementById('dependency-svg');
  if (existingSvg) existingSvg.remove();

  // SVGレイヤーを作成
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.id = 'dependency-svg';
  svg.style.position = 'absolute';
  svg.style.top = '0';
  svg.style.left = '0';
  svg.style.width = '100%';
  svg.style.height = '100%';
  svg.style.pointerEvents = 'none';
  svg.style.zIndex = '5';
  container.appendChild(svg);

  // タスク間の依存関係を探す（memo に "depends:task_name" がある場合）
  store.tasks.forEach(task => {
    if (!task.memo) return;

    const dependsMatch = task.memo.match(/depends:(.+?)(?:\s|$|@)/i);
    if (!dependsMatch) return;

    const dependsOnName = dependsMatch[1].trim();
    const dependsOnTask = store.tasks.find(t => t.name === dependsOnName);
    if (!dependsOnTask) return;

    // 両方のタスクバーを取得
    const fromBar = document.querySelector(`[data-task-id="${dependsOnTask.id}"]`);
    const toBar = document.querySelector(`[data-task-id="${task.id}"]`);
    if (!fromBar || !toBar) return;

    // 座標計算
    const fromRect = fromBar.getBoundingClientRect();
    const toRect = toBar.getBoundingClientRect();
    const containerRect = container.getBoundingClientRect();

    const x1 = fromRect.right - containerRect.left;
    const y1 = fromRect.top + fromRect.height / 2 - containerRect.top;
    const x2 = toRect.left - containerRect.left;
    const y2 = toRect.top + toRect.height / 2 - containerRect.top;

    // 矢印を描画
    const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    const midX = (x1 + x2) / 2;
    const d = `M ${x1} ${y1} C ${midX} ${y1}, ${midX} ${y2}, ${x2} ${y2}`;
    path.setAttribute('d', d);
    path.setAttribute('stroke', '#4285F4');
    path.setAttribute('stroke-width', '2');
    path.setAttribute('fill', 'none');
    path.setAttribute('marker-end', 'url(#arrowhead)');
    svg.appendChild(path);
  });

  // 矢印のマーカーを定義
  const defs = document.createElementNS('http://www.w3.org/2000/svg', 'defs');
  const marker = document.createElementNS('http://www.w3.org/2000/svg', 'marker');
  marker.setAttribute('id', 'arrowhead');
  marker.setAttribute('markerWidth', '10');
  marker.setAttribute('markerHeight', '10');
  marker.setAttribute('refX', '9');
  marker.setAttribute('refY', '3');
  marker.setAttribute('orient', 'auto');
  const polygon = document.createElementNS('http://www.w3.org/2000/svg', 'polygon');
  polygon.setAttribute('points', '0 0, 10 3, 0 6');
  polygon.setAttribute('fill', '#4285F4');
  marker.appendChild(polygon);
  defs.appendChild(marker);
  svg.appendChild(defs);
}

// --- グローバル公開 ---
window.changeZoom = changeZoom;
// ... (他のエクスポートは維持)

function getDateColorClass(d) {
  const today = dayjs();
  const day = d.day();
  const isHoliday = (d.month() === 0 && d.date() === 1) || (d.month() === 4 && d.date() === 3);

  // 今日の日付を黄色でハイライト
  if (d.isSame(today, 'day')) return 'bg-yellow-200 font-bold';
  if (isHoliday) return 'bg-red-100';
  if (day === 0) return 'is-weekend';
  if (day === 6) return 'is-saturday';
  return 'bg-white';
}

// --- タスクのドラッグ移動 ---
let isDragging = false;
let dragTask = null;
let dragStartX = 0;
let initialLeft = 0;
let dragThresholdMet = false;
const DRAG_THRESHOLD = 5;

function startDrag(e, task) {
  if (e.button !== 0) return; // 左クリックのみ
  isDragging = true;
  dragTask = task;
  dragStartX = e.clientX;
  dragThresholdMet = false;

  const taskBar = e.currentTarget;
  initialLeft = parseFloat(taskBar.style.left);

  document.body.style.cursor = 'grabbing';
  e.preventDefault();
}

function onMouseMove(e) {
  if (!isDragging || !dragTask) return;

  const dx = e.clientX - dragStartX;
  const taskBar = document.querySelector(`[data-task-id="${dragTask.id}"]`);

  if (!dragThresholdMet) {
    if (Math.abs(dx) > DRAG_THRESHOLD) {
      dragThresholdMet = true;
      // ドラッグ開始時の視覚的フィードバック
      if (taskBar) {
        taskBar.classList.add('dragging');
      }
    } else {
      return; // 閾値を超えていないなら何もしない
    }
  }

  // ドラッグ中の表示更新
  if (taskBar) {
    taskBar.style.left = `${initialLeft + dx}px`;
  }
}

async function onMouseUp(e) {
  if (!isDragging || !dragTask) return;

  const taskBar = document.querySelector(`[data-task-id="${dragTask.id}"]`);

  // ドラッグクラスを削除
  if (taskBar) {
    taskBar.classList.remove('dragging');
  }

  isDragging = false;
  document.body.style.cursor = '';

  if (!dragThresholdMet) {
    dragTask = null;
    return; // ドラッグとみなされなかった
  }

  // 移動量の計算と反映
  const dx = e.clientX - dragStartX;
  const dayDiff = Math.round(dx / CELL_WIDTH);

  if (dayDiff !== 0) {
    const newStart = dayjs(dragTask.start_date).add(dayDiff, 'day');
    const newEnd = dayjs(dragTask.end_date).add(dayDiff, 'day');

    try {
      await updateTask(dragTask.id, {
        startDate: newStart.format('YYYY-MM-DD'),
        endDate: newEnd.format('YYYY-MM-DD')
      });
      await loadAllData();
    } catch (error) {
      console.error('Task move failed:', error);
      alert('タスクの移動に失敗しました');
      await loadAllData();
    }
  } else {
    // 移動なしなら位置を元に戻す
    if (taskBar) {
      taskBar.style.left = `${initialLeft}px`;
    }
  }

  dragTask = null;
}

// イベントリスナー登録（重複防止）
window.removeEventListener('mousemove', onMouseMove);
window.removeEventListener('mouseup', onMouseUp);
window.addEventListener('mousemove', onMouseMove);
window.addEventListener('mouseup', onMouseUp);
window.addEventListener('mousemove', onResizeMove);
window.addEventListener('mouseup', onResizeUp);

// --- タスクのリサイズ ---
let isResizing = false;
let resizeTask = null;
let resizeDirection = null;
let resizeStartX = 0;
let initialResizeLeft = 0;
let initialResizeWidth = 0;

function startResize(e, taskId, direction) {
  if (e.button !== 0) return;
  e.stopPropagation();

  isResizing = true;
  resizeTask = store.tasks.find(t => t.id === taskId);
  resizeDirection = direction;
  resizeStartX = e.clientX;

  const taskBar = document.querySelector(`[data-task-id="${taskId}"]`);
  initialResizeLeft = parseFloat(taskBar.style.left);
  initialResizeWidth = parseFloat(taskBar.style.width);

  // リサイズクラスを追加
  taskBar.classList.add('resizing');
  document.body.style.cursor = 'ew-resize';
  e.preventDefault();
}

function onResizeMove(e) {
  if (!isResizing || !resizeTask) return;

  const dx = e.clientX - resizeStartX;
  const taskBar = document.querySelector(`[data-task-id="${resizeTask.id}"]`);
  if (!taskBar) return;

  if (resizeDirection === 'right') {
    const newWidth = Math.max(CELL_WIDTH, initialResizeWidth + dx);
    taskBar.style.width = `${newWidth}px`;
  } else if (resizeDirection === 'left') {
    const newWidth = Math.max(CELL_WIDTH, initialResizeWidth - dx);
    const newLeft = initialResizeLeft + dx;
    if (newWidth >= CELL_WIDTH) {
      taskBar.style.width = `${newWidth}px`;
      taskBar.style.left = `${newLeft}px`;
    }
  }
}

async function onResizeUp(e) {
  if (!isResizing || !resizeTask) return;

  const taskBar = document.querySelector(`[data-task-id="${resizeTask.id}"]`);

  // リサイズクラスを削除
  if (taskBar) {
    taskBar.classList.remove('resizing');
  }

  isResizing = false;
  document.body.style.cursor = '';

  const currentLeft = parseFloat(taskBar.style.left);
  const currentWidth = parseFloat(taskBar.style.width);

  const startDiffDays = Math.round(currentLeft / CELL_WIDTH);
  const durationDays = Math.round(currentWidth / CELL_WIDTH);

  const newStart = ganttStartDate.add(startDiffDays, 'day');
  // 終了日は開始日 + 期間 - 1日 (ただしdurationDaysが0にならないように)
  const newEnd = newStart.add(Math.max(0, durationDays - 1), 'day');

  try {
    await updateTask(resizeTask.id, {
      startDate: newStart.format('YYYY-MM-DD'),
      endDate: newEnd.format('YYYY-MM-DD')
    });
    await loadAllData();
  } catch (error) {
    console.error('Resize failed:', error);
    alert('期間変更に失敗しました');
    await loadAllData();
  }

  resizeTask = null;
}

window.addEventListener('mousemove', onResizeMove);
window.addEventListener('mouseup', onResizeUp);

// --- 10. 行のドラッグ＆ドロップ ---
function handleRowDragStart(e, type, id) {
  e.dataTransfer.setData('type', type);
  e.dataTransfer.setData('dragId', id);
  e.stopPropagation();
}

function handleRowDrop(e, type, targetId) {
  e.preventDefault();
  e.stopPropagation();

  const dragType = e.dataTransfer.getData('type');
  const dragId = e.dataTransfer.getData('dragId');

  if (dragType !== type || dragId === targetId) return;

  let list, updateFunc;
  if (type === 'major') {
    list = store.majorCats.filter(m => m.project_id === currentProjectId);
    updateFunc = updateMajorCat;
  } else if (type === 'minor') {
    const targetMinor = store.minorCats.find(m => m.id === targetId);
    const dragMinor = store.minorCats.find(m => m.id === dragId);
    if (!targetMinor || !dragMinor || targetMinor.major_id !== dragMinor.major_id) return;

    list = store.minorCats.filter(m => m.major_id === targetMinor.major_id);
    updateFunc = updateMinorCat;
  } else {
    return;
  }

  const dragIndex = list.findIndex(item => String(item.id) === String(dragId));
  const targetIndex = list.findIndex(item => String(item.id) === String(targetId));

  if (dragIndex === -1 || targetIndex === -1) return;

  // 移動
  const item = list.splice(dragIndex, 1)[0];
  list.splice(targetIndex, 0, item);

  // sort_order更新
  const updates = list.map((item, index) => ({
    id: item.id,
    sort_order: (index + 1) * 1000
  }));

  try {
    // 並列更新
    Promise.all(updates.map(u => updateFunc(u.id, null, u.sort_order)))
      .then(() => loadAllData());
  } catch (error) {
    console.error('Sort update failed:', error);
    alert('並び替えに失敗しました');
  }
}

function handleMinorDropOnMajor(e, targetMajorId) {
  e.preventDefault();
  e.stopPropagation();
  // 省略（既存コードと同様）
}

// --- 11. モーダル制御 ---
let editingTaskId = null;

function openModal(type, parentId = null) {
  editingTaskId = null;
  document.getElementById('inputModal').classList.remove('hidden');
  document.getElementById('inputModal').classList.add('flex');

  document.getElementById('modalType').value = type;
  document.getElementById('modalParentId').value = parentId || '';

  document.getElementById('modalNameInput').value = '';
  document.getElementById('taskFields').classList.add('hidden');

  let title = '';
  if (type === 'client') title = 'クライアント追加';
  if (type === 'project') title = '案件追加';
  if (type === 'major') title = '大分類 (工程) 追加';
  if (type === 'minor') title = '小分類 追加';

  document.getElementById('modalTitle').innerText = title;

  // プロジェクトモーダルをホーム画面から開いた場合、クライアント選択可能に
  if (type === 'project' && !currentClientId) {
    const clientSelectHTML = `
        < div class="mb-4" >
        <label class="block text-sm font-medium text-gray-700 mb-1">クライアント選択</label>
        <select id="modalClientSelect" class="w-full border rounded p-2">
          ${store.clients.map(c => `<option value="${c.id}">${c.name}</option>`).join('')}
        </select>
      </div >
        `;
    const nameInput = document.getElementById('modalNameInput').parentElement;
    nameInput.insertAdjacentHTML('beforebegin', clientSelectHTML);
  }
}

function openTaskModal(taskId, minorId, dateStr) {
  const modal = document.getElementById('inputModal');
  const title = document.getElementById('modalTitle');
  const typeInput = document.getElementById('modalType');
  const parentInput = document.getElementById('modalParentId');
  const nameInput = document.getElementById('modalNameInput');
  const taskFields = document.getElementById('taskFields');
  const deleteBtn = document.getElementById('modalDeleteBtn');

  modal.classList.remove('hidden');
  modal.classList.add('flex');
  typeInput.value = 'task';
  taskFields.classList.remove('hidden');

  if (taskId) {
    // 編集モード
    const task = store.tasks.find(t => t.id === taskId);
    editingTaskId = taskId; // Ensure editingTaskId is set for submitModal
    title.textContent = 'タスク編集';
    parentInput.value = task.minor_id; // Corrected to use task.minor_id
    nameInput.value = task.name;
    document.getElementById('modalStartDate').value = task.start_date;
    document.getElementById('modalEndDate').value = task.end_date;

    // ラジオボタンのセット
    const radios = document.getElementsByName('modalStatus');
    radios.forEach(r => {
      if (parseInt(r.value) === task.status) r.checked = true;
    });

    document.getElementById('modalMemo').value = task.memo || ''; // Added memo field

    // 削除ボタン表示
    deleteBtn.classList.remove('hidden');
    deleteBtn.onclick = () => deleteTask(taskId);
  } else {
    // 新規作成
    editingTaskId = null; // Ensure editingTaskId is reset for new task
    title.textContent = 'タスク追加';
    parentInput.value = minorId;
    nameInput.value = '';
    document.getElementById('modalStartDate').value = dateStr;
    document.getElementById('modalEndDate').value = dayjs(dateStr).add(1, 'day').format('YYYY-MM-DD'); // Reverted to original logic for end date

    // ステータスリセット（未着手）
    const radios = document.getElementsByName('modalStatus');
    radios.forEach(r => {
      if (r.value === "0") r.checked = true;
    });
    document.getElementById('modalMemo').value = ''; // Added memo field

    // 削除ボタン非表示
    deleteBtn.classList.add('hidden');
  }
}

function closeModal(modalType) {
  // フォームをクリア
  const nameInput = document.getElementById('modalNameInput');
  const memoInput = document.getElementById('modalMemo');
  if (nameInput) nameInput.value = '';
  if (memoInput) memoInput.value = '';

  if (modalType === 'task') {
    document.getElementById('inputModal').classList.add('hidden');
    document.getElementById('inputModal').classList.remove('flex');
  } else if (modalType === 'client') {
    // クライアント追加モーダル（簡易版）を閉じる処理があればここに
    document.getElementById('inputModal').classList.add('hidden');
    document.getElementById('inputModal').classList.remove('flex');
  } else if (modalType === 'project') {
    // プロジェクト追加モーダルを閉じる
    document.getElementById('inputModal').classList.add('hidden');
    document.getElementById('inputModal').classList.remove('flex');
  } else {
    document.getElementById('inputModal').classList.add('hidden');
    document.getElementById('inputModal').classList.remove('flex');
  }
}

function handleDelete() {
  const deleteBtn = document.getElementById('modalDeleteBtn');
  if (deleteBtn.onclick) deleteBtn.onclick();
}

// --- 削除機能 ---
async function deleteTask(id) {
  if (!confirm('このタスクを削除しますか？')) return;

  try {
    const { error } = await supabaseClient.from('tasks').delete().eq('id', id);
    if (error) throw error;

    store.tasks = store.tasks.filter(t => t.id !== id);
    closeModal('task');
    renderGantt();
  } catch (e) {
    console.error('削除エラー:', e);
    alert('削除に失敗しました');
  }
}

async function deleteProject(id) {
  if (!confirm('この案件を削除しますか？\n関連するすべてのタスクも削除されます。')) return;

  try {
    // 関連データの削除（簡易実装：本来はサーバーサイドでCASCADE推奨）
    const { error: pErr } = await supabaseClient.from('projects').delete().eq('id', id);
    if (pErr) throw pErr;

    await loadAllData(); // データ再読み込み
    showHome();
  } catch (e) {
    console.error('削除エラー:', e);
    alert('削除に失敗しました');
  }
}

async function deleteClient(id) {
  if (!confirm('このクライアントを削除しますか？\n関連するすべての案件とタスクも削除されます。')) return;

  try {
    const { error } = await supabaseClient.from('clients').delete().eq('id', id);
    if (error) throw error;

    await loadAllData();
    showHome();
  } catch (e) {
    console.error('削除エラー:', e);
    alert('削除に失敗しました');
  }
}

// --- クライアント編集 ---
function openClientEditModal(clientId) {
  const client = store.clients.find(c => c.id === clientId);
  if (!client) return;

  const modal = document.getElementById('inputModal');
  const title = document.getElementById('modalTitle');
  const typeInput = document.getElementById('modalType');
  const parentInput = document.getElementById('modalParentId');
  const nameInput = document.getElementById('modalNameInput');
  const taskFields = document.getElementById('taskFields');
  const deleteBtn = document.getElementById('modalDeleteBtn');

  modal.classList.remove('hidden');
  modal.classList.add('flex');
  typeInput.value = 'client_edit'; // 新しいタイプ
  parentInput.value = clientId; // IDを格納
  nameInput.value = client.name;
  taskFields.classList.add('hidden');

  deleteBtn.classList.remove('hidden');
  deleteBtn.onclick = () => deleteClient(clientId);

  title.textContent = 'クライアント編集';
}

// --- 小分類編集 ---
function openMinorEditModal(minorId) {
  const minor = store.minorCats.find(m => m.id === minorId);
  if (!minor) return;

  const modal = document.getElementById('inputModal');
  const title = document.getElementById('modalTitle');
  const typeInput = document.getElementById('modalType');
  const parentInput = document.getElementById('modalParentId');
  const nameInput = document.getElementById('modalNameInput');
  const taskFields = document.getElementById('taskFields');
  const deleteBtn = document.getElementById('modalDeleteBtn');

  modal.classList.remove('hidden');
  modal.classList.add('flex');
  typeInput.value = 'minor_edit';
  parentInput.value = minorId;
  nameInput.value = minor.name;
  taskFields.classList.add('hidden');

  deleteBtn.classList.remove('hidden');
  deleteBtn.onclick = () => deleteMinor(minorId);

  title.textContent = '小分類編集';
}

function openMajorEditModal(majorId) {
  const major = store.majorCats.find(m => m.id === majorId);
  if (!major) return;

  const modal = document.getElementById('inputModal');
  const title = document.getElementById('modalTitle');
  const typeInput = document.getElementById('modalType');
  const parentInput = document.getElementById('modalParentId');
  const nameInput = document.getElementById('modalNameInput');
  const taskFields = document.getElementById('taskFields');
  const deleteBtn = document.getElementById('modalDeleteBtn');

  modal.classList.remove('hidden');
  modal.classList.add('flex');
  typeInput.value = 'major_edit';
  parentInput.value = majorId;
  nameInput.value = major.name;
  taskFields.classList.add('hidden');

  deleteBtn.classList.remove('hidden');
  deleteBtn.onclick = () => deleteMajorCat(majorId);

  title.textContent = '大分類(工程)編集';
}

async function deleteMajorCat(id) {
  if (!confirm('この工程と含まれる全ての小分類・タスクを削除しますか？')) return;
  try {
    // 関連データの削除 (カスケード設定があれば自動だが念のため)
    // 小分類を取得
    const minors = store.minorCats.filter(m => m.major_id === id);
    const minorIds = minors.map(m => m.id);

    if (minorIds.length > 0) {
      await supabaseClient.from('tasks').delete().in('minor_id', minorIds);
      await supabaseClient.from('minor_cats').delete().eq('major_id', id);
    }

    const { error } = await supabaseClient.from('major_cats').delete().eq('id', id);
    if (error) throw error;

    await loadAllData();
    closeModal();
  } catch (e) {
    console.error('削除エラー:', e);
    alert('削除に失敗しました');
  }
}

async function updateMinor(id, name) {
  const { error } = await supabaseClient.from('minor_cats').update({ name }).eq('id', id);
  if (error) throw error;
}

async function deleteMinor(id) {
  if (!confirm('この小分類と含まれる全タスクを削除しますか？')) return;
  try {
    // タスク削除 (カスケード設定されていれば不要だが念のため)
    await supabaseClient.from('tasks').delete().eq('minor_id', id);
    const { error } = await supabaseClient.from('minor_cats').delete().eq('id', id);
    if (error) throw error;
    await loadAllData();
    closeModal();
  } catch (e) {
    console.error('削除エラー:', e);
    alert('削除に失敗しました');
  }
}

// --- モーダル送信 ---
async function submitModal() {
  const type = document.getElementById('modalType').value;
  const name = document.getElementById('modalNameInput').value;
  let parentId = document.getElementById('modalParentId').value;

  if (!name) { alert('名称を入力してください'); return; }

  try {
    if (type === 'client') {
      await saveClient(name);
    } else if (type === 'project') {
      const clientSelect = document.getElementById('modalClientSelect');
      const clientId = clientSelect ? clientSelect.value : currentClientId;
      if (!clientId) { alert('クライアントを選択してください'); return; }
      await saveProject(clientId, name);
    } else if (type === 'major') {
      await saveMajorCat(currentProjectId, name);
    } else if (type === 'major_edit') {
      await updateMajorCat(parentId, name);
    } else if (type === 'minor') {
      await saveMinorCat(parentId, name);
    } else if (type === 'minor_edit') {
      await updateMinor(parentId, name);
    } else if (type === 'task') {
      const sDate = document.getElementById('modalStartDate').value;
      const eDate = document.getElementById('modalEndDate').value;

      let status = 0;
      document.getElementsByName('modalStatus').forEach(r => {
        if (r.checked) status = parseInt(r.value);
      });

      const memo = document.getElementById('modalMemo').value;

      if (dayjs(eDate).isBefore(dayjs(sDate))) {
        alert('終了日は開始日より後にして下さい');
        return;
      }

      if (editingTaskId) {
        await updateTask(editingTaskId, {
          name,
          startDate: sDate,
          endDate: eDate,
          status,
          memo
        });
      } else {
        await saveTask({
          minorId: parentId,
          name,
          startDate: sDate,
          endDate: eDate,
          status,
          memo
        });
      }
    }

    await loadAllData();
    closeModal();
  } catch (error) {
    console.error('保存エラー:', error);
    alert('保存に失敗しました');
  }
}

function renderApp() {
  if (currentClientId) renderClientSelect();
  if (currentProjectId) {
    renderProjectSelect();
    renderGantt();
  }

  // 期限通知チェック
  checkDeadlineNotifications();
}

// 期限通知機能
function checkDeadlineNotifications() {
  const today = dayjs();
  const urgentTasks = store.tasks.filter(t => {
    if (t.status === 2) return false; // 完了済みは除外
    const endDate = dayjs(t.end_date);
    const daysUntil = endDate.diff(today, 'day');
    return daysUntil >= 0 && daysUntil <= 3; // 3日以内
  });

  if (urgentTasks.length > 0) {
    showDeadlineToast(urgentTasks.length);
  }
}

function showDeadlineToast(count) {
  const existing = document.getElementById('deadline-toast');
  if (existing) existing.remove();

  const toast = document.createElement('div');
  toast.id = 'deadline-toast';
  toast.className = 'fixed top-20 right-6 bg-red-500 text-white px-6 py-4 rounded-lg shadow-xl z-50 animate-slide-in';
  toast.innerHTML = `
    <div class="flex items-center gap-3">
      <i class="fas fa-exclamation-triangle text-2xl"></i>
      <div>
        <div class="font-bold">期限が近いタスクがあります</div>
        <div class="text-sm opacity-90">${count}件のタスクが3日以内に期限を迎えます</div>
      </div>
      <button onclick="this.parentElement.parentElement.remove()" class="ml-4 hover:bg-red-600 px-2 py-1 rounded">
        <i class="fas fa-times"></i>
      </button>
    </div>
  `;
  document.body.appendChild(toast);

  // 10秒後に自動で消す
  setTimeout(() => {
    if (toast.parentElement) toast.remove();
  }, 10000);
}

// --- グローバル公開 ---
window.openModal = openModal;
window.closeModal = closeModal;
window.submitModal = submitModal;
window.resetData = resetData;
window.showHome = showHome;
window.loadProject = loadProject;
window.openTaskModal = openTaskModal;
window.openProjectInfoModal = openProjectInfoModal;
window.saveProjectInfo = saveProjectInfo;
window.renderClientProjectList = renderClientProjectList;
window.handleMinorDropOnMajor = handleMinorDropOnMajor;
window.openLocalNewsModal = openLocalNewsModal;
window.changeZoom = changeZoom;
