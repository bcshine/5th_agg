// Firebase Authentication 시스템
import { initializeApp } from "https://www.gstatic.com/firebasejs/11.8.1/firebase-app.js";
import { 
    getAuth, 
    createUserWithEmailAndPassword, 
    signInWithEmailAndPassword, 
    updateProfile, 
    onAuthStateChanged,
    signOut 
} from "https://www.gstatic.com/firebasejs/11.8.1/firebase-auth.js";
import { 
    getFirestore, 
    doc, 
    setDoc, 
    getDoc 
} from "https://www.gstatic.com/firebasejs/11.8.1/firebase-firestore.js";

// Firebase 설정을 전역 변수에서 가져오기
// firebase-config.js 파일이 먼저 로드되어야 함

// Firebase 초기화
const app = initializeApp(window.firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

console.log('🔥 Firebase Auth 초기화 완료');

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
    // 인증 상태 변화 감지
    onAuthStateChanged(auth, (user) => {
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
    
    const email = document.getElementById('email').value.trim();
    const password = document.getElementById('password').value;
    const rememberMe = document.getElementById('rememberMe').checked;
    
    if (!email || !password) {
        showMessage('이메일과 비밀번호를 모두 입력해주세요.');
        return;
    }

    showLoading(true, '로그인 중입니다...');
    
    try {
        const userCredential = await signInWithEmailAndPassword(auth, email, password);
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
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        const user = userCredential.user;
        
        // 사용자 프로필 업데이트
        await updateProfile(user, {
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
        
        // 이메일 기반 문서 ID 생성 (admin.js와 동일한 방식)
        const userDocId = email.replace(/[.@]/g, '_');
        await setDoc(doc(db, 'users', userDocId), userData);
        
        console.log('✅ 회원가입 성공:', user.email);
        
        // 자동 로그인 설정
        if (autoLogin) {
            localStorage.setItem('rememberLogin', 'true');
        }
        
        showMessage('회원가입이 완료되었습니다! 메인 페이지로 이동합니다.');
        
        setTimeout(() => {
            window.location.href = 'index.html';
        }, 2000);
        
    } catch (error) {
        console.error('❌ 회원가입 오류:', error);
        
        let errorMessage = '회원가입에 실패했습니다.';
        
        switch (error.code) {
            case 'auth/email-already-in-use':
                errorMessage = '이미 사용 중인 이메일입니다. 로그인을 시도해보세요.';
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

// 비밀번호 보기/숨기기 토글
function togglePassword(inputId) {
    const input = document.getElementById(inputId);
    const eyeIcon = document.getElementById(inputId + '-eye');
    
    if (input.type === 'password') {
        input.type = 'text';
        eyeIcon.classList.remove('fa-eye');
        eyeIcon.classList.add('fa-eye-slash');
    } else {
        input.type = 'password';
        eyeIcon.classList.remove('fa-eye-slash');
        eyeIcon.classList.add('fa-eye');
    }
}

// 전화번호 포맷팅
function formatPhoneNumber(e) {
    let value = e.target.value.replace(/[^0-9]/g, '');
    
    if (value.length >= 3 && value.length <= 7) {
        value = value.replace(/(\d{3})(\d{0,4})/, '$1-$2');
    } else if (value.length > 7) {
        value = value.replace(/(\d{3})(\d{4})(\d{0,4})/, '$1-$2-$3');
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

// 로딩 상태 표시/숨김
function showLoading(show, message = '처리 중입니다...') {
    const loadingElement = document.getElementById('loading');
    if (loadingElement) {
        if (show) {
            loadingElement.style.display = 'flex';
            const loadingText = loadingElement.querySelector('p');
            if (loadingText) {
                loadingText.textContent = message;
            }
        } else {
            loadingElement.style.display = 'none';
        }
    }
}

// 메시지 표시
function showMessage(message) {
    const messageModal = document.getElementById('messageModal');
    const messageText = document.getElementById('messageText');
    
    if (messageModal && messageText) {
        messageText.textContent = message;
        messageModal.style.display = 'flex';
    }
}

// 메시지 모달 닫기
function closeMessage() {
    const messageModal = document.getElementById('messageModal');
    if (messageModal) {
        messageModal.style.display = 'none';
    }
}

// 사용자 인증 상태 확인 (다른 페이지에서 사용)
export function getCurrentUser() {
    return auth.currentUser;
}

// 로그아웃 (다른 페이지에서 사용)
export async function logout() {
    try {
        await signOut(auth);
        localStorage.removeItem('rememberLogin');
        console.log('✅ 로그아웃 성공');
        return true;
    } catch (error) {
        console.error('❌ 로그아웃 오류:', error);
        return false;
    }
}

console.log(' Auth.js 초기화 완료!'); 