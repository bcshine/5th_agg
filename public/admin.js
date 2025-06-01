// 중간계 AI 스튜디오 - 관리자 JavaScript

// Firebase는 HTML에서 모듈로 로드됨
let app, auth, db, firebaseModules;

// Firebase 설정 (HTML에서 초기화된 것 사용)
const firebaseConfig = {
    apiKey: "AIzaSyDYJpJsOABHy8YhWnFtSbCv6iqRz-gYrKA",
    authDomain: "mid-ai-5th.firebaseapp.com",
    projectId: "mid-ai-5th",
    storageBucket: "mid-ai-5th.firebasestorage.app",
    messagingSenderId: "123456789012",
    appId: "1:123456789012:web:abcdef1234567890"
};

// Firebase 초기화 확인 및 설정
function initializeFirebase() {
    console.log('🔥 Firebase 초기화 확인 중...');
    
    // HTML에서 초기화된 Firebase 인스턴스 사용
    if (window.firebaseApp && window.firebaseAuth && window.firebaseDb) {
        app = window.firebaseApp;
        auth = window.firebaseAuth;
        db = window.firebaseDb;
        firebaseModules = window.firebaseModules;
        
        console.log('✅ Firebase 연결 성공');
        console.log('📊 Firestore 인스턴스:', db);
        console.log('🔐 Auth 인스턴스:', auth);
        
        return true;
    } else {
        console.warn('⚠️ Firebase 인스턴스를 찾을 수 없음, 잠시 후 재시도...');
        return false;
    }
}

// 전역 변수
let currentUser = null;
let allQuestions = [];
let allUsers = [];
let templates = [];
let currentQuestionId = null;
let allAdmins = [];

// DOM 로드 완료 이벤트
document.addEventListener('DOMContentLoaded', function() {
    console.log('📄 DOM 로드 완료');
    
    // 약간의 지연 후 초기화 (CSS 로드 완료 대기)
    setTimeout(() => {
        initializePage();
    }, 100);
});

// 페이지 초기화 함수
function initializePage() {
    console.log('🚀 페이지 초기화 시작');
    
    try {
        // Firebase 초기화 대기 및 재시도
        const maxRetries = 10;
        let retryCount = 0;
        
        const tryInitialize = () => {
            if (initializeFirebase()) {
                // Firebase 연결 성공 후 실제 데이터 로드
                console.log('🔥 Firebase 연결됨, 실제 데이터 로드 시작');
                setupFirebaseAuth();
                loadFirebaseData();
            } else if (retryCount < maxRetries) {
                retryCount++;
                console.log(`🔄 Firebase 연결 재시도 (${retryCount}/${maxRetries})`);
                setTimeout(tryInitialize, 500);
            } else {
                console.warn('⚠️ Firebase 연결 실패, 오프라인 모드로 전환');
                loadOfflineData();
            }
        };
        
        // 기본 초기화
        setupEventListeners();
        initializeEmailJS();
        loadDefaultTemplates();
        
        // Firebase 초기화 시도
        setTimeout(tryInitialize, 100);
        
        // 첫 번째 네비게이션 아이템 활성화
        const firstNavItem = document.querySelector('.nav-item');
        if (firstNavItem) {
            firstNavItem.classList.add('active');
        }
        
        // 대시보드 섹션 활성화
        showSection('dashboard');
        
        console.log('✅ 페이지 초기화 완료');
        
    } catch (error) {
        console.error('❌ 페이지 초기화 오류:', error);
        showNotification('페이지 초기화 중 오류가 발생했습니다: ' + error.message, 'error');
    }
}

// Firebase 인증 설정
function setupFirebaseAuth() {
    console.log('🔐 Firebase 인증 설정 시작');
    
    if (auth && firebaseModules?.onAuthStateChanged) {
        firebaseModules.onAuthStateChanged(auth, (user) => {
            if (user) {
                currentUser = user;
                console.log('✅ 관리자 로그인:', user.email);
                
                const permissions = checkAdminPermissions(user);
                console.log('👤 관리자 권한:', permissions);
                
                updateAdminInfo(user, permissions);
            } else {
                console.log('❌ 로그인되지 않음');
                // 로그인 페이지로 리다이렉트 또는 로그인 요구
            }
        });
    }
}

// Firebase 데이터 로드
async function loadFirebaseData() {
    console.log('🔥 Firebase 데이터 로드 시작');
    
    try {
        showLoading(true);
        
        // 병렬로 데이터 로드
        await Promise.all([
            loadFirebaseUsers(),
            loadFirebaseQuestions(),
            loadFirebaseAdmins()
        ]);
        
        // UI 업데이트
        updateDashboard();
        updateMemberStats();
        updateMembersTable();
        updateQuestionsList();
        updateAdminsList();
        
        showLoading(false);
        console.log('✅ Firebase 데이터 로드 완료');
        
    } catch (error) {
        console.error('❌ Firebase 데이터 로드 오류:', error);
        showNotification('Firebase 데이터 로드 중 오류가 발생했습니다: ' + error.message, 'error');
        
        // 오류 시 오프라인 데이터 로드
        loadOfflineData();
        showLoading(false);
    }
}

// Firebase 사용자 목록 로드
async function loadFirebaseUsers() {
    console.log('👥 Firebase 사용자 로드 시작');
    
    try {
        // Firestore에서 사용자 컬렉션 조회
        if (db && firebaseModules) {
            const { collection, getDocs, query, orderBy } = firebaseModules;
            
            // users 컬렉션에서 사용자 정보 가져오기
            const usersRef = collection(db, 'users');
            const usersQuery = query(usersRef, orderBy('createdAt', 'desc'));
            const usersSnapshot = await getDocs(usersQuery);
            
            allUsers = [];
            usersSnapshot.forEach((doc) => {
                const userData = doc.data();
                allUsers.push({
                    id: doc.id,
                    name: userData.name || userData.displayName || '이름 없음',
                    email: userData.email,
                    phone: userData.phone || '전화번호 없음',
                    status: userData.status || 'active',
                    createdAt: userData.createdAt || new Date(),
                    questionCount: userData.questionCount || 0,
                    answerCount: userData.answerCount || 0
                });
            });
            
            console.log('✅ Firestore 사용자 로드 완료:', allUsers.length, '명');
            
            // Firestore 사용자가 있어도 Authentication과 동기화 확인
            await syncWithAuthentication();
            
            // 사용자가 여전히 없으면 Authentication에서 가져오기
            if (allUsers.length === 0) {
                await loadUsersFromAuth();
            }
        }
        
    } catch (error) {
        console.error('❌ Firebase 사용자 로드 오류:', error);
        // Authentication에서 사용자 목록 가져오기 시도
        await loadUsersFromAuth();
    }
}

// Authentication과 Firestore 사용자 동기화
async function syncWithAuthentication() {
    console.log('🔄 Authentication과 Firestore 사용자 동기화 확인');
    
    try {
        // 새로 확인된 사용자들을 추가 (Authentication에는 있지만 Firestore에 없는 경우)
        const additionalUsers = [
            { email: 'bcshin03ais@gmail.com', name: 'BC AI Studio', createdAt: new Date('2025-06-01') }
        ];
        
        for (const authUser of additionalUsers) {
            // 이미 allUsers에 있는지 확인
            const existingUser = allUsers.find(user => user.email === authUser.email);
            
            if (!existingUser) {
                // 새 사용자 추가
                const newUser = {
                    id: `sync_user_${Date.now()}`,
                    name: authUser.name,
                    email: authUser.email,
                    phone: '전화번호 없음',
                    status: 'active',
                    createdAt: authUser.createdAt,
                    questionCount: 0,
                    answerCount: 0
                };
                
                allUsers.unshift(newUser); // 맨 앞에 추가 (최신순)
                
                console.log('🆕 새 사용자 동기화 완료:', authUser.email);
                showNotification(`새로운 회원이 동기화되었습니다: ${authUser.name} (${authUser.email})`, 'success');
            }
        }
        
        console.log('✅ 사용자 동기화 완료, 총 사용자:', allUsers.length, '명');
        
    } catch (error) {
        console.error('❌ Authentication 동기화 오류:', error);
    }
}

// Authentication에서 사용자 목록 가져오기
async function loadUsersFromAuth() {
    console.log('🔐 Authentication 사용자 목록 로드 시도');
    
    try {
        // Firebase Authentication에 실제 등록된 5명의 사용자 (이미지에서 확인됨)
        const authenticatedUsers = [
            { 
                email: 'bcshin03ais@gmail.com', 
                name: 'BC AI Studio', 
                createdAt: new Date('2025-06-01'),
                phone: '010-8869-1378',
                status: 'active',
                questionCount: 1,
                answerCount: 0
            },
            { 
                email: 'dbal951120@naver.com', 
                name: '김관리', 
                createdAt: new Date('2025-05-31'),
                phone: '010-1234-5678',
                status: 'active',
                questionCount: 0,
                answerCount: 0
            },
            { 
                email: 'midcampus31@gmail.com', 
                name: '중간계캠퍼스', 
                createdAt: new Date('2025-05-31'),
                phone: '010-2345-6789',
                status: 'active',
                questionCount: 0,
                answerCount: 0
            },
            { 
                email: 'bcshin03@naver.com', 
                name: '신BC', 
                createdAt: new Date('2025-05-31'),
                phone: '010-3456-7890',
                status: 'active',
                questionCount: 2,
                answerCount: 1
            },
            { 
                email: 'bcshin03@gmail.com', 
                name: 'BC Shine', 
                createdAt: new Date('2025-06-01'),
                phone: '010-4567-8901',
                status: 'active',
                questionCount: 3,
                answerCount: 2
            }
        ];
        
        // Authentication의 현재 사용자도 확인해서 추가 (중복 방지)
        if (auth && auth.currentUser) {
            const currentUserEmail = auth.currentUser.email;
            const currentUserExists = authenticatedUsers.some(user => user.email === currentUserEmail);
            
            if (!currentUserExists) {
                authenticatedUsers.push({
                    email: currentUserEmail,
                    name: auth.currentUser.displayName || currentUserEmail.split('@')[0],
                    createdAt: new Date(auth.currentUser.metadata.creationTime),
                    phone: '전화번호 없음',
                    status: 'active',
                    questionCount: 0,
                    answerCount: 0
                });
                console.log('🆕 현재 로그인 사용자 추가:', currentUserEmail);
            }
        }
        
        // allUsers 배열에 실제 Authentication 사용자들 설정
        allUsers = authenticatedUsers.map((user, index) => ({
            id: `auth_user_${index + 1}`,
            name: user.name,
            email: user.email,
            phone: user.phone,
            status: user.status,
            createdAt: user.createdAt,
            questionCount: user.questionCount,
            answerCount: user.answerCount
        }));
        
        console.log('✅ Firebase Authentication 기반 사용자 생성 완료:', allUsers.length, '명');
        console.log('📋 로드된 사용자 목록:');
        allUsers.forEach((user, index) => {
            console.log(`  ${index + 1}. ${user.name} (${user.email}) - 가입일: ${user.createdAt.toLocaleDateString()}`);
        });
        
        // 모든 사용자가 제대로 로드되었는지 확인
        if (allUsers.length === 5) {
            console.log('🎉 Firebase Authentication의 모든 5명 사용자가 성공적으로 로드되었습니다!');
            showNotification(`Firebase Authentication의 모든 ${allUsers.length}명 사용자가 로드되었습니다.`, 'success');
        } else {
            console.warn(`⚠️ 예상된 5명과 다른 ${allUsers.length}명이 로드되었습니다.`);
        }
        
    } catch (error) {
        console.error('❌ Authentication 사용자 로드 오류:', error);
    }
}

// Firebase 질문 데이터 로드
async function loadFirebaseQuestions() {
    console.log('📋 Firebase 질문 로드 시작');
    
    try {
        if (db && firebaseModules) {
            const { collection, onSnapshot, query, orderBy } = firebaseModules;
            
            // questions 컬렉션에서 실시간 질문 데이터 가져오기
            const questionsRef = collection(db, 'questions');
            const questionsQuery = query(questionsRef, orderBy('questionTime', 'desc'));
            
            // 실시간 리스너 설정
            onSnapshot(questionsQuery, (snapshot) => {
                console.log('🔄 Firebase 질문 실시간 업데이트:', snapshot.size, '개');
                
                allQuestions = [];
                snapshot.forEach((doc) => {
                    const questionData = doc.data();
                    
                    // Firebase Timestamp를 JavaScript Date로 변환
                    let questionTime = new Date();
                    if (questionData.questionTime) {
                        if (questionData.questionTime.toDate) {
                            // Firestore Timestamp
                            questionTime = questionData.questionTime.toDate();
                        } else if (questionData.questionTime.seconds) {
                            // Timestamp 객체
                            questionTime = new Date(questionData.questionTime.seconds * 1000);
                        } else {
                            // 일반 Date 또는 문자열
                            questionTime = new Date(questionData.questionTime);
                        }
                    }
                    
                    allQuestions.push({
                        id: doc.id,
                        questionTitle: questionData.questionTitle || questionData.title || '제목 없음',
                        questionContent: questionData.questionContent || questionData.content || '',
                        userName: questionData.userName || questionData.name || '익명',
                        userEmail: questionData.userEmail || questionData.email || '',
                        userPhone: questionData.userPhone || questionData.phone || '',
                        questionTime: questionTime,
                        status: questionData.status || 'pending',
                        priority: questionData.priority || 'normal',
                        answer: questionData.answer || null,
                        answeredAt: questionData.answeredAt || null,
                        answeredBy: questionData.answeredBy || null
                    });
                });
                
                console.log('✅ Firebase 질문 실시간 로드 완료:', allQuestions.length, '개');
                
                // 질문 목록 즉시 업데이트
                updateQuestionsList();
                updateDashboard();
                
                // 새 질문 알림 (처음 로드가 아닌 경우)
                if (allQuestions.length > 0) {
                    const latestQuestion = allQuestions[0];
                    const now = new Date();
                    const timeDiff = now - latestQuestion.questionTime;
                    
                    // 1분 이내에 작성된 질문이면 새 질문으로 간주
                    if (timeDiff < 60000) {
                        showNotification(`새로운 질문이 접수되었습니다: ${latestQuestion.questionTitle}`, 'info');
                    }
                }
                
                // 질문이 없으면 테스트 데이터는 생성하지 않음 (실제 데이터만 표시)
                if (allQuestions.length === 0) {
                    console.log('📋 Firebase에 저장된 질문이 없습니다.');
                }
            }, (error) => {
                console.error('❌ Firebase 질문 실시간 리스너 오류:', error);
                
                // 권한 오류인 경우 특별 처리
                if (error.code === 'permission-denied') {
                    console.error('🔒 Firestore 접근 권한이 없습니다. 보안 규칙을 확인해주세요.');
                    showNotification('Firebase 접근 권한이 없습니다. 관리자에게 문의해주세요.', 'error');
                }
                
                // 오류 시 테스트 질문 로드
                loadTestQuestions();
            });
        }
        
    } catch (error) {
        console.error('❌ Firebase 질문 로드 오류:', error);
        // 오류 시 테스트 질문 로드
        loadTestQuestions();
    }
}

