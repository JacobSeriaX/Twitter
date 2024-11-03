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

console.log("Firebase initialized");

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

// Элементы модального окна редактирования профиля
const editProfileButton = document.getElementById('edit-profile-button');
const editProfileModal = document.getElementById('edit-profile-modal');
const closeModalButton = document.querySelector('.close-button');
const saveProfileButton = document.getElementById('save-profile-button');
const editDisplayNameInput = document.getElementById('edit-display-name');

// Переключение форм регистрации и входа
showRegister.addEventListener('click', (e) => {
    e.preventDefault();
    loginForm.style.display = 'none';
    registerForm.style.display = 'block';
    console.log("Switched to Register form");
});

showLogin.addEventListener('click', (e) => {
    e.preventDefault();
    registerForm.style.display = 'none';
    loginForm.style.display = 'block';
    console.log("Switched to Login form");
});

// Регистрация пользователя
registerButton.addEventListener('click', () => {
    const email = document.getElementById('register-username').value.trim();
    const password = document.getElementById('register-password').value.trim();

    console.log(`Attempting to register with email: ${email}`);

    if (email === '' || password === '') {
        alert('Пожалуйста, заполните все поля.');
        console.warn("Registration failed: Empty fields");
        return;
    }

    auth.createUserWithEmailAndPassword(email, password)
        .then((userCredential) => {
            console.log(`User registered: ${userCredential.user.uid}`);
            // Добавление пользователя в Firestore с displayName и isVerified по умолчанию
            return db.collection('users').doc(userCredential.user.uid).set({
                email: email,
                displayName: email.split('@')[0], // Инициализация displayName
                isVerified: false, // По умолчанию не проверен
                createdAt: firebase.firestore.FieldValue.serverTimestamp()
            });
        })
        .then(() => {
            alert('Регистрация прошла успешно!');
            console.log("User data saved to Firestore");
        })
        .catch((error) => {
            console.error(`Registration error: ${error.message}`);
            alert(`Ошибка: ${error.message}`);
        });
});

// Вход пользователя
loginButton.addEventListener('click', () => {
    const email = document.getElementById('login-username').value.trim();
    const password = document.getElementById('login-password').value.trim();

    console.log(`Attempting to login with email: ${email}`);

    if (email === '' || password === '') {
        alert('Пожалуйста, заполните все поля.');
        console.warn("Login failed: Empty fields");
        return;
    }

    auth.signInWithEmailAndPassword(email, password)
        .then(() => {
            console.log('User signed in');
        })
        .catch((error) => {
            console.error(`Login error: ${error.message}`);
            alert(`Ошибка: ${error.message}`);
        });
});

// Наблюдатель состояния аутентификации
auth.onAuthStateChanged((user) => {
    if (user) {
        console.log(`User is signed in: ${user.uid}`);
        authContainer.style.display = 'none';
        mainContainer.style.display = 'block';
        loadProfile(user);
        loadFeed();
    } else {
        console.log('No user is signed in');
        authContainer.style.display = 'block';
        mainContainer.style.display = 'none';
        feed.innerHTML = ''; // Очистить ленту при выходе
    }
});

// Загрузка профиля пользователя
function loadProfile(user) {
    db.collection('users').doc(user.uid).get().then((doc) => {
        if (doc.exists) {
            const userData = doc.data();
            // Добавление галочки, если пользователь проверен
            const verifiedIcon = userData.isVerified ? '<i class="fas fa-check-circle verified-icon"></i>' : '';
            profileUsername.innerHTML = `Имя: ${userData.displayName}${verifiedIcon}`;
            console.log(`Profile loaded for user: ${user.uid}`);
        } else {
            console.warn("No such user document!");
            profileUsername.textContent = "Имя: Неизвестно";
        }
    }).catch((error) => {
        console.error(`Error fetching user data: ${error.message}`);
    });
}

// Выход пользователя
logoutButton.addEventListener('click', () => {
    auth.signOut()
        .then(() => {
            console.log('User signed out');
        })
        .catch((error) => {
            console.error(`Logout error: ${error.message}`);
            alert(`Ошибка: ${error.message}`);
        });
});

// Публикация сообщения
postButton.addEventListener('click', () => {
    const content = postContent.value.trim();
    const user = auth.currentUser;

    console.log(`Attempting to post: "${content}" by user: ${user ? user.uid : 'None'}`);

    if (content === '') {
        alert('Пожалуйста, введите сообщение.');
        console.warn("Post failed: Empty content");
        return;
    }

    if (user) {
        // Сохранение поста в Firestore
        savePost(content, user.uid);
    } else {
        console.warn("Post failed: No user authenticated");
    }
});

// Функция сохранения поста в Firestore
function savePost(content, userId) {
    db.collection('posts').add({
        userId: userId,
        content: content,
        createdAt: firebase.firestore.FieldValue.serverTimestamp()
    })
    .then(() => {
        console.log('Post added');
        postContent.value = '';
        // Не обязательно вызывать loadFeed(), так как мы используем onSnapshot()
    })
    .catch((error) => {
        console.error(`Post error: ${error.message}`);
        alert(`Ошибка: ${error.message}`);
    });
}

