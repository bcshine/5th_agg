// Firebase v8 Legacy 방식 - 테스트에서 작동 확인됨
const firebaseConfig = {
  apiKey: "AIzaSyDjLGVPUFy2sAVjfys_FEbITu2Dq7VNDKM",
  authDomain: "mid-ai-5th.firebaseapp.com",
  projectId: "mid-ai-5th",
  storageBucket: "mid-ai-5th.firebasestorage.app",
  messagingSenderId: "2959931709",
  appId: "1:2959931709:web:2e4c0e1bf8ff3121a46d54"
};

// Firebase 초기화 변수
let app, auth, db;
let isFirebaseReady = false;

// Firebase 초기화 함수
function initializeFirebase() {
    try {
        console.log('🔄 Firebase 초기화 시작...');
        
        // Firebase 스크립트 로딩 확인
        if (typeof firebase === 'undefined') {
            console.error('❌ Firebase 스크립트가 로드되지 않음');
            console.error('현재 window.firebase:', window.firebase);
            return false;
        }
        
        console.log('✅ Firebase 스크립트 로드됨');
        console.log('Firebase 버전:', firebase.SDK_VERSION);
        
        // Firebase 초기화
        console.log('📋 Firebase 설정:', firebaseConfig);
        app = firebase.initializeApp(firebaseConfig);
        console.log('✅ Firebase 앱 초기화 완료');
        
        auth = firebase.auth();
        console.log('✅ Firebase Auth 초기화 완료');
        
        // Firestore는 선택적으로 초기화
        try {
            db = firebase.firestore();
            console.log('✅ Firestore 연결 성공');
        } catch (firestoreError) {
            console.warn('⚠️ Firestore 연결 실패, 계속 진행:', firestoreError.message);
        }
        
        console.log('✅ Firebase 초기화 완료');
        console.log('✅ 프로젝트 ID:', app.options.projectId);
        console.log('✅ Auth Domain:', app.options.authDomain);
        
        isFirebaseReady = true;
        return true;
        
    } catch (error) {
        console.error('❌ Firebase 초기화 실패:', error);
        console.error('오류 상세:', error.message);
        console.error('오류 스택:', error.stack);
        return false;
    }
}

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
document.addEventListener('DOMContentLoaded', function() {
    console.log('📄 페이지 로드 완료');
    
    // Firebase 초기화 시도
    if (!initializeFirebase()) {
        showMessage('Firebase 연결에 실패했습니다. 페이지를 새로고침해주세요.');
        return;
    }
    
    // Firebase가 성공적으로 초기화된 경우에만 인증 상태 감지
    if (auth) {
        // 인증 상태 변화 감지
        auth.onAuthStateChanged((user) => {
            console.log('👤 인증 상태 변화:', user ? `로그인: ${user.email}` : '로그아웃');
            
            if (user && (isLoginPage || isRegisterPage)) {
                console.log('이미 로그인된 사용자 감지, 메인으로 리다이렉트');
                showMessage('이미 로그인되어 있습니다. 메인 페이지로 이동합니다.');
                setTimeout(() => {
                    window.location.href = 'index.html';
                }, 1500);
            }
        });
    }

    // 폼 이벤트 리스너 설정
    if (isLoginPage) {
        console.log('🔑 로그인 폼 준비');
        initLoginForm();
    } else if (isRegisterPage) {
        console.log('📝 회원가입 폼 준비');
        initRegisterForm();
    }
    
    console.log('✅ 모든 준비 완료');
});

