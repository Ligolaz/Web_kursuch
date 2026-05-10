/*=========================================
Бібліотеки + налаштування
=========================================*/
const express = require('express');
const mysql = require('mysql2/promise');
const path = require('path');
const cors = require('cors');
const multer = require('multer');
const fs = require('fs');

const app = express();
const PORT = 3001;
const pool = mysql.createPool({
	host: 'localhost', user: 'root', password: 'pass', database: 'blog_db' //Change passw before uploading to github
});

const upload = multer({ storage: multer.diskStorage({
	destination: (req, file, cb) => {
		const dir = 'public/uploads';
		if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
		cb(null, dir);
	},
	filename: (req, file, cb) => { cb(null, Date.now() + '-' + file.originalname); }
})});

app.use(cors());
app.use(express.json());
app.use(express.static('public'));

/*=========================================
Допоміжні функції (пінги @user)
=========================================*/
async function handlePings(text, senderName, newsId) {
	const pings = text.match(/@([a-zA-Z0-9_]+)/g);
	if (!pings) return;
	for (let ping of pings) {
		const name = ping.substring(1);
		const [users] = await pool.query('SELECT id FROM User WHERE LOWER(full_name) = LOWER(?)', [name]);
		if (users.length > 0) {
			const targetId = users[0].id;
			await pool.query('INSERT INTO Notifications (user_id, sender_name, news_id) VALUES (?, ?, ?)', [targetId, senderName, newsId]);
			await pool.query(`DELETE FROM Notifications WHERE user_id = ? AND id NOT IN (SELECT id FROM (SELECT id FROM Notifications WHERE user_id = ? ORDER BY created_at DESC LIMIT 5) as t)`, [targetId, targetId]);
		}
	}
}

/*=========================================
Автентифікація + профіль
=========================================*/
app.post('/api/register', async (req, res) => {
	const { username, full_name, password } = req.body;
	if (!/^[a-zA-Z0-9_]{1,24}$/.test(full_name)) return res.status(400).json({ success: false, message: 'Невірний формат Display Name' });
	try {
		await pool.query('INSERT INTO User (username, full_name, password, role_id) VALUES (?, ?, ?, 2)', [username, full_name, password]);
		res.json({ success: true });
	} catch (e) { res.status(400).json({ success: false, message: 'Логін або ім’я вже зайняті' }); }
});

app.post('/api/login', async (req, res) => {
	const { username, password } = req.body;
	const [users] = await pool.query('SELECT * FROM User WHERE username = ? AND password = ?', [username, password]);
	if (users.length > 0) res.json({ success: true, user: { id: users[0].id, fullName: users[0].full_name, roleId: users[0].role_id } });
	else res.status(401).json({ success: false, message: 'Невірні дані' });
});

app.get('/api/users/:id/stats', async (req, res) => {
	const [rows] = await pool.query(`SELECT u.full_name, u.role_id, (SELECT COUNT(*) FROM News WHERE author_id = u.id) as post_count, (SELECT COUNT(*) FROM Comments WHERE user_id = u.id) as comment_count FROM User u WHERE u.id = ?`, [req.params.id]);
	res.json({ success: true, data: rows[0] });
});

/*=========================================
Пости (crud + пагінація(<<..>>))
=========================================*/
app.get('/api/categories', async (req, res) => {
	const [rows] = await pool.query('SELECT * FROM Category ORDER BY name');
	res.json({ success: true, data: rows });
});

app.get('/api/news', async (req, res) => {
	const { search, authorSearch, categoryId, sort, limit, page, authorId } = req.query;
	const pageSize = parseInt(limit) || 5;
	const offset = (parseInt(page) - 1) * pageSize;
	const orderDir = sort === 'ASC' ? 'ASC' : 'DESC';

	let where = 'WHERE 1=1';
	const params = [];
	if (search) { where += ' AND (n.title LIKE ? OR n.content LIKE ?)'; params.push(`%${search}%`, `%${search}%`); }
	if (authorSearch) { where += ' AND u.full_name LIKE ?'; params.push(`%${authorSearch}%`); }
	if (categoryId) { where += ' AND n.category_id = ?'; params.push(categoryId); }
	if (authorId) { where += ' AND n.author_id = ?'; params.push(authorId); }

	const [rows] = await pool.query(`SELECT n.*, u.full_name as author_name, c.name as category_name FROM News n LEFT JOIN User u ON n.author_id = u.id LEFT JOIN Category c ON n.category_id = c.id ${where} ORDER BY n.publication_date ${orderDir} LIMIT ? OFFSET ?`, [...params, pageSize, offset]);
	const [count] = await pool.query(`SELECT COUNT(*) as total FROM News n LEFT JOIN User u ON n.author_id = u.id ${where}`, params);
	
	res.json({ success: true, data: rows, pagination: { totalPages: Math.ceil(count[0].total / pageSize), currentPage: parseInt(page) || 1 } });
});

