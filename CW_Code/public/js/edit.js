/*=========================================
Підготовка сторінки до редагування поста
=========================================*/
//id поста дістається з адресного рядка
document.addEventListener('DOMContentLoaded', async () => {
	const postId = new URLSearchParams(window.location.search).get('id');

	//Перевірка чи залогінений
	if (!currentUser || !postId) {
		location.href = 'index.html'; //На основу якщо ні
		return;
	}

	/*=========================================
	Завантаження даних
	=========================================*/
	try {
		//Спочатку список категорії
		const catRes = await fetch('/api/categories');
		const catData = await catRes.json();
		const select = document.getElementById('category');
		catData.data.forEach(c => select.innerHTML += `<option value="${c.id}">${c.name}</option>`);

		//Тепер вантажимо сам пост
		const res = await fetch(`/api/news/${postId}`);
		const result = await res.json();
		const post = result.data;

		//Перевірка на авторство
		if (post.author_id !== currentUser.id) {
			alert('Неможливо редагувати чужий пост.');
			location.href = 'index.html'; //Також на головну
			return;
		}

		//Заповнення поля форми старими даними
		document.getElementById('title').value = post.title;
		document.getElementById('content').value = post.content;
		document.getElementById('category').value = post.category_id;
		document.getElementById('maps').value = post.google_maps_url || '';

	} catch (err) {
		console.error('Помилка підготовки сторінки: ', err);
	}

	/*=========================================
	Відправка нових даних(пост оновлено)
	=========================================*/
	document.getElementById('editForm').addEventListener('submit', async (e) => {
		e.preventDefault();

		const updatedData = {
			title: document.getElementById('title').value,
			content: document.getElementById('content').value,
			category_id: document.getElementById('category').value,
			google_maps_url: document.getElementById('maps').value,
			author_id: currentUser.id
		};

		//Відправка оновленого пакету даних на сервер
		try {
			const response = await fetch(`/api/news/${postId}`, {
				method: 'PUT',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify(updatedData)
			});

			if ((await response.json()).success) {
				location.href = `post.html?id=${postId}`;
			} else {
				alert('Не вдалося зберегти зміни.');
			}
		} catch (err) {
			console.error('Помилка сервера при оновленні: ', err);
		}
	});
});