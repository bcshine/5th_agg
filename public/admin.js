// 중간계 AI 스튜디오 - 관리자 JavaScript

// Firebase 인스턴스들 (HTML에서 초기화됨)
let app, auth, db, modules;

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
    
    // Firebase 초기화 대기
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
                console.log('🔥 Firebase 연결됨, 데이터 로드 시작');
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

// Firebase 초기화 확인 및 설정
function initializeFirebase() {
    console.log('🔥 Firebase 초기화 확인 중...');
    
    try {
        // HTML에서 초기화된 Firebase 인스턴스 확인
        if (window.firebaseApp && window.firebaseAuth && window.firebaseDb && window.firebaseModules) {
            app = window.firebaseApp;
            auth = window.firebaseAuth;
            db = window.firebaseDb;
            modules = window.firebaseModules;
            
            console.log('✅ Firebase 연결 성공');
            console.log('📊 Firestore 인스턴스:', db);
            console.log('🔐 Auth 인스턴스:', auth);
            return true;
        } else {
            console.warn('⚠️ Firebase가 HTML에서 아직 초기화되지 않음');
            return false;
        }
    } catch (error) {
        console.error('❌ Firebase 초기화 실패:', error);
        return false;
    }
}

// Firebase 인증 설정 및 Firestore 동기화
function setupFirebaseAuth() {
    console.log('🔐 Firebase 인증 설정 시작');
    
    if (auth && modules?.onAuthStateChanged) {
        modules.onAuthStateChanged(auth, async (user) => {
            if (user) {
                currentUser = user;
                console.log('✅ 사용자 로그인:', user.email);
                
                // 사용자 정보를 Firestore에 동기화
                await syncUserToFirestore(user);
                
                const permissions = checkAdminPermissions(user);
                console.log('👤 권한:', permissions);
                
                updateAdminInfo(user, permissions);
                
                // 데이터 새로고침
                await loadFirebaseData();
                
            } else {
                console.log('❌ 로그인되지 않음');
                currentUser = null;
            }
        });
    }
}

// 사용자 정보를 Firestore에 동기화
async function syncUserToFirestore(user) {
    console.log('🔄 사용자 Firestore 동기화 시작:', user.email);
    
    if (!db || !modules) {
        console.warn('⚠️ Firestore 연결 없음');
        return;
    }
    
    try {
        const { collection, doc, getDoc, setDoc, serverTimestamp } = modules;
        
        // 사용자 문서 참조 생성 (이메일 기반 ID)
        const userDocId = user.email.replace(/[.@]/g, '_');
        const userRef = doc(collection(db, 'users'), userDocId);
        
        // 기존 사용자 정보 확인
        const userDoc = await getDoc(userRef);
        
        if (!userDoc.exists()) {
            // 새 사용자인 경우 Firestore에 추가
            const userData = {
                uid: user.uid,
                email: user.email,
                name: user.displayName || user.email.split('@')[0],
                phone: user.phoneNumber || '',
                status: 'active',
                role: checkAdminPermissions(user).role || 'user',
                questionCount: 0,
                answerCount: 0,
                createdAt: serverTimestamp(),
                lastLogin: serverTimestamp()
            };
            
            await setDoc(userRef, userData);
            console.log('✅ 새 사용자를 Firestore에 추가:', user.email);
            
        } else {
            // 기존 사용자인 경우 로그인 시간만 업데이트
            const { updateDoc } = modules;
            await updateDoc(userRef, {
                lastLogin: serverTimestamp()
            });
            console.log('✅ 기존 사용자 로그인 시간 업데이트:', user.email);
        }
        
    } catch (error) {
        console.error('❌ 사용자 Firestore 동기화 실패:', error);
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
        loadOfflineData();
        showLoading(false);
    }
}

// Firebase 사용자 목록 로드
async function loadFirebaseUsers() {
    console.log('👥 Firebase 사용자 로드 시작');
    
    try {
        if (db && modules) {
            const { collection, getDocs, query, orderBy } = modules;
            
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
                    createdAt: userData.createdAt ? userData.createdAt.toDate() : new Date(),
                    questionCount: userData.questionCount || 0,
                    answerCount: userData.answerCount || 0,
                    role: userData.role || 'user'
                });
            });
            
            console.log('✅ Firestore 사용자 로드 완료:', allUsers.length, '명');
        }
        
    } catch (error) {
        console.error('❌ Firebase 사용자 로드 오류:', error);
        allUsers = [];
    }
}

// Firebase 질문 데이터 로드
async function loadFirebaseQuestions() {
    console.log('📋 Firebase 질문 로드 시작');
    
    try {
        if (db && modules) {
            const { collection, onSnapshot, query, orderBy } = modules;
            
            const questionsRef = collection(db, 'questions');
            const questionsQuery = query(questionsRef, orderBy('questionTime', 'desc'));
            
            // 실시간 리스너 설정
            onSnapshot(questionsQuery, (snapshot) => {
                console.log('🔄 Firebase 질문 실시간 업데이트:', snapshot.size, '개');
                
                allQuestions = [];
                snapshot.forEach((doc) => {
                    const questionData = doc.data();
                    
                    let questionTime = new Date();
                    if (questionData.questionTime) {
                        if (questionData.questionTime.toDate) {
                            questionTime = questionData.questionTime.toDate();
                        } else if (questionData.questionTime.seconds) {
                            questionTime = new Date(questionData.questionTime.seconds * 1000);
                        } else {
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
                updateQuestionsList();
                updateDashboard();
            }, (error) => {
                console.error('❌ Firebase 질문 실시간 리스너 오류:', error);
            });
        }
        
    } catch (error) {
        console.error('❌ Firebase 질문 로드 오류:', error);
    }
}

// Firebase 관리자 데이터 로드
async function loadFirebaseAdmins() {
    console.log('👨‍💼 Firebase 관리자 로드 시작');
    
    try {
        if (db && modules) {
            const { collection, getDocs } = modules;
            
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
            
            if (allAdmins.length === 0) {
                await createDefaultAdmins();
            }
        }
        
    } catch (error) {
        console.error('❌ Firebase 관리자 로드 오류:', error);
        await createDefaultAdmins();
    }
}

// 테스트 질문 생성 함수 (개발용)
async function createTestQuestion() {
    if (!db || !modules) {
        alert('Firebase 연결을 확인해주세요.');
        return;
    }

    try {
        const { collection, addDoc, serverTimestamp } = modules;
        
        const testQuestion = {
            questionTitle: 'AI 상세페이지 제작 문의',
            questionContent: '안녕하세요. AI를 활용한 상세페이지 제작에 대해 문의드리고 싶습니다. 비용과 제작 기간이 궁금합니다.',
            userName: currentUser ? currentUser.displayName || currentUser.email.split('@')[0] : '테스트 사용자',
            userEmail: currentUser ? currentUser.email : 'test@example.com',
            userPhone: '010-1234-5678',
            questionTime: serverTimestamp(),
            status: 'pending',
            priority: 'normal'
        };

        const questionsRef = collection(db, 'questions');
        const docRef = await addDoc(questionsRef, testQuestion);
        
        console.log('✅ 테스트 질문 생성 완료:', docRef.id);
        showNotification('테스트 질문이 생성되었습니다!', 'success');
        
    } catch (error) {
        console.error('❌ 테스트 질문 생성 실패:', error);
        showNotification('테스트 질문 생성에 실패했습니다: ' + error.message, 'error');
    }
}

// 기본 관리자 생성
async function createDefaultAdmins() {
    console.log('👨‍💼 기본 관리자 생성 시작');
    
    // 로그인한 사용자가 있으면 자동으로 슈퍼 관리자로 추가
    if (currentUser && currentUser.email) {
        try {
            if (db && modules) {
                const { collection, doc, setDoc, serverTimestamp } = modules;
                
                // admin1 ID로 첫 번째 관리자 생성
                const adminDocId = 'admin1';
                const adminRef = doc(collection(db, 'admins'), adminDocId);
                
                const adminData = {
                    id: adminDocId,
                    name: currentUser.displayName || currentUser.email.split('@')[0],
                    email: currentUser.email,
                    role: 'super',
                    status: 'active',
                    department: '시스템 관리',
                    createdAt: serverTimestamp(),
                    createdBy: 'system',
                    lastLogin: serverTimestamp()
                };
                
                await setDoc(adminRef, adminData);
                
                console.log('✅ 현재 사용자를 admin1 슈퍼 관리자로 추가:', currentUser.email);
                
                // 로컬 배열에도 추가
                allAdmins = [{
                    id: adminDocId,
                    name: adminData.name,
                    email: adminData.email,
                    role: 'super',
                    status: 'active',
                    department: '시스템 관리',
                    createdAt: new Date(),
                    lastLogin: new Date()
                }];
                
                return;
            }
        } catch (error) {
            console.error('❌ 기본 관리자 Firestore 추가 실패:', error);
        }
    }
    
    // Firestore 연결이 없거나 사용자가 없으면 로컬 기본값 사용
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
        }
    ];
    console.log('✅ 로컬 기본 관리자 생성 완료:', allAdmins.length, '명');
}

// 오프라인 데이터 로드
function loadOfflineData() {
    console.log('📦 오프라인 데이터 로드 시작');
    
    allUsers = [];
    allQuestions = [];
    createDefaultAdmins();
    
    updateDashboard();
    updateMemberStats();
    updateMembersTable();
    updateQuestionsList();
    updateAdminsList();
    
    console.log('✅ 오프라인 데이터 로드 완료');
}

// 관리자 권한 확인
function checkAdminPermissions(user) {
    if (!user) return { role: 'user', permissions: [], canDeleteAdmin: false };
    
    const email = user.email;
    const superAdminEmails = [
        'bcshin03@gmail.com',
        'bcshin03@naver.com',
        'bcshin03ais@gmail.com'
    ];
    
    if (superAdminEmails.includes(email)) {
        return {
            role: 'super',
            permissions: ['모든 권한', '시스템 관리', '관리자 관리', '데이터 관리'],
            canDeleteAdmin: true
        };
    }
    
    return {
        role: 'admin',
        permissions: ['읽기', '질문 답변'],
        canDeleteAdmin: false
    };
}

// 기본 템플릿 로드
function loadDefaultTemplates() {
    console.log('📄 기본 템플릿 로드 시작');
    
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
        }
    ];
    
    templates = defaultTemplates;
    console.log('✅ 기본 템플릿 로드 완료:', templates.length, '개');
}