// Загрузка ленты сообщений
function loadFeed() {
    feed.innerHTML = '';
    console.log('Loading feed');

    db.collection('posts')
        .orderBy('createdAt', 'desc')
        .limit(50)
        .onSnapshot((querySnapshot) => {
            console.log('Feed snapshot received');
            feed.innerHTML = ''; // Очистить перед обновлением
            querySnapshot.forEach((doc) => {
                const post = doc.data();
                const postId = doc.id;

                // Создание элемента поста
                const postDiv = document.createElement('div');
                postDiv.classList.add('post');

                // Получение данных пользователя
                db.collection('users').doc(post.userId).get().then((userDoc) => {
                    if (userDoc.exists) {
                        const userData = userDoc.data();
                        const date = post.createdAt ? post.createdAt.toDate() : new Date();
                        const formattedDate = formatDate(date);

                        // Добавление иконки верификации, если пользователь проверен
                        const verifiedIcon = userData.isVerified ? '<i class="fas fa-check-circle verified-icon"></i>' : '';

                        postDiv.innerHTML = `
                            <p><strong>${userData.displayName}${verifiedIcon}</strong> <span>${formattedDate}</span></p>
                            <p>${post.content}</p>
                            <div class="reactions-container" id="reactions-${postId}">
                                <!-- Реакции будут добавлены здесь -->
                            </div>
                        `;
                        feed.appendChild(postDiv);

                        // Загрузка реакций для этого поста
                        loadReactions(postId);
                    } else {
                        console.warn(`No user document for userId: ${post.userId}`);
                        postDiv.innerHTML = `
                            <p><strong>Неизвестный пользователь</strong> <span>${formatDate(new Date())}</span></p>
                            <p>${post.content}</p>
                            <div class="reactions-container" id="reactions-${postId}">
                                <!-- Реакции будут добавлены здесь -->
                            </div>
                        `;
                        feed.appendChild(postDiv);
                        loadReactions(postId);
                    }
                }).catch((error) => {
                    console.error(`Error fetching user data: ${error.message}`);
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
    console.log(`Loading reactions for post: ${postId}`);

    // Определение типов реакций
    const reactionTypes = [
        { type: 'like', icon: '👍' },
        { type: 'fire', icon: '🔥' },
        { type: 'heart', icon: '❤️' },
        { type: 'laugh', icon: '😂' }
    ];

    // Получение текущего пользователя
    const currentUser = auth.currentUser;
    console.log(`Current user in loadReactions: ${currentUser ? currentUser.uid : 'None'}`);

    // Прослушивание изменений в реакциях для этого поста
    db.collection('posts').doc(postId).collection('reactions')
        .onSnapshot((querySnapshot) => {
            console.log(`Reactions snapshot received for post: ${postId}`);
            const reactionsCount = {};

            querySnapshot.forEach((doc) => {
                const reaction = doc.data();
                if (reactionsCount[reaction.type]) {
                    reactionsCount[reaction.type]++;
                } else {
                    reactionsCount[reaction.type] = 1;
                }
            });

            console.log('Reactions count:', reactionsCount);

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

                console.log(`Reaction: ${reaction.type}, User reacted: ${userReacted}`);

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
                    console.log(`Reaction button clicked: ${reaction.type} for post: ${postId}`);
                    handleReaction(postId, reaction.type, userReacted, userReactionDocId)
                        .then(() => {
                            console.log('Reaction handled successfully.');
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
        console.log(`Removing reaction: ${reactionType} from user: ${currentUser.uid}`);
        // Если пользователь уже поставил реакцию, удаляем её
        return reactionRef.doc(reactionDocId).delete();
    } else {
        console.log(`Adding reaction: ${reactionType} from user: ${currentUser.uid}`);
        // Иначе добавляем новую реакцию
        return reactionRef.add({
            type: reactionType,
            userId: currentUser.uid,
            createdAt: firebase.firestore.FieldValue.serverTimestamp()
        });
    }
}

// Открытие модального окна редактирования профиля
editProfileButton.addEventListener('click', () => {
    const user = auth.currentUser;
    if (user) {
        db.collection('users').doc(user.uid).get().then((doc) => {
            if (doc.exists) {
                const userData = doc.data();
                editDisplayNameInput.value = userData.displayName || '';
                editProfileModal.style.display = 'block';
                console.log("Edit profile modal opened");
            } else {
                console.warn("No user document found!");
            }
        }).catch((error) => {
            console.error(`Error fetching user data: ${error.message}`);
        });
    }
});

// Закрытие модального окна
closeModalButton.addEventListener('click', () => {
    editProfileModal.style.display = 'none';
    console.log("Edit profile modal closed");
});

// Закрытие модального окна при клике вне его
window.addEventListener('click', (event) => {
    if (event.target == editProfileModal) {
        editProfileModal.style.display = 'none';
        console.log("Edit profile modal closed by clicking outside");
    }
});

// Сохранение изменений профиля
saveProfileButton.addEventListener('click', () => {
    const newDisplayName = editDisplayNameInput.value.trim();
    const user = auth.currentUser;

    if (newDisplayName === '') {
        alert('Пожалуйста, введите отображаемое имя.');
        console.warn("Save profile failed: Empty display name");
        return;
    }

    if (user) {
        db.collection('users').doc(user.uid).update({
            displayName: newDisplayName
        })
        .then(() => {
            alert('Профиль обновлен успешно!');
            editProfileModal.style.display = 'none';
            console.log("User displayName updated");
            loadProfile(user); // Обновить отображение профиля
        })
        .catch((error) => {
            console.error(`Error updating profile: ${error.message}`);
            alert(`Ошибка: ${error.message}`);
        });
    } else {
        console.warn("Save profile failed: No user authenticated");
    }
});
