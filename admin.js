// 중간계 AI 스튜디오 - 관리자 JavaScript
import { initializeApp } from "https://www.gstatic.com/firebasejs/11.8.1/firebase-app.js";
import { getAnalytics } from "https://www.gstatic.com/firebasejs/11.8.1/firebase-analytics.js";
import { getFirestore, collection, doc, addDoc, setDoc, updateDoc, deleteDoc, onSnapshot, getDocs, getDoc, query, orderBy, where, serverTimestamp, Timestamp } from "https://www.gstatic.com/firebasejs/11.8.1/firebase-firestore.js";
import { getAuth, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/11.8.1/firebase-auth.js";
import { firebaseConfig } from "./firebase-config.js";

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);
const db = getFirestore(app);
const auth = getAuth(app);

// 전역 변수
let currentUser = null;
let allQuestions = [];
let allUsers = [];
let templates = [];
let currentQuestionId = null;

// DOM 로드 완료 이벤트
document.addEventListener('DOMContentLoaded', function() {
    initializeAdmin();
});

// 관리자 초기화
function initializeAdmin() {
    // 인증 상태 확인
    onAuthStateChanged(auth, (user) => {
        if (user) {
            currentUser = user;
            console.log('✅ 관리자 로그인:', user.email);
            updateAdminInfo(user);
            loadAllData();
        } else {
            console.log('❌ 관리자 로그아웃');
            redirectToLogin();
        }
    });

    // 이벤트 리스너 설정
    setupEventListeners();
    
    // 기본 템플릿 로드
    loadDefaultTemplates();
}

// 관리자 정보 업데이트
function updateAdminInfo(user) {
    const adminName = document.getElementById('adminName');
    const adminEmail = document.getElementById('adminEmail');
    
    if (adminName) adminName.textContent = user.displayName || '관리자';
    if (adminEmail) adminEmail.textContent = user.email;
}

// 모든 데이터 로드
function loadAllData() {
    showLoading(true);
    
    Promise.all([
        loadQuestions(),
        loadUsers(),
        loadTemplates()
    ]).then(() => {
        updateDashboard();
        showLoading(false);
    }).catch(error => {
        console.error('데이터 로드 오류:', error);
        showLoading(false);
    });
}

// 질문 데이터 로드
async function loadQuestions() {
    try {
        const questionsRef = collection(db, 'questions');
        const questionsQuery = query(questionsRef, orderBy('questionTime', 'desc'));
        
        onSnapshot(questionsQuery, (snapshot) => {
            allQuestions = [];
            snapshot.forEach((doc) => {
                allQuestions.push({ id: doc.id, ...doc.data() });
            });
            
            console.log('📋 질문 데이터 로드됨:', allQuestions.length);
            updateQuestionsList();
            updateDashboard();
        });
        
    } catch (error) {
        console.error('질문 로드 오류:', error);
    }
}

// 사용자 데이터 로드
async function loadUsers() {
    try {
        const usersRef = collection(db, 'users');
        const snapshot = await getDocs(usersRef);
        
        allUsers = [];
        snapshot.forEach((doc) => {
            allUsers.push({ id: doc.id, ...doc.data() });
        });
        
        console.log('👥 사용자 데이터 로드됨:', allUsers.length);
        updateUsersList();
        
    } catch (error) {
        console.error('사용자 로드 오류:', error);
    }
}

// 템플릿 데이터 로드
async function loadTemplates() {
    try {
        const templatesRef = collection(db, 'templates');
        const snapshot = await getDocs(templatesRef);
        
        templates = [];
        snapshot.forEach((doc) => {
            templates.push({ id: doc.id, ...doc.data() });
        });
        
        console.log('📄 템플릿 데이터 로드됨:', templates.length);
        updateTemplatesList();
        
    } catch (error) {
        console.error('템플릿 로드 오류:', error);
    }
}