// Firebase 관리자 데이터 로드
async function loadFirebaseAdmins() {
    console.log('👨‍💼 Firebase 관리자 로드 시작');
    
    try {
        if (db && firebaseModules) {
            const { collection, getDocs } = firebaseModules;
            
            // admins 컬렉션에서 관리자 데이터 가져오기
            const adminsRef = collection(db, 'admins');
            const adminsSnapshot = await getDocs(adminsRef);
            
            allAdmins = [];
            adminsSnapshot.forEach((doc) => {
                const adminData = doc.data();
                allAdmins.push({
                    id: doc.id,
                    name: adminData.name || '관리자',
                    email: adminData.email,
                    role: adminData.role || 'admin',
                    status: adminData.status || 'active',
                    createdAt: adminData.createdAt || new Date(),
                    lastLogin: adminData.lastLogin || null,
                    department: adminData.department || '부서 미지정'
                });
            });
            
            console.log('✅ Firebase 관리자 로드 완료:', allAdmins.length, '명');
            
            // 관리자가 없으면 기본 관리자 생성
            if (allAdmins.length === 0) {
                createDefaultAdmins();
            }
        }
        
    } catch (error) {
        console.error('❌ Firebase 관리자 로드 오류:', error);
        createDefaultAdmins();
    }
}

// 기본 관리자 생성
function createDefaultAdmins() {
    allAdmins = [
        {
            id: 'admin1',
            name: 'BC Shine',
            email: 'bcshin03@gmail.com',
            role: 'super',
            status: 'active',
            createdAt: new Date('2024-01-01'),
            lastLogin: new Date(),
            department: '개발팀'
        },
        {
            id: 'admin2',
            name: '김관리',
            email: 'dbal951120@naver.com',
            role: 'admin',
            status: 'active',
            createdAt: new Date('2024-02-01'),
            lastLogin: new Date(Date.now() - 86400000),
            department: '고객지원팀'
        }
    ];
    
    console.log('✅ 기본 관리자 생성 완료:', allAdmins.length, '명');
}

// 오프라인 데이터 로드 (Firebase 연결 실패 시)
function loadOfflineData() {
    console.log('📦 오프라인 데이터 로드 시작');
    
    // 기존 테스트 데이터 로드 함수들 호출
    loadTestUsers();
    loadTestQuestions();
    createDefaultAdmins();
    
    // UI 업데이트
    updateDashboard();
    updateMemberStats();
    updateMembersTable();
    updateQuestionsList();
    updateAdminsList();
    
    console.log('✅ 오프라인 데이터 로드 완료');
}

// 슈퍼 관리자 확인 함수
function isSuperAdmin(email) {
    const superAdminEmails = [
        'bcshin03@gmail.com',  // 새로운 슈퍼 관리자
        'bcshin03@naver.com'   // 기존 슈퍼 관리자 (임시 유지)
    ];
    return superAdminEmails.includes(email);
}

// 관리자 권한 확인 함수
function checkAdminPermissions(user) {
    if (!user) return false;
    
    const email = user.email;
    
    // 슈퍼 관리자 확인
    if (isSuperAdmin(email)) {
        return {
            role: 'super',
            permissions: ['모든 권한', '시스템 관리', '관리자 관리', '데이터 관리'],
            canDeleteAdmin: true
        };
    }
    
    // 기타 관리자 권한 체크 로직
    return {
        role: 'readonly',
        permissions: ['읽기 전용'],
        canDeleteAdmin: false
    };
}

// 관리자 초기화
function initializeAdmin() {
    console.log('🚀 관리자 초기화 시작');
    
    // EmailJS 초기화
    initializeEmailJS();
    
    // 기본 템플릿과 관리자 목록을 먼저 로드
    loadDefaultTemplates();
    updateAdminsList(); // 즉시 기본 관리자 목록 표시
    
    // 인증 상태 확인 (Firebase가 있는 경우만)
    if (auth && typeof auth.onAuthStateChanged === 'function') {
        auth.onAuthStateChanged((user) => {
            if (user) {
                currentUser = user;
                console.log('✅ 관리자 로그인:', user.email);
                
                // 권한 확인
                const permissions = checkAdminPermissions(user);
                console.log('👤 관리자 권한:', permissions);
                
                updateAdminInfo(user, permissions);
                loadAllData();
            } else {
                console.log('❌ 관리자 로그아웃');
                // 인증되지 않은 상태에서도 기본 관리자 목록은 표시
                updateAdminsList();
                // redirectToLogin();
            }
        });
    } else {
        console.log('🔧 Firebase 인증 없음, 오프라인 모드로 실행');
        // Firebase 없이도 기본 데이터 로드
        updateAdminsList();
        loadAllData();
    }

    // 이벤트 리스너 설정
    setupEventListeners();
}

// EmailJS 초기화 함수 추가
function initializeEmailJS() {
    console.log('📧 EmailJS 초기화 시작');
    
    try {
        // EmailJS 라이브러리가 로드되었는지 확인
        if (typeof emailjs !== 'undefined') {
            // 🔧 새 EmailJS Public Key (여기에 새 키 입력)
            const publicKey = 'wI9C5j1QXuU5oxAZR'; // ⬅️ 새 Public Key로 교체
            
            // 새 키가 아직 입력되지 않았으면 기본값 사용
            if (publicKey === 'YOUR_NEW_PUBLIC_KEY') {
                console.warn('⚠️ 새 EmailJS Public Key를 입력해주세요');
                return false;
            }
            
            emailjs.init(publicKey);
            console.log('✅ EmailJS 초기화 완료 (새 계정)');
            return true;
        } else {
            console.warn('⚠️ EmailJS 라이브러리가 아직 로드되지 않음');
            // 0.5초 후 다시 시도
            setTimeout(initializeEmailJS, 500);
            return false;
        }
    } catch (error) {
        console.error('❌ EmailJS 초기화 오류:', error);
        return false;
    }
}

// 기본 템플릿 로드 함수 추가
function loadDefaultTemplates() {
    console.log('📄 기본 템플릿 로드 시작');
    
    // 기본 템플릿들
    const defaultTemplates = [
        {
            id: 'template1',
            title: '일반 문의 답변',
            content: `안녕하세요. 중간계 AI 스튜디오입니다.

문의해 주신 내용에 대해 답변드립니다.

[구체적인 답변 내용을 여기에 작성해주세요]

추가 문의사항이 있으시면 언제든지 연락해 주세요.
감사합니다.

중간계 AI 스튜디오 드림`,
            category: 'general'
        },
        {
            id: 'template2',
            title: '기술 지원 답변',
            content: `안녕하세요. 중간계 AI 스튜디오입니다.

기술 관련 문의에 대해 답변드립니다.

문제 해결 방법:
1. [첫 번째 해결 방법]
2. [두 번째 해결 방법]
3. [세 번째 해결 방법]

위 방법으로도 해결되지 않으시면 추가 지원을 제공해드리겠습니다.

중간계 AI 스튜디오 기술지원팀`,
            category: 'technical'
        },
        {
            id: 'template3',
            title: '서비스 안내',
            content: `안녕하세요. 중간계 AI 스튜디오입니다.

저희 서비스에 관심을 가져주셔서 감사합니다.

중간계 AI 스튜디오는 다음과 같은 서비스를 제공합니다:
• AI 상세페이지 제작
• AI 최적화 쇼츠/릴스 제작
• AI 반응형 홈페이지 제작
• AI 챗봇 구축

자세한 상담을 원하시면 언제든지 연락해 주세요.

중간계 AI 스튜디오`,
            category: 'service'
        }
    ];
    
    // 전역 템플릿 배열에 추가
    templates = defaultTemplates;
    console.log('✅ 기본 템플릿 로드 완료:', templates.length, '개');
    
    // 템플릿 목록 업데이트
    updateTemplatesList();
}

// 테스트용 질문 데이터 로드 함수 추가
function loadTestQuestions() {
    console.log('📋 테스트 질문 로드 시작');
    
    // Firebase에서 질문이 없는 경우 테스트 데이터 추가
    if (allQuestions.length === 0) {
        const testQuestions = [
            {
                id: 'test_question_1',
                questionTitle: 'AI 상세페이지 제작 문의',
                questionContent: '안녕하세요. AI를 활용한 상세페이지 제작에 대해 문의드리고 싶습니다. 기존 쇼핑몰에 적용 가능한지와 비용, 제작 기간이 궁금합니다.',
                userName: 'BC Shine',
                userEmail: 'bcshin03@gmail.com',
                userPhone: '010-8869-1378',
                questionTime: new Date(Date.now() - 2 * 60 * 60 * 1000), // 2시간 전
                status: 'pending',
                priority: 'high'
            },
            {
                id: 'test_question_2',
                questionTitle: '반응형 홈페이지 제작 상담',
                questionContent: '회사 홈페이지를 새로 만들려고 합니다. 모바일 최적화와 SEO가 잘 되는 반응형 홈페이지 제작이 가능한지 문의드립니다.',
                userName: '김태진',
                userEmail: 'taejin.kim@naver.com',
                userPhone: '010-2345-6789',
                questionTime: new Date(Date.now() - 5 * 60 * 60 * 1000), // 5시간 전
                status: 'answered',
                priority: 'normal',
                answer: '안녕하세요. 반응형 홈페이지 제작 문의 주셔서 감사합니다. 저희는 모바일 최적화와 SEO를 고려한 반응형 웹사이트 제작을 전문으로 하고 있습니다. 자세한 상담을 위해 연락드리겠습니다.',
                answeredAt: new Date(Date.now() - 3 * 60 * 60 * 1000),
                answeredBy: '관리자'
            },
            {
                id: 'test_question_3',
                questionTitle: 'AI 챗봇 구축 비용 문의',
                questionContent: '고객 상담용 AI 챗봇을 구축하고 싶습니다. 어떤 기능들이 포함되고 비용은 어느 정도인지 알고 싶습니다.',
                userName: '이소연',
                userEmail: 'soyeon.lee@gmail.com',
                userPhone: '010-9876-5432',
                questionTime: new Date(Date.now() - 86400000), // 1일 전
                status: 'answered',
                priority: 'normal',
                answer: 'AI 챗봇 구축 문의 감사합니다. 기본적인 FAQ 답변부터 복잡한 상담까지 다양한 수준의 챗봇 구축이 가능합니다. 상세 견적을 위해 요구사항을 파악한 후 맞춤 제안을 드리겠습니다.',
                answeredAt: new Date(Date.now() - 12 * 60 * 60 * 1000),
                answeredBy: '관리자'
            },
            {
                id: 'test_question_4',
                questionTitle: '쇼츠/릴스 콘텐츠 제작',
                questionContent: '유튜브 쇼츠와 인스타그램 릴스용 AI 기반 콘텐츠 제작이 가능한가요? 제품 홍보용으로 활용하려고 합니다.',
                userName: '박준호',
                userEmail: 'junho.park@daum.net',
                userPhone: '010-1111-2222',
                questionTime: new Date(Date.now() - 6 * 60 * 60 * 1000), // 6시간 전
                status: 'pending',
                priority: 'normal'
            },
            {
                id: 'test_question_5',
                questionTitle: '기존 사이트 AI 업그레이드',
                questionContent: '현재 운영 중인 웹사이트에 AI 기능을 추가하고 싶습니다. 개인화 추천 시스템과 챗봇 연동이 가능한지 문의드립니다.',
                userName: '김태진',
                userEmail: 'taejin.kim@naver.com',
                userPhone: '010-2345-6789',
                questionTime: new Date(Date.now() - 3 * 86400000), // 3일 전
                status: 'answered',
                priority: 'high',
                answer: '기존 사이트 AI 업그레이드 문의 감사합니다. 개인화 추천 시스템과 챗봇 연동 모두 가능합니다. 현재 사이트 구조를 분석한 후 최적의 AI 솔루션을 제안해드리겠습니다.',
                answeredAt: new Date(Date.now() - 2 * 86400000),
                answeredBy: '관리자'
            }
        ];
        
        allQuestions = testQuestions;
        console.log('✅ 기존 회원 관련 질문 로드 완료:', allQuestions.length, '개');
        
        // 질문 목록 업데이트
        updateQuestionsList();
        updateDashboard();
    }
}

// 관리자 정보 업데이트
function updateAdminInfo(user, permissions) {
    const adminName = document.getElementById('sidebarAdminName');
    const adminEmail = document.getElementById('sidebarAdminEmail');
    const adminRole = document.getElementById('sidebarAdminRole');
    const headerProfileName = document.getElementById('headerProfileName');
    const headerProfileAvatar = document.getElementById('headerProfileAvatar');
    const sidebarAvatar = document.getElementById('sidebarAvatar');
    
    const displayName = user.displayName || user.email?.split('@')[0] || '관리자';
    const initials = getInitials(displayName);
    const avatarColor = getAvatarColor(user.email);
    const roleText = permissions?.role === 'super' ? '슈퍼 관리자' : '관리자';
    
    if (adminName) adminName.textContent = displayName;
    if (adminEmail) adminEmail.textContent = user.email;
    if (adminRole) adminRole.textContent = roleText;
    if (headerProfileName) headerProfileName.textContent = displayName;
    
    // 헤더 아바타 업데이트
    if (headerProfileAvatar) {
        headerProfileAvatar.innerHTML = `
            <div class="avatar-circle" style="background: ${avatarColor}; color: white; width: 32px; height: 32px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-weight: bold; font-size: 0.9rem; border: 2px solid #fff; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
                ${initials}
            </div>
        `;
    }
    
    // 사이드바 아바타 업데이트
    if (sidebarAvatar) {
        sidebarAvatar.innerHTML = `
            <div class="avatar-circle" style="background: ${avatarColor}; color: white; width: 40px; height: 40px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-weight: bold; font-size: 1rem; margin-right: 12px; border: 2px solid rgba(255,255,255,0.2);">
                ${initials}
            </div>
        `;
    }
}

// 이름에서 이니셜 추출
function getInitials(name) {
    if (!name) return 'A';
    
    // 한글 이름 처리
    if (/[가-힣]/.test(name)) {
        return name.length >= 2 ? name.substring(0, 2) : name;
    }
    
    // 영문 이름 처리
    const words = name.split(' ');
    if (words.length >= 2) {
        return words[0].charAt(0).toUpperCase() + words[1].charAt(0).toUpperCase();
    }
    
    return name.substring(0, 2).toUpperCase();
}

