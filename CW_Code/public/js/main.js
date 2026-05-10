/*=========================================
Початкові налаштування (сторінка, ліміт, сорт)
=========================================*/
let currentPage = 1, pageSize = 5, sortOrder = 'DESC';

/*=========================================
Вантаж кантєнта та фільтрів
=========================================*/
document.addEventListener('DOMContentLoaded', () => {
	loadCategories();
	loadNews();
	
	const getEl = id => document.getElementById(id);
	[getEl('searchInput'), getEl('authorSearchInput')].forEach(el => el.oninput = () => { currentPage = 1; loadNews(); });
	getEl('categoryFilter').onchange = () => { currentPage = 1; loadNews(); };
	getEl('sortFilter').onchange = (e) => { sortOrder = e.target.value; currentPage = 1; loadNews(); };
	getEl('limitFilter').onchange = (e) => { pageSize = parseInt(e.target.value); currentPage = 1; loadNews(); };
});

/*=========================================
Завантаження списку категорій з бд
=========================================*/
async function loadCategories() {
	const res = await fetch('/api/categories');
	const result = await res.json();
	const select = document.getElementById('categoryFilter');
	result.data.forEach(cat => select.innerHTML += `<option value="${cat.id}">${cat.name}</option>`);
}

/*=========================================
Завантаження постів з фільтрами
=========================================*/
async function loadNews() {
	const container = document.getElementById('news-container');
	const s = document.getElementById('searchInput').value;
	const a = document.getElementById('authorSearchInput').value;
	const c = document.getElementById('categoryFilter').value;
	
	const url = `/api/news?search=${encodeURIComponent(s)}&authorSearch=${encodeURIComponent(a)}&categoryId=${c}&sort=${sortOrder}&limit=${pageSize}&page=${currentPage}`;
	const res = await fetch(url);
	const result = await res.json();

	container.innerHTML = '';
	if (result.success && result.data.length > 0) {
		result.data.forEach(item => container.innerHTML += createNewsCardHTML(item));
		renderPagination(result.pagination);
	} else {
		container.innerHTML = '<p class="text-muted">Нічого не знайдено.</p>';
		document.getElementById('pagination').innerHTML = '';
	}
}

/*=========================================
Пагінація (<<..>>)
=========================================*/
function renderPagination(pg) {
	const nav = document.getElementById('pagination');
	nav.innerHTML = '';
	if(pg.totalPages <= 1) return;

	const addBtn = (t, p, d, a = false) => {
		const b = document.createElement('button');
		b.className = `pg-btn ${a ? 'active' : ''} ${d ? 'disabled' : ''}`;
		b.textContent = t;
		if (!d && !a) b.onclick = () => { currentPage = p; loadNews(); window.scrollTo(0,0); };
		nav.appendChild(b);
	};

	addBtn('≪', 1, pg.currentPage === 1);
	addBtn('＜', pg.currentPage - 1, pg.currentPage === 1);
	for (let i = 1; i <= pg.totalPages; i++) {
		if (i === 1 || i === pg.totalPages || (i >= pg.currentPage - 1 && i <= pg.currentPage + 1)) addBtn(i, i, false, i === pg.currentPage);
		else if (Math.abs(i - pg.currentPage) === 2) { const s = document.createElement('span'); s.textContent = '...'; nav.appendChild(s); }
	}
	addBtn('＞', pg.currentPage + 1, pg.currentPage === pg.totalPages);
	addBtn('≫', pg.totalPages, pg.currentPage === pg.totalPages);
}