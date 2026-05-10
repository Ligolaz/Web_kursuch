/*=========================================
Логіка перемикання вкладок вхід/реєстрація
=========================================*/
function switchTab(type) {
	document.querySelectorAll('.auth-tab, .auth-form').forEach(el => el.classList.remove('active'));
	document.getElementById(`tab-${type}`).classList.add('active');
	document.getElementById(`${type}Form`).classList.add('active');
}

/*=========================================
Основна робота з входом та реєстрацією
=========================================*/
//Аналіз вводу з полів, перевірка ніку і стукаємо на сервер
async function handleAuth(e, type) {
	e.preventDefault();
	const msg = document.getElementById('authMessage');
	const isReg = type === 'register';

	const data = {
		username: document.getElementById(isReg ? 'regUser' : 'loginUser').value,
		password: document.getElementById(isReg ? 'regPass' : 'loginPass').value,
		full_name: isReg ? document.getElementById('regName').value : null
	};

	if (isReg && !/^[a-zA-Z0-9_]{1,24}$/.test(data.full_name)) {
		msg.className = 'message error';
		return msg.textContent = 'Display Name: тільки латиниця, цифри та "_" (1-24 симв.)';
	}

	const res = await fetch(`/api/${type}`, {
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify(data)
	});
	const result = await res.json();

	if (result.success) {
		if (isReg) { msg.className = 'message success'; msg.textContent = 'Успіх! Увійдіть.'; switchTab('login'); }
		else { localStorage.setItem('user', JSON.stringify(result.user)); location.href = 'index.html'; }
	} else { msg.className = 'message error'; msg.textContent = result.message; }
}

/*=========================================
Вмикання кнопки підтвердження(вхід /реєстрація)
=========================================*/
document.getElementById('loginForm').onsubmit = (e) => handleAuth(e, 'login');
document.getElementById('registerForm').onsubmit = (e) => handleAuth(e, 'register');