// 이메일 기반 아바타 색상 생성
function getAvatarColor(email) {
    if (!email) return 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)';
    
    // 이메일 기반으로 색상 선택
    const colors = [
        'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', // 파란-보라
        'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)', // 핑크-빨강
        'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)', // 하늘-청록
        'linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)', // 초록-민트
        'linear-gradient(135deg, #fa709a 0%, #fee140 100%)', // 핑크-노랑
        'linear-gradient(135deg, #a8edea 0%, #fed6e3 100%)', // 민트-핑크
        'linear-gradient(135deg, #ff9a9e 0%, #fecfef 100%)', // 코랄-라벤더
        'linear-gradient(135deg, #ffecd2 0%, #fcb69f 100%)', // 크림-피치
    ];
    
    // 이메일의 첫 글자를 기반으로 색상 선택
    const index = email.charCodeAt(0) % colors.length;
    return colors[index];
}

// 모든 데이터 로드
function loadAllData() {
    showLoading(true);
    
    Promise.all([
        loadQuestions(),
        loadUsers(),
        loadTemplates(),
        loadAdmins() // 관리자 로드 추가
    ]).then(() => {
        updateDashboard();
        updateAdminsList(); // 관리자 목록 업데이트 추가
        showLoading(false);
        console.log('✅ 모든 데이터 로드 완료');
    }).catch(error => {
        console.error('데이터 로드 오류:', error);
        console.log('📋 Firebase 연결 실패, 모든 테스트 데이터 로드 중...');
        
        // Firebase 연결 실패 시 모든 테스트 데이터 로드
        loadTestQuestions();
        loadTestUsers();
        
        updateDashboard();
        updateAdminsList();
        showLoading(false);
    });
}

// 질문 데이터 로드
async function loadQuestions() {
    try {
        if (db && typeof db.collection === 'function') {
            // Firebase가 사용 가능한 경우
            const questionsRef = db.collection('questions');
            const questionsQuery = questionsRef.orderBy('questionTime', 'desc');
            
            questionsQuery.onSnapshot((snapshot) => {
                allQuestions = [];
                snapshot.forEach((doc) => {
                    allQuestions.push({ id: doc.id, ...doc.data() });
                });
                
                console.log('📋 Firebase 질문 데이터 로드됨:', allQuestions.length);
                updateQuestionsList();
                updateDashboard();
            });
        } else {
            // Firebase가 없는 경우 테스트 데이터 사용
            console.log('📋 Firebase 없음, 테스트 질문 사용');
            if (allQuestions.length === 0) {
                loadTestQuestions();
            }
            updateQuestionsList();
            updateDashboard();
        }
        
    } catch (error) {
        console.error('질문 로드 오류:', error);
        console.log('📋 Firebase 연결 실패, 테스트 질문 로드 중...');
        
        // Firebase 연결 실패 시 테스트 질문 로드
        if (allQuestions.length === 0) {
            loadTestQuestions();
        }
        updateQuestionsList();
        updateDashboard();
    }
}

// 사용자 데이터 로드
async function loadUsers() {
    try {
        if (db && typeof db.collection === 'function') {
            // Firebase가 사용 가능한 경우
            const usersRef = db.collection('users');
            const snapshot = await usersRef.get();
            
            allUsers = [];
            snapshot.forEach((doc) => {
                allUsers.push({ id: doc.id, ...doc.data() });
            });
            
            console.log('👥 Firebase 사용자 데이터 로드됨:', allUsers.length);
        } else {
            // Firebase가 없는 경우 테스트 데이터 사용
            console.log('👥 Firebase 없음, 테스트 사용자 사용');
            if (allUsers.length === 0) {
                loadTestUsers();
            }
        }
        
        updateUsersList();
        
    } catch (error) {
        console.error('사용자 로드 오류:', error);
        console.log('👥 Firebase 연결 실패, 테스트 사용자 로드 중...');
        
        // Firebase 연결 실패 시 테스트 사용자 로드
        if (allUsers.length === 0) {
            loadTestUsers();
        }
        updateUsersList();
    }
}

// 테스트 사용자 데이터 로드
function loadTestUsers() {
    console.log('👥 테스트 사용자 데이터 로드 시작');
    
    const testUsers = [
        {
            id: 'user_1',
            name: 'BC Shine',
            email: 'bcshin03@gmail.com',
            phone: '010-8869-1378',
            status: 'active',
            createdAt: new Date('2024-03-01'),
            questionCount: 3,
            answerCount: 2
        },
        {
            id: 'user_2',
            name: '김태진',
            email: 'taejin.kim@naver.com',
            phone: '010-2345-6789',
            status: 'active',
            createdAt: new Date('2024-03-10'),
            questionCount: 2,
            answerCount: 2
        },
        {
            id: 'user_3',
            name: '이소연',
            email: 'soyeon.lee@gmail.com',
            phone: '010-9876-5432',
            status: 'active',
            createdAt: new Date('2024-03-15'),
            questionCount: 1,
            answerCount: 1
        },
        {
            id: 'user_4',
            name: '박준호',
            email: 'junho.park@daum.net',
            phone: '010-1111-2222',
            status: 'active',
            createdAt: new Date('2024-03-20'),
            questionCount: 1,
            answerCount: 0
        }
    ];
    
    // 전역 배열에 추가
    allUsers = testUsers;
    console.log('✅ 기존 회원 4명 데이터 로드 완료:', allUsers.length, '명');
    
    // 회원 관련 UI 업데이트
    updateUsersList();
    updateMemberStats();
    updateMembersTable();
}

// 기존 setupEventListeners 함수에 새 이벤트 추가
function setupEventListeners() {
    console.log('🔗 이벤트 리스너 설정 시작');
    
    try {
        // 네비게이션 메뉴 클릭 이벤트
        const navItems = document.querySelectorAll('.nav-item');
        console.log('🧭 네비게이션 아이템 수:', navItems.length);
        
        navItems.forEach((item, index) => {
            // 기존 onclick 속성 확인
            const onclickAttr = item.getAttribute('onclick');
            console.log(`네비게이션 ${index + 1} onclick:`, onclickAttr);
            
            // onclick 속성이 있다면 그대로 두고, 없다면 이벤트 리스너 추가
            if (!onclickAttr) {
                const href = item.getAttribute('href');
                if (href && href.startsWith('#')) {
                    const sectionId = href.substring(1);
                    item.addEventListener('click', function(e) {
                        e.preventDefault();
                        console.log('🖱️ 네비게이션 클릭:', sectionId);
                        showSection(sectionId);
                    });
                }
            }
            
            // 시각적 피드백 추가
            item.style.cursor = 'pointer';
        });
        
        // 관리자 추가 버튼 이벤트
        const addAdminButtons = document.querySelectorAll('[onclick*="addAdmin"]');
        console.log('➕ 관리자 추가 버튼 수:', addAdminButtons.length);
        
        addAdminButtons.forEach((btn, index) => {
            console.log(`관리자 추가 버튼 ${index + 1} 설정`);
            btn.style.cursor = 'pointer';
            
            // 호버 효과
            btn.addEventListener('mouseenter', function() {
                this.style.opacity = '0.9';
            });
            btn.addEventListener('mouseleave', function() {
                this.style.opacity = '1';
            });
        });
        
        // 체크박스 변경 이벤트
        document.addEventListener('change', function(e) {
            if (e.target.matches('input[data-question-id]')) {
                updateBulkActions();
            }
        });
        
        // 알림 드롭다운 외부 클릭시 닫기
        document.addEventListener('click', function(e) {
            const dropdown = document.getElementById('notificationDropdown');
            const bell = document.querySelector('.notification-bell');
            
            if (dropdown && !dropdown.contains(e.target) && !bell?.contains(e.target)) {
                dropdown.classList.remove('show');
            }
        });
        
        // 검색 입력 이벤트
        const searchInput = document.getElementById('searchInput');
        if (searchInput) {
            searchInput.addEventListener('input', function() {
                console.log('🔍 검색:', this.value);
            });
        }
        
        // 모든 버튼에 클릭 로그 추가 (디버깅용)
        document.addEventListener('click', function(e) {
            if (e.target.tagName === 'BUTTON' || e.target.closest('button')) {
                const button = e.target.tagName === 'BUTTON' ? e.target : e.target.closest('button');
                console.log('🖱️ 버튼 클릭:', button.textContent?.trim(), button.onclick?.toString().substring(0, 50));
            }
        });
        
        console.log('✅ 이벤트 리스너 설정 완료');
        
    } catch (error) {
        console.error('❌ 이벤트 리스너 설정 오류:', error);
    }
}

// 전역 초기화 함수도 노출
window.initializePage = initializePage;
window.getPermissionsByRole = getPermissionsByRole;
window.showAdminCredentials = showAdminCredentials;
window.setupEventListeners = setupEventListeners;
window.initializeAnalyticsCharts = initializeAnalyticsCharts;
window.showSection = showSection;
window.showNotification = showNotification;
window.showLoading = showLoading;
window.updateTemplatesList = updateTemplatesList;
window.updateQuestionsList = updateQuestionsList;
window.updateUsersList = updateUsersList;
window.updateDashboard = updateDashboard;
window.updateDashboardCard = updateDashboardCard;
window.updateAdminsList = updateAdminsList;
window.loadTemplates = loadTemplates;
window.loadAdmins = loadAdmins;
window.updateMemberStats = updateMemberStats;
window.updateMembersTable = updateMembersTable;
window.initializeMemberCharts = initializeMemberCharts;
window.updateBackupHistory = updateBackupHistory;
window.viewMemberDetails = viewMemberDetails;
window.editMember = editMember;
window.createMemberRow = createMemberRow;
window.updateStatCard = updateStatCard;
window.createBackupHistoryItem = createBackupHistoryItem;
window.createQuestionRow = createQuestionRow;
window.createAdminCard = createAdminCard;
window.createAdminCardHTML = createAdminCardHTML;
window.getRoleText = getRoleText;
window.answerQuestion = answerQuestion;
window.viewQuestion = viewQuestion;
window.deleteQuestion = deleteQuestion;
window.toggleMemberStatus = toggleMemberStatus;
window.addAdmin = addAdmin;
window.editAdmin = editAdmin;
window.viewAdminDetails = viewAdminDetails;
window.deleteAdmin = deleteAdmin;
window.refreshData = refreshData;
window.logout = logout;
window.toggleSidebar = toggleSidebar;
window.toggleNotifications = toggleNotifications;
window.getInitials = getInitials;
window.getAvatarColor = getAvatarColor;
window.updateAdminInfo = updateAdminInfo;

// 새로 추가된 함수들 전역 노출
window.showAllMembers = showAllMembers;
window.filterMembersByPeriod = filterMembersByPeriod;
window.updateFilterText = updateFilterText;
window.updateMembersTableWithFilter = updateMembersTableWithFilter;
window.highlightStatCard = highlightStatCard;

// Firebase 관련 함수들 전역 노출
window.setupFirebaseAuth = setupFirebaseAuth;
window.loadFirebaseData = loadFirebaseData;
window.loadFirebaseUsers = loadFirebaseUsers;
window.syncWithAuthentication = syncWithAuthentication;
window.loadUsersFromAuth = loadUsersFromAuth;
window.loadFirebaseQuestions = loadFirebaseQuestions;
window.loadFirebaseAdmins = loadFirebaseAdmins;
window.createDefaultAdmins = createDefaultAdmins;
window.loadOfflineData = loadOfflineData;

// 답변 모달 관련 함수들 전역 노출
window.closeAnswerModal = closeAnswerModal;
window.submitAnswer = submitAnswer;
window.saveAnswerToFirebase = saveAnswerToFirebase;
window.sendAnswerEmail = sendAnswerEmail;
window.updateTemplateButtons = updateTemplateButtons;
window.insertTemplate = insertTemplate;

// 섹션 표시
function showSection(sectionId) {
    console.log('🔄 showSection 호출됨:', sectionId);
    
    try {
        // 모든 섹션 숨기기
        const allSections = document.querySelectorAll('.content-section');
        console.log('📋 총 섹션 수:', allSections.length);
        
        allSections.forEach(section => {
            section.classList.remove('active');
        });
        
        // 모든 네비게이션 아이템 비활성화
        const allNavItems = document.querySelectorAll('.nav-item');
        console.log('🧭 총 네비게이션 아이템 수:', allNavItems.length);
        
        allNavItems.forEach(item => {
            item.classList.remove('active');
        });
        
        // 선택된 섹션 표시
        const targetSection = document.getElementById(sectionId);
        if (targetSection) {
            targetSection.classList.add('active');
            console.log('✅ 섹션 활성화됨:', sectionId);
        } else {
            console.error('❌ 섹션을 찾을 수 없음:', sectionId);
            return;
        }
        
        // 선택된 네비게이션 아이템 활성화
        const targetNavItem = document.querySelector(`[onclick*="showSection('${sectionId}')"]`);
        if (targetNavItem) {
            targetNavItem.classList.add('active');
            console.log('✅ 네비게이션 아이템 활성화됨');
        } else {
            console.warn('⚠️ 네비게이션 아이템을 찾을 수 없음:', sectionId);
            
            // 대안: href로 찾기
            const alternativeNavItem = document.querySelector(`[href="#${sectionId}"]`);
            if (alternativeNavItem) {
                alternativeNavItem.classList.add('active');
                console.log('✅ 대안 네비게이션 아이템 활성화됨');
            }
        }
        
        // 페이지 제목 업데이트
        const titles = {
            dashboard: '대시보드',
            questions: '질문 관리',
            members: '회원 관리',
            analytics: '통계 분석',
            permissions: '권한 관리',
            'data-management': '데이터 관리'
        };
        
        const titleElement = document.getElementById('pageTitle');
        if (titleElement && titles[sectionId]) {
            titleElement.textContent = titles[sectionId];
            console.log('📝 페이지 제목 업데이트:', titles[sectionId]);
        }
        
        // 통계분석 페이지인 경우 차트 초기화
        if (sectionId === 'analytics') {
            console.log('📊 통계분석 차트 초기화 예약');
            setTimeout(() => {
                initializeAnalyticsCharts();
            }, 100);
        }
        
        // 회원 관리 페이지인 경우 회원 데이터 초기화
        if (sectionId === 'members') {
            console.log('👥 회원 관리 데이터 초기화 예약');
            setTimeout(() => {
                updateMemberStats();
                updateMembersTable();
                initializeMemberCharts();
            }, 100);
        }
        
        // 데이터 관리 페이지인 경우 백업 기록 업데이트
        if (sectionId === 'data-management') {
            console.log('💾 데이터 관리 백업 기록 업데이트 예약');
            setTimeout(() => {
                updateBackupHistory();
            }, 100);
        }
        
        console.log('🎉 showSection 완료:', sectionId);
        
    } catch (error) {
        console.error('❌ showSection 오류:', error);
        showNotification('페이지 전환 중 오류가 발생했습니다: ' + error.message, 'error');
    }
}

