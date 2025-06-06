// Firebase 전통적인 스크립트 방식으로 변경
// ES6 모듈 대신 CDN 스크립트 사용

// Firebase가 로드될 때까지 기다리는 함수
function waitForFirebase() {
    return new Promise((resolve) => {
        if (window.firebase) {
            resolve();
        } else {
            const checkFirebase = setInterval(() => {
                if (window.firebase) {
                    clearInterval(checkFirebase);
                    resolve();
                }
            }, 100);
        }
    });
}

// Firebase 초기화 함수
async function initializeFirebase() {
    await waitForFirebase();
    
    // Firebase 초기화
    const app = firebase.initializeApp(window.firebaseConfig);
    const auth = firebase.auth();
    const db = firebase.firestore();
    
    console.log('🔥 Firebase Auth 초기화 완료');
    
    return { app, auth, db };
}

let firebaseInstance = null;

// 전역 함수들
window.togglePassword = togglePassword;
window.showTermsModal = showTermsModal;
window.closeTermsModal = closeTermsModal;
window.agreeTerms = agreeTerms;
window.closeMessage = closeMessage;

// 현재 페이지 확인
const isLoginPage = window.location.pathname.includes('login.html');
const isRegisterPage = window.location.pathname.includes('register.html');

// 페이지 로드 시 초기화
document.addEventListener('DOMContentLoaded', async function() {
    try {
        firebaseInstance = await initializeFirebase();
        const { auth } = firebaseInstance;
        
        // 인증 상태 변화 감지
        auth.onAuthStateChanged((user) => {
            if (user && (isLoginPage || isRegisterPage)) {
                // 이미 로그인된 상태라면 메인 페이지로 리다이렉트
                showMessage('이미 로그인되어 있습니다. 메인 페이지로 이동합니다.');
                setTimeout(() => {
                    window.location.href = 'index.html';
                }, 1500);
            }
        });

        // 폼 이벤트 리스너 설정
        if (isLoginPage) {
            initLoginForm();
        } else if (isRegisterPage) {
            initRegisterForm();
        }
    } catch (error) {
        console.error('Firebase 초기화 오류:', error);
        showMessage('Firebase 초기화에 실패했습니다. 페이지를 새로고침해주세요.');
    }
});

// 로그인 폼 초기화
function initLoginForm() {
    const loginForm = document.getElementById('loginForm');
    if (loginForm) {
        loginForm.addEventListener('submit', handleLogin);
    }
}

// 회원가입 폼 초기화
function initRegisterForm() {
    const registerForm = document.getElementById('registerForm');
    if (registerForm) {
        registerForm.addEventListener('submit', handleRegister);
    }

    // 전화번호 입력 포맷팅
    const phoneInput = document.getElementById('phone');
    if (phoneInput) {
        phoneInput.addEventListener('input', formatPhoneNumber);
    }
}

// 로그인 처리
async function handleLogin(e) {
    e.preventDefault();
    
    if (!firebaseInstance) {
        showMessage('Firebase가 아직 초기화되지 않았습니다. 잠시 후 다시 시도해주세요.');
        return;
    }
    
    const { auth } = firebaseInstance;
    const email = document.getElementById('email').value.trim();
    const password = document.getElementById('password').value;
    const rememberMe = document.getElementById('rememberMe').checked;
    
    if (!email || !password) {
        showMessage('이메일과 비밀번호를 모두 입력해주세요.');
        return;
    }

    showLoading(true, '로그인 중입니다...');
    
    try {
        const userCredential = await auth.signInWithEmailAndPassword(email, password);
        const user = userCredential.user;
        
        console.log('✅ 로그인 성공:', user.email);
        
        // 자동 로그인 설정
        if (rememberMe) {
            localStorage.setItem('rememberLogin', 'true');
        } else {
            localStorage.removeItem('rememberLogin');
        }
        
        showMessage('로그인 성공! 메인 페이지로 이동합니다.');
        
        setTimeout(() => {
            window.location.href = 'index.html';
        }, 1500);
        
    } catch (error) {
        console.error('❌ 로그인 오류:', error);
        
        let errorMessage = '로그인에 실패했습니다.';
        
        switch (error.code) {
            case 'auth/user-not-found':
                errorMessage = '존재하지 않는 이메일입니다. 회원가입을 먼저 해주세요.';
                break;
            case 'auth/wrong-password':
                errorMessage = '비밀번호가 틀렸습니다.';
                break;
            case 'auth/invalid-email':
                errorMessage = '유효하지 않은 이메일 형식입니다.';
                break;
            case 'auth/too-many-requests':
                errorMessage = '너무 많은 로그인 시도입니다. 잠시 후 다시 시도해주세요.';
                break;
            case 'auth/invalid-credential':
                errorMessage = '이메일 또는 비밀번호가 잘못되었습니다.';
                break;
            default:
                errorMessage = `오류가 발생했습니다: ${error.message}`;
        }
        
        showMessage(errorMessage);
        showLoading(false);
    }
}

