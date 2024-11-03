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
        feed.innerHTML = ''; // Очистить ленту при выходе
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
            // Не обязательно вызывать loadFeed(), так как мы используем onSnapshot()
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
        .onSnapshot((querySnapshot) => {
            feed.innerHTML = ''; // Очистить перед обновлением
            querySnapshot.forEach((doc) => {
                const post = doc.data();
                const postId = doc.id;

                // Создание элемента поста
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
                        <div class="reactions-container" id="reactions-${postId}">
                            <!-- Реакции будут добавлены здесь -->
                        </div>
                    `;
                    feed.appendChild(postDiv);

                    // Загрузка реакций для этого поста
                    loadReactions(postId);
                });
            });
        }, (error) => {
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

// Функция для загрузки и отображения реакций
function loadReactions(postId) {
    const reactionsContainer = document.getElementById(`reactions-${postId}`);

    // Определение типов реакций
    const reactionTypes = [
        { type: 'like', icon: '👍' },
        { type: 'fire', icon: '🔥' },
        { type: 'heart', icon: '❤️' },
        { type: 'laugh', icon: '😂' }
    ];

    // Получение текущего пользователя
    const currentUser = auth.currentUser;

    // Прослушивание изменений в реакциях для этого поста
    db.collection('posts').doc(postId).collection('reactions')
        .onSnapshot((querySnapshot) => {
            const reactionsCount = {};

            querySnapshot.forEach((doc) => {
                const reaction = doc.data();
                if (reactionsCount[reaction.type]) {
                    reactionsCount[reaction.type]++;
                } else {
                    reactionsCount[reaction.type] = 1;
                }
            });

            // Очистить контейнер реакций перед обновлением
            reactionsContainer.innerHTML = '';

            // Для каждого типа реакции создаём кнопку
            reactionTypes.forEach((reaction) => {
                const count = reactionsCount[reaction.type] || 0;

                // Проверка, поставил ли текущий пользователь эту реакцию
                let userReacted = false;
                let userReactionDocId = null;

                querySnapshot.forEach((doc) => {
                    const reactionData = doc.data();
                    if (reactionData.type === reaction.type && reactionData.userId === currentUser.uid) {
                        userReacted = true;
                        userReactionDocId = doc.id;
                    }
                });

                // Создание кнопки реакции
                const reactionButton = document.createElement('button');
                reactionButton.classList.add('reaction-button');
                reactionButton.innerHTML = `
                    <span class="reaction-icon">${reaction.icon}</span>
                    <span class="reaction-count">${count}</span>
                `;

                // Если пользователь уже поставил эту реакцию, выделяем её
                if (userReacted) {
                    reactionButton.style.color = '#1da1f2';
                } else {
                    reactionButton.style.color = '#657786';
                }

                // Добавление обработчика события
                reactionButton.addEventListener('click', () => {
                    handleReaction(postId, reaction.type, userReacted, userReactionDocId)
                        .then(() => {
                            // Реакции обновятся автоматически через onSnapshot
                        })
                        .catch((error) => {
                            console.error("Ошибка при обработке реакции: ", error);
                        });
                });

                reactionsContainer.appendChild(reactionButton);
            });
        }, (error) => {
            console.error("Ошибка при загрузке реакций: ", error);
        });
}

// Функция для обработки добавления или удаления реакции
function handleReaction(postId, reactionType, userReacted, reactionDocId) {
    const currentUser = auth.currentUser;
    const reactionRef = db.collection('posts').doc(postId).collection('reactions');

    if (userReacted) {
        // Если пользователь уже поставил реакцию, удаляем её
        return reactionRef.doc(reactionDocId).delete();
    } else {
        // Иначе добавляем новую реакцию
        return reactionRef.add({
            type: reactionType,
            userId: currentUser.uid,
            createdAt: firebase.firestore.FieldValue.serverTimestamp()
        });
    }
}