// 대시보드 업데이트
function updateDashboard() {
    const totalQuestions = allQuestions.length;
    const pendingQuestions = allQuestions.filter(q => q.status === 'pending').length;
    const answeredQuestions = allQuestions.filter(q => q.status === 'answered').length;
    const totalUsers = allUsers.length;
    
    // 통계 업데이트
    updateElement('totalQuestions', totalQuestions);
    updateElement('pendingQuestions', pendingQuestions);
    updateElement('answeredQuestions', answeredQuestions);
    updateElement('totalUsers', totalUsers);
    updateElement('pendingCount', pendingQuestions);
    updateElement('notificationCount', pendingQuestions);
    
    // 최근 질문 업데이트
    updateRecentQuestions();
}

// 최근 질문 업데이트
function updateRecentQuestions() {
    const recentQuestions = allQuestions.slice(0, 5);
    const container = document.getElementById('recentQuestions');
    
    if (!container) return;
    
    container.innerHTML = '';
    
    if (recentQuestions.length === 0) {
        container.innerHTML = '<p class="text-center text-muted">최근 질문이 없습니다.</p>';
        return;
    }
    
    recentQuestions.forEach(question => {
        const questionElement = createQuestionElement(question, true);
        container.appendChild(questionElement);
    });
}

// 질문 요소 생성
function createQuestionElement(question, isRecent = false) {
    const div = document.createElement('div');
    div.className = 'question-item fadeIn';
    
    const questionTime = question.questionTime;
    const questionDate = questionTime.toDate ? questionTime.toDate() : new Date(questionTime);
    const timeString = questionDate.toLocaleString('ko-KR');
    
    const statusClass = question.status === 'answered' ? 'status-answered' : 'status-pending';
    const statusText = question.status === 'answered' ? '답변완료' : '답변대기';
    
    div.innerHTML = `
        <div class="question-header">
            <div>
                <div class="question-title">${question.questionTitle || '제목 없음'}</div>
                <div class="question-meta">
                    👤 ${question.userName} | 📧 ${question.userEmail} | 🕒 ${timeString}
                </div>
            </div>
            <div class="question-status ${statusClass}">${statusText}</div>
        </div>
        ${!isRecent ? `
            <div class="question-content" style="margin: 10px 0; color: #666; line-height: 1.6;">
                ${question.questionContent || '내용 없음'}
            </div>
            <div style="display: flex; gap: 10px; margin-top: 15px;">
                ${question.status === 'pending' ? 
                    `<button class="btn-success btn-sm" onclick="openAnswerModal('${question.id}')">
                        <i class="fas fa-reply"></i> 답변하기
                    </button>` : 
                    `<button class="btn-secondary btn-sm" onclick="viewAnswer('${question.id}')">
                        <i class="fas fa-eye"></i> 답변보기
                    </button>`
                }
                <button class="btn-danger btn-sm" onclick="deleteQuestion('${question.id}')">
                    <i class="fas fa-trash"></i> 삭제
                </button>
            </div>
        ` : ''}
    `;
    
    return div;
}

// 질문 목록 업데이트
function updateQuestionsList() {
    const tbody = document.getElementById('questionsTableBody');
    if (!tbody) return;
    
    tbody.innerHTML = '';
    
    if (allQuestions.length === 0) {
        tbody.innerHTML = '<tr><td colspan="5" class="text-center">질문이 없습니다.</td></tr>';
        return;
    }
    
    allQuestions.forEach(question => {
        const row = document.createElement('tr');
        
        const questionTime = question.questionTime;
        const questionDate = questionTime.toDate ? questionTime.toDate() : new Date(questionTime);
        const timeString = questionDate.toLocaleDateString('ko-KR');
        
        const statusClass = question.status === 'answered' ? 'status-answered' : 'status-pending';
        const statusText = question.status === 'answered' ? '답변완료' : '답변대기';
        
        row.innerHTML = `
            <td><span class="question-status ${statusClass}">${statusText}</span></td>
            <td>
                <div style="font-weight: 600; margin-bottom: 5px;">${question.questionTitle || '제목 없음'}</div>
                <div style="font-size: 0.85rem; color: #666; max-width: 300px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">
                    ${question.questionContent || '내용 없음'}
                </div>
            </td>
            <td>
                <div style="font-weight: 500;">${question.userName}</div>
                <div style="font-size: 0.85rem; color: #666;">${question.userEmail}</div>
            </td>
            <td>${timeString}</td>
            <td>
                <div style="display: flex; gap: 5px;">
                    ${question.status === 'pending' ? 
                        `<button class="btn-success btn-sm" onclick="openAnswerModal('${question.id}')">
                            답변
                        </button>` : 
                        `<button class="btn-secondary btn-sm" onclick="viewAnswer('${question.id}')">
                            보기
                        </button>`
                    }
                    <button class="btn-danger btn-sm" onclick="deleteQuestion('${question.id}')">
                        삭제
                    </button>
                </div>
            </td>
        `;
        
        tbody.appendChild(row);
    });
}