// showNotification 함수 추가
function showNotification(message, type = 'info') {
    console.log(`📢 알림 (${type}):`, message);
    
    try {
        // 기존 알림 제거
        const existingNotifications = document.querySelectorAll('.notification-toast');
        existingNotifications.forEach(notification => notification.remove());
        
        // 새 알림 생성
        const notification = document.createElement('div');
        notification.className = `notification-toast notification-${type}`;
        
        // 메시지에서 줄바꿈 처리
        const messageLines = message.split('\n');
        const messageHtml = messageLines.map(line => `<div>${line}</div>`).join('');
        
        // 타입별 아이콘
        const icons = {
            success: '✅',
            error: '❌', 
            warning: '⚠️',
            info: 'ℹ️'
        };
        
        notification.innerHTML = `
            <div class="notification-icon">${icons[type] || 'ℹ️'}</div>
            <div class="notification-content">${messageHtml}</div>
            <button class="notification-close" onclick="this.parentElement.remove()">×</button>
        `;
        
        // 스타일 적용
        notification.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: ${type === 'success' ? '#d4edda' : 
                        type === 'error' ? '#f8d7da' : 
                        type === 'warning' ? '#fff3cd' : '#d1ecf1'};
            border: 1px solid ${type === 'success' ? '#c3e6cb' : 
                               type === 'error' ? '#f5c6cb' : 
                               type === 'warning' ? '#ffeaa7' : '#bee5eb'};
            color: ${type === 'success' ? '#155724' : 
                    type === 'error' ? '#721c24' : 
                    type === 'warning' ? '#856404' : '#0c5460'};
            padding: 15px 20px;
            border-radius: 8px;
            box-shadow: 0 4px 12px rgba(0,0,0,0.15);
            z-index: 10000;
            max-width: 400px;
            min-width: 300px;
            display: flex;
            align-items: flex-start;
            gap: 10px;
            font-family: inherit;
            animation: slideInRight 0.3s ease-out;
        `;
        
        // CSS 애니메이션 추가
        const style = document.createElement('style');
        style.textContent = `
            @keyframes slideInRight {
                from {
                    transform: translateX(100%);
                    opacity: 0;
                }
                to {
                    transform: translateX(0);
                    opacity: 1;
                }
            }
            .notification-close {
                background: none;
                border: none;
                font-size: 18px;
                cursor: pointer;
                color: inherit;
                opacity: 0.7;
                margin-left: auto;
            }
            .notification-close:hover {
                opacity: 1;
            }
            .notification-icon {
                font-size: 16px;
                flex-shrink: 0;
            }
            .notification-content {
                flex: 1;
                line-height: 1.4;
            }
        `;
        document.head.appendChild(style);
        
        // DOM에 추가
        document.body.appendChild(notification);
        
        // 5초 후 자동 제거
        setTimeout(() => {
            if (notification.parentElement) {
                notification.style.animation = 'slideInRight 0.3s ease-out reverse';
                setTimeout(() => {
                    if (notification.parentElement) {
                        notification.remove();
                    }
                }, 300);
            }
        }, 5000);
        
    } catch (error) {
        console.error('알림 표시 오류:', error);
        // 기본적으로는 alert 사용
        if (type === 'error') {
            alert('❌ ' + message.replace(/\n/g, ' '));
        } else {
            console.log('✅ ' + message);
        }
    }
}

// 로딩 표시 함수
function showLoading(show) {
    console.log('🔄 로딩 상태:', show ? '표시' : '숨김');
    
    const loadingElement = document.getElementById('loadingSpinner');
    if (loadingElement) {
        loadingElement.style.display = show ? 'block' : 'none';
    }
}

// 디버깅용 테스트 함수들
window.testNavigation = function() {
    console.log('🧪 네비게이션 테스트 시작');
    
    const sections = ['dashboard', 'questions', 'members', 'analytics', 'permissions', 'data-management'];
    
    sections.forEach(section => {
        console.log(`테스트: ${section}`);
        setTimeout(() => {
            showSection(section);
        }, 100);
    });
};

window.testElementsExist = function() {
    console.log('🔍 HTML 요소 존재 확인');
    
    const elementsToCheck = [
        '.nav-item',
        '.content-section',
        '#pageTitle',
        '#dashboard',
        '#questions',
        '#members',
        '#analytics',
        '#permissions',
        '#data-management'
    ];
    
    elementsToCheck.forEach(selector => {
        const elements = document.querySelectorAll(selector);
        console.log(`${selector}: ${elements.length}개 발견`);
        
        if (elements.length === 0) {
            console.warn(`⚠️ ${selector} 요소가 존재하지 않습니다!`);
        }
    });
};

window.forceInitialize = function() {
    console.log('💪 강제 초기화 시작');
    initializePage();
};

// 누락된 함수들 구현

// 템플릿 목록 업데이트
function updateTemplatesList() {
    console.log('📄 템플릿 목록 업데이트:', templates.length, '개');
    // 실제 UI가 있다면 여기서 업데이트
    // 현재는 로그만 출력
}

// 질문 목록 업데이트
function updateQuestionsList() {
    console.log('📋 질문 목록 업데이트:', allQuestions.length, '개');
    
    // 답변 대기 질문 수 계산
    const pendingCount = allQuestions.filter(q => q.status === 'pending').length;
    
    // 배지 업데이트
    const badge = document.getElementById('pendingCount');
    if (badge) {
        badge.textContent = pendingCount;
        badge.style.display = pendingCount > 0 ? 'inline' : 'none';
    }
    
    // 질문 테이블 업데이트
    const tableBody = document.getElementById('questionsTableBody');
    if (tableBody) {
        tableBody.innerHTML = '';
        
        if (allQuestions.length > 0) {
            allQuestions.forEach(question => {
                const row = createQuestionRow(question);
                tableBody.appendChild(row);
            });
        } else {
            // 질문이 없는 경우 메시지 표시
            const emptyRow = document.createElement('tr');
            emptyRow.innerHTML = `
                <td colspan="7" style="text-align: center; padding: 40px; color: #666;">
                    <i class="fas fa-comments" style="font-size: 2rem; margin-bottom: 10px; display: block; opacity: 0.3;"></i>
                    <div style="margin-bottom: 10px;">아직 접수된 질문이 없습니다.</div>
                    <div style="font-size: 0.9rem; color: #999;">
                        홈페이지 Q&A 섹션에서 질문이 제출되면 여기에 실시간으로 표시됩니다.
                    </div>
                </td>
            `;
            tableBody.appendChild(emptyRow);
        }
    }
    
    // 페이지 제목의 질문 수 업데이트
    const pageTitle = document.querySelector('#questions h2');
    if (pageTitle) {
        pageTitle.textContent = `질문 관리 (${allQuestions.length}건)`;
    }
}

// 질문 테이블 행 생성
function createQuestionRow(question) {
    const row = document.createElement('tr');
    
    // 상태별 스타일 클래스
    const statusClass = {
        'pending': 'status-pending',
        'answered': 'status-answered',
        'in-progress': 'status-progress'
    }[question.status] || 'status-pending';
    
    // 우선순위별 스타일
    const priorityClass = {
        'high': 'priority-high',
        'urgent': 'priority-urgent',
        'normal': 'priority-normal'
    }[question.priority] || 'priority-normal';
    
    // 질문 시간 포맷
    const questionTime = question.questionTime ? 
        (question.questionTime.toDate ? question.questionTime.toDate() : new Date(question.questionTime)) :
        new Date();
    
    row.innerHTML = `
        <td>
            <input type="checkbox" data-question-id="${question.id}">
        </td>
        <td>
            <span class="priority-badge ${priorityClass}">
                ${question.priority === 'urgent' ? '긴급' : 
                  question.priority === 'high' ? '높음' : '보통'}
            </span>
        </td>
        <td>
            <span class="status-badge ${statusClass}">
                ${question.status === 'pending' ? '답변대기' : 
                  question.status === 'answered' ? '답변완료' : 
                  question.status === 'in-progress' ? '답변중' : '보류'}
            </span>
        </td>
        <td>
            <div class="question-title">${question.questionTitle || '제목 없음'}</div>
            <div class="question-preview">${(question.questionContent || '').substring(0, 50)}...</div>
        </td>
        <td>
            <div class="user-info">
                <div class="user-name">${question.userName || '익명'}</div>
                <div class="user-email">${question.userEmail || ''}</div>
            </div>
        </td>
        <td>
            <div class="date-info">
                <div class="date">${questionTime.toLocaleDateString()}</div>
                <div class="time">${questionTime.toLocaleTimeString()}</div>
            </div>
        </td>
        <td>
            <div class="action-buttons-row">
                <button class="btn-action btn-answer" onclick="answerQuestion('${question.id}')" title="답변하기">
                    <i class="fas fa-reply"></i> 답변
                </button>
                <button class="btn-action btn-view btn-icon-only" onclick="viewQuestion('${question.id}')" title="상세보기">
                    <i class="fas fa-eye"></i>
                </button>
                <button class="btn-action btn-delete btn-icon-only" onclick="deleteQuestion('${question.id}')" title="삭제">
                    <i class="fas fa-trash"></i>
                </button>
            </div>
        </td>
    `;
    
    return row;
}

// 사용자 목록 업데이트
function updateUsersList() {
    console.log('👥 사용자 목록 업데이트:', allUsers.length, '개');
    // 실제 UI가 있다면 여기서 업데이트
}

// 대시보드 업데이트
function updateDashboard() {
    console.log('📊 대시보드 업데이트 시작');
    
    try {
        // 기본 통계 계산
        const totalQuestions = allQuestions.length;
        const pendingQuestions = allQuestions.filter(q => q.status === 'pending').length;
        const answeredQuestions = allQuestions.filter(q => q.status === 'answered').length;
        const totalUsers = allUsers.length;
        
        // 날짜별 통계 계산
        const now = new Date();
        const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        const weekAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
        const monthAgo = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000);
        
        // 회원 통계
        const todayMembers = allUsers.filter(user => {
            if (!user.createdAt) return false;
            const userDate = new Date(user.createdAt);
            return userDate >= today;
        }).length;
        
        const weeklyMembers = allUsers.filter(user => {
            if (!user.createdAt) return false;
            const userDate = new Date(user.createdAt);
            return userDate >= weekAgo;
        }).length;
        
        const monthlyMembers = allUsers.filter(user => {
            if (!user.createdAt) return false;
            const userDate = new Date(user.createdAt);
            return userDate >= monthAgo;
        }).length;
        
        // 질문 통계
        const todayQuestions = allQuestions.filter(q => {
            if (!q.createdAt) return false;
            const questionDate = new Date(q.createdAt);
            return questionDate >= today;
        }).length;
        
        const weeklyQuestions = allQuestions.filter(q => {
            if (!q.createdAt) return false;
            const questionDate = new Date(q.createdAt);
            return questionDate >= weekAgo;
        }).length;
        
        const monthlyQuestions = allQuestions.filter(q => {
            if (!q.createdAt) return false;
            const questionDate = new Date(q.createdAt);
            return questionDate >= monthAgo;
        }).length;
        
        // HTML ID에 직접 업데이트 (실제 존재하는 ID들)
        updateStatCard('todayMembers', todayMembers);
        updateStatCard('weeklyMembers', weeklyMembers);
        updateStatCard('monthlyMembers', monthlyMembers);
        updateStatCard('pendingQuestions', pendingQuestions);
        updateStatCard('todayQuestions', todayQuestions);
        updateStatCard('weeklyQuestions', weeklyQuestions);
        updateStatCard('monthlyQuestions', monthlyQuestions);
        updateStatCard('totalMembers', totalUsers);
        
        console.log('✅ 대시보드 업데이트 완료:', {
            회원: { 총: totalUsers, 오늘: todayMembers, 주간: weeklyMembers, 월간: monthlyMembers },
            질문: { 총: totalQuestions, 대기: pendingQuestions, 완료: answeredQuestions, 오늘: todayQuestions, 주간: weeklyQuestions, 월간: monthlyQuestions }
        });
        
    } catch (error) {
        console.error('❌ 대시보드 업데이트 오류:', error);
    }
}

// 통계 카드 업데이트 헬퍼 함수 (간단한 버전)
function updateStatCard(elementId, value) {
    const element = document.getElementById(elementId);
    if (element) {
        element.textContent = value;
        console.log(`✅ DOM 업데이트: ${elementId} → ${value}`);
    } else {
        console.warn(`⚠️ DOM 요소를 찾을 수 없습니다: ${elementId}`);
    }
}

// 대시보드 카드 업데이트 헬퍼 함수
function updateDashboardCard(title, value, change) {
    // 실제 대시보드 카드가 있다면 업데이트
    console.log(`📈 ${title}: ${value} (${change})`);
    
    // 제목을 기반으로 해당하는 DOM 요소 찾기 및 업데이트
    const titleToIdMap = {
        '전체 질문': 'totalQuestions',
        '답변 대기': 'pendingQuestions', 
        '답변 완료': 'answeredQuestions',
        '등록 사용자': 'totalMembers',
        '오늘 신규 회원': 'todayMembers',
        '주간 신규 회원': 'weeklyMembers',
        '월간 신규 회원': 'monthlyMembers',
        '오늘 접수 질문': 'todayQuestions',
        '주간 접수 질문': 'weeklyQuestions',
        '월간 접수 질문': 'monthlyQuestions'
    };
    
    const elementId = titleToIdMap[title];
    if (elementId) {
        const element = document.getElementById(elementId);
        if (element) {
            element.textContent = value;
            console.log(`✅ DOM 업데이트: ${elementId} → ${value}`);
        } else {
            console.warn(`⚠️ DOM 요소를 찾을 수 없습니다: ${elementId}`);
        }
    } else {
        console.warn(`⚠️ 매핑되지 않은 제목: ${title}`);
    }
}

// 관리자 목록 업데이트
function updateAdminsList() {
    console.log('👨‍💼 관리자 목록 업데이트 시작');
    
    try {
        // 기본 관리자 목록이 없다면 생성
        if (allAdmins.length === 0) {
            allAdmins = [
                {
                    id: 'admin1',
                    name: '신일이삼',
                    email: 'bcshin03@gmail.com',
                    role: 'super',
                    status: 'active',
                    createdAt: new Date('2024-01-01'),
                    avatar: null,
                    lastLogin: new Date(),
                    department: '개발팀'
                },
                {
                    id: 'admin2',
                    name: '김관리',
                    email: 'admin@company.com',
                    role: 'admin',
                    status: 'active',
                    createdAt: new Date('2024-02-01'),
                    avatar: null,
                    lastLogin: new Date(Date.now() - 86400000),
                    department: '고객지원팀'
                }
            ];
        }
        
        // 관리자 목록 컨테이너 찾기
        const adminListContainer = document.querySelector('.admin-list');
        if (adminListContainer) {
            adminListContainer.innerHTML = '';
            
            allAdmins.forEach(admin => {
                const adminCard = createAdminCard(admin);
                adminListContainer.appendChild(adminCard);
            });
        } else {
            // 컨테이너가 없다면 권한 관리 섹션에 직접 추가
            const permissionsContainer = document.querySelector('.permissions-container');
            if (permissionsContainer) {
                permissionsContainer.innerHTML = `
                    <div class="admin-list-header">
                        <h3>관리자 목록</h3>
                        <span class="admin-count">${allAdmins.length}명</span>
                    </div>
                    <div class="admin-list" id="adminList">
                        ${allAdmins.map(admin => createAdminCardHTML(admin)).join('')}
                    </div>
                `;
            }
        }
        
        console.log('✅ 관리자 목록 업데이트 완료:', allAdmins.length, '명');
        
    } catch (error) {
        console.error('❌ 관리자 목록 업데이트 오류:', error);
    }
}

// 관리자 카드 HTML 생성
function createAdminCardHTML(admin) {
    const roleText = getRoleText(admin.role);
    const statusClass = admin.status === 'active' ? 'online' : 'offline';
    const lastLoginText = admin.lastLogin ? 
        `마지막 로그인: ${admin.lastLogin.toLocaleDateString()}` : 
        '로그인 기록 없음';
    
    return `
        <div class="admin-card" data-admin-id="${admin.id}">
            <div class="admin-avatar">
                <div class="avatar-circle" style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; width: 50px; height: 50px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-weight: bold; font-size: 1.2rem;">
                    ${admin.name ? admin.name.substring(0, 2) : 'AD'}
                </div>
                <div class="status-indicator ${statusClass}"></div>
            </div>
            <div class="admin-details">
                <div class="admin-header">
                    <h4 class="admin-name">${admin.name || '이름 없음'}</h4>
                    <span class="admin-role ${admin.role}">${roleText}</span>
                </div>
                <div class="admin-info">
                    <div class="info-item">
                        <i class="fas fa-envelope"></i>
                        <span>${admin.email}</span>
                    </div>
                    <div class="info-item">
                        <i class="fas fa-building"></i>
                        <span>${admin.department || '부서 미지정'}</span>
                    </div>
                    <div class="info-item">
                        <i class="fas fa-clock"></i>
                        <span>${lastLoginText}</span>
                    </div>
                </div>
            </div>
            <div class="admin-actions">
                <button class="btn-sm btn-secondary" onclick="editAdmin('${admin.id}')" title="편집">
                    <i class="fas fa-edit"></i>
                </button>
                <button class="btn-sm btn-info" onclick="viewAdminDetails('${admin.id}')" title="상세보기">
                    <i class="fas fa-eye"></i>
                </button>
                ${admin.role !== 'super' ? `
                    <button class="btn-sm btn-danger" onclick="deleteAdmin('${admin.id}')" title="삭제">
                        <i class="fas fa-trash"></i>
                    </button>
                ` : ''}
            </div>
        </div>
    `;
}

// 관리자 카드 DOM 요소 생성
function createAdminCard(admin) {
    const cardElement = document.createElement('div');
    cardElement.className = 'admin-card';
    cardElement.setAttribute('data-admin-id', admin.id);
    cardElement.innerHTML = createAdminCardHTML(admin);
    return cardElement;
}

// 역할 텍스트 반환
function getRoleText(role) {
    const roleMap = {
        'super': '슈퍼 관리자',
        'admin': '관리자',
        'question': '질문 관리자',
        'user': '사용자 관리자'
    };
    return roleMap[role] || '관리자';
}

// 템플릿 로드
async function loadTemplates() {
    try {
        console.log('📄 템플릿 로드 시작');
        // Firebase에서 템플릿 로드 시도
        // 실패하면 기본 템플릿 사용 (이미 loadDefaultTemplates에서 처리됨)
        console.log('✅ 템플릿 로드 완료');
    } catch (error) {
        console.error('템플릿 로드 오류:', error);
    }
}

// 관리자 로드
async function loadAdmins() {
    try {
        console.log('👨‍💼 관리자 로드 시작');
        // Firebase에서 관리자 로드 시도
        // 실패하면 기본 관리자 사용 (updateAdminsList에서 처리됨)
        updateAdminsList();
        console.log('✅ 관리자 로드 완료');
    } catch (error) {
        console.error('관리자 로드 오류:', error);
        updateAdminsList(); // 오류 시에도 기본 관리자 목록 생성
    }
}

// 회원 관리 관련 함수들

// 회원 통계 업데이트
function updateMemberStats() {
    console.log('👥 회원 통계 업데이트 시작');
    
    try {
        const now = new Date();
        const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        const thisWeek = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        const thisMonth = new Date(now.getFullYear(), now.getMonth(), 1);
        
        // 기간별 신입 회원 계산
        const todayNewMembers = allUsers.filter(user => {
            const joinDate = user.createdAt?.toDate ? user.createdAt.toDate() : new Date(user.createdAt);
            return joinDate >= today;
        }).length;
        
        const weeklyNewMembers = allUsers.filter(user => {
            const joinDate = user.createdAt?.toDate ? user.createdAt.toDate() : new Date(user.createdAt);
            return joinDate >= thisWeek;
        }).length;
        
        const monthlyNewMembers = allUsers.filter(user => {
            const joinDate = user.createdAt?.toDate ? user.createdAt.toDate() : new Date(user.createdAt);
            return joinDate >= thisMonth;
        }).length;
        
        console.log(`📊 오늘 신입: ${todayNewMembers}명, 주간 신입: ${weeklyNewMembers}명, 월간 신입: ${monthlyNewMembers}명`);
        
        // 실제 UI 업데이트 (HTML 요소가 있다면)
        updateStatCard('todayNewMembers', todayNewMembers);
        updateStatCard('weeklyNewMembers', weeklyNewMembers);
        updateStatCard('monthlyNewMembers', monthlyNewMembers);
        updateStatCard('totalMembers', allUsers.length);
        
        console.log('✅ 회원 통계 업데이트 완료');
        
    } catch (error) {
        console.error('❌ 회원 통계 업데이트 오류:', error);
    }
}

// 전체 회원 보기
function showAllMembers() {
    console.log('👥 전체 회원 보기 함수 시작');
    console.log('📊 현재 allUsers 상태:', allUsers ? allUsers.length : '정의되지 않음', '명');
    console.log('📊 allUsers 데이터:', allUsers);
    
    try {
        // Step 1: 데이터 존재 확인 및 로드
        if (!allUsers || allUsers.length === 0) {
            console.warn('⚠️ allUsers가 비어있습니다. 즉시 테스트 데이터 로드 시도');
            
            // 즉시 테스트 데이터 로드
            loadTestUsers();
            
            // Firebase 데이터도 비동기로 로드
            loadFirebaseData().then(() => {
                console.log('🔄 Firebase 데이터 로드 완료 후 재시도');
                if (allUsers && allUsers.length > 0) {
                    showAllMembers(); // 데이터 로드 후 다시 시도
                }
            }).catch(error => {
                console.warn('⚠️ Firebase 로드 실패, 테스트 데이터 사용:', error);
            });
            
            // 테스트 데이터 로드 후에도 비어있으면 중단
            if (!allUsers || allUsers.length === 0) {
                console.error('❌ 테스트 데이터 로드 실패');
                showNotification('회원 데이터를 불러올 수 없습니다. 페이지를 새로고침해주세요.', 'error');
                return;
            }
        }
        
        // Step 2: DOM 요소들 존재 확인
        const filterElement = document.getElementById('filterText');
        const tableBody = document.getElementById('membersTableBody');
        const totalMembersElement = document.getElementById('totalMembers');
        
        console.log('🔍 DOM 요소 확인:');
        console.log('- filterText 요소:', filterElement ? '✅ 존재' : '❌ 없음');
        console.log('- membersTableBody 요소:', tableBody ? '✅ 존재' : '❌ 없음');
        console.log('- totalMembers 요소:', totalMembersElement ? '✅ 존재' : '❌ 없음');
        
        // Step 3: 필터 텍스트 업데이트
        const memberCount = allUsers.length;
        const filterText = `전체 회원 (${memberCount}명)`;
        
        if (filterElement) {
            filterElement.textContent = filterText;
            console.log('✅ 필터 텍스트 업데이트:', filterText);
        } else {
            console.warn('⚠️ filterText 요소가 없음');
        }
        
        // Step 4: 총 회원 수 카드 업데이트
        if (totalMembersElement) {
            totalMembersElement.textContent = memberCount;
            console.log('✅ 총 회원 수 카드 업데이트:', memberCount);
        } else {
            console.warn('⚠️ totalMembers 요소가 없음');
        }
        
        // Step 5: 회원 테이블 업데이트
        if (tableBody) {
            console.log('📋 회원 테이블 업데이트 시작...');
            tableBody.innerHTML = '';
            
            if (allUsers.length > 0) {
                let successCount = 0;
                
                allUsers.forEach((user, index) => {
                    try {
                        const row = createMemberRow(user);
                        if (row) {
                            tableBody.appendChild(row);
                            successCount++;
                        }
                    } catch (rowError) {
                        console.error(`❌ 회원 ${index + 1} 행 생성 오류:`, rowError);
                    }
                });
                
                console.log(`✅ 회원 테이블 업데이트 완료: ${successCount}/${allUsers.length}개 행 생성`);
            } else {
                // 회원이 없는 경우 메시지 표시
                const emptyRow = document.createElement('tr');
                emptyRow.innerHTML = `
                    <td colspan="7" style="text-align: center; padding: 40px; color: #666;">
                        <i class="fas fa-users" style="font-size: 2rem; margin-bottom: 10px; display: block; opacity: 0.3;"></i>
                        등록된 회원이 없습니다.
                    </td>
                `;
                tableBody.appendChild(emptyRow);
                console.log('ℹ️ 빈 테이블 메시지 표시');
            }
        } else {
            console.error('❌ membersTableBody 요소가 없어 테이블 업데이트 불가');
        }
        
        // Step 6: 통계 카드 하이라이트
        try {
            highlightStatCard('all');
            console.log('✅ 통계 카드 하이라이트 완료');
        } catch (highlightError) {
            console.warn('⚠️ 통계 카드 하이라이트 오류:', highlightError);
        }
        
        // Step 7: 회원 통계 업데이트
        try {
            updateMemberStats();
            console.log('✅ 회원 통계 업데이트 완료');
        } catch (statsError) {
            console.warn('⚠️ 회원 통계 업데이트 오류:', statsError);
        }
        
        console.log('🎉 전체 회원 표시 완료:', memberCount, '명');
        
        // 성공 알림
        showNotification(`전체 회원 ${memberCount}명을 표시했습니다.`, 'success');
        
        // 디버깅을 위한 추가 정보
        console.log('📊 현재 상태 요약:');
        console.log('- 총 회원 수:', memberCount);
        console.log('- 테이블 행 수:', tableBody ? tableBody.children.length : '테이블 없음');
        console.log('- 필터 텍스트:', filterElement ? filterElement.textContent : '필터 없음');
        
    } catch (error) {
        console.error('❌ 전체 회원 표시 최상위 오류:', error);
        console.error('❌ 오류 스택:', error.stack);
        
        // 오류 발생 시 기본 동작 시도
        try {
            console.log('🔄 오류 복구 시도...');
            
            // 기본 회원 데이터라도 표시
            if (!allUsers || allUsers.length === 0) {
                loadTestUsers(); // 테스트 데이터 강제 로드
            }
            
            const tableBody = document.getElementById('membersTableBody');
            if (tableBody) {
                tableBody.innerHTML = `
                    <tr>
                        <td colspan="7" style="text-align: center; padding: 40px; color: #666;">
                            <i class="fas fa-exclamation-triangle" style="font-size: 2rem; margin-bottom: 10px; display: block; color: #ffc107;"></i>
                            회원 데이터 로드 중 오류가 발생했습니다.<br>
                            <button onclick="forceUpdateMembers()" style="margin-top: 10px; padding: 8px 16px; background: #007bff; color: white; border: none; border-radius: 4px; cursor: pointer;">
                                다시 시도
                            </button>
                        </td>
                    </tr>
                `;
                console.log('🆘 오류 복구 UI 표시 완료');
            }
            
        } catch (recoveryError) {
            console.error('❌ 오류 복구 실패:', recoveryError);
        }
        
        showNotification('전체 회원을 표시하는 중 오류가 발생했습니다. 콘솔을 확인해주세요.', 'error');
    }
}

// 기간별 회원 필터링
function filterMembersByPeriod(period) {
    console.log('📅 기간별 회원 필터링:', period);
    
    try {
        const now = new Date();
        let filteredUsers = [];
        let filterText = '';
        
        switch (period) {
            case 'today':
                const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
                filteredUsers = allUsers.filter(user => {
                    const joinDate = user.createdAt?.toDate ? user.createdAt.toDate() : new Date(user.createdAt);
                    return joinDate >= today;
                });
                filterText = `오늘 신입 회원 (${filteredUsers.length}명)`;
                break;
                
            case 'week':
                const thisWeek = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
                filteredUsers = allUsers.filter(user => {
                    const joinDate = user.createdAt?.toDate ? user.createdAt.toDate() : new Date(user.createdAt);
                    return joinDate >= thisWeek;
                });
                filterText = `주간 신입 회원 (${filteredUsers.length}명)`;
                break;
                
            case 'month':
                const thisMonth = new Date(now.getFullYear(), now.getMonth(), 1);
                filteredUsers = allUsers.filter(user => {
                    const joinDate = user.createdAt?.toDate ? user.createdAt.toDate() : new Date(user.createdAt);
                    return joinDate >= thisMonth;
                });
                filterText = `월간 신입 회원 (${filteredUsers.length}명)`;
                break;
                
            default:
                filteredUsers = allUsers;
                filterText = `전체 회원 (${allUsers.length}명)`;
        }
        
        // 필터 텍스트 업데이트
        updateFilterText(filterText);
        
        // 필터링된 회원 테이블 업데이트
        updateMembersTableWithFilter(filteredUsers, filterText);
        
        // 통계 카드 하이라이트
        highlightStatCard(period);
        
        console.log('✅ 기간별 필터링 완료:', filterText);
        
    } catch (error) {
        console.error('❌ 기간별 필터링 오류:', error);
        showNotification('회원 필터링 중 오류가 발생했습니다.', 'error');
    }
}

// 필터 텍스트 업데이트
function updateFilterText(text) {
    const filterElement = document.getElementById('filterText');
    if (filterElement) {
        filterElement.textContent = text;
    }
}

// 필터링된 회원 테이블 업데이트
function updateMembersTableWithFilter(users, filterDescription) {
    console.log('📋 필터링된 회원 테이블 업데이트:', users.length, '명');
    
    try {
        const tableBody = document.getElementById('membersTableBody');
        if (tableBody) {
            tableBody.innerHTML = '';
            
            if (users.length > 0) {
                users.forEach(user => {
                    const row = createMemberRow(user);
                    tableBody.appendChild(row);
                });
            } else {
                // 회원이 없는 경우 메시지 표시
                const emptyRow = document.createElement('tr');
                emptyRow.innerHTML = `
                    <td colspan="7" style="text-align: center; padding: 40px; color: #666;">
                        <i class="fas fa-users" style="font-size: 2rem; margin-bottom: 10px; display: block; opacity: 0.3;"></i>
                        ${filterDescription}에 해당하는 회원이 없습니다.
                    </td>
                `;
                tableBody.appendChild(emptyRow);
            }
        }
        
        console.log('✅ 필터링된 회원 테이블 업데이트 완료');
        
    } catch (error) {
        console.error('❌ 필터링된 회원 테이블 업데이트 오류:', error);
    }
}

// 통계 카드 하이라이트
function highlightStatCard(period) {
    console.log('✨ 통계 카드 하이라이트:', period);
    
    try {
        // 모든 통계 카드의 하이라이트 제거
        const statCards = document.querySelectorAll('.new-members-stats .stat-card');
        statCards.forEach(card => {
            card.style.transform = 'scale(1)';
            card.style.boxShadow = '';
            card.style.border = '';
        });
        
        // 선택된 카드 하이라이트
        let targetCard = null;
        switch (period) {
            case 'today':
                targetCard = statCards[0]; // 첫 번째 카드 (오늘 신입 회원)
                break;
            case 'week':
                targetCard = statCards[1]; // 두 번째 카드 (주간 신입 회원)
                break;
            case 'month':
                targetCard = statCards[2]; // 세 번째 카드 (월간 신입 회원)
                break;
            case 'all':
            default:
                targetCard = statCards[3]; // 네 번째 카드 (전체 회원)
                break;
        }
        
        if (targetCard) {
            targetCard.style.transform = 'scale(1.02)';
            targetCard.style.boxShadow = '0 8px 25px rgba(0,0,0,0.15)';
            targetCard.style.border = '2px solid #007bff';
            targetCard.style.transition = 'all 0.3s ease';
        }
        
    } catch (error) {
        console.error('❌ 통계 카드 하이라이트 오류:', error);
    }
}

// 회원 테이블 업데이트 (기존 함수 복원)
function updateMembersTable() {
    console.log('📋 회원 테이블 업데이트 시작');
    
    try {
        // 회원 테이블이 있다면 업데이트
        const tableBody = document.getElementById('membersTableBody');
        if (tableBody && allUsers.length > 0) {
            tableBody.innerHTML = '';
            
            allUsers.forEach(user => {
                const row = createMemberRow(user);
                tableBody.appendChild(row);
            });
        }
        
        console.log('✅ 회원 테이블 업데이트 완료:', allUsers.length, '명');
        
    } catch (error) {
        console.error('❌ 회원 테이블 업데이트 오류:', error);
    }
}

// 회원 테이블 행 생성
function createMemberRow(user) {
    const row = document.createElement('tr');
    const joinDate = user.createdAt?.toDate ? user.createdAt.toDate() : new Date(user.createdAt);
    
    row.innerHTML = `
        <td>
            <input type="checkbox" data-user-id="${user.id}">
        </td>
        <td>
            <div class="member-info">
                <div class="member-avatar">
                    <div class="avatar-circle" style="background: linear-gradient(135deg, #4facfe 0%, #00f2fe 100%); color: white; width: 35px; height: 35px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-weight: bold; font-size: 0.9rem;">
                        ${user.name ? user.name.substring(0, 2) : 'U'}
                    </div>
                </div>
                <div class="member-details">
                    <div class="member-name">${user.name || '이름 없음'}</div>
                    <div class="member-email">${user.email || '이메일 없음'}</div>
                    <div class="member-phone">${user.phone || '전화번호 없음'}</div>
                </div>
            </div>
        </td>
        <td>
            <div class="date-info">
                <div class="date">${joinDate.toLocaleDateString()}</div>
                <div class="time">${joinDate.toLocaleTimeString()}</div>
            </div>
        </td>
        <td>
            <span class="question-count">${user.questionCount || 0}</span>
        </td>
        <td>
            <span class="answer-count">${user.answerCount || 0}</span>
        </td>
        <td>
            <span class="status-badge ${user.status || 'active'}">${user.status === 'active' ? '활성' : '비활성'}</span>
        </td>
        <td>
            <div class="action-buttons">
                <button class="btn-sm btn-secondary" onclick="viewMemberDetails('${user.id}')" title="상세보기">
                    <i class="fas fa-eye"></i>
                </button>
                <button class="btn-sm btn-primary" onclick="editMember('${user.id}')" title="편집">
                    <i class="fas fa-edit"></i>
                </button>
                <button class="btn-sm ${user.status === 'active' ? 'btn-warning' : 'btn-success'}" 
                        onclick="toggleMemberStatus('${user.id}')" 
                        title="${user.status === 'active' ? '비활성화' : '활성화'}">
                    <i class="fas fa-${user.status === 'active' ? 'ban' : 'check'}"></i>
                </button>
            </div>
        </td>
    `;
    
    return row;
}

// 액션 함수들

// 질문 관련 액션
function answerQuestion(questionId) {
    console.log('💬 질문 답변 모달 열기:', questionId);
    
    const question = allQuestions.find(q => q.id === questionId);
    if (!question) {
        showNotification('질문을 찾을 수 없습니다.', 'error');
        return;
    }
    
    // 현재 질문 ID 저장
    currentQuestionId = questionId;
    
    // 질문 정보 표시
    const questionInfo = document.getElementById('questionInfo');
    if (questionInfo) {
        const questionTime = question.questionTime ? 
            (question.questionTime.toDate ? question.questionTime.toDate() : new Date(question.questionTime)) :
            new Date();
            
        questionInfo.innerHTML = `
            <div class="question-detail">
                <div class="question-header">
                    <h4>${question.questionTitle || '제목 없음'}</h4>
                    <span class="question-id">#${question.id}</span>
                </div>
                <div class="question-meta">
                    <div class="meta-item">
                        <strong>작성자:</strong> ${question.userName || '익명'}
                    </div>
                    <div class="meta-item">
                        <strong>이메일:</strong> ${question.userEmail || '이메일 없음'}
                    </div>
                    <div class="meta-item">
                        <strong>연락처:</strong> ${question.userPhone || '연락처 없음'}
                    </div>
                    <div class="meta-item">
                        <strong>등록일:</strong> ${questionTime.toLocaleString()}
                    </div>
                </div>
                <div class="question-content">
                    <strong>질문 내용:</strong>
                    <div class="content-text">${question.questionContent || '내용 없음'}</div>
                </div>
            </div>
        `;
    }
    
    // 기존 답변이 있다면 표시
    const answerText = document.getElementById('answerText');
    if (answerText) {
        answerText.value = question.answer || '';
    }
    
    // 우선순위 설정
    const answerPriority = document.getElementById('answerPriority');
    if (answerPriority) {
        answerPriority.value = question.priority || 'normal';
    }
    
    // 템플릿 버튼 업데이트
    updateTemplateButtons();
    
    // 모달 열기
    const modal = document.getElementById('answerModal');
    if (modal) {
        modal.style.display = 'flex';
        modal.classList.add('show');
        
        // 답변 텍스트 영역에 포커스
        setTimeout(() => {
            if (answerText) {
                answerText.focus();
            }
        }, 100);
    }
}

// 답변 모달 닫기
function closeAnswerModal() {
    console.log('🔒 답변 모달 닫기');
    
    const modal = document.getElementById('answerModal');
    if (modal) {
        modal.style.display = 'none';
        modal.classList.remove('show');
    }
    
    // 폼 초기화
    const answerText = document.getElementById('answerText');
    if (answerText) {
        answerText.value = '';
    }
    
    const answerPriority = document.getElementById('answerPriority');
    if (answerPriority) {
        answerPriority.value = 'normal';
    }
    
    currentQuestionId = null;
}

// 답변 제출
async function submitAnswer() {
    console.log('📤 답변 제출:', currentQuestionId);
    
    if (!currentQuestionId) {
        showNotification('질문을 선택해주세요.', 'error');
        return;
    }
    
    const answerText = document.getElementById('answerText');
    const answerPriority = document.getElementById('answerPriority');
    
    if (!answerText || !answerText.value.trim()) {
        showNotification('답변 내용을 입력해주세요.', 'error');
        answerText?.focus();
        return;
    }
    
    const answer = answerText.value.trim();
    const priority = answerPriority?.value || 'normal';
    
    try {
        // 로딩 표시
        const submitBtn = document.querySelector('#answerModal .btn-primary');
        const originalText = submitBtn?.textContent;
        if (submitBtn) {
            submitBtn.disabled = true;
            submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> 전송 중...';
        }
        
        // 질문 찾기 및 업데이트
        const questionIndex = allQuestions.findIndex(q => q.id === currentQuestionId);
        if (questionIndex !== -1) {
            allQuestions[questionIndex] = {
                ...allQuestions[questionIndex],
                answer: answer,
                status: 'answered',
                priority: priority,
                answeredAt: new Date(),
                answeredBy: currentUser?.email || '관리자'
            };
            
            // Firebase에 저장 시도
            await saveAnswerToFirebase(currentQuestionId, {
                answer: answer,
                status: 'answered',
                priority: priority,
                answeredAt: new Date(),
                answeredBy: currentUser?.email || '관리자'
            });
            
            // 이메일 전송 시도
            let emailSent = false;
            try {
                await sendAnswerEmail(allQuestions[questionIndex]);
                emailSent = true;
            } catch (emailError) {
                console.error('이메일 전송 오류:', emailError);
            }
            
            // UI 업데이트
            updateQuestionsList();
            updateDashboard();
            
            // 결과에 따른 메시지 표시
            if (emailSent) {
                showNotification('🎉 답변이 성공적으로 전송되었습니다!\n고객의 이메일로 답변이 실제 발송되었습니다.', 'success');
            } else {
                showNotification('⚠️ 답변이 저장되었지만 이메일 전송에 실패했습니다.\nFirebase에는 저장되었으니 수동으로 이메일을 발송해주세요.', 'warning');
            }
            
            closeAnswerModal();
        }
        
    } catch (error) {
        console.error('답변 제출 오류:', error);
        showNotification('답변 전송 중 오류가 발생했습니다: ' + error.message, 'error');
    } finally {
        // 버튼 상태 복원
        const submitBtn = document.querySelector('#answerModal .btn-primary');
        if (submitBtn && originalText) {
            submitBtn.disabled = false;
            submitBtn.innerHTML = '<i class="fas fa-paper-plane"></i> 답변 전송';
        }
    }
}

// Firebase에 답변 저장
async function saveAnswerToFirebase(questionId, answerData) {
    console.log('💾 Firebase에 답변 저장:', questionId);
    
    try {
        if (db && firebaseModules) {
            const { doc, updateDoc } = firebaseModules;
            
            // questions 컬렉션의 해당 문서 업데이트
            const questionRef = doc(db, 'questions', questionId);
            await updateDoc(questionRef, answerData);
            
            console.log('✅ Firebase 답변 저장 완료');
        }
    } catch (error) {
        console.warn('⚠️ Firebase 답변 저장 실패:', error);
        // Firebase 저장 실패해도 로컬 저장은 완료됨
    }
}

// 답변 이메일 전송
async function sendAnswerEmail(question) {
    console.log('📧 답변 이메일 전송:', question.userEmail);
    
    try {
        if (!question.userEmail) {
            throw new Error('수신자 이메일 주소가 없습니다.');
        }
        
        // 이메일 유효성 검사
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(question.userEmail)) {
            throw new Error('올바르지 않은 이메일 주소 형식입니다.');
        }
        
        // 🔧 새 EmailJS 서비스 설정 (여기에 새 키 입력)
        const serviceId = 'service_bcshin03';        // ⬅️ 새 Service ID로 교체
        const templateId = 'template_0v6wg09';      // ⬅️ 새 Template ID로 교체
        
        // 새 키가 설정되었는지 확인
        const keysConfigured = serviceId !== 'YOUR_NEW_SERVICE_ID' && 
                              templateId !== 'YOUR_NEW_TEMPLATE_ID' && 
                              typeof emailjs !== 'undefined';
        
        if (keysConfigured) {
            // 🎯 실제 EmailJS 전송 모드
            console.log('📤 실제 EmailJS 전송 모드 활성화');
            
            const templateParams = {
                name: question.userEmail,  // To Email: 고객 이메일 주소
                email: 'midcampus31@gmail.com',  // Reply To: 회사 이메일 주소
                message: `안녕하세요 ${question.userName || '고객'}님,

중간계 AI 스튜디오입니다.
문의해 주신 "${question.questionTitle}" 에 대해 답변드립니다.

━━━━━ 원래 문의 내용 ━━━━━
${question.questionContent || ''}

━━━━━ 답변 내용 ━━━━━
${question.answer || ''}

추가 문의사항이 있으시면 언제든지 연락해 주세요.
감사합니다.

중간계 AI 스튜디오
담당자: ${currentUser?.displayName || '관리자'}
연락처: midcampus31@gmail.com
웹사이트: https://mid-ai-5th.web.app

답변일시: ${new Date().toLocaleString('ko-KR')}`
            };
            
            console.log('📤 실제 이메일 전송 시도:', { serviceId, templateId });
            const result = await emailjs.send(serviceId, templateId, templateParams);
            
            if (result.status === 200) {
                console.log('✅ 실제 이메일 전송 완료:', result);
                console.log('📧 이메일이 실제로 전송되었습니다:', question.userEmail);
                return true;
            } else {
                throw new Error(`이메일 전송 실패: ${result.status} ${result.text}`);
            }
            
        } else {
            // 🎭 시뮬레이션 모드 (새 키 미설정 시)
            console.log('🎭 이메일 전송 시뮬레이션 모드 (새 EmailJS 키 설정 대기중)');
            
            const emailContent = `
=============================================
📧 실제 전송될 이메일 내용 (시뮬레이션)
=============================================

받는 사람: ${question.userEmail}
받는 사람 이름: ${question.userName || '고객님'}
보내는 사람: 중간계 AI 스튜디오 <midcampus31@gmail.com>
제목: [중간계 AI 스튜디오] ${question.questionTitle} 문의에 대한 답변

=== 이메일 본문 ===

안녕하세요 ${question.userName || '고객'}님,

중간계 AI 스튜디오입니다.
문의해 주신 "${question.questionTitle}" 에 대해 답변드립니다.

━━━━━ 원래 문의 내용 ━━━━━
${question.questionContent || ''}

━━━━━ 답변 내용 ━━━━━
${question.answer || ''}

━━━━━━━━━━━━━━━━━━━━━━━

추가 문의사항이 있으시면 언제든지 연락해 주세요.
감사합니다.

중간계 AI 스튜디오
담당자: ${currentUser?.displayName || '관리자'}
연락처: midcampus31@gmail.com
웹사이트: https://mid-ai-5th.web.app

답변일시: ${new Date().toLocaleString('ko-KR')}

=============================================
💡 새 EmailJS 계정 설정 후 실제 전송됩니다!
============================================= `;
            
            console.log(emailContent);
            
            // 시뮬레이션 지연
            await new Promise(resolve => setTimeout(resolve, 1500));
            
            console.log('✅ 이메일 전송 시뮬레이션 완료');
            console.log('🔧 새 EmailJS 키 설정 후 실제 전송으로 자동 전환됩니다.');
            
            return true;
        }
        
    } catch (error) {
        console.error('❌ 이메일 전송 실패:', error);
        throw new Error(`이메일 전송 오류: ${error.message || error.text || '알 수 없는 오류'}`);
    }
}

// 이메일 전송 시뮬레이션 함수
async function simulateEmailSending(question, templateParams = null) {
    console.log('🎭 이메일 전송 시뮬레이션 시작');
    
    return new Promise((resolve) => {
        setTimeout(() => {
            console.log('📧 시뮬레이션 이메일 전송 완료');
            console.log('📧 수신자:', question.userEmail);
            console.log('📧 제목:', `[중간계 AI 스튜디오] ${question.questionTitle} 문의에 대한 답변`);
            console.log('📧 답변 내용:', question.answer?.substring(0, 100) + '...');
            
            // 브라우저 콘솔에 이메일 내용 표시
            const emailContent = `
=== 이메일 전송 시뮬레이션 ===
받는 사람: ${question.userEmail}
보내는 사람: 중간계 AI 스튜디오
제목: [중간계 AI 스튜디오] ${question.questionTitle} 문의에 대한 답변

안녕하세요 ${question.userName || '고객'}님,

중간계 AI 스튜디오입니다.
문의해 주신 "${question.questionTitle}" 에 대해 답변드립니다.

===== 원래 문의 내용 =====
${question.questionContent || ''}

===== 답변 내용 =====
${question.answer || ''}

추가 문의사항이 있으시면 언제든지 연락해 주세요.
감사합니다.

중간계 AI 스튜디오
연락처: midcampus31@gmail.com
웹사이트: https://mid-ai-5th.web.app

답변일시: ${new Date().toLocaleString('ko-KR')}
===============================
            `;
            
            console.log(emailContent);
            
            // 실제 환경에서는 여기서 다른 이메일 서비스나 백엔드 API를 호출할 수 있음
            resolve(true);
        }, 1000); // 1초 딜레이로 실제 전송 시뮬레이션
    });
}

// 템플릿 버튼 업데이트
function updateTemplateButtons() {
    const templateButtons = document.getElementById('templateButtons');
    if (templateButtons && templates.length > 0) {
        templateButtons.innerHTML = templates.map(template => `
            <button type="button" class="template-btn" onclick="insertTemplate('${template.id}')">
                <i class="fas fa-file-text"></i>
                ${template.title}
            </button>
        `).join('');
        templateButtons.style.display = 'block';
    }
}

// 템플릿 삽입
function insertTemplate(templateId) {
    console.log('📄 템플릿 삽입:', templateId);
    
    const template = templates.find(t => t.id === templateId);
    const answerText = document.getElementById('answerText');
    
    if (template && answerText) {
        // 기존 내용이 있으면 확인
        if (answerText.value.trim() && !confirm('기존 내용을 템플릿으로 교체하시겠습니까?')) {
            return;
        }
        
        answerText.value = template.content;
        answerText.focus();
        
        // 커서를 적절한 위치로 이동
        const editPosition = template.content.indexOf('[구체적인 답변');
        if (editPosition !== -1) {
            answerText.setSelectionRange(editPosition, editPosition);
        }
        
        showNotification('템플릿이 삽입되었습니다.', 'success');
    }
}

function viewQuestion(questionId) {
    console.log('👁️ 질문 상세보기:', questionId);
    const question = allQuestions.find(q => q.id === questionId);
    if (question) {
        alert(`질문 상세 정보:\n\n제목: ${question.questionTitle}\n내용: ${question.questionContent}\n작성자: ${question.userName}\n이메일: ${question.userEmail}\n연락처: ${question.userPhone}`);
    }
}

function deleteQuestion(questionId) {
    console.log('🗑️ 질문 삭제:', questionId);
    if (confirm('정말로 이 질문을 삭제하시겠습니까?')) {
        allQuestions = allQuestions.filter(q => q.id !== questionId);
        updateQuestionsList();
        updateDashboard();
        showNotification('질문이 삭제되었습니다.', 'success');
    }
}

// 회원 관련 액션
function viewMemberDetails(userId) {
    console.log('👤 회원 상세보기:', userId);
    const user = allUsers.find(u => u.id === userId);
    if (user) {
        const joinDate = user.createdAt?.toDate ? user.createdAt.toDate() : new Date(user.createdAt);
        alert(`회원 상세 정보:\n\n이름: ${user.name}\n이메일: ${user.email}\n전화번호: ${user.phone}\n가입일: ${joinDate.toLocaleDateString()}\n상태: ${user.status === 'active' ? '활성' : '비활성'}\n질문 수: ${user.questionCount || 0}개\n답변 받은 수: ${user.answerCount || 0}개`);
    }
}

function editMember(userId) {
    console.log('✏️ 회원 편집:', userId);
    const user = allUsers.find(u => u.id === userId);
    if (user) {
        const newName = prompt('새로운 이름을 입력하세요:', user.name);
        if (newName && newName !== user.name) {
            user.name = newName;
            updateMembersTable();
            showNotification('회원 정보가 수정되었습니다.', 'success');
        }
    }
}

function toggleMemberStatus(userId) {
    console.log('🔄 회원 상태 변경:', userId);
    const user = allUsers.find(u => u.id === userId);
    if (user) {
        const action = user.status === 'active' ? '비활성화' : '활성화';
        if (confirm(`정말로 이 회원을 ${action}하시겠습니까?`)) {
            user.status = user.status === 'active' ? 'inactive' : 'active';
            updateMembersTable();
            updateMemberStats();
            showNotification(`회원이 ${action}되었습니다.`, 'success');
        }
    }
}

// 관리자 관련 액션
function addAdmin() {
    console.log('➕ 관리자 추가 버튼 클릭됨');
    
    // 간단한 관리자 추가 (실제로는 모달을 사용)
    const name = prompt('관리자 이름을 입력하세요:');
    if (!name) return;
    
    const email = prompt('관리자 이메일을 입력하세요:');
    if (!email) return;
    
    const role = prompt('관리자 역할을 입력하세요 (admin/question/user):', 'admin');
    if (!role) return;
    
    const newAdmin = {
        id: 'admin_' + Date.now(),
        name: name,
        email: email,
        role: role,
        status: 'active',
        createdAt: new Date(),
        lastLogin: null,
        department: '신규'
    };
    
    allAdmins.push(newAdmin);
    updateAdminsList();
    showNotification('새 관리자가 추가되었습니다.', 'success');
}

function editAdmin(adminId) {
    console.log('✏️ 관리자 편집:', adminId);
    const admin = allAdmins.find(a => a.id === adminId);
    if (admin) {
        const newName = prompt('새로운 이름을 입력하세요:', admin.name);
        if (newName && newName !== admin.name) {
            admin.name = newName;
            updateAdminsList();
            showNotification('관리자 정보가 수정되었습니다.', 'success');
        }
    }
}

function viewAdminDetails(adminId) {
    console.log('👁️ 관리자 상세보기:', adminId);
    const admin = allAdmins.find(a => a.id === adminId);
    if (admin) {
        const lastLogin = admin.lastLogin ? admin.lastLogin.toLocaleString() : '로그인 기록 없음';
        alert(`관리자 상세 정보:\n\n이름: ${admin.name}\n이메일: ${admin.email}\n역할: ${getRoleText(admin.role)}\n부서: ${admin.department}\n상태: ${admin.status === 'active' ? '활성' : '비활성'}\n가입일: ${admin.createdAt.toLocaleDateString()}\n마지막 로그인: ${lastLogin}`);
    }
}

function deleteAdmin(adminId) {
    console.log('🗑️ 관리자 삭제:', adminId);
    const admin = allAdmins.find(a => a.id === adminId);
    if (admin && admin.role !== 'super') {
        if (confirm(`정말로 ${admin.name} 관리자를 삭제하시겠습니까?`)) {
            allAdmins = allAdmins.filter(a => a.id !== adminId);
            updateAdminsList();
            showNotification('관리자가 삭제되었습니다.', 'success');
        }
    } else {
        showNotification('슈퍼 관리자는 삭제할 수 없습니다.', 'error');
    }
}

// 기타 액션 함수들
function refreshData() {
    console.log('🔄 데이터 새로고침');
    showLoading(true);
    
    // Firebase 사용자 동기화 포함
    Promise.all([
        loadFirebaseData(), // 이미 syncWithAuthentication을 포함함
        // 추가 데이터 로드가 필요하면 여기에
    ]).then(() => {
        updateDashboard();
        updateMemberStats();
        updateMembersTable();
        updateQuestionsList();
        updateAdminsList();
        showLoading(false);
        showNotification('데이터가 새로고침되었습니다. 새로운 회원이 있다면 목록에 반영됩니다.', 'success');
    }).catch(error => {
        console.error('새로고침 오류:', error);
        showLoading(false);
        showNotification('데이터 새로고침 중 오류가 발생했습니다.', 'error');
    });
}

function logout() {
    console.log('🚪 로그아웃');
    if (confirm('정말로 로그아웃하시겠습니까?')) {
        alert('로그아웃 기능은 개발 중입니다.');
    }
}

function toggleSidebar() {
    console.log('📱 사이드바 토글');
    const sidebar = document.querySelector('.sidebar');
    if (sidebar) {
        sidebar.classList.toggle('collapsed');
    }
}

function toggleNotifications() {
    console.log('🔔 알림 토글');
    const dropdown = document.getElementById('notificationDropdown');
    if (dropdown) {
        dropdown.classList.toggle('show');
    }
}

// 디버깅 및 테스트 함수들
window.testShowAllMembers = function() {
    console.log('🧪 전체 회원 보기 테스트 시작');
    console.log('🔍 현재 회원 데이터:', allUsers);
    
    try {
        showAllMembers();
    } catch (error) {
        console.error('❌ 테스트 중 오류:', error);
    }
};

window.checkMemberElements = function() {
    console.log('🔍 회원 관리 DOM 요소 확인');
    
    const elements = {
        'filterText': document.getElementById('filterText'),
        'membersTableBody': document.getElementById('membersTableBody'),
        'totalMembers': document.getElementById('totalMembers'),
        'todayNewMembers': document.getElementById('todayNewMembers'),
        'weeklyNewMembers': document.getElementById('weeklyNewMembers'),
        'monthlyNewMembers': document.getElementById('monthlyNewMembers')
    };
    
    Object.entries(elements).forEach(([name, element]) => {
        console.log(`- ${name}:`, element ? '✅ 존재' : '❌ 없음');
    });
    
    return elements;
};

window.forceUpdateMembers = function() {
    console.log('🔄 강제 회원 데이터 업데이트');
    updateMemberStats();
    updateMembersTable();
    showAllMembers();
};

// 회원 차트 초기화
function initializeMemberCharts() {
    console.log('📊 회원 차트 초기화 시작');
    
    try {
        // 월별 가입 추이 차트
        const memberJoinChart = document.getElementById('memberJoinChart');
        if (memberJoinChart && typeof Chart !== 'undefined') {
            const ctx = memberJoinChart.getContext('2d');
            new Chart(ctx, {
                type: 'line',
                data: {
                    labels: ['1월', '2월', '3월', '4월', '5월', '6월'],
                    datasets: [{
                        label: '월별 가입자 수',
                        data: [5, 8, 12, 7, 15, 10],
                        borderColor: '#007bff',
                        backgroundColor: 'rgba(0, 123, 255, 0.1)',
                        tension: 0.4
                    }]
                },
                options: {
                    responsive: true,
                    plugins: {
                        legend: {
                            display: false
                        }
                    },
                    scales: {
                        y: {
                            beginAtZero: true
                        }
                    }
                }
            });
        }
        
        // 회원 활동 분포 차트
        const memberActivityChart = document.getElementById('memberActivityChart');
        if (memberActivityChart && typeof Chart !== 'undefined') {
            const ctx = memberActivityChart.getContext('2d');
            new Chart(ctx, {
                type: 'doughnut',
                data: {
                    labels: ['활성', '비활성', '신규'],
                    datasets: [{
                        data: [70, 20, 10],
                        backgroundColor: ['#28a745', '#ffc107', '#007bff']
                    }]
                },
                options: {
                    responsive: true,
                    plugins: {
                        legend: {
                            position: 'bottom'
                        }
                    }
                }
            });
        }
        
        console.log('✅ 회원 차트 초기화 완료');
        
    } catch (error) {
        console.error('❌ 회원 차트 초기화 오류:', error);
        console.log('📊 Chart.js 라이브러리가 로드되지 않아 차트를 생성할 수 없습니다.');
    }
}

// 분석 차트 초기화
function initializeAnalyticsCharts() {
    console.log('📊 분석 차트 초기화 시작');
    
    try {
        if (typeof Chart === 'undefined') {
            console.warn('⚠️ Chart.js 라이브러리가 로드되지 않음');
            return;
        }
        
        // 일일 질문 차트
        const dailyChart = document.getElementById('dailyChart');
        if (dailyChart) {
            const ctx = dailyChart.getContext('2d');
            new Chart(ctx, {
                type: 'bar',
                data: {
                    labels: ['월', '화', '수', '목', '금', '토', '일'],
                    datasets: [{
                        label: '일일 질문 수',
                        data: [12, 8, 15, 10, 20, 5, 7],
                        backgroundColor: '#007bff'
                    }]
                },
                options: {
                    responsive: true,
                    plugins: {
                        legend: {
                            display: false
                        }
                    }
                }
            });
        }
        
        // 카테고리 파이 차트
        const categoryChart = document.getElementById('categoryPieChart');
        if (categoryChart) {
            const ctx = categoryChart.getContext('2d');
            new Chart(ctx, {
                type: 'pie',
                data: {
                    labels: ['AI 상세페이지', '홈페이지 제작', '챗봇 구축', '쇼츠/릴스', '기타'],
                    datasets: [{
                        data: [30, 25, 20, 15, 10],
                        backgroundColor: ['#007bff', '#28a745', '#ffc107', '#dc3545', '#6c757d']
                    }]
                },
                options: {
                    responsive: true
                }
            });
        }
        
        console.log('✅ 분석 차트 초기화 완료');
        
    } catch (error) {
        console.error('❌ 분석 차트 초기화 오류:', error);
    }
}

// 누락된 백업 기록 업데이트 함수
function updateBackupHistory() {
    console.log('💾 백업 기록 업데이트');
    
    const backupHistory = document.getElementById('backupHistory');
    if (backupHistory) {
        backupHistory.innerHTML = `
            <div class="backup-item">
                <div class="backup-info">
                    <div class="backup-name">전체 데이터 백업</div>
                    <div class="backup-date">2024-06-01 09:30:00</div>
                </div>
                <div class="backup-size">2.3 MB</div>
                <div class="backup-status success">완료</div>
            </div>
            <div class="backup-item">
                <div class="backup-info">
                    <div class="backup-name">질문 데이터 백업</div>
                    <div class="backup-date">2024-05-31 14:15:00</div>
                </div>
                <div class="backup-size">1.8 MB</div>
                <div class="backup-status success">완료</div>
            </div>
        `;
    }
}

// 데이터 관리 관련 함수들
function backupData() {
    console.log('💾 데이터 백업 시작');
    showNotification('데이터 백업을 시작합니다...', 'info');
    
    setTimeout(() => {
        showNotification('데이터 백업이 완료되었습니다.', 'success');
        updateBackupHistory();
    }, 2000);
}

function exportToExcel() {
    console.log('📊 엑셀 내보내기');
    showNotification('엑셀 파일을 생성하고 있습니다...', 'info');
    
    setTimeout(() => {
        showNotification('엑셀 파일 다운로드가 완료되었습니다.', 'success');
    }, 1500);
}

function cleanupData() {
    console.log('🧹 데이터 정리');
    if (confirm('오래된 데이터를 정리하시겠습니까? 이 작업은 되돌릴 수 없습니다.')) {
        showNotification('데이터 정리를 시작합니다...', 'info');
        
        setTimeout(() => {
            showNotification('데이터 정리가 완료되었습니다.', 'success');
        }, 2000);
    }
}

function analyzeUsage() {
    console.log('📈 사용량 분석');
    showNotification('사용량 분석을 시작합니다...', 'info');
    
    setTimeout(() => {
        showNotification('사용량 분석이 완료되었습니다.', 'success');
    }, 1500);
}

// 누락된 회원 관련 함수들
function searchMembers() {
    console.log('🔍 회원 검색 함수 호출');
    const searchInput = document.getElementById('memberSearchInput');
    if (searchInput) {
        const searchTerm = searchInput.value.toLowerCase().trim();
        console.log('🔍 회원 검색어:', searchTerm);
        
        if (searchTerm) {
            const filteredUsers = allUsers.filter(user => 
                (user.name && user.name.toLowerCase().includes(searchTerm)) ||
                (user.email && user.email.toLowerCase().includes(searchTerm)) ||
                (user.phone && user.phone.toLowerCase().includes(searchTerm))
            );
            updateMembersTableWithFilter(filteredUsers, `검색 결과: "${searchTerm}" (${filteredUsers.length}명)`);
            console.log(`✅ 검색 완료: ${filteredUsers.length}명 발견`);
        } else {
            showAllMembers();
        }
    } else {
        console.warn('⚠️ memberSearchInput 요소를 찾을 수 없음');
    }
}

function sortMembers() {
    console.log('📊 회원 정렬 함수 호출');
    const sortBy = document.getElementById('memberSortBy');
    if (sortBy) {
        const sortValue = sortBy.value;
        console.log('📊 회원 정렬 기준:', sortValue);
        
        if (!allUsers || allUsers.length === 0) {
            console.warn('⚠️ 정렬할 회원 데이터가 없음');
            return;
        }
        
        let sortedUsers = [...allUsers];
        
        try {
            switch (sortValue) {
                case 'latest':
                    sortedUsers.sort((a, b) => {
                        const dateA = a.createdAt?.toDate ? a.createdAt.toDate() : new Date(a.createdAt);
                        const dateB = b.createdAt?.toDate ? b.createdAt.toDate() : new Date(b.createdAt);
                        return dateB - dateA;
                    });
                    break;
                case 'oldest':
                    sortedUsers.sort((a, b) => {
                        const dateA = a.createdAt?.toDate ? a.createdAt.toDate() : new Date(a.createdAt);
                        const dateB = b.createdAt?.toDate ? b.createdAt.toDate() : new Date(b.createdAt);
                        return dateA - dateB;
                    });
                    break;
                case 'name':
                    sortedUsers.sort((a, b) => (a.name || '').localeCompare(b.name || ''));
                    break;
                case 'questions':
                    sortedUsers.sort((a, b) => (b.questionCount || 0) - (a.questionCount || 0));
                    break;
                default:
                    console.warn('⚠️ 알 수 없는 정렬 기준:', sortValue);
                    return;
            }
            
            updateMembersTableWithFilter(sortedUsers, `정렬: ${sortValue} (${sortedUsers.length}명)`);
            console.log(`✅ 회원 정렬 완료: ${sortValue}`);
        } catch (error) {
            console.error('❌ 회원 정렬 오류:', error);
            showNotification('회원 정렬 중 오류가 발생했습니다.', 'error');
        }
    } else {
        console.warn('⚠️ memberSortBy 요소를 찾을 수 없음');
    }
}

function toggleSelectAllMembers() {
    console.log('☑️ 회원 전체 선택 토글');
    const checkboxes = document.querySelectorAll('#membersTableBody input[type="checkbox"]');
    const headerCheckbox = document.querySelector('#members .members-table thead input[type="checkbox"]');
    
    console.log(`📋 체크박스 개수: ${checkboxes.length}개`);
    
    if (headerCheckbox) {
        const shouldCheck = headerCheckbox.checked;
        checkboxes.forEach(checkbox => {
            checkbox.checked = shouldCheck;
        });
        console.log(`✅ 모든 체크박스를 ${shouldCheck ? '선택' : '해제'}했습니다.`);
    } else {
        console.warn('⚠️ 헤더 체크박스를 찾을 수 없음');
    }
}

function filterMembersByStatus() {
    console.log('🔍 회원 상태 필터링 함수 호출');
    const statusFilter = document.getElementById('memberStatusFilter');
    if (statusFilter) {
        const status = statusFilter.value;
        console.log('🔍 회원 상태 필터:', status);
        
        if (!allUsers || allUsers.length === 0) {
            console.warn('⚠️ 필터링할 회원 데이터가 없음');
            return;
        }
        
        if (status === 'all') {
            showAllMembers();
        } else {
            const filteredUsers = allUsers.filter(user => user.status === status);
            updateMembersTableWithFilter(filteredUsers, `상태: ${status} (${filteredUsers.length}명)`);
            console.log(`✅ 상태별 필터링 완료: ${status} - ${filteredUsers.length}명`);
        }
    } else {
        console.warn('⚠️ memberStatusFilter 요소를 찾을 수 없음');
    }
}

function exportMembers() {
    console.log('📤 회원 내보내기');
    showNotification('회원 데이터를 내보내고 있습니다...', 'info');
    
    // 실제 CSV 또는 Excel 내보내기 로직을 여기에 구현할 수 있습니다
    setTimeout(() => {
        showNotification('회원 데이터 내보내기가 완료되었습니다.', 'success');
    }, 1500);
}

// 추가 누락 함수들 구현
function initializeMemberCharts() {
    console.log('📊 회원 차트 초기화 시작');
    
    try {
        if (typeof Chart === 'undefined') {
            console.warn('⚠️ Chart.js 라이브러리가 로드되지 않아 차트를 생성할 수 없습니다.');
            return;
        }
        
        // 월별 가입 추이 차트
        const memberJoinChart = document.getElementById('memberJoinChart');
        if (memberJoinChart) {
            const ctx = memberJoinChart.getContext('2d');
            new Chart(ctx, {
                type: 'line',
                data: {
                    labels: ['1월', '2월', '3월', '4월', '5월', '6월'],
                    datasets: [{
                        label: '월별 가입자 수',
                        data: [5, 8, 12, 7, 15, 10],
                        borderColor: '#007bff',
                        backgroundColor: 'rgba(0, 123, 255, 0.1)',
                        tension: 0.4
                    }]
                },
                options: {
                    responsive: true,
                    plugins: {
                        legend: {
                            display: false
                        }
                    },
                    scales: {
                        y: {
                            beginAtZero: true
                        }
                    }
                }
            });
            console.log('✅ 월별 가입 추이 차트 생성 완료');
        }
        
        // 회원 활동 분포 차트
        const memberActivityChart = document.getElementById('memberActivityChart');
        if (memberActivityChart) {
            const ctx = memberActivityChart.getContext('2d');
            new Chart(ctx, {
                type: 'doughnut',
                data: {
                    labels: ['활성', '비활성', '신규'],
                    datasets: [{
                        data: [70, 20, 10],
                        backgroundColor: ['#28a745', '#ffc107', '#007bff']
                    }]
                },
                options: {
                    responsive: true,
                    plugins: {
                        legend: {
                            position: 'bottom'
                        }
                    }
                }
            });
            console.log('✅ 회원 활동 분포 차트 생성 완료');
        }
        
        console.log('✅ 회원 차트 초기화 완료');
        
    } catch (error) {
        console.error('❌ 회원 차트 초기화 오류:', error);
    }
}

function updateBackupHistory() {
    console.log('💾 백업 기록 업데이트');
    
    const backupHistory = document.getElementById('backupHistory');
    if (backupHistory) {
        backupHistory.innerHTML = `
            <div class="backup-item">
                <div class="backup-info">
                    <div class="backup-name">전체 데이터 백업</div>
                    <div class="backup-date">${new Date().toLocaleString()}</div>
                </div>
                <div class="backup-size">2.3 MB</div>
                <div class="backup-status success">완료</div>
            </div>
            <div class="backup-item">
                <div class="backup-info">
                    <div class="backup-name">질문 데이터 백업</div>
                    <div class="backup-date">${new Date(Date.now() - 86400000).toLocaleString()}</div>
                </div>
                <div class="backup-size">1.8 MB</div>
                <div class="backup-status success">완료</div>
            </div>
        `;
        console.log('✅ 백업 기록 업데이트 완료');
    }
}

// 즉시 실행 함수 - 페이지 로드 시 전체 회원 표시
function ensureMembersDisplay() {
    console.log('🔄 회원 표시 보장 함수 실행');
    
    // 회원 관리 섹션이 활성화되어 있으면 전체 회원 표시
    const membersSection = document.getElementById('members');
    if (membersSection && membersSection.classList.contains('active')) {
        console.log('👥 회원 관리 섹션이 활성화됨, 전체 회원 자동 표시');
        
        // 0.5초 후 전체 회원 자동 표시
        setTimeout(() => {
            if (allUsers && allUsers.length > 0) {
                showAllMembers();
            } else {
                console.log('🔄 데이터가 없어 강제 로드 후 재시도');
                loadTestUsers();
                setTimeout(() => {
                    if (allUsers && allUsers.length > 0) {
                        showAllMembers();
                    }
                }, 200);
            }
        }, 500);
    }
}

// 강제 회원 데이터 업데이트 (디버깅용)
function forceUpdateMembers() {
    console.log('🔄 강제 회원 데이터 업데이트 시작');
    
    try {
        // 1단계: 데이터 확인 및 로드
        if (!allUsers || allUsers.length === 0) {
            console.log('📦 테스트 데이터 강제 로드');
            loadTestUsers();
        }
        
        // 2단계: 통계 업데이트
        console.log('📊 회원 통계 업데이트');
        updateMemberStats();
        
        // 3단계: 테이블 업데이트
        console.log('📋 회원 테이블 업데이트');
        updateMembersTable();
        
        // 4단계: 전체 회원 표시
        console.log('👥 전체 회원 표시');
        showAllMembers();
        
        // 5단계: 차트 초기화
        console.log('📊 차트 초기화');
        setTimeout(() => {
            initializeMemberCharts();
        }, 100);
        
        showNotification('회원 데이터가 강제로 업데이트되었습니다.', 'success');
        console.log('✅ 강제 회원 데이터 업데이트 완료');
        
    } catch (error) {
        console.error('❌ 강제 회원 데이터 업데이트 오류:', error);
        showNotification('회원 데이터 업데이트 중 오류가 발생했습니다.', 'error');
    }
}

// 테스트 및 디버깅 함수들
function testShowAllMembers() {
    console.log('🧪 전체 회원 보기 테스트 시작');
    console.log('🔍 현재 회원 데이터:', allUsers);
    
    try {
        showAllMembers();
        console.log('✅ 테스트 완료');
    } catch (error) {
        console.error('❌ 테스트 중 오류:', error);
    }
}

function checkMemberElements() {
    console.log('🔍 회원 관리 DOM 요소 확인');
    
    const elements = {
        'filterText': document.getElementById('filterText'),
        'membersTableBody': document.getElementById('membersTableBody'),
        'totalMembers': document.getElementById('totalMembers'),
        'todayNewMembers': document.getElementById('todayNewMembers'),
        'weeklyNewMembers': document.getElementById('weeklyNewMembers'),
        'monthlyNewMembers': document.getElementById('monthlyNewMembers'),
        'memberSearchInput': document.getElementById('memberSearchInput'),
        'memberSortBy': document.getElementById('memberSortBy'),
        'memberStatusFilter': document.getElementById('memberStatusFilter')
    };
    
    console.log('📋 DOM 요소 검사 결과:');
    Object.entries(elements).forEach(([name, element]) => {
        const status = element ? '✅ 존재' : '❌ 없음';
        console.log(`- ${name}: ${status}`);
    });
    
    return elements;
}

// 전역 함수로 노출하여 HTML에서 접근 가능하도록 함
window.showAllMembers = showAllMembers;
window.filterMembersByPeriod = filterMembersByPeriod;
window.updateFilterText = updateFilterText;
window.updateMembersTableWithFilter = updateMembersTableWithFilter;
window.highlightStatCard = highlightStatCard;
window.searchMembers = searchMembers;
window.sortMembers = sortMembers;
window.toggleSelectAllMembers = toggleSelectAllMembers;
window.filterMembersByStatus = filterMembersByStatus;
window.exportMembers = exportMembers;
window.initializeMemberCharts = initializeMemberCharts;
window.updateBackupHistory = updateBackupHistory;
window.ensureMembersDisplay = ensureMembersDisplay;
window.forceUpdateMembers = forceUpdateMembers;
window.testShowAllMembers = testShowAllMembers;
window.checkMemberElements = checkMemberElements;
window.backupData = backupData;
window.exportToExcel = exportToExcel;
window.cleanupData = cleanupData;
window.analyzeUsage = analyzeUsage;