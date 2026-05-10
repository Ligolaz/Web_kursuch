/*=========================================
Глобальні налаштування для конкретного поста
=========================================*/
const postId = new URLSearchParams(window.location.search).get('id');
let postAuthorId = null; //Запам'ятовує автора поста (PLS DELETE WORK U NG)

/*=========================================
Лоадінг поста та налаштування кнопок
=========================================*/
document.addEventListener('DOMContentLoaded', async () => {
	if (!postId) return;

	// Завантаження поста
	const res = await fetch(`/api/news/${postId}`);
	const result = await res.json();
	const post = result.data;

	if (!post) {
		document.getElementById('post-content').innerHTML = '<p class="text-muted">Пост не знайдено.</p>';
		return;
	}

	postAuthorId = post.author_id;

	//Малює плитку поста
	document.getElementById('post-content').innerHTML = `
		<div class="content-card">
			<div class="card-category">c/${post.category_name}</div>
			<h1 class="text-accent" style="font-size:2.5rem; margin-bottom:10px;">${post.title}</h1>
			<div class="text-muted">Автор: <a href="profile.html?id=${post.author_id}" class="text-accent" style="text-decoration:none;">u/${post.author_name}</a> | ${new Date(post.publication_date).toLocaleDateString()}</div>
			<hr style="border:0; border-top:1px solid #333; margin:20px 0;">
			<div style="font-size:1.1rem; white-space: pre-wrap;">${formatContent(post.content)}</div>
			${post.images.length > 0 ? renderSlider(post.images) : ''}
			${post.google_maps_url ? `<div class="map-wrapper">${post.google_maps_url}</div>` : ''}
		</div>`;

	//Кнопки керування (чекає поки app.js намалює навігацію зверху, потім ліпить баттони)
	const interval = setInterval(() => {
		const box = document.getElementById('post-specific-btns');
		if (box && currentUser) {
			clearInterval(interval);
			if (currentUser.id === post.author_id) {
				box.innerHTML += `<a href="edit.html?id=${post.id}" class="btn-accent" style="background:#333; color:#fff; margin-left:15px;">Редагувати</a>`;
			}
			if (currentUser.roleId === 1 || currentUser.id === post.author_id) {
				box.innerHTML += `<button class="btn-accent" style="background:#ff4d4d; margin-left:15px;" onclick="deletePost(${post.id})">Видалити</button>`;
			}
		}
	}, 100);

	//Підготовка форми головного коментаря
	if (!currentUser) {
		const form = document.getElementById('comment-form-container');
		if(form) form.innerHTML = '<p class="text-muted">Щоб залишити коментар, будь ласка, <a href="login.html" class="text-accent">увійдіть</a>.</p>';
	} else {
		document.getElementById('submitComment')?.addEventListener('click', () => submitComment());
	}

	loadComments();
});

/*=========================================
Коментарі
=========================================*/
//Завантаження
async function loadComments() {
	const res = await fetch(`/api/news/${postId}/comments`);
	const result = await res.json();
	const commentList = document.getElementById('comments-list');

	if (result.success && result.data.length > 0) {
		const tree = buildTree(result.data);
		commentList.innerHTML = tree.map(c => renderCommentHTML(c)).join('');
	} else {
		commentList.innerHTML = '<p class="text-muted">Тут поки порожньо. Будьте першим!</p>';
	}
}

//Буде слоями (розкидує на різні рівні а-ля нові ютубівські)
function buildTree(list) {
	const map = {}, roots = [];
	list.forEach(c => map[c.id] = { ...c, replies:[] });
	list.forEach(c => { 
		if(c.parent_id && map[c.parent_id]) map[c.parent_id].replies.push(map[c.id]); 
		else roots.push(map[c.id]); 
	});
	return roots;
}