// 사용자 목록 업데이트
function updateUsersList() {
    const container = document.getElementById('usersGrid');
    if (!container) return;
    
    container.innerHTML = '';
    
    if (allUsers.length === 0) {
        container.innerHTML = '<p class="text-center">등록된 사용자가 없습니다.</p>';
        return;
    }
    
    allUsers.forEach(user => {
        const userCard = document.createElement('div');
        userCard.className = 'user-card fadeIn';
        
        const userQuestions = allQuestions.filter(q => q.userId === user.id);
        const answeredQuestions = userQuestions.filter(q => q.status === 'answered');
        
        const createdDate = user.createdAt && user.createdAt.toDate ? 
            user.createdAt.toDate().toLocaleDateString('ko-KR') : '정보 없음';
        
        userCard.innerHTML = `
            <div class="user-avatar">
                ${user.name ? user.name.charAt(0).toUpperCase() : '?'}
            </div>
            <div class="user-name">${user.name || '익명'}</div>
            <div class="user-email">${user.email}</div>
            <div style="font-size: 0.85rem; color: #666; margin-bottom: 10px;">
                📞 ${user.phone || '정보 없음'}
            </div>
            <div style="font-size: 0.85rem; color: #666;">
                📅 가입일: ${createdDate}
            </div>
            <div class="user-stats">
                <div class="user-stat">
                    <strong>${userQuestions.length}</strong>
                    <span>총 질문</span>
                </div>
                <div class="user-stat">
                    <strong>${answeredQuestions.length}</strong>
                    <span>답변받음</span>
                </div>
            </div>
        `;
        
        container.appendChild(userCard);
    });
}

// 템플릿 목록 업데이트
function updateTemplatesList() {
    const container = document.getElementById('templatesGrid');
    if (!container) return;
    
    container.innerHTML = '';
    
    templates.forEach(template => {
        const templateCard = document.createElement('div');
        templateCard.className = 'template-card fadeIn';
        
        templateCard.innerHTML = `
            <div class="template-title">${template.title}</div>
            <div class="template-content">${template.content}</div>
            <div class="template-actions">
                <button class="btn-secondary btn-sm" onclick="editTemplate('${template.id}')">
                    <i class="fas fa-edit"></i> 수정
                </button>
                <button class="btn-danger btn-sm" onclick="deleteTemplate('${template.id}')">
                    <i class="fas fa-trash"></i> 삭제
                </button>
            </div>
        `;
        
        container.appendChild(templateCard);
    });
}

// 답변 모달 열기
function openAnswerModal(questionId) {
    const question = allQuestions.find(q => q.id === questionId);
    if (!question) return;
    
    currentQuestionId = questionId;
    
    const questionInfo = document.getElementById('questionInfo');
    const modal = document.getElementById('answerModal');
    
    const questionTime = question.questionTime;
    const questionDate = questionTime.toDate ? questionTime.toDate() : new Date(questionTime);
    const timeString = questionDate.toLocaleString('ko-KR');
    
    questionInfo.innerHTML = `
        <h4>${question.questionTitle}</h4>
        <p><strong>작성자:</strong> ${question.userName} (${question.userEmail})</p>
        <p><strong>전화번호:</strong> ${question.userPhone}</p>
        <p><strong>작성일:</strong> ${timeString}</p>
        <div style="margin-top: 15px; padding: 15px; background: white; border-radius: 6px; border: 1px solid #ddd;">
            <strong>질문 내용:</strong><br>
            ${question.questionContent}
        </div>
    `;
    
    // 템플릿 버튼 추가
    updateTemplateButtons();
    
    modal.classList.add('show');
}