// 로그인 폼 초기화
function initLoginForm() {
    const loginForm = document.getElementById('loginForm');
    if (loginForm) {
        loginForm.addEventListener('submit', handleLogin);
        console.log('로그인 폼 이벤트 리스너 등록됨');
    } else {
        console.error('로그인 폼을 찾을 수 없습니다');
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
    console.log('🔑 로그인 시도 시작');
    
    if (!isFirebaseReady || !auth) {
        showMessage('Firebase가 아직 준비되지 않았습니다. 잠시 후 다시 시도해주세요.');
        return;
    }
    
    const email = document.getElementById('email').value.trim();
    const password = document.getElementById('password').value;
    const rememberMe = document.getElementById('rememberMe').checked;
    
    console.log('입력값 확인:', { email: email, passwordLength: password.length });
    
    if (!email || !password) {
        showMessage('이메일과 비밀번호를 모두 입력해주세요.');
        return;
    }

    showLoading(true, '로그인 중입니다...');
    
    try {
        console.log('Firebase 로그인 시도:', email);
        const userCredential = await auth.signInWithEmailAndPassword(email, password);
        const user = userCredential.user;
        
        console.log('✅ 로그인 성공:', user.email);
        
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
        console.error('오류 코드:', error.code);
        console.error('오류 메시지:', error.message);
        
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
            case 'auth/invalid-login-credentials':
                errorMessage = '이메일 또는 비밀번호가 잘못되었습니다.';
                break;
            case 'auth/internal-error':
                errorMessage = '서버 내부 오류입니다. 잠시 후 다시 시도해주세요.';
                break;
            default:
                errorMessage = `로그인 오류: ${error.message}`;
        }
        
        showMessage(errorMessage);
        showLoading(false);
    }
}

// 회원가입 처리
async function handleRegister(e) {
    e.preventDefault();
    
    if (!isFirebaseReady || !auth) {
        showMessage('Firebase가 아직 준비되지 않았습니다. 잠시 후 다시 시도해주세요.');
        return;
    }
    
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
        
        // Firestore에 사용자 정보 저장 (선택적)
        if (db) {
            try {
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
                console.log('✅ 사용자 데이터 Firestore에 저장됨');
            } catch (dbError) {
                console.warn('⚠️ Firestore 저장 실패, 계속 진행:', dbError.message);
            }
        }
        
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
                errorMessage = `회원가입 오류: ${error.message}`;
        }
        
        showMessage(errorMessage);
        showLoading(false);
    }
}

// 비밀번호 표시/숨김 토글
function togglePassword(inputId) {
    const input = document.getElementById(inputId);
    const icon = document.getElementById(inputId + '-eye');
    
    if (input && icon) {
        if (input.type === 'password') {
            input.type = 'text';
            icon.className = 'far fa-eye-slash';
        } else {
            input.type = 'password';
            icon.className = 'far fa-eye';
        }
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
    const modal = document.getElementById('termsModal');
    if (modal) {
        modal.style.display = 'flex';
    }
}

// 약관 모달 닫기
function closeTermsModal() {
    const modal = document.getElementById('termsModal');
    if (modal) {
        modal.style.display = 'none';
    }
}

// 약관 동의
function agreeTerms() {
    const checkbox = document.getElementById('agreeTerms');
    if (checkbox) {
        checkbox.checked = true;
    }
    closeTermsModal();
}

// 로딩 표시/숨김
function showLoading(show, message = '처리 중입니다...') {
    const loading = document.getElementById('loading');
    if (loading) {
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
}

// 메시지 표시
function showMessage(message) {
    const modal = document.getElementById('messageModal');
    const text = document.getElementById('messageText');
    if (modal && text) {
        text.textContent = message;
        modal.style.display = 'flex';
    } else {
        // 폴백: alert 사용
        alert(message);
    }
}

// 메시지 닫기
function closeMessage() {
    const modal = document.getElementById('messageModal');
    if (modal) {
        modal.style.display = 'none';
    }
}

// 현재 사용자 정보 가져오기
function getCurrentUser() {
    return auth ? auth.currentUser : null;
}

// 로그아웃
async function logout() {
    if (!auth) return;
    try {
        await auth.signOut();
        console.log('로그아웃 완료');
        window.location.href = 'login.html';
    } catch (error) {
        console.error('로그아웃 오류:', error);
    }
}

console.log(' Auth.js 초기화 완료!'); 