//Відображає блоки коментів
function renderCommentHTML(c) {
	//Видаляє адмін, автор коментаря та автор поста
	const canDel = currentUser && (currentUser.roleId === 1 || currentUser.id === c.user_id || currentUser.id === postAuthorId);
	const formatted = formatContent(c.content); //Обробляє пінг @user

	return `
		<div class="comment-card" id="comment-${c.id}">
			<div class="comment-meta"><span class="comment-author" onclick="location.href='profile.html?id=${c.user_id}'">u/${c.author_name}</span></div>
			<div class="comment-text">${formatted}</div>
			<div class="comment-actions">
				${currentUser ? `<button class="btn-reply" onclick="showReplyForm(${c.id})">Відповісти</button>` : ''}
				${canDel ? `<button class="btn-delete-comment" onclick="deleteComment(${c.id})">Видалити</button>` : ''}
			</div>
			<div id="reply-form-holder-${c.id}"></div>
			<div class="comment-replies">${c.replies.map(r => renderCommentHTML(r)).join('')}</div>
		</div>`;
}

/*=========================================
Створення відповідей та їх видалення
=========================================*/
//Віконце для відповіді під конкретним коментарем
window.showReplyForm = (pid) => {
	document.querySelectorAll('[id^="reply-form-holder-"]').forEach(h => h.innerHTML = '');

	const holder = document.getElementById(`reply-form-holder-${pid}`);
	if (holder) {
		holder.innerHTML = `
			<div class="comment-input-area" style="margin-top:15px; margin-bottom:15px;">
				<textarea id="replyText-${pid}" rows="4" placeholder="Ваша відповідь..." style="width: 100%; border-radius: 12px; padding: 15px; background: #262626; color: #fff; border: 1px solid #3d3d3d; font-family: 'Bender'; resize: none; margin-bottom: 10px;"></textarea>
				<div style="display:flex; gap:10px;">
					<button class="btn-accent" onclick="submitComment(${pid})">Відповісти</button>
					<button class="btn-accent" style="background:#333; color:#fff;" onclick="this.parentElement.parentElement.remove()">Скасувати</button>
				</div>
			</div>`;
	}
}

//Відправка коменту(просто або як відповідь)
async function submitComment(pid = null) {
	const textId = pid ? `replyText-${pid}` : 'commentText';
	const content = document.getElementById(textId).value;

	if (!content.trim()) return;

	await fetch('/api/comments', { 
		method: 'POST', 
		headers: {'Content-Type':'application/json'}, 
		body: JSON.stringify({ news_id: postId, user_id: currentUser.id, content, parent_id: pid }) 
	});

	location.reload(); 
}

//Видалення із підтвердженням
window.deleteComment = async (id) => {
	if (confirm('Видалити цей коментар?')) {
		await fetch(`/api/comments/${id}`, { 
			method: 'DELETE', 
			headers: {'Content-Type':'application/json'}, 
			body: JSON.stringify({ user_id: currentUser.id, role_id: currentUser.roleId }) 
		});
		location.reload();
	}
}

/*=========================================
Слайдер картинок (< >)
=========================================*/
function renderSlider(imgs) {
	return `
		<div class="slider-container">
			<div class="slider-wrapper" id="sliderWrapper">
				${imgs.map(i => `<div class="slider-item"><img src="${i}"></div>`).join('')}
			</div>
			${imgs.length > 1 ? `
				<button class="slider-btn prev-btn" onclick="moveSlider(-1)">❮</button>
				<button class="slider-btn next-btn" onclick="moveSlider(1)">❯</button>
			` : ''}
		</div>`;
}

//Логіка гортання left-right
let curSlide = 0;
window.moveSlider = (s) => { 
	const w = document.getElementById('sliderWrapper');
	if (!w) return;
	curSlide = (curSlide + s + w.children.length) % w.children.length;
	w.style.transform = `translateX(-${curSlide * 100}%)`;
}

//Видалення самого посту з БД + перекидування на головну
async function deletePost(id) {
	if (confirm('Видалити пост?')) { 
		await fetch(`/api/news/${id}`, { method: 'DELETE' }); 
		location.href = 'index.html'; 
	}
}