// 템플릿 버튼 업데이트
function updateTemplateButtons() {
    const container = document.getElementById('templateButtons');
    if (!container) return;
    
    container.innerHTML = '';
    
    templates.forEach(template => {
        const button = document.createElement('button');
        button.className = 'template-btn';
        button.textContent = template.title;
        button.onclick = () => {
            document.getElementById('answerText').value = template.content;
        };
        container.appendChild(button);
    });
}

// 답변 모달 닫기
function closeAnswerModal() {
    const modal = document.getElementById('answerModal');
    modal.classList.remove('show');
    document.getElementById('answerText').value = '';
    currentQuestionId = null;
}

// 답변 제출
async function submitAnswer() {
    if (!currentQuestionId) return;
    
    const answerText = document.getElementById('answerText').value.trim();
    if (!answerText) {
        alert('답변 내용을 입력해주세요.');
        return;
    }
    
    showLoading(true);
    
    try {
        const questionRef = doc(db, 'questions', currentQuestionId);
        const questionSnapshot = await getDoc(questionRef);
        const existingData = questionSnapshot.data();
        
        if (existingData) {
            const updatedData = {
                ...existingData,
                answer: answerText,
                status: 'answered',
                answeredAt: Timestamp.now(),
                answeredBy: currentUser.displayName || currentUser.email
            };
            
            await setDoc(questionRef, updatedData);
            
            console.log('✅ 답변이 저장되었습니다.');
            closeAnswerModal();
            showNotification('답변이 성공적으로 전송되었습니다.', 'success');
        }
        
    } catch (error) {
        console.error('답변 저장 오류:', error);
        showNotification('답변 저장 중 오류가 발생했습니다.', 'error');
    } finally {
        showLoading(false);
    }
}

// 답변 보기
function viewAnswer(questionId) {
    const question = allQuestions.find(q => q.id === questionId);
    if (!question || !question.answer) return;
    
    const answeredDate = question.answeredAt.toDate ? 
        question.answeredAt.toDate() : new Date(question.answeredAt);
    const timeString = answeredDate.toLocaleString('ko-KR');
    
    alert(`답변 내용:\n\n${question.answer}\n\n답변자: ${question.answeredBy}\n답변일: ${timeString}`);
}

// 질문 삭제
async function deleteQuestion(questionId) {
    if (!confirm('이 질문을 삭제하시겠습니까?')) return;
    
    showLoading(true);
    
    try {
        await deleteDoc(doc(db, 'questions', questionId));
        console.log('✅ 질문이 삭제되었습니다.');
        showNotification('질문이 삭제되었습니다.', 'success');
    } catch (error) {
        console.error('질문 삭제 오류:', error);
        showNotification('질문 삭제 중 오류가 발생했습니다.', 'error');
    } finally {
        showLoading(false);
    }
}

// 템플릿 추가
function addTemplate() {
    document.getElementById('templateModalTitle').textContent = '새 템플릿';
    document.getElementById('templateTitle').value = '';
    document.getElementById('templateContent').value = '';
    document.getElementById('templateModal').classList.add('show');
}

// 템플릿 편집
function editTemplate(templateId) {
    const template = templates.find(t => t.id === templateId);
    if (!template) return;
    
    document.getElementById('templateModalTitle').textContent = '템플릿 편집';
    document.getElementById('templateTitle').value = template.title;
    document.getElementById('templateContent').value = template.content;
    document.getElementById('templateModal').classList.add('show');
    
    // 편집 모드 플래그 설정
    document.getElementById('templateModal').setAttribute('data-edit-id', templateId);
}

// 템플릿 모달 닫기
function closeTemplateModal() {
    const modal = document.getElementById('templateModal');
    modal.classList.remove('show');
    modal.removeAttribute('data-edit-id');
}

