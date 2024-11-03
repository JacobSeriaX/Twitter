// TODO: Замените следующие конфигурационные данные на свои из Firebase
const firebaseConfig = {
    apiKey: "AIzaSyAuxFcoW-cV8rxAow9IvIdSkgk9NwSyx3M",
    authDomain: "twitter-c89f3.firebaseapp.com",
    projectId: "twitter-c89f3",
    storageBucket: "twitter-c89f3.firebasestorage.app",
    messagingSenderId: "719202520636",
    appId: "1:719202520636:web:01f0851ced15e393607d39"
};

// Инициализация Firebase
firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();
const db = firebase.firestore();

// Элементы DOM
const showRegister = document.getElementById('show-register');
const showLogin = document.getElementById('show-login');
const loginForm = document.getElementById('login-form');
const registerForm = document.getElementById('register-form');
const registerButton = document.getElementById('register-button');
const loginButton = document.getElementById('login-button');
const authContainer = document.getElementById('auth-container');
const mainContainer = document.getElementById('main-container');
const logoutButton = document.getElementById('logout-button');

const profileUsername = document.getElementById('profile-username');
const postButton = document.getElementById('post-button');
const postContent = document.getElementById('post-content');
const feed = document.getElementById('feed');

// Переключение форм регистрации и входа
showRegister.addEventListener('click', (e) => {
    e.preventDefault();
    loginForm.style.display = 'none';
    registerForm.style.display = 'block';
});

showLogin.addEventListener('click', (e) => {
    e.preventDefault();
    registerForm.style.display = 'none';
    loginForm.style.display = 'block';
});

// Регистрация пользователя
registerButton.addEventListener('click', () => {
    const email = document.getElementById('register-username').value.trim();
    const password = document.getElementById('register-password').value.trim();

    if (email === '' || password === '') {
        alert('Пожалуйста, заполните все поля.');
        return;
    }

    auth.createUserWithEmailAndPassword(email, password)
        .then((userCredential) => {
            // Добавление пользователя в Firestore
            return db.collection('users').doc(userCredential.user.uid).set({
                email: email,
                createdAt: firebase.firestore.FieldValue.serverTimestamp()
            });
        })
        .then(() => {
            alert('Регистрация прошла успешно!');
        })
        .catch((error) => {
            alert(`Ошибка: ${error.message}`);
        });
});

// Вход пользователя
loginButton.addEventListener('click', () => {
    const email = document.getElementById('login-username').value.trim();
    const password = document.getElementById('login-password').value.trim();

    if (email === '' || password === '') {
        alert('Пожалуйста, заполните все поля.');
        return;
    }

    auth.signInWithEmailAndPassword(email, password)
        .then(() => {
            // Успешный вход
        })
        .catch((error) => {
            alert(`Ошибка: ${error.message}`);
        });
});

// Наблюдатель состояния аутентификации
auth.onAuthStateChanged((user) => {
    if (user) {
        authContainer.style.display = 'none';
        mainContainer.style.display = 'block';
        loadProfile(user);
        loadFeed();
    } else {
        authContainer.style.display = 'block';
        mainContainer.style.display = 'none';
    }
});

// Загрузка профиля пользователя
function loadProfile(user) {
    profileUsername.textContent = `Электронная почта: ${user.email}`;
}

// Выход пользователя
logoutButton.addEventListener('click', () => {
    auth.signOut()
        .then(() => {
            // Успешный выход
        })
        .catch((error) => {
            alert(`Ошибка: ${error.message}`);
        });
});

// Публикация сообщения
postButton.addEventListener('click', () => {
    const content = postContent.value.trim();
    const user = auth.currentUser;

    if (content === '') {
        alert('Пожалуйста, введите сообщение.');
        return;
    }

    if (user) {
        db.collection('posts').add({
            userId: user.uid,
            content: content,
            createdAt: firebase.firestore.FieldValue.serverTimestamp()
        })
        .then(() => {
            postContent.value = '';
            loadFeed();
        })
        .catch((error) => {
            alert(`Ошибка: ${error.message}`);
        });
    }
});

// Загрузка ленты сообщений
function loadFeed() {
    feed.innerHTML = '';

    db.collection('posts')
        .orderBy('createdAt', 'desc')
        .limit(50)
        .get()
        .then((querySnapshot) => {
            querySnapshot.forEach((doc) => {
                const post = doc.data();
                const postDiv = document.createElement('div');
                postDiv.classList.add('post');

                // Получение данных пользователя
                db.collection('users').doc(post.userId).get().then((userDoc) => {
                    const userData = userDoc.data();
                    const date = post.createdAt ? post.createdAt.toDate() : new Date();
                    const formattedDate = formatDate(date);

                    postDiv.innerHTML = `
                        <p><strong>${userData.email}</strong> <span>${formattedDate}</span></p>
                        <p>${post.content}</p>
                    `;
                    feed.appendChild(postDiv);
                });
            });
        })
        .catch((error) => {
            console.error("Ошибка при получении сообщений: ", error);
        });
}

// Форматирование даты
function formatDate(date) {
    const now = new Date();
    const diffTime = now - date;
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays === 0) {
        return `Сегодня в ${date.getHours()}:${String(date.getMinutes()).padStart(2, '0')}`;
    } else if (diffDays === 1) {
        return `Вчера в ${date.getHours()}:${String(date.getMinutes()).padStart(2, '0')}`;
    } else {
        return `${date.toLocaleDateString()} в ${date.getHours()}:${String(date.getMinutes()).padStart(2, '0')}`;
    }
}
