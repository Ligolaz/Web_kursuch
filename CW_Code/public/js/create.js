/*=========================================
Підготовка сторінки до створення нового поста
=========================================*/
document.addEventListener('DOMContentLoaded', async () => {
	//Перевірка авторизації
	if (!currentUser) {
		location.href = 'login.html'; //на головну єслі нє
		return;
	}

	//Завантаження списку(назв) категорій з бд для випадаючиого списку
	try {
		const res = await fetch('/api/categories');
		const result = await res.json();
		const select = document.getElementById('category');
		
		result.data.forEach(cat => {
			select.innerHTML += `<option value="${cat.id}">${cat.name}</option>`;
		});
	} catch (err) {
		console.error('Помилка завантаження категорій:', err);
	}

	//Обробка відправки форми
	document.getElementById('createForm').addEventListener('submit', async (e) => {
		e.preventDefault();
		//Створення пакету FormData для підтримки завантаження картинок на сервер
		const formData = new FormData();
		formData.append('title', document.getElementById('title').value);
		formData.append('content', document.getElementById('content').value);
		formData.append('category_id', document.getElementById('category').value);
		formData.append('google_maps_url', document.getElementById('maps').value);
		formData.append('author_id', currentUser.id); //Беремо id з app.js

		//Додаєм всі обрані картинки по одній
		const photos = document.getElementById('photos').files;
		for (let i = 0; i < photos.length; i++) {
			formData.append('photos', photos[i]);
		}

		//Відправка, запит на сервер і чекаємо відповіді
		try {
			const response = await fetch('/api/news', {
				method: 'POST',
				body: formData
			});
			const result = await response.json();
			if (result.success) {
				location.href = 'index.html';
			} else {
				alert('Помилка: ' + result.message);
			}
		} catch (err) {
			console.error('Помилка сервера при створенні: ', err);
		}
	});
});