// 템플릿 저장
async function saveTemplate() {
    const title = document.getElementById('templateTitle').value.trim();
    const content = document.getElementById('templateContent').value.trim();
    
    if (!title || !content) {
        alert('제목과 내용을 모두 입력해주세요.');
        return;
    }
    
    const modal = document.getElementById('templateModal');
    const editId = modal.getAttribute('data-edit-id');
    
    showLoading(true);
    
    try {
        const templateData = {
            title: title,
            content: content,
            createdAt: Timestamp.now(),
            createdBy: currentUser.email
        };
        
        if (editId) {
            // 편집 모드
            await setDoc(doc(db, 'templates', editId), templateData);
            console.log('✅ 템플릿이 수정되었습니다.');
        } else {
            // 추가 모드
            await addDoc(collection(db, 'templates'), templateData);
            console.log('✅ 템플릿이 추가되었습니다.');
        }
        
        closeTemplateModal();
        loadTemplates();
        showNotification('템플릿이 저장되었습니다.', 'success');
        
    } catch (error) {
        console.error('템플릿 저장 오류:', error);
        showNotification('템플릿 저장 중 오류가 발생했습니다.', 'error');
    } finally {
        showLoading(false);
    }
}

// 템플릿 삭제
async function deleteTemplate(templateId) {
    if (!confirm('이 템플릿을 삭제하시겠습니까?')) return;
    
    showLoading(true);
    
    try {
        await deleteDoc(doc(db, 'templates', templateId));
        console.log('✅ 템플릿이 삭제되었습니다.');
        loadTemplates();
        showNotification('템플릿이 삭제되었습니다.', 'success');
    } catch (error) {
        console.error('템플릿 삭제 오류:', error);
        showNotification('템플릿 삭제 중 오류가 발생했습니다.', 'error');
    } finally {
        showLoading(false);
    }
}

// 섹션 표시
function showSection(sectionId) {
    // 모든 섹션 숨기기
    document.querySelectorAll('.content-section').forEach(section => {
        section.classList.remove('active');
    });
    
    // 모든 네비게이션 아이템 비활성화
    document.querySelectorAll('.nav-item').forEach(item => {
        item.classList.remove('active');
    });
    
    // 선택된 섹션 표시
    document.getElementById(sectionId).classList.add('active');
    
    // 선택된 네비게이션 아이템 활성화
    document.querySelector(`[onclick="showSection('${sectionId}')"]`).classList.add('active');
    
    // 페이지 제목 업데이트
    const titles = {
        dashboard: '대시보드',
        questions: '질문 관리',
        users: '사용자 관리',
        templates: '답변 템플릿',
        settings: '설정'
    };
    
    document.getElementById('pageTitle').textContent = titles[sectionId];
}

// 질문 필터링
function filterQuestions() {
    const filter = document.getElementById('statusFilter').value;
    // 필터링 로직 구현
    console.log('필터 적용:', filter);
}

// 질문 내보내기
function exportQuestions() {
    const csvContent = generateQuestionsCSV();
    downloadCSV(csvContent, 'questions.csv');
}

// 사용자 내보내기
function exportUsers() {
    const csvContent = generateUsersCSV();
    downloadCSV(csvContent, 'users.csv');
}

// CSV 생성 및 다운로드 함수들
function generateQuestionsCSV() {
    const headers = ['ID', '제목', '내용', '작성자', '이메일', '전화번호', '작성일', '상태', '답변', '답변일'];
    const rows = allQuestions.map(q => {
        const questionDate = q.questionTime.toDate ? q.questionTime.toDate() : new Date(q.questionTime);
        const answerDate = q.answeredAt ? (q.answeredAt.toDate ? q.answeredAt.toDate() : new Date(q.answeredAt)) : null;
        
        return [
            q.id,
            q.questionTitle,
            q.questionContent,
            q.userName,
            q.userEmail,
            q.userPhone,
            questionDate.toLocaleString('ko-KR'),
            q.status === 'answered' ? '답변완료' : '답변대기',
            q.answer || '',
            answerDate ? answerDate.toLocaleString('ko-KR') : ''
        ];
    });
    
    return [headers, ...rows].map(row => row.map(field => `"${field}"`).join(',')).join('\n');
}