// 회원가입 처리
async function handleRegister(e) {
    e.preventDefault();
    
    if (!firebaseInstance) {
        showMessage('Firebase가 아직 초기화되지 않았습니다. 잠시 후 다시 시도해주세요.');
        return;
    }
    
    const { auth, db } = firebaseInstance;
    const name = document.getElementById('name').value.trim();
    const phone = document.getElementById('phone').value.trim();
    const email = document.getElementById('email').value.trim();
    const password = document.getElementById('password').value;
    const confirmPassword = document.getElementById('confirmPassword').value;
    const autoLogin = document.getElementById('autoLogin').checked;
    const agreeTerms = document.getElementById('agreeTerms').checked;
    
    // 입력값 검증
    if (!name || !phone || !email || !password || !confirmPassword) {
        showMessage('모든 필수 항목을 입력해주세요.');
        return;
    }
    
    if (!agreeTerms) {
        showMessage('개인정보 이용약관에 동의해주세요.');
        return;
    }
    
    if (password !== confirmPassword) {
        showMessage('비밀번호가 일치하지 않습니다.');
        return;
    }
    
    if (password.length < 6) {
        showMessage('비밀번호는 6자리 이상이어야 합니다.');
        return;
    }
    
    if (!isValidEmail(email)) {
        showMessage('유효한 이메일 주소를 입력해주세요.');
        return;
    }
    
    if (!isValidPhone(phone)) {
        showMessage('유효한 전화번호를 입력해주세요. (예: 010-1234-5678)');
        return;
    }

    showLoading(true, '회원가입 중입니다...');
    
    try {
        // Firebase Authentication으로 계정 생성
        const userCredential = await auth.createUserWithEmailAndPassword(email, password);
        const user = userCredential.user;
        
        // 사용자 프로필 업데이트
        await user.updateProfile({
            displayName: name
        });
        
        // 사용자 정보를 데이터베이스에 저장
        const userData = {
            uid: user.uid,
            name: name,
            phone: phone,
            email: email,
            status: 'active',
            role: 'user',
            autoLogin: autoLogin,
            questionCount: 0,
            answerCount: 0,
            createdAt: Date.now(),
            lastLoginAt: Date.now()
        };
        
        await db.collection('users').doc(user.uid).set(userData);
        
        console.log('✅ 회원가입 성공:', user.email);
        
        showMessage('회원가입이 완료되었습니다! 로그인 페이지로 이동합니다.');
        
        setTimeout(() => {
            window.location.href = 'login.html';
        }, 2000);
        
    } catch (error) {
        console.error('❌ 회원가입 오류:', error);
        
        let errorMessage = '회원가입에 실패했습니다.';
        
        switch (error.code) {
            case 'auth/email-already-in-use':
                errorMessage = '이미 사용 중인 이메일입니다. 다른 이메일을 사용해주세요.';
                break;
            case 'auth/invalid-email':
                errorMessage = '유효하지 않은 이메일 형식입니다.';
                break;
            case 'auth/weak-password':
                errorMessage = '비밀번호가 너무 약합니다. 더 강한 비밀번호를 사용해주세요.';
                break;
            default:
                errorMessage = `오류가 발생했습니다: ${error.message}`;
        }
        
        showMessage(errorMessage);
        showLoading(false);
    }
}

// 비밀번호 표시/숨김 토글
function togglePassword(inputId) {
    const input = document.getElementById(inputId);
    const icon = document.getElementById(inputId + '-eye');
    
    if (input.type === 'password') {
        input.type = 'text';
        icon.className = 'far fa-eye-slash';
    } else {
        input.type = 'password';
        icon.className = 'far fa-eye';
    }
}

// 전화번호 포맷팅
function formatPhoneNumber(e) {
    let value = e.target.value.replace(/[^\d]/g, '');
    if (value.length >= 3 && value.length <= 7) {
        value = value.replace(/(\d{3})(\d+)/, '$1-$2');
    } else if (value.length > 7) {
        value = value.replace(/(\d{3})(\d{4})(\d+)/, '$1-$2-$3');
    }
    e.target.value = value;
}

// 이메일 유효성 검사
function isValidEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
}

// 전화번호 유효성 검사
function isValidPhone(phone) {
    const phoneRegex = /^010-\d{4}-\d{4}$/;
    return phoneRegex.test(phone);
}

// 약관 모달 표시
function showTermsModal() {
    document.getElementById('termsModal').style.display = 'flex';
}

// 약관 모달 닫기
function closeTermsModal() {
    document.getElementById('termsModal').style.display = 'none';
}

// 약관 동의
function agreeTerms() {
    document.getElementById('agreeTerms').checked = true;
    closeTermsModal();
}

// 로딩 표시/숨김
function showLoading(show, message = '처리 중입니다...') {
    const loading = document.getElementById('loading');
    if (show) {
        loading.style.display = 'flex';
        const loadingText = loading.querySelector('p');
        if (loadingText) {
            loadingText.textContent = message;
        }
    } else {
        loading.style.display = 'none';
    }
}

// 메시지 표시
function showMessage(message) {
    const modal = document.getElementById('messageModal');
    const text = document.getElementById('messageText');
    text.textContent = message;
    modal.style.display = 'flex';
}

// 메시지 닫기
function closeMessage() {
    document.getElementById('messageModal').style.display = 'none';
}

// 현재 사용자 정보 가져오기
async function getCurrentUser() {
    if (!firebaseInstance) return null;
    return firebaseInstance.auth.currentUser;
}

// 로그아웃
async function logout() {
    if (!firebaseInstance) return;
    try {
        await firebaseInstance.auth.signOut();
        console.log('로그아웃 완료');
        window.location.href = 'login.html';
    } catch (error) {
        console.error('로그아웃 오류:', error);
    }
}

console.log(' Auth.js 초기화 완료!'); 