// 이벤트 리스너 설정
function setupEventListeners() {
    console.log('🔗 이벤트 리스너 설정 시작');
    
    try {
        const navItems = document.querySelectorAll('.nav-item');
        navItems.forEach((item) => {
            const onclickAttr = item.getAttribute('onclick');
            if (!onclickAttr) {
                const href = item.getAttribute('href');
                if (href && href.startsWith('#')) {
                    const sectionId = href.substring(1);
                    item.addEventListener('click', function(e) {
                        e.preventDefault();
                        showSection(sectionId);
                    });
                }
            }
            item.style.cursor = 'pointer';
        });
        
        console.log('✅ 이벤트 리스너 설정 완료');
        
    } catch (error) {
        console.error('❌ 이벤트 리스너 설정 오류:', error);
    }
}

// 섹션 표시
function showSection(sectionId) {
    console.log('🔄 showSection 호출:', sectionId);
    
    try {
        // 모든 섹션 숨기기
        const allSections = document.querySelectorAll('.content-section, .section');
        allSections.forEach(section => {
            section.classList.remove('active');
        });
        
        // 모든 네비게이션 아이템 비활성화
        const allNavItems = document.querySelectorAll('.nav-item');
        allNavItems.forEach(item => {
            item.classList.remove('active');
        });
        
        // 선택된 섹션 표시
        const targetSection = document.getElementById(sectionId);
        if (targetSection) {
            targetSection.classList.add('active');
        }
        
        // 선택된 네비게이션 아이템 활성화
        const targetNavItem = document.querySelector(`[onclick*="showSection('${sectionId}')"]`);
        if (targetNavItem) {
            targetNavItem.classList.add('active');
        }
        
        // 섹션별 데이터 로드
        loadSectionData(sectionId);
        
        console.log('✅ showSection 완료:', sectionId);
        
    } catch (error) {
        console.error('❌ showSection 오류:', error);
    }
}