function generateUsersCSV() {
    const headers = ['ID', '이름', '이메일', '전화번호', '가입일', '질문수'];
    const rows = allUsers.map(u => {
        const createdDate = u.createdAt && u.createdAt.toDate ? u.createdAt.toDate() : null;
        const userQuestions = allQuestions.filter(q => q.userId === u.id);
        
        return [
            u.id,
            u.name,
            u.email,
            u.phone,
            createdDate ? createdDate.toLocaleDateString('ko-KR') : '',
            userQuestions.length
        ];
    });
    
    return [headers, ...rows].map(row => row.map(field => `"${field}"`).join(',')).join('\n');
}

function downloadCSV(csvContent, filename) {
    const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', filename);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}

// 기본 템플릿 로드
function loadDefaultTemplates() {
    const defaultTemplates = [
        {
            title: '감사 인사',
            content: '안녕하세요. 문의해 주셔서 감사합니다. 신속하고 정확한 답변을 드리겠습니다.'
        },
        {
            title: '추가 문의 안내',
            content: '추가로 궁금한 사항이 있으시면 언제든지 문의해 주세요. 최선을 다해 도와드리겠습니다.'
        },
        {
            title: '서비스 안내',
            content: '저희 중간계 AI 스튜디오의 서비스에 관심을 가져주셔서 감사합니다. 자세한 상담을 원하시면 연락 부탁드립니다.'
        }
    ];
    
    // 템플릿이 없을 때만 기본 템플릿 추가
    if (templates.length === 0) {
        templates = defaultTemplates;
    }
}

// 이벤트 리스너 설정
function setupEventListeners() {
    // 검색 기능
    const searchInput = document.getElementById('searchInput');
    if (searchInput) {
        searchInput.addEventListener('input', (e) => {
            // 검색 로직 구현
            console.log('검색어:', e.target.value);
        });
    }
    
    // 모달 외부 클릭 시 닫기
    document.addEventListener('click', (e) => {
        if (e.target.classList.contains('modal')) {
            e.target.classList.remove('show');
        }
    });
}

// 유틸리티 함수들
function updateElement(id, value) {
    const element = document.getElementById(id);
    if (element) element.textContent = value;
}

function showLoading(show) {
    const overlay = document.getElementById('loadingOverlay');
    if (overlay) {
        overlay.classList.toggle('show', show);
    }
}

function showNotification(message, type = 'info') {
    // 간단한 알림 구현
    const notification = document.createElement('div');
    notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        padding: 15px 20px;
        border-radius: 6px;
        color: white;
        font-weight: 500;
        z-index: 9999;
        animation: slideIn 0.3s ease;
    `;
    
    switch (type) {
        case 'success':
            notification.style.background = '#27ae60';
            break;
        case 'error':
            notification.style.background = '#e74c3c';
            break;
        default:
            notification.style.background = '#3498db';
    }
    
    notification.textContent = message;
    document.body.appendChild(notification);
    
    setTimeout(() => {
        notification.remove();
    }, 3000);
}

function toggleSidebar() {
    const sidebar = document.querySelector('.sidebar');
    sidebar.classList.toggle('mobile-open');
}

function refreshData() {
    loadAllData();
    showNotification('데이터가 새로고침되었습니다.', 'success');
}

function redirectToLogin() {
    window.location.href = 'login.html';
}

// 로그아웃
async function logout() {
    if (confirm('로그아웃 하시겠습니까?')) {
        try {
            await signOut(auth);
            window.location.href = 'login.html';
        } catch (error) {
            console.error('로그아웃 오류:', error);
        }
    }
}

// 전역 함수 등록
window.showSection = showSection;
window.filterQuestions = filterQuestions;
window.exportQuestions = exportQuestions;
window.exportUsers = exportUsers;
window.openAnswerModal = openAnswerModal;
window.closeAnswerModal = closeAnswerModal;
window.submitAnswer = submitAnswer;
window.viewAnswer = viewAnswer;
window.deleteQuestion = deleteQuestion;
window.addTemplate = addTemplate;
window.editTemplate = editTemplate;
window.closeTemplateModal = closeTemplateModal;
window.saveTemplate = saveTemplate;
window.deleteTemplate = deleteTemplate;
window.toggleSidebar = toggleSidebar;
window.refreshData = refreshData;
window.logout = logout; 