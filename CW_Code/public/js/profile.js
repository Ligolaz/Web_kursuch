/*=========================================
Налаштування пагінації у профілі(фіксовано якщо більше 5ти постів)
=========================================*/
let currentPage = 1, pageSize = 5;

/*=========================================
Who's профіль і вантаже дані
=========================================*/
document.addEventListener('DOMContentLoaded', () => {
	const userId = new URLSearchParams(window.location.search).get('id');
	if (!userId) return location.href = 'index.html'; //Якщо нема
	loadProfile(userId);
	loadNews(userId);
});

/*=========================================
Завантаження шапки(не навігація) профілю(нік, роль єслі адмін, стати)
=========================================*/
async function loadProfile(uid) {
	const res = await fetch(`/api/users/${uid}/stats`);
	const u = (await res.json()).data;
	document.getElementById('user-info-card').innerHTML = `
		<div class="profile-card-content">
			<div class="profile-avatar-circle">${u.full_name[0].toUpperCase()}</div>
			<div class="profile-info-main">
				<h2>u/${u.full_name}${u.role_id === 1 ? '<span class="admin-status">Admin</span>' : ''}</h2>
				<div class="profile-stats-row">
					<div class="stat-box"><span class="stat-num">${u.post_count}</span><span class="stat-desc">Пости</span></div>
					<div class="stat-box"><span class="stat-num">${u.comment_count}</span><span class="stat-desc">Коментарі</span></div>
				</div>
			</div>
		</div>`;
}

/*=========================================
Завантаження постів, написаних юзером
=========================================*/
async function loadNews(uid) {
	const res = await fetch(`/api/news?authorId=${uid}&limit=${pageSize}&page=${currentPage}`);
	const result = await res.json();
	const container = document.getElementById('news-container');

	container.innerHTML = '';

	if (result.success && result.data.length > 0) {
		result.data.forEach(item => container.innerHTML += createNewsCardHTML(item));

		//Виклик відрисовки кнопок(передає дані про сторінки та ID автора)
		renderPagination(result.pagination, uid); 
	} else {
		container.innerHTML = '<p class="text-muted">Нічого не знайдено.</p>';
		document.getElementById('pagination').innerHTML = ''; //Якщо пусто - кнопок нема
	}
}

/*=========================================
Логіка кнопок перемикання сторінок у профілі
=========================================*/
function renderPagination(pg, uid) {
	const nav = document.getElementById('pagination');
	nav.innerHTML = '';

	//Якщо сторінка всього одна(не більше 5ти постів) - кнопки не потрібні
	if(pg.totalPages <= 1) return;

	const addBtn = (t, p, d, a = false) => {
		const b = document.createElement('button');
		b.className = `pg-btn ${a ? 'active' : ''} ${d ? 'disabled' : ''}`;
		b.textContent = t;
		if (!d && !a) b.onclick = () => { 
			currentPage = p; 
			loadNews(uid); //Вантаже наступні 5(або меньше) постів юзера
			window.scrollTo(0,0); 
		};
		nav.appendChild(b);
	};

	//Стрілки та номери сторінок
	addBtn('≪', 1, pg.currentPage === 1);
	addBtn('＜', pg.currentPage - 1, pg.currentPage === 1);

	for (let i = 1; i <= pg.totalPages; i++) {
		if (i === 1 || i === pg.totalPages || (i >= pg.currentPage - 1 && i <= pg.currentPage + 1)) {
			addBtn(i, i, false, i === pg.currentPage);
		} else if (Math.abs(i - pg.currentPage) === 2) {
			const s = document.createElement('span'); s.textContent = '...'; 
			s.style.color = '#555'; nav.appendChild(s);
		}
	}

	addBtn('＞', pg.currentPage + 1, pg.currentPage === pg.totalPages);
	addBtn('≫', pg.totalPages, pg.currentPage === pg.totalPages);
}