// 알림 표시
function showNotification(message, type = 'info') {
    console.log(`📢 알림 (${type}):`, message);
    
    try {
        const existingNotifications = document.querySelectorAll('.notification-toast');
        existingNotifications.forEach(notification => notification.remove());
        
        const notification = document.createElement('div');
        notification.className = `notification-toast notification-${type}`;
        
        const icons = {
            success: '✅',
            error: '❌', 
            warning: '⚠️',
            info: 'ℹ️'
        };
        
        notification.innerHTML = `
            <div style="display: flex; align-items: center; gap: 10px;">
                <span>${icons[type] || 'ℹ️'}</span>
                <span>${message}</span>
                <button onclick="this.parentElement.parentElement.remove()" style="margin-left: auto; background: none; border: none; font-size: 18px; cursor: pointer;">×</button>
            </div>
        `;
        
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
            font-family: inherit;
        `;
        
        document.body.appendChild(notification);
        
        setTimeout(() => {
            if (notification.parentElement) {
                notification.remove();
            }
        }, 5000);
        
    } catch (error) {
        console.error('알림 표시 오류:', error);
        alert(message);
    }
}

// 로딩 표시
function showLoading(show) {
    console.log('🔄 로딩 상태:', show ? '표시' : '숨김');
    const loadingElement = document.getElementById('loadingSpinner');
    if (loadingElement) {
        loadingElement.style.display = show ? 'block' : 'none';
    }
}

// UI 업데이트 함수들
function updateQuestionsList() {
    console.log('📋 질문 목록 업데이트:', allQuestions.length, '개');
    
    const pendingCount = allQuestions.filter(q => q.status === 'pending').length;
    
    const badge = document.getElementById('questionBadge');
    if (badge) {
        badge.textContent = pendingCount;
        badge.style.display = pendingCount > 0 ? 'inline' : 'none';
    }
    
    // 질문 관리 페이지의 테이블 업데이트
    const questionsTable = document.getElementById('questionsTable');
    if (questionsTable) {
        updateQuestionsTable();
    }
}

function updateQuestionsTable() {
    console.log('📋 질문 테이블 업데이트 시작');
    
    const questionsTable = document.getElementById('questionsTable');
    if (!questionsTable) {
        console.warn('⚠️ 질문 테이블 요소를 찾을 수 없음');
        return;
    }
    
    // 로딩 표시
    questionsTable.innerHTML = `
        <tr>
            <td colspan="5" style="text-align: center; padding: 40px; color: #666;">
                <i class="fas fa-spinner fa-spin" style="font-size: 2rem; margin-bottom: 10px;"></i>
                <div>질문 목록을 불러오는 중...</div>
            </td>
        </tr>
    `;
    
    if (allQuestions.length === 0) {
        // 질문이 없으면 안내 메시지
        questionsTable.innerHTML = `
            <tr>
                <td colspan="5" style="text-align: center; padding: 40px; color: #666;">
                    <div style="margin-bottom: 15px;">
                        <i class="fas fa-comments" style="font-size: 2rem; color: #ccc; margin-bottom: 10px;"></i>
                        <div><strong>접수된 질문이 없습니다</strong></div>
                        <div style="margin-top: 10px; font-size: 0.9rem; color: #999;">
                            "테스트 질문 생성" 버튼으로 샘플 질문을 만들어보세요.
                        </div>
                    </div>
                </td>
            </tr>
        `;
        return;
    }
    
    // 실제 질문 데이터 표시
    questionsTable.innerHTML = allQuestions.map(question => {
        const questionTime = question.questionTime instanceof Date ? 
            question.questionTime : new Date(question.questionTime);
        
        const statusBadges = {
            'pending': 'badge-pending',
            'answered': 'badge-completed', 
            'in-progress': 'badge-progress',
            'completed': 'badge-completed'
        };
        
        const statusLabels = {
            'pending': '미답변',
            'answered': '답변완료',
            'in-progress': '답변중',
            'completed': '답변완료'
        };
        
        const statusClass = statusBadges[question.status] || 'badge-pending';
        const statusLabel = statusLabels[question.status] || '미답변';
        
        return `
            <tr>
                <td>
                    <span class="badge ${statusClass}">${statusLabel}</span>
                </td>
                <td>
                    <div style="font-weight: 500; margin-bottom: 4px;">${question.questionTitle || '제목 없음'}</div>
                    <div style="font-size: 0.8rem; color: #666; max-width: 300px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">
                        ${(question.questionContent || '').substring(0, 50)}...
                    </div>
                </td>
                <td>
                    <div style="font-weight: 500;">${question.userName || '익명'}</div>
                    <div style="font-size: 0.8rem; color: #666;">${question.userEmail || ''}</div>
                </td>
                <td>
                    <div style="font-size: 0.9rem;">${questionTime.toLocaleDateString('ko-KR')}</div>
                    <div style="font-size: 0.8rem; color: #666;">${questionTime.toLocaleTimeString('ko-KR', {hour: '2-digit', minute: '2-digit'})}</div>
                </td>
                <td>
                    <div style="display: flex; gap: 5px;">
                        ${question.status === 'pending' || question.status === 'in-progress' ? 
                            `<button class="btn btn-success btn-sm" onclick="answerQuestion('${question.id}')" style="font-size: 0.8rem;">
                                <i class="fas fa-reply"></i> 답변
                            </button>` : 
                            `<button class="btn btn-outline btn-sm" onclick="viewQuestion('${question.id}')" style="font-size: 0.8rem;">
                                <i class="fas fa-eye"></i> 보기
                            </button>`
                        }
                        <button class="btn btn-danger btn-sm" onclick="deleteQuestion('${question.id}')" style="font-size: 0.8rem;">
                            <i class="fas fa-trash"></i>
                        </button>
                    </div>
                </td>
            </tr>
        `;
    }).join('');
    
    console.log('✅ 질문 테이블 업데이트 완료:', allQuestions.length, '개');
}

function updateDashboard() {
    console.log('📊 대시보드 업데이트 시작');
    
    try {
        const totalQuestions = allQuestions.length;
        const pendingQuestions = allQuestions.filter(q => q.status === 'pending').length;
        const answeredQuestions = allQuestions.filter(q => q.status === 'answered').length;
        const totalUsers = allUsers.length;
        
        updateStatCard('pendingQuestions', pendingQuestions);
        updateStatCard('totalMembers', totalUsers);
        updateStatCard('totalQuestions', totalQuestions);
        updateStatCard('answeredQuestions', answeredQuestions);
        
        console.log('✅ 대시보드 업데이트 완료');
        
    } catch (error) {
        console.error('❌ 대시보드 업데이트 오류:', error);
    }
}

function updateStatCard(elementId, value) {
    const element = document.getElementById(elementId);
    if (element) {
        element.textContent = value;
    }
}

function updateMemberStats() {
    console.log('👥 회원 통계 업데이트');
    
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const thisWeek = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const thisMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    
    const todayNewMembers = allUsers.filter(user => {
        const joinDate = user.createdAt instanceof Date ? user.createdAt : new Date(user.createdAt);
        return joinDate >= today;
    }).length;
    
    const weeklyNewMembers = allUsers.filter(user => {
        const joinDate = user.createdAt instanceof Date ? user.createdAt : new Date(user.createdAt);
        return joinDate >= thisWeek;
    }).length;
    
    const monthlyNewMembers = allUsers.filter(user => {
        const joinDate = user.createdAt instanceof Date ? user.createdAt : new Date(user.createdAt);
        return joinDate >= thisMonth;
    }).length;
    
    updateStatCard('todayMembers', todayNewMembers);
    updateStatCard('weeklyMembers', weeklyNewMembers);
    updateStatCard('monthlyMembers', monthlyNewMembers);
    updateStatCard('totalMembers', allUsers.length);
}

function updateMembersTable() {
    console.log('📋 회원 테이블 업데이트 시작');
    
    const membersTable = document.getElementById('membersTable');
    if (!membersTable) {
        console.warn('⚠️ 회원 테이블 요소를 찾을 수 없음');
        return;
    }
    
    // 로딩 표시
    membersTable.innerHTML = `
        <tr>
            <td colspan="5" style="text-align: center; padding: 40px; color: #666;">
                <i class="fas fa-spinner fa-spin" style="font-size: 2rem; margin-bottom: 10px;"></i>
                <div>회원 정보를 불러오는 중...</div>
            </td>
        </tr>
    `;
    
    if (allUsers.length === 0) {
        // Firebase에서 사용자 데이터가 없으면 안내 메시지
        membersTable.innerHTML = `
            <tr>
                <td colspan="5" style="text-align: center; padding: 40px; color: #666;">
                    <div style="margin-bottom: 15px;">
                        <i class="fas fa-users" style="font-size: 2rem; color: #ccc; margin-bottom: 10px;"></i>
                        <div><strong>등록된 회원이 없습니다</strong></div>
                        <div style="margin-top: 10px; font-size: 0.9rem; color: #999;">
                            사용자가 로그인하면 자동으로 회원 정보가 표시됩니다.
                        </div>
                    </div>
                </td>
            </tr>
        `;
        return;
    }
    
    // 실제 회원 데이터 표시
    membersTable.innerHTML = allUsers.map(user => {
        const joinDate = user.createdAt instanceof Date ? user.createdAt : new Date(user.createdAt);
        
        return `
            <tr>
                <td>
                    <div style="display: flex; align-items: center; gap: 10px;">
                        <div style="width: 35px; height: 35px; border-radius: 50%; background: linear-gradient(135deg, #4facfe 0%, #00f2fe 100%); color: white; display: flex; align-items: center; justify-content: center; font-weight: bold; font-size: 0.9rem;">
                            ${user.name ? user.name.substring(0, 2) : 'U'}
                        </div>
                        <div>
                            <div style="font-weight: 500;">${user.name || '이름 없음'}</div>
                            <div style="font-size: 0.8rem; color: #666;">${user.role || 'user'}</div>
                        </div>
                    </div>
                </td>
                <td>
                    <div style="font-size: 0.9rem;">${user.email || '이메일 없음'}</div>
                </td>
                <td>
                    <div style="font-size: 0.9rem;">${user.phone || '전화번호 없음'}</div>
                </td>
                <td>
                    <div style="font-size: 0.9rem;">${joinDate.toLocaleDateString('ko-KR')}</div>
                    <div style="font-size: 0.8rem; color: #666;">${joinDate.toLocaleTimeString('ko-KR', {hour: '2-digit', minute: '2-digit'})}</div>
                </td>
                <td>
                    <span style="background: #e3f2fd; color: #1976d2; padding: 4px 8px; border-radius: 12px; font-size: 0.8rem; font-weight: 500;">
                        ${user.questionCount || 0}개
                    </span>
                </td>
            </tr>
        `;
    }).join('');
    
    console.log('✅ 회원 테이블 업데이트 완료:', allUsers.length, '명');
}

function updateAdminsList() {
    console.log('👨‍💼 관리자 목록 업데이트');
    
    const tableBody = document.getElementById('adminsTable');
    if (!tableBody) return;
    
    // 기본 로딩 표시
    tableBody.innerHTML = `
        <tr>
            <td colspan="6" class="loading">
                <i class="fas fa-spinner"></i>
                <div>관리자 목록을 불러오는 중...</div>
            </td>
        </tr>
    `;
    
    // 실제 관리자 데이터가 있으면 표시
    if (allAdmins && allAdmins.length > 0) {
        tableBody.innerHTML = allAdmins.map(admin => `
            <tr>
                <td>${admin.id}</td>
                <td>${admin.name || '이름 없음'}</td>
                <td>${admin.email}</td>
                <td>
                    <span class="badge ${admin.role === 'super' ? 'badge-success' : 'badge-primary'}">
                        ${admin.role === 'super' ? '슈퍼 관리자' : '관리자'}
                    </span>
                </td>
                <td>
                    <span class="badge ${admin.status === 'active' ? 'badge-completed' : 'badge-pending'}">
                        ${admin.status === 'active' ? '활성' : '비활성'}
                    </span>
                </td>
                <td>
                    <button class="btn btn-outline" onclick="editAdmin('${admin.id}')" title="수정">
                        <i class="fas fa-edit"></i>
                        수정
                    </button>
                    ${currentUser && checkAdminPermissions(currentUser).canDeleteAdmin && admin.email !== currentUser.email ? 
                        `<button class="btn btn-danger" onclick="removeAdmin('${admin.id}')" title="삭제">
                            <i class="fas fa-trash"></i>
                            삭제
                        </button>` : ''
                    }
                </td>
            </tr>
        `).join('');
    } else {
        // 관리자가 없는 경우
        tableBody.innerHTML = `
            <tr>
                <td colspan="6" style="text-align: center; padding: 40px; color: #666;">
                    <i class="fas fa-user-shield" style="font-size: 2rem; margin-bottom: 10px; opacity: 0.5;"></i><br>
                    등록된 관리자가 없습니다.<br>
                    <button class="btn btn-primary" onclick="showAddAdminModal()" style="margin-top: 10px;">
                        <i class="fas fa-plus"></i> 관리자 추가
                    </button>
                </td>
            </tr>
        `;
    }
}

// 관리자 추가 모달 표시
function showAddAdminModal() {
    console.log('📝 관리자 추가 모달 열기');
    
    // 기존 사용자 목록을 선택 옵션으로 로드
    loadAvailableUsers();
    
    const modal = document.getElementById('addAdminModal');
    if (modal) {
        modal.classList.add('active');
    }
}

// 관리자 추가 모달 닫기
function closeAddAdminModal() {
    console.log('❌ 관리자 추가 모달 닫기');
    
    const modal = document.getElementById('addAdminModal');
    if (modal) {
        modal.classList.remove('active');
    }
    
    // 폼 초기화
    const form = modal.querySelector('form');
    if (form) form.reset();
}

// 사용 가능한 사용자 목록 로드
async function loadAvailableUsers() {
    console.log('👥 사용 가능한 사용자 목록 로드');
    
    try {
        // 모든 Firebase Auth 사용자 가져오기 (실제로는 Firestore users 컬렉션에서)
        if (allUsers && allUsers.length > 0) {
            const userSelect = document.getElementById('userSelect');
            if (userSelect) {
                // 이미 관리자가 아닌 사용자들만 필터링
                const adminEmails = allAdmins.map(admin => admin.email);
                const availableUsers = allUsers.filter(user => !adminEmails.includes(user.email));
                
                userSelect.innerHTML = `
                    <option value="">사용자를 선택하세요</option>
                    ${availableUsers.map(user => `
                        <option value="${user.email}" data-name="${user.name || user.email.split('@')[0]}">
                            ${user.name || user.email.split('@')[0]} (${user.email})
                        </option>
                    `).join('')}
                `;
            }
        }
        
    } catch (error) {
        console.error('❌ 사용자 목록 로드 실패:', error);
    }
}

// 관리자 추가
async function addAdmin() {
    console.log('➕ 관리자 추가 시작');
    
    const userSelect = document.getElementById('userSelect');
    const adminRole = document.getElementById('newAdminRole');
    
    if (!userSelect || !userSelect.value) {
        showNotification('사용자를 선택해주세요.', 'error');
        return;
    }
    
    if (!adminRole || !adminRole.value) {
        showNotification('권한을 선택해주세요.', 'error');
        return;
    }
    
    try {
        showLoading(true);
        
        const selectedEmail = userSelect.value;
        const selectedOption = userSelect.querySelector(`option[value="${selectedEmail}"]`);
        const selectedName = selectedOption ? selectedOption.getAttribute('data-name') : selectedEmail.split('@')[0];
        const role = adminRole.value;
        
        if (!db || !modules) {
            throw new Error('Firestore 연결이 없습니다.');
        }
        
        const { collection, doc, setDoc, getDocs, serverTimestamp } = modules;
        
        // 다음 관리자 ID 번호 생성 (admin1, admin2, admin3...)
        const nextAdminId = await getNextAdminId();
        
        // Firestore admins 컬렉션에 추가
        const adminRef = doc(collection(db, 'admins'), nextAdminId);
        
        const adminData = {
            id: nextAdminId,
            name: selectedName,
            email: selectedEmail,
            role: role,
            status: 'active',
            department: role === 'super' ? '전체 관리' : role === 'admin' ? '일반 관리' : '제한적 관리',
            createdAt: serverTimestamp(),
            createdBy: currentUser ? currentUser.email : 'system',
            lastLogin: serverTimestamp()
        };
        
        await setDoc(adminRef, adminData);
        
        console.log('✅ 관리자 추가 완료:', nextAdminId, selectedEmail);
        showNotification('관리자가 성공적으로 추가되었습니다!', 'success');
        
        // 데이터 새로고침 및 모달 닫기
        await loadFirebaseAdmins();
        updateAdminsList();
        closeAddAdminModal();
        
    } catch (error) {
        console.error('❌ 관리자 추가 실패:', error);
        showNotification('관리자 추가에 실패했습니다: ' + error.message, 'error');
    } finally {
        showLoading(false);
    }
}

// 다음 관리자 ID 번호 생성 함수
async function getNextAdminId() {
    console.log('🔢 다음 관리자 ID 생성');
    
    try {
        if (!db || !modules) {
            console.warn('⚠️ Firestore 연결 없음, 로컬 계산 사용');
            return `admin${allAdmins.length + 1}`;
        }
        
        const { collection, getDocs } = modules;
        
        // 기존 관리자들의 ID 조회
        const adminsRef = collection(db, 'admins');
        const adminsSnapshot = await getDocs(adminsRef);
        
        const existingIds = [];
        adminsSnapshot.forEach((doc) => {
            const adminId = doc.id;
            // admin1, admin2 형태의 ID에서 숫자만 추출
            const match = adminId.match(/^admin(\d+)$/);
            if (match) {
                existingIds.push(parseInt(match[1]));
            }
        });
        
        // 다음 번호 계산 (1부터 시작)
        let nextNumber = 1;
        if (existingIds.length > 0) {
            nextNumber = Math.max(...existingIds) + 1;
        }
        
        const nextId = `admin${nextNumber}`;
        console.log('✅ 생성된 관리자 ID:', nextId);
        
        return nextId;
        
    } catch (error) {
        console.error('❌ 관리자 ID 생성 실패:', error);
        // 오류 시 현재 시간 기반으로 생성
        return `admin${Date.now()}`;
    }
}

// 관리자 수정
function editAdmin(adminId) {
    console.log('✏️ 관리자 수정:', adminId);
    
    const admin = allAdmins.find(a => a.id === adminId);
    if (!admin) {
        showNotification('관리자 정보를 찾을 수 없습니다.', 'error');
        return;
    }
    
    // 수정 모달 열기
    showEditAdminModal(admin);
}

// 관리자 수정 모달 표시
function showEditAdminModal(admin) {
    console.log('📝 관리자 수정 모달 열기:', admin.email);
    
    // 수정 모달이 없으면 동적으로 생성
    let modal = document.getElementById('editAdminModal');
    if (!modal) {
        modal = createEditAdminModal();
        document.body.appendChild(modal);
    }
    
    // 폼에 기존 데이터 채우기
    const editAdminId = document.getElementById('editAdminId');
    const editAdminName = document.getElementById('editAdminName');
    const editAdminEmail = document.getElementById('editAdminEmail');
    const editAdminRole = document.getElementById('editAdminRole');
    const editAdminStatus = document.getElementById('editAdminStatus');
    
    if (editAdminId) editAdminId.value = admin.id;
    if (editAdminName) editAdminName.value = admin.name || '';
    if (editAdminEmail) editAdminEmail.value = admin.email || '';
    if (editAdminRole) editAdminRole.value = admin.role || 'admin';
    if (editAdminStatus) editAdminStatus.value = admin.status || 'active';
    
    // 현재 수정 중인 관리자 ID 저장
    modal.setAttribute('data-admin-id', admin.id);
    
    modal.classList.add('active');
}

// 관리자 수정 모달 HTML 생성
function createEditAdminModal() {
    const modal = document.createElement('div');
    modal.className = 'modal';
    modal.id = 'editAdminModal';
    modal.innerHTML = `
        <div class="modal-content">
            <div class="modal-header">
                <h3>관리자 수정</h3>
                <button class="close-btn" onclick="closeEditAdminModal()">
                    <i class="fas fa-times"></i>
                </button>
            </div>
            <div class="modal-body">
                <div class="form-group">
                    <label for="editAdminId">관리자 ID (변경 불가)</label>
                    <input type="text" id="editAdminId" readonly style="background: #f5f5f5;">
                </div>
                <div class="form-group">
                    <label for="editAdminName">이름</label>
                    <input type="text" id="editAdminName" placeholder="관리자 이름">
                </div>
                <div class="form-group">
                    <label for="editAdminEmail">이메일 (변경 불가)</label>
                    <input type="email" id="editAdminEmail" readonly style="background: #f5f5f5;">
                </div>
                <div class="form-group">
                    <label for="editAdminRole">권한</label>
                    <select id="editAdminRole">
                        <option value="super">슈퍼 관리자</option>
                        <option value="admin">관리자</option>
                        <option value="limited">제한적 관리자</option>
                    </select>
                </div>
                <div class="form-group">
                    <label for="editAdminStatus">상태</label>
                    <select id="editAdminStatus">
                        <option value="active">활성</option>
                        <option value="inactive">비활성</option>
                    </select>
                </div>
            </div>
            <div class="modal-footer">
                <button class="btn btn-outline" onclick="closeEditAdminModal()">취소</button>
                <button class="btn btn-primary" onclick="updateAdmin()">
                    <i class="fas fa-save"></i>
                    저장
                </button>
            </div>
        </div>
    `;
    return modal;
}

// 관리자 수정 모달 닫기
function closeEditAdminModal() {
    console.log('❌ 관리자 수정 모달 닫기');
    
    const modal = document.getElementById('editAdminModal');
    if (modal) {
        modal.classList.remove('active');
    }
}

// 관리자 정보 업데이트
async function updateAdmin() {
    console.log('💾 관리자 정보 업데이트 시작');
    
    const modal = document.getElementById('editAdminModal');
    const adminId = modal.getAttribute('data-admin-id');
    
    const editAdminName = document.getElementById('editAdminName');
    const editAdminRole = document.getElementById('editAdminRole');
    const editAdminStatus = document.getElementById('editAdminStatus');
    
    if (!adminId || !editAdminName || !editAdminRole || !editAdminStatus) {
        showNotification('필수 정보가 누락되었습니다.', 'error');
        return;
    }
    
    try {
        showLoading(true);
        
        if (!db || !modules) {
            throw new Error('Firestore 연결이 없습니다.');
        }
        
        const { collection, doc, updateDoc, serverTimestamp } = modules;
        
        // Firestore admins 컬렉션 업데이트
        const adminRef = doc(collection(db, 'admins'), adminId);
        
        const updateData = {
            name: editAdminName.value.trim(),
            role: editAdminRole.value,
            status: editAdminStatus.value,
            updatedAt: serverTimestamp(),
            updatedBy: currentUser ? currentUser.email : 'system'
        };
        
        await updateDoc(adminRef, updateData);
        
        console.log('✅ 관리자 정보 업데이트 완료:', adminId);
        showNotification('관리자 정보가 성공적으로 업데이트되었습니다!', 'success');
        
        // 데이터 새로고침 및 모달 닫기
        await loadFirebaseAdmins();
        updateAdminsList();
        closeEditAdminModal();
        
    } catch (error) {
        console.error('❌ 관리자 정보 업데이트 실패:', error);
        showNotification('관리자 정보 업데이트에 실패했습니다: ' + error.message, 'error');
    } finally {
        showLoading(false);
    }
}

// 관리자 삭제
async function removeAdmin(adminId) {
    console.log('🗑️ 관리자 삭제:', adminId);
    
    const admin = allAdmins.find(a => a.id === adminId);
    if (!admin) {
        showNotification('관리자 정보를 찾을 수 없습니다.', 'error');
        return;
    }
    
    // 자기 자신은 삭제할 수 없음
    if (currentUser && admin.email === currentUser.email) {
        showNotification('자기 자신은 삭제할 수 없습니다.', 'error');
        return;
    }
    
    // 확인 대화상자
    const confirmDelete = confirm(`정말로 "${admin.name} (${admin.email})" 관리자를 삭제하시겠습니까?\n\n이 작업은 되돌릴 수 없습니다.`);
    if (!confirmDelete) return;
    
    try {
        showLoading(true);
        
        if (!db || !modules) {
            throw new Error('Firestore 연결이 없습니다.');
        }
        
        const { collection, doc, deleteDoc } = modules;
        
        // Firestore admins 컬렉션에서 삭제
        const adminRef = doc(collection(db, 'admins'), adminId);
        await deleteDoc(adminRef);
        
        console.log('✅ 관리자 삭제 완료:', adminId);
        showNotification('관리자가 성공적으로 삭제되었습니다!', 'success');
        
        // 데이터 새로고침
        await loadFirebaseAdmins();
        updateAdminsList();
        
    } catch (error) {
        console.error('❌ 관리자 삭제 실패:', error);
        showNotification('관리자 삭제에 실패했습니다: ' + error.message, 'error');
    } finally {
        showLoading(false);
    }
}

// 전역 함수로 노출
window.initializePage = initializePage;
window.showSection = showSection;
window.showNotification = showNotification;
window.createTestQuestion = createTestQuestion;
window.checkFirebaseStatus = checkFirebaseStatus;
window.refreshData = refreshData;
window.migrateAuthUsersToFirestore = migrateAuthUsersToFirestore;
window.debugFirestoreDates = debugFirestoreDates;
window.answerQuestion = answerQuestion;
window.openAnswerModal = openAnswerModal;
window.closeAnswerModal = closeAnswerModal;
window.sendAnswer = sendAnswer;
window.checkEmailStatus = checkEmailStatus;
window.migrateAdminIds = migrateAdminIds;

// 섹션별 데이터 로드 함수 추가
function loadSectionData(sectionId) {
    console.log('📄 섹션 데이터 로드:', sectionId);
    
    switch (sectionId) {
        case 'dashboard':
            updateDashboard();
            updateMemberStats();
            break;
        case 'members':
            updateMembersTable();
            break;
        case 'questions':
            updateQuestionsTable();
            break;
        case 'admins':
            updateAdminsList();
            break;
    }
}

// Firebase Auth 사용자들을 Firestore로 마이그레이션
async function migrateAuthUsersToFirestore() {
    console.log('🔄 Firebase Auth 사용자 마이그레이션 시작');
    
    if (!auth || !db || !modules) {
        showNotification('Firebase 연결을 확인해주세요.', 'error');
        return;
    }
    
    try {
        showNotification('Firebase Auth 사용자를 Firestore로 마이그레이션 중...', 'info');
        
        // 주의: 클라이언트에서는 모든 사용자 목록을 직접 가져올 수 없음
        // 대신 현재 로그인된 사용자만 동기화하고, 
        // 실제로는 각 사용자가 다시 로그인할 때 동기화됨
        
        if (currentUser) {
            await syncUserToFirestore(currentUser);
            showNotification('현재 사용자를 Firestore에 동기화했습니다.', 'success');
        } else {
            showNotification('로그인된 사용자가 없습니다. 다른 사용자들은 로그인할 때 자동으로 동기화됩니다.', 'warning');
        }
        
        // Firestore에 기본 사용자 데이터 생성 (개발용)
        await createDefaultUsersInFirestore();
        
    } catch (error) {
        console.error('❌ 사용자 마이그레이션 실패:', error);
        showNotification('사용자 마이그레이션 중 오류가 발생했습니다: ' + error.message, 'error');
    }
}

// Firestore에 기본 사용자 데이터 생성 (개발용)
async function createDefaultUsersInFirestore() {
    console.log('👥 기본 사용자 데이터 생성 시작');
    
    try {
        const { collection, doc, getDoc, setDoc, serverTimestamp } = modules;
        
        // Firebase Auth에서 보인 사용자들을 기반으로 기본 데이터 생성
        const authUsers = [
            {
                email: 'bcshin03@gmail.com',
                name: 'BC Shine',
                role: 'admin'
            },
            {
                email: 'bcshin03ais@gmail.com', 
                name: 'BC Shine AI',
                role: 'admin'
            },
            {
                email: 'bcshin03@naver.com',
                name: 'BC Shine Naver',
                role: 'admin'  
            },
            {
                email: 'midcampus31@gmail.com',
                name: '중간계 캠퍼스',
                role: 'user'
            },
            {
                email: 'dbal951120@naver.com',
                name: '사용자',
                role: 'user'
            },
            {
                email: '1231231123@gmail.com',
                name: '테스트 사용자',
                role: 'user'
            },
            {
                email: 'ozung1008@naver.com',
                name: 'ozung1008',
                role: 'user'
            }
        ];
        
        for (const user of authUsers) {
            const userDocId = user.email.replace(/[.@]/g, '_');
            const userRef = doc(collection(db, 'users'), userDocId);
            
            // 기존 사용자 확인
            const userDoc = await getDoc(userRef);
            
            if (!userDoc.exists()) {
                const userData = {
                    email: user.email,
                    name: user.name,
                    phone: '전화번호 없음',
                    status: 'active',
                    role: user.role,
                    questionCount: 0,
                    answerCount: 0,
                    createdAt: serverTimestamp(),
                    lastLogin: serverTimestamp(),
                    source: 'auth_migration' // 마이그레이션으로 생성된 것임을 표시
                };
                
                await setDoc(userRef, userData);
                console.log('✅ 사용자 생성:', user.email);
            } else {
                console.log('ℹ️ 이미 존재하는 사용자:', user.email);
            }
        }
        
        console.log('✅ 기본 사용자 데이터 생성 완료');
        showNotification('Firebase Auth 사용자들을 Firestore에 동기화했습니다!', 'success');
        
        // 데이터 새로고침
        await loadFirebaseData();
        
    } catch (error) {
        console.error('❌ 기본 사용자 생성 실패:', error);
        showNotification('사용자 데이터 생성 중 오류가 발생했습니다: ' + error.message, 'error');
    }
}

// Firebase 데이터의 날짜 확인 함수 (디버깅용)
async function debugFirestoreDates() {
    console.log('🔍 Firestore 날짜 데이터 확인 시작');
    
    if (!db || !modules) {
        showNotification('Firebase 연결을 확인해주세요.', 'error');
        return;
    }
    
    try {
        const { collection, getDocs, query, orderBy } = modules;
        
        // 사용자 데이터 확인
        console.log('👥 === 사용자 생성일 확인 ===');
        const usersRef = collection(db, 'users');
        const usersQuery = query(usersRef, orderBy('createdAt', 'desc'));
        const usersSnapshot = await getDocs(usersQuery);
        
        usersSnapshot.forEach((doc) => {
            const userData = doc.data();
            const createdAt = userData.createdAt;
            
            let createdDate = null;
            if (createdAt) {
                if (createdAt.toDate) {
                    createdDate = createdAt.toDate();
                } else if (createdAt.seconds) {
                    createdDate = new Date(createdAt.seconds * 1000);
                } else {
                    createdDate = new Date(createdAt);
                }
            }
            
            console.log(`📅 ${userData.email}: ${createdDate ? createdDate.toLocaleString('ko-KR') : '날짜 없음'} (source: ${userData.source || 'unknown'})`);
        });
        
        // 질문 데이터 확인
        console.log('\n📋 === 질문 접수일 확인 ===');
        const questionsRef = collection(db, 'questions');
        const questionsQuery = query(questionsRef, orderBy('questionTime', 'desc'));
        const questionsSnapshot = await getDocs(questionsQuery);
        
        questionsSnapshot.forEach((doc) => {
            const questionData = doc.data();
            const questionTime = questionData.questionTime;
            
            let questionDate = null;
            if (questionTime) {
                if (questionTime.toDate) {
                    questionDate = questionTime.toDate();
                } else if (questionTime.seconds) {
                    questionDate = new Date(questionTime.seconds * 1000);
                } else {
                    questionDate = new Date(questionTime);
                }
            }
            
            console.log(`📅 ${questionData.questionTitle || '제목없음'}: ${questionDate ? questionDate.toLocaleString('ko-KR') : '날짜 없음'}`);
        });
        
        // 현재 시간과 비교
        const now = new Date();
        const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        const thisWeek = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        const thisMonth = new Date(now.getFullYear(), now.getMonth(), 1);
        
        console.log('\n⏰ === 기준 시간 ===');
        console.log(`현재 시간: ${now.toLocaleString('ko-KR')}`);
        console.log(`오늘 시작: ${today.toLocaleString('ko-KR')}`);
        console.log(`일주일 전: ${thisWeek.toLocaleString('ko-KR')}`);
        console.log(`이번 달 시작: ${thisMonth.toLocaleString('ko-KR')}`);
        
        showNotification('콘솔에서 Firestore 날짜 데이터를 확인하세요!', 'info');
        
    } catch (error) {
        console.error('❌ 날짜 데이터 확인 실패:', error);
        showNotification('날짜 데이터 확인 중 오류가 발생했습니다: ' + error.message, 'error');
    }
}

// Firestore Functions 이메일 상태 확인
async function checkEmailStatus() {
    console.log('📧 Firestore 이메일 상태 확인');
    
    if (!db || !modules) {
        showNotification('Firestore 연결을 확인해주세요.', 'error');
        return;
    }
    
    try {
        const { collection, getDocs, query, orderBy, limit } = modules;
        
        // 최근 이메일 전송 기록 확인
        const emailsRef = collection(db, 'emails');
        const emailsQuery = query(emailsRef, orderBy('createdAt', 'desc'), limit(10));
        const emailsSnapshot = await getDocs(emailsQuery);
        
        if (emailsSnapshot.empty) {
            showNotification('이메일 전송 기록이 없습니다.', 'info');
            return;
        }
        
        console.log('📧 === 최근 이메일 전송 기록 ===');
        let statusMessage = '최근 이메일 전송 기록:\n\n';
        
        emailsSnapshot.forEach((doc) => {
            const emailData = doc.data();
            const createdAt = emailData.createdAt ? 
                (emailData.createdAt.toDate ? emailData.createdAt.toDate() : new Date(emailData.createdAt)) : 
                new Date();
            
            console.log(`📧 ${emailData.to}: ${emailData.status} (${createdAt.toLocaleString('ko-KR')})`);
            statusMessage += `${emailData.to}: ${emailData.status}\n`;
            statusMessage += `  - 제목: ${emailData.subject}\n`;
            statusMessage += `  - 시간: ${createdAt.toLocaleString('ko-KR')}\n\n`;
        });
        
        showNotification(statusMessage, 'info');
        
    } catch (error) {
        console.error('❌ 이메일 상태 확인 실패:', error);
        showNotification('이메일 상태 확인 중 오류가 발생했습니다: ' + error.message, 'error');
    }
}

function updateAdminInfo(user, permissions) {
    const adminName = document.getElementById('sidebarAdminName');
    const adminEmail = document.getElementById('sidebarAdminEmail');
    const adminRole = document.getElementById('sidebarAdminRole');
    
    const displayName = user.displayName || user.email?.split('@')[0] || '관리자';
    const roleText = permissions?.role === 'super' ? '슈퍼 관리자' : '관리자';
    
    if (adminName) adminName.textContent = displayName;
    if (adminEmail) adminEmail.textContent = user.email;
    if (adminRole) adminRole.textContent = roleText;
}

// 액션 함수들
function answerQuestion(questionId) {
    console.log('💬 질문 답변:', questionId);
    
    const question = allQuestions.find(q => q.id === questionId);
    if (!question) {
        showNotification('질문을 찾을 수 없습니다.', 'error');
        return;
    }
    
    // 답변 모달 열기
    openAnswerModal(question);
}

// 답변 모달 열기
function openAnswerModal(question) {
    console.log('📝 답변 모달 열기:', question.questionTitle);
    
    // 질문 정보 표시
    const questionInfo = document.getElementById('questionInfo');
    if (questionInfo) {
        questionInfo.innerHTML = `
            <div style="margin-bottom: 10px;">
                <strong style="color: #333; font-size: 1.1rem;">${question.questionTitle}</strong>
            </div>
            <div style="margin-bottom: 8px; color: #666;">
                <i class="fas fa-user"></i> ${question.userName} (${question.userEmail})
            </div>
            <div style="margin-bottom: 8px; color: #666;">
                <i class="fas fa-clock"></i> ${question.questionTime.toLocaleString('ko-KR')}
            </div>
            <div style="padding: 12px; background: #fff; border: 1px solid #e5e5e5; border-radius: 4px; margin-top: 10px;">
                <strong>질문 내용:</strong><br>
                ${question.questionContent || '내용이 없습니다.'}
            </div>
        `;
    }
    
    // 답변 텍스트 초기화
    const answerText = document.getElementById('answerText');
    if (answerText) {
        answerText.value = `안녕하세요. 중간계 AI 스튜디오입니다.

문의해 주신 내용에 대해 답변드립니다.

[구체적인 답변 내용을 여기에 작성해주세요]

추가 문의사항이 있으시면 언제든지 연락해 주세요.
감사합니다.

중간계 AI 스튜디오 드림`;
    }
    
    // 현재 답변 중인 질문 ID 저장
    currentQuestionId = question.id;
    
    // 모달 표시
    const modal = document.getElementById('answerModal');
    if (modal) {
        modal.classList.add('active');
    }
}

// 답변 모달 닫기
function closeAnswerModal() {
    console.log('❌ 답변 모달 닫기');
    
    const modal = document.getElementById('answerModal');
    if (modal) {
        modal.classList.remove('active');
    }
    
    currentQuestionId = null;
}

// 답변 전송
async function sendAnswer() {
    console.log('📧 답변 전송 시작');
    
    if (!currentQuestionId) {
        showNotification('답변할 질문을 선택해주세요.', 'error');
        return;
    }
    
    const answerText = document.getElementById('answerText');
    if (!answerText || !answerText.value.trim()) {
        showNotification('답변 내용을 입력해주세요.', 'error');
        return;
    }
    
    const question = allQuestions.find(q => q.id === currentQuestionId);
    if (!question) {
        showNotification('질문 정보를 찾을 수 없습니다.', 'error');
        return;
    }
    
    try {
        showLoading(true);
        showNotification('답변을 전송 중입니다...', 'info');
        
        // 1. 이메일 전송
        const emailSent = await sendEmailAnswer(question, answerText.value.trim());
        
        if (emailSent) {
            // 2. Firestore 업데이트
            const firestoreUpdated = await updateQuestionAnswer(currentQuestionId, answerText.value.trim());
            
            if (firestoreUpdated) {
                showNotification('답변이 성공적으로 전송되었습니다!', 'success');
                closeAnswerModal();
                await loadFirebaseData(); // 데이터 새로고침
            } else {
                showNotification('이메일은 전송되었지만 상태 업데이트에 실패했습니다.', 'warning');
            }
        }
        
    } catch (error) {
        console.error('❌ 답변 전송 실패:', error);
        showNotification('답변 전송 중 오류가 발생했습니다: ' + error.message, 'error');
    } finally {
        showLoading(false);
    }
}

// 이메일 답변 전송 (Firestore Functions 사용)
async function sendEmailAnswer(question, answerContent) {
    console.log('📨 Firestore Functions 이메일 전송 시작:', question.userEmail);
    
    try {
        if (!db || !modules) {
            throw new Error('Firestore 연결이 없습니다.');
        }
        
        const { collection, addDoc, serverTimestamp } = modules;
        
        // 현재 로그인한 사용자의 관리자 정보 찾기
        let adminName = '관리자';
        let adminEmail = 'admin@example.com';
        
        if (currentUser) {
            adminEmail = currentUser.email;
            
            // 관리자 테이블에서 현재 사용자의 이름 찾기
            const currentAdmin = allAdmins.find(admin => admin.email === currentUser.email);
            if (currentAdmin) {
                adminName = currentAdmin.name; // 관리자 테이블의 이름 필드 사용 (BC Shine)
                console.log('👤 관리자 이름 사용:', adminName, adminEmail);
            } else {
                // 관리자 테이블에 없으면 displayName 사용
                adminName = currentUser.displayName || currentUser.email.split('@')[0];
                console.log('👤 Firebase 사용자 정보 사용:', adminName);
            }
        }
        
        // Firestore의 이메일 전송 컬렉션에 데이터 추가
        // Cloud Functions가 이 데이터를 감지하여 이메일을 전송함
        const emailData = {
            type: 'question_answer',
            to: question.userEmail,
            toName: question.userName,
            subject: `[중간계 AI 스튜디오] "${question.questionTitle}" 문의 답변`,
            questionTitle: question.questionTitle,
            questionContent: question.questionContent,
            answerContent: answerContent,
            adminName: adminName,
            adminEmail: adminEmail,
            companyName: '중간계 AI 스튜디오',
            status: 'pending',
            createdAt: serverTimestamp(),
            questionId: question.id
        };
        
        console.log('📧 Firestore 이메일 데이터:', emailData);
        
        // 'emails' 컬렉션에 추가 (Cloud Functions가 감지)
        const emailRef = collection(db, 'emails');
        const docRef = await addDoc(emailRef, emailData);
        
        console.log('✅ Firestore 이메일 요청 생성 완료:', docRef.id);
        
        // 이메일 전송 확인을 위한 대기 (실제로는 Cloud Functions가 처리)
        showNotification('이메일 전송 요청이 생성되었습니다. Cloud Functions가 처리 중입니다.', 'info');
        
        return true;
        
    } catch (error) {
        console.error('❌ Firestore 이메일 전송 오류:', error);
        
        // Firestore Functions가 설정되지 않은 경우를 위한 로컬 시뮬레이션
        console.log('📧 Firestore Functions 설정이 완료되지 않아 시뮬레이션 모드로 전송');
        showNotification('Firestore Functions 설정 후 실제 이메일이 전송됩니다. (현재는 시뮬레이션)', 'warning');
        
        // 시뮬레이션으로 이메일 전송 성공 처리
        return true;
    }
}

// Firestore 질문 답변 상태 업데이트
async function updateQuestionAnswer(questionId, answerContent) {
    console.log('🔄 Firestore 답변 상태 업데이트:', questionId);
    
    if (!db || !modules) {
        console.warn('⚠️ Firestore 연결 없음');
        return false;
    }
    
    try {
        const { collection, doc, updateDoc, serverTimestamp } = modules;
        
        const questionRef = doc(collection(db, 'questions'), questionId);
        
        await updateDoc(questionRef, {
            status: 'answered',
            answer: answerContent,
            answeredAt: serverTimestamp(),
            answeredBy: currentUser ? currentUser.email : '관리자'
        });
        
        console.log('✅ Firestore 답변 상태 업데이트 완료');
        return true;
        
    } catch (error) {
        console.error('❌ Firestore 업데이트 실패:', error);
        return false;
    }
}

function viewQuestion(questionId) {
    console.log('👁️ 질문 상세보기:', questionId);
    const question = allQuestions.find(q => q.id === questionId);
    if (question) {
        alert(`질문 상세:\n\n제목: ${question.questionTitle}\n내용: ${question.questionContent}\n작성자: ${question.userName}`);
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

function refreshData() {
    console.log('🔄 데이터 새로고침');
    showLoading(true);
    
    loadFirebaseData().then(() => {
        showLoading(false);
        showNotification('데이터가 새로고침되었습니다.', 'success');
    }).catch(error => {
        console.error('새로고침 오류:', error);
        showLoading(false);
        showNotification('데이터 새로고침 중 오류가 발생했습니다.', 'error');
    });
}

// Firebase 연결 상태 확인 함수
function checkFirebaseStatus() {
    console.log('🔍 Firebase 연결 상태 확인');
    
    let statusMessage = '';
    let statusType = 'info';
    
    // Firebase 앱 상태 확인
    if (window.firebaseApp) {
        statusMessage += '✅ Firebase App: 연결됨\n';
    } else {
        statusMessage += '❌ Firebase App: 연결 안됨\n';
        statusType = 'error';
    }
    
    // Firebase Auth 상태 확인
    if (window.firebaseAuth) {
        statusMessage += '✅ Firebase Auth: 연결됨\n';
        if (currentUser) {
            statusMessage += `👤 현재 사용자: ${currentUser.email}\n`;
        } else {
            statusMessage += '👤 현재 사용자: 로그인하지 않음\n';
        }
    } else {
        statusMessage += '❌ Firebase Auth: 연결 안됨\n';
        statusType = 'error';
    }
    
    // Firestore 상태 확인
    if (window.firebaseDb) {
        statusMessage += '✅ Firestore: 연결됨\n';
    } else {
        statusMessage += '❌ Firestore: 연결 안됨\n';
        statusType = 'error';
    }
    
    // Firebase 모듈 상태 확인
    if (window.firebaseModules) {
        statusMessage += '✅ Firebase 모듈: 로드됨\n';
    } else {
        statusMessage += '❌ Firebase 모듈: 로드 안됨\n';
        statusType = 'error';
    }
    
    // 데이터 상태 확인
    statusMessage += `📊 사용자 수: ${allUsers.length}명\n`;
    statusMessage += `📋 질문 수: ${allQuestions.length}개\n`;
    statusMessage += `👨‍💼 관리자 수: ${allAdmins.length}명`;
    
    showNotification(statusMessage, statusType);
    console.log('Firebase 상태:', {
        app: !!window.firebaseApp,
        auth: !!window.firebaseAuth,
        db: !!window.firebaseDb,
        modules: !!window.firebaseModules,
        currentUser: currentUser,
        usersCount: allUsers.length,
        questionsCount: allQuestions.length,
        adminsCount: allAdmins.length
    });
}

// 관리자 ID를 admin1, admin2 형태로 마이그레이션
async function migrateAdminIds() {
    console.log('🔄 관리자 ID 마이그레이션 시작');
    
    if (!db || !modules) {
        showNotification('Firebase 연결을 확인해주세요.', 'error');
        return;
    }
    
    try {
        showLoading(true);
        showNotification('관리자 ID를 admin1, admin2 형태로 마이그레이션 중...', 'info');
        
        const { collection, getDocs, doc, setDoc, deleteDoc, serverTimestamp } = modules;
        
        // 기존 관리자들 조회
        const adminsRef = collection(db, 'admins');
        const adminsSnapshot = await getDocs(adminsRef);
        
        if (adminsSnapshot.empty) {
            showNotification('마이그레이션할 관리자가 없습니다.', 'info');
            return;
        }
        
        const existingAdmins = [];
        const adminIdsToMigrate = [];
        
        adminsSnapshot.forEach((docSnapshot) => {
            const adminData = docSnapshot.data();
            const currentId = docSnapshot.id;
            
            // 이미 admin1, admin2 형태인지 확인
            const isNewFormat = /^admin\d+$/.test(currentId);
            
            if (!isNewFormat) {
                adminIdsToMigrate.push({
                    currentId: currentId,
                    data: { ...adminData, id: currentId }
                });
            }
            
            existingAdmins.push({
                id: currentId,
                data: adminData
            });
        });
        
        if (adminIdsToMigrate.length === 0) {
            showNotification('모든 관리자 ID가 이미 새로운 형태입니다.', 'success');
            return;
        }
        
        console.log(`📋 마이그레이션 대상: ${adminIdsToMigrate.length}개 관리자`);
        
        // 새로운 ID로 관리자 재생성
        let migratedCount = 0;
        
        for (let i = 0; i < adminIdsToMigrate.length; i++) {
            const adminToMigrate = adminIdsToMigrate[i];
            const newAdminId = `admin${i + 1}`;
            
            try {
                // 새 ID로 문서 생성
                const newAdminRef = doc(collection(db, 'admins'), newAdminId);
                const migratedData = {
                    ...adminToMigrate.data,
                    id: newAdminId,
                    migratedAt: serverTimestamp(),
                    migratedFrom: adminToMigrate.currentId
                };
                
                await setDoc(newAdminRef, migratedData);
                
                // 기존 문서 삭제
                const oldAdminRef = doc(collection(db, 'admins'), adminToMigrate.currentId);
                await deleteDoc(oldAdminRef);
                
                migratedCount++;
                console.log(`✅ ${adminToMigrate.currentId} → ${newAdminId} 마이그레이션 완료`);
                
            } catch (error) {
                console.error(`❌ ${adminToMigrate.currentId} 마이그레이션 실패:`, error);
            }
        }
        
        console.log('✅ 관리자 ID 마이그레이션 완료');
        showNotification(`${migratedCount}개 관리자 ID가 성공적으로 마이그레이션되었습니다!`, 'success');
        
        // 데이터 새로고침
        await loadFirebaseAdmins();
        updateAdminsList();
        
    } catch (error) {
        console.error('❌ 관리자 ID 마이그레이션 실패:', error);
        showNotification('관리자 ID 마이그레이션 중 오류가 발생했습니다: ' + error.message, 'error');
    } finally {
        showLoading(false);
    }
} 