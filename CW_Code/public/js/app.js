/*=========================================
Глобальні налаштування та юзер
=========================================*/
const currentUser = JSON.parse(localStorage.getItem('user'));

/*=========================================
Обробка тексту (youtube player and yellow font for ping(@user))
=========================================*/
function formatContent(text) {
	if (!text) return "";
	const ytRegex = /https?:\/\/(?:www\.)?(?:youtube\.com\/watch\?v=|youtu\.be\/)([a-zA-Z0-9_-]{11})[^\s]*/g;
	let formatted = text.replace(ytRegex, (match, id) => {
		return `<div class="video-wrapper"><iframe src="https://www.youtube.com/embed/${id}" allowfullscreen></iframe></div>`;
	});
	formatted = formatted.replace(/@([a-zA-Z0-9_]+)/g, '<span class="text-yellow">@$1</span>');
	return formatted;
}

/*=========================================
Генерація картки (main menu + profile)
=========================================*/
function createNewsCardHTML(item) {
	const dateObj = new Date(item.publication_date);
	const dateStr = dateObj.toLocaleDateString('uk-UA');
	const timeStr = dateObj.toLocaleTimeString('uk-UA', { hour: '2-digit', minute: '2-digit' });

	let excerpt = item.content.substring(0, 200);
	if (item.content.length > 200) excerpt += '...';
	const formattedExcerpt = excerpt.replace(/@([a-zA-Z0-9_]+)/g, '<span class="text-yellow">@$1</span>');

	return `
		<a href="post.html?id=${item.id}" class="card-link">
			<article class="content-card">
				<div class="card-meta">
					<span class="card-author" onclick="event.preventDefault(); window.location.href='profile.html?id=${item.author_id}'">u/${item.author_name}</span> 
					<span style="margin: 0 5px; opacity: 0.5;">•</span> 
					${dateStr} ${timeStr}
				</div>
				<h2 class="card-title">${item.title}</h2>
				<div class="card-excerpt">${formattedExcerpt}</div>
				<div class="card-category-tag">c/${item.category_name || 'Різне'}</div>
			</article>
		</a>`;
}

/*=========================================
Навігація (лого, кнопки, профіль/вихід, сповіщення)
=========================================*/
function renderGlobalUI() {
	const nav = document.querySelector('nav');
	const footer = document.querySelector('footer');

	if (nav) {
		const isPostOrEdit = window.location.pathname.includes('post.html') || window.location.pathname.includes('edit.html');
		
		nav.innerHTML = `
			<div class="container">
				<div class="nav-wrapper">
					<a href="index.html" class="logo-wrap">Blog<span class="hub-box">Hub</span></a>
					<div class="nav-links">
						${currentUser ? `
							${!isPostOrEdit ? '<a href="create.html" class="btn-accent">Додати пост</a>' : '<span id="post-specific-btns"></span>'}
							
							<div class="notif-wrapper" onclick="toggleNotifs()">
								<span class="notif-bell">🔔</span>
								<div id="notifBadge" class="notif-badge"></div>
								<div id="notifDropdown" class="notif-dropdown"></div>
							</div>

							<a href="profile.html?id=${currentUser.id}" class="nav-user-link" style="margin-left:15px;">u/${currentUser.fullName}</a>
							<div class="nav-divider"></div>
							<a href="#" id="logoutBtn" class="text-muted" style="text-decoration:none; align-self:center;">Вийти</a>
						` : '<a href="login.html" class="btn-accent">Увійти</a>'}
					</div>
				</div>
			</div>`;

		const logoutBtn = document.getElementById('logoutBtn');
		if(logoutBtn) logoutBtn.onclick = () => { localStorage.removeItem('user'); window.location.href = 'index.html'; };
		if(currentUser) loadNotifications(currentUser.id);
	}

	if (footer) {
		footer.innerHTML = `<div class="container"><p class="footer-text">&copy; 2026 BlogHub. Всі права захищені.</p></div>`;
	}
}

/*=========================================
Сповіщення them selves
=========================================*/
async function loadNotifications(userId) {
	try {
		const res = await fetch(`/api/notifications/${userId}`);
		const result = await res.json();
		const dropdown = document.getElementById('notifDropdown');
		const badge = document.getElementById('notifBadge');
		if (!dropdown || !badge) return;

		if (result.success && result.data.length > 0) {
			const unread = result.data.filter(n => !n.is_read).length;
			if (unread > 0) badge.style.display = 'block';
			dropdown.innerHTML = result.data.map(n => `
				<a href="post.html?id=${n.news_id}" class="notif-item ${n.is_read ? '' : 'unread'}">
					<b class="text-accent">u/${n.sender_name}</b> згадав вас
				</a>`).join('');
		} else {
			dropdown.innerHTML = '<div class="notif-empty">Сповіщень немає</div>';
		}
	} catch (e) { console.log("Notif load error"); }
}

window.toggleNotifs = async () => {
	const dropdown = document.getElementById('notifDropdown');
	const badge = document.getElementById('notifBadge');
	if(!dropdown) return;
	dropdown.classList.toggle('active');
	if (dropdown.classList.contains('active') && currentUser) {
		await fetch(`/api/notifications/read/${currentUser.id}`, { method: 'PUT' });
		if(badge) badge.style.display = 'none';
	}
};

//Запуск відразу
renderGlobalUI();