app.get('/api/news/:id', async (req, res) => {
	const [post] = await pool.query(`SELECT n.*, u.full_name as author_name, c.name as category_name FROM News n LEFT JOIN User u ON n.author_id = u.id LEFT JOIN Category c ON n.category_id = c.id WHERE n.id = ?`, [req.params.id]);
	const [images] = await pool.query(`SELECT image_url FROM PostImages WHERE news_id = ?`, [req.params.id]);
	res.json({ success: true, data: { ...post[0], images: images.map(img => img.image_url) } });
});

app.post('/api/news', upload.array('photos', 10), async (req, res) => {
	const { title, content, author_id, category_id, google_maps_url } = req.body;
	const [res1] = await pool.query('INSERT INTO News (title, content, author_id, category_id, google_maps_url) VALUES (?, ?, ?, ?, ?)', [title, content, author_id, category_id, google_maps_url]);
	const newsId = res1.insertId;
	if (req.files) {
		for (let f of req.files) await pool.query('INSERT INTO PostImages (news_id, image_url) VALUES (?, ?)', [newsId, `/uploads/${f.filename}`]);
	}
	const [u] = await pool.query('SELECT full_name FROM User WHERE id = ?', [author_id]);
	await handlePings(content, u[0].full_name, newsId);
	res.json({ success: true });
});

app.put('/api/news/:id', async (req, res) => {
	const { title, content, category_id, google_maps_url, author_id } = req.body;
	const [r] = await pool.query(`UPDATE News SET title=?, content=?, category_id=?, google_maps_url=? WHERE id=? AND author_id=?`, [title, content, category_id, google_maps_url, req.params.id, author_id]);
	res.json({ success: r.affectedRows > 0 });
});

app.delete('/api/news/:id', async (req, res) => {
	await pool.query('DELETE FROM News WHERE id = ?', [req.params.id]);
	res.json({ success: true });
});

/*=========================================
Коменти та сповіщення
=========================================*/
//Отримання коментів до поста
app.get('/api/news/:id/comments', async (req, res) => {
	try {
		const [rows] = await pool.query(`SELECT c.*, u.full_name as author_name FROM Comments c JOIN User u ON c.user_id = u.id WHERE c.news_id = ? ORDER BY c.created_at DESC`, [req.params.id]);
		res.json({ success: true, data: rows });
	} catch (err) {
		res.status(500).json({ success: false, message: err.message });
	}
});

//Створення нового коментаря або відповіді
app.post('/api/comments', async (req, res) => {
	try {
		const { news_id, user_id, content, parent_id } = req.body;
		if (!content || content.trim() === '') {
			return res.status(400).json({ success: false, message: 'Порожньо' });
		}
		await pool.query('INSERT INTO Comments (news_id, user_id, content, parent_id) VALUES (?, ?, ?, ?)', [news_id, user_id, content, parent_id || null]);

		//Пінг до того, кого @user в тексті
		const [u] = await pool.query('SELECT full_name FROM User WHERE id = ?', [user_id]);
		await handlePings(content, u[0].full_name, news_id);

		res.json({ success: true });
	} catch (err) {
		res.status(500).json({ success: false, message: err.message });
	}
});

//Видалення коментаря (автор коментаря, адмін, або автор поста під яким комм)
app.delete('/api/comments/:id', async (req, res) => {
	try {
		const { user_id, role_id } = req.body;
		const commentId = req.params.id;

		//Отримання інфи про авторів
		const [rows] = await pool.query(`
			SELECT c.user_id as comment_author_id, n.author_id as post_author_id 
			FROM Comments c 
			JOIN News n ON c.news_id = n.id 
			WHERE c.id = ?`, [commentId]);

		if (rows.length === 0) return res.status(404).json({ success: false, message: 'Не знайдено' });
		const { comment_author_id, post_author_id } = rows[0];

		//Перевірка прав
		if (role_id === 1 || user_id === comment_author_id || user_id === post_author_id) {
			await pool.query('DELETE FROM Comments WHERE id = ?', [commentId]);
			res.json({ success: true });
		} else {
			res.status(403).json({ success: false, message: 'Немає прав' });
		}
	} catch (err) {
		res.status(500).json({ success: false, message: err.message });
	}
});

app.get('/api/notifications/:userId', async (req, res) => {
	const [rows] = await pool.query('SELECT * FROM Notifications WHERE user_id = ? ORDER BY created_at DESC LIMIT 5', [req.params.userId]);
	res.json({ success: true, data: rows });
});

app.put('/api/notifications/read/:userId', async (req, res) => {
	await pool.query('UPDATE Notifications SET is_read = TRUE WHERE user_id = ?', [req.params.userId]);
	res.json({ success: true });
});

app.listen(PORT, () => console.log(`Server is running at: http://localhost:${PORT}`));