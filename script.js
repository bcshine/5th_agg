// 중간계 AI 스튜디오 - 메인 JavaScript
import { initializeApp } from "https://www.gstatic.com/firebasejs/11.8.1/firebase-app.js";
import { getAnalytics } from "https://www.gstatic.com/firebasejs/11.8.1/firebase-analytics.js";
import { getFirestore, collection, doc, addDoc, setDoc, onSnapshot, getDocs, getDoc, query, orderBy, limit, serverTimestamp, Timestamp } from "https://www.gstatic.com/firebasejs/11.8.1/firebase-firestore.js";
import { getAuth, onAuthStateChanged, signOut, updateProfile } from "https://www.gstatic.com/firebasejs/11.8.1/firebase-auth.js";
import { firebaseConfig } from "./firebase-config.js";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);
const db = getFirestore(app);
const auth = getAuth(app);

// 로그인 상태 관리
let currentUser = null;

// DOM 로드 완료 이벤트
document.addEventListener('DOMContentLoaded', function() {
    // 히어로 슬라이더 초기화
    initHeroSlider();
    
    // 폼 이벤트 초기화
    initFormEvents();
    
    // PWA 설치 기능 초기화
    initPWA();
    
    // 키보드 이벤트 초기화
    initKeyboardEvents();
    
    // Firebase 데이터 로드
    loadQuestionsFromFirebase();
    
    // 인증 상태 확인
    initAuth();
    
    // 자동 응답 설정 로드
    setTimeout(loadAutoReplySettings, 1000); // 1초 후에 로드 (DOM 요소들이 완전히 준비된 후)
});

// 인증 상태 초기화
function initAuth() {
    onAuthStateChanged(auth, (user) => {
        currentUser = user;
        updateLoginButton(user);
        
        if (user) {
            console.log('✅ 사용자 로그인됨:', user.email);
        } else {
            console.log('❌ 사용자 로그아웃됨');
        }
    });
}

// 로그인 버튼 상태 업데이트
function updateLoginButton(user) {
    const loginBtn = document.querySelector('.login-btn');
    if (loginBtn) {
        if (user) {
            // 로그인된 상태
            loginBtn.innerHTML = `
                <div class="user-menu">
                    <span class="user-name">${user.displayName || user.email}</span>
                    <div class="user-dropdown">
                        <a href="#" onclick="showUserProfile()">프로필</a>
                        <a href="#" onclick="logout()">로그아웃</a>
                    </div>
                </div>
            `;
            loginBtn.classList.add('logged-in');
        } else {
            // 로그아웃된 상태
            loginBtn.innerHTML = '로그인';
            loginBtn.href = 'login.html';
            loginBtn.classList.remove('logged-in');
        }
    }
}

// 로그아웃 기능
async function logout() {
    try {
        await signOut(auth);
        localStorage.removeItem('rememberLogin');
        alert('로그아웃되었습니다.');
        
        // 페이지 새로고침
        window.location.reload();
    } catch (error) {
        console.error('로그아웃 오류:', error);
        alert('로그아웃 중 오류가 발생했습니다.');
    }
}

// 사용자 프로필 표시 (향후 기능)
function showUserProfile() {
    alert('프로필 기능은 준비 중입니다.');
}

// 헤더 모바일 메뉴 토글
function toggleMobileMenu() {
    const mobileNav = document.getElementById('mobileNav');
    if (mobileNav.classList.contains('active')) {
        mobileNav.classList.remove('active');
    } else {
        mobileNav.classList.add('active');
    }
}

function closeMobileMenu() {
    const mobileNav = document.getElementById('mobileNav');
    mobileNav.classList.remove('active');
}

// 히어로 슬라이더 관련 변수
let currentSlide = 0;
const totalSlides = 3;
let autoSlideTimer;

// 히어로 슬라이더 초기화
function initHeroSlider() {
    startAutoSlide();
    
    // 히어로 섹션에 마우스 이벤트 추가
    const heroSection = document.querySelector('.hero-section');
    if (heroSection) {
        heroSection.addEventListener('mouseenter', stopAutoSlide);
        heroSection.addEventListener('mouseleave', startAutoSlide);
    }
}

// 슬라이더 기능
function nextSlide() {
    goToSlide((currentSlide + 1) % totalSlides);
}

function previousSlide() {
    goToSlide((currentSlide - 1 + totalSlides) % totalSlides);
}

function goToSlide(slideIndex) {
    const slides = document.querySelectorAll('.hero-slide');
    const indicators = document.querySelectorAll('.hero-indicator');
    
    slides.forEach(slide => slide.classList.remove('active'));
    indicators.forEach(indicator => indicator.classList.remove('active'));
    
    slides[slideIndex].classList.add('active');
    indicators[slideIndex].classList.add('active');
    
    currentSlide = slideIndex;
    resetAutoSlide();
}

function startAutoSlide() {
    autoSlideTimer = setInterval(nextSlide, 5000);
}

function stopAutoSlide() {
    if (autoSlideTimer) {
        clearInterval(autoSlideTimer);
    }
}

function resetAutoSlide() {
    stopAutoSlide();
    startAutoSlide();
}

// 모달 관련 기능
function openModal() {
    const modal = document.getElementById('brandModal');
    modal.classList.add('show');
    document.body.style.overflow = 'hidden';
}

function closeBrandModal() {
    const modal = document.getElementById('brandModal');
    modal.classList.remove('show');
    document.body.style.overflow = 'auto';
}

function openHistoryModal() {
    const modal = document.getElementById('historyModal');
    modal.classList.add('show');
    document.body.style.overflow = 'hidden';
}

function closeHistoryModal() {
    const modal = document.getElementById('historyModal');
    modal.classList.remove('show');
    document.body.style.overflow = 'auto';
}

function openCeoModal() {
    const modal = document.getElementById('ceoModal');
    modal.classList.add('show');
    document.body.style.overflow = 'hidden';
}

function closeCeoModal() {
    const modal = document.getElementById('ceoModal');
    modal.classList.remove('show');
    document.body.style.overflow = 'auto';
}

// 배경 클릭으로 모달 닫기
function closeModalOnBackground(event, modalId) {
    if (event.target === event.currentTarget) {
        if (modalId === 'historyModal') {
            closeHistoryModal();
        } else if (modalId === 'ceoModal') {
            closeCeoModal();
        } else if (modalId === 'brandModal') {
            closeBrandModal();
        }
    }
}

// Q&A 기능
function toggleAnswer(num) {
    const answer = document.getElementById('answer' + num);
    if (answer.style.display === 'none' || answer.style.display === '') {
        answer.style.display = 'block';
    } else {
        answer.style.display = 'none';
    }
}

function addComment(message) {
    const commentsList = document.getElementById('commentsList');
    const commentItem = document.createElement('div');
    commentItem.className = 'comment-item';
    
    const now = new Date();
    const timeString = now.getFullYear() + '년 ' + 
                      (now.getMonth() + 1) + '월 ' + 
                      now.getDate() + '일 ' +
                      now.getHours().toString().padStart(2, '0') + ':' +
                      now.getMinutes().toString().padStart(2, '0');
    
    commentItem.innerHTML = `
        <div class="comment-message">${message}</div>
        <div class="comment-time">${timeString}</div>
    `;
    
    commentsList.insertBefore(commentItem, commentsList.firstChild);
}

// 폼 이벤트 초기화
function initFormEvents() {
    const questionForm = document.getElementById('questionForm');
    if (questionForm) {
        questionForm.addEventListener('submit', function(e) {
            e.preventDefault();
            const title = document.getElementById('title').value;
            const question = document.getElementById('question').value;
            
            // Firebase에 질문 저장
            saveQuestionToFirebase(title, question);
            
            this.reset();
        });
    }
}

// Firebase에 질문 저장
async function saveQuestionToFirebase(title, question) {
    // 입력값 검증
    if (!title || !question) {
        addComment("제목과 질문 내용을 모두 입력해주세요.");
        return;
    }

    // Firebase 연결 상태 확인
    if (!db) {
        addComment("데이터베이스 연결에 문제가 있습니다. 페이지를 새로고침해주세요.");
        console.error('Firestore가 초기화되지 않았습니다.');
        return;
    }

    // 로그인 상태 확인
    if (!currentUser) {
        addComment("질문을 작성하려면 로그인이 필요합니다.");
        setTimeout(() => {
            window.location.href = 'login.html';
        }, 2000);
        return;
    }

    console.log('Firestore에 질문 저장 시도:', { title, question, user: currentUser.email });
    
    try {
        // 사용자 토큰 새로고침 (권한 문제 해결)
        console.log('사용자 토큰 새로고침 중...');
        await currentUser.getIdToken(true);
        console.log('토큰 새로고침 완료');
        
        // 사용자 정보 가져오기
        console.log('사용자 정보 조회 중:', currentUser.uid);
        const userDataRef = doc(db, 'users', currentUser.uid);
        const userSnapshot = await getDoc(userDataRef);
        const userData = userSnapshot.exists() ? userSnapshot.data() : null;
        console.log('사용자 데이터:', userData);
        
        // 질문 데이터 준비
        const questionData = {
            // 사용자 정보
            userId: currentUser.uid,
            userName: userData?.name || currentUser.displayName || '익명',
            userEmail: currentUser.email,
            userPhone: userData?.phone || '정보 없음',
            
            // 질문 정보
            questionTitle: title,
            questionContent: question,
            questionTime: Timestamp.now(), // Firestore Timestamp 사용
            status: 'pending', // 답변 대기 상태
            
            // 답변 관련 (초기값)
            answer: null,
            answeredAt: null,
            answeredBy: null
        };
        
        console.log('저장할 데이터:', questionData);
        
        // Firestore에 질문 저장
        const questionsRef = collection(db, 'questions');
        const docRef = await addDoc(questionsRef, questionData);
        
        console.log('저장된 문서 ID:', docRef.id);
        
        // 즉시 자동 응답 표시 (더 간단하고 확실한 방법)
        addComment("질문이 성공적으로 저장되었습니다. 곧 이메일로 답변 드리겠습니다.");
        
        // 1.5초 후 자동 응답 메시지 표시
        setTimeout(() => {
            const autoResponseMessage = `📧 중간계 AI 스튜디오 자동 응답

안녕하세요. ${questionData.userName}님

귀하의 소중한 문의를 잘 받았습니다.
담당자가 확인 후 빠른 시일 내에 상세한 답변을 이메일(${questionData.userEmail})로 보내드리겠습니다.

추가 문의사항이 있으시면 언제든지 연락해 주세요.
감사합니다.

중간계 AI 스튜디오 팀`;
            
            addComment(autoResponseMessage);
            console.log('✅ 자동 응답이 표시되었습니다.');
        }, 1500);
        
        console.log('✅ 질문이 Firestore에 저장되었습니다.');
        
    } catch (error) {
        console.error('❌ 질문 저장 중 상세 오류:', {
            code: error.code,
            message: error.message,
            details: error,
            user: currentUser?.email,
            uid: currentUser?.uid
        });
        
        // 오류 유형별 메시지
        let errorMessage = "질문 저장 중 오류가 발생했습니다.";
        
        if (error.code === 'permission-denied') {
            errorMessage = "🔒 데이터베이스 접근 권한이 없습니다. Firestore 보안 규칙을 확인해주세요.";
        } else if (error.code === 'unavailable') {
            errorMessage = "⏰ 서비스가 일시적으로 사용할 수 없습니다. 잠시 후 다시 시도해주세요.";
        } else if (error.code === 'unauthenticated') {
            errorMessage = "🔐 인증이 만료되었습니다. 다시 로그인해주세요.";
        }
        
        addComment(errorMessage);
        
        // Firestore 규칙 설정 안내 메시지
        if (error.code === 'permission-denied') {
            console.log(`
📋 Firestore 보안 규칙 설정 방법:

1. Firebase Console (https://console.firebase.google.com) 접속
2. 프로젝트 선택: mid-ai-5th
3. 왼쪽 메뉴 → Firestore Database → 규칙 탭
4. 다음 규칙으로 변경:

rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /{document=**} {
      allow read, write: if request.auth != null;
    }
  }
}

또는 개발용으로:

rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /{document=**} {
      allow read, write: if true;
    }
  }
}

5. 게시 버튼 클릭
            `);
        }
    }
}

// Firebase 데이터 로드
function loadQuestionsFromFirebase() {
    console.log('🔄 Firestore에서 질문 데이터 로드 시작...');
    
    const questionsRef = collection(db, 'questions');
    const questionsQuery = query(questionsRef, orderBy('questionTime', 'desc'));
    
    // 오류 처리가 포함된 onSnapshot 리스너
    onSnapshot(questionsQuery, (snapshot) => {
        console.log('📊 Firestore 스냅샷 수신, 문서 개수:', snapshot.size);
        
        if (snapshot.empty) {
            console.log('❌ Firestore에서 질문 데이터를 찾을 수 없습니다.');
            const commentsList = document.getElementById('commentsList');
            if (commentsList) {
                commentsList.innerHTML = '<div style="text-align: center; padding: 20px; color: #666;">저장된 질문이 없습니다.</div>';
            }
        } else {
            const questions = [];
            snapshot.forEach((doc) => {
                questions.push({ id: doc.id, ...doc.data() });
            });
            
            console.log('📋 전체 질문 데이터:', questions);
            
            const commentsList = document.getElementById('commentsList');
            if (commentsList) {
                commentsList.innerHTML = '';
                
                // 최신 2개 질문만 선택
                const recentQuestions = questions.slice(0, 2);
                const totalQuestions = questions.length;
                const remainingQuestions = totalQuestions - recentQuestions.length;
                
                console.log('🔢 전체 질문 수:', totalQuestions);
                console.log('🔢 표시할 질문 수:', recentQuestions.length);
                console.log('🔢 숨겨진 질문 수:', remainingQuestions);
                
                recentQuestions.forEach((question, index) => {
                    console.log(`\n📝 질문 ${index + 1} 처리 중:`, {
                        questionId: question.id,
                        fullQuestionData: question,
                        userName: question.userName,
                        userNameType: typeof question.userName,
                        userEmail: question.userEmail,
                        userPhone: question.userPhone
                    });
                    
                    const commentItem = document.createElement('div');
                    commentItem.className = 'comment-item';
                    commentItem.setAttribute('data-question-id', question.id);
                    
                    // 시간 처리
                    const questionDate = question.questionTime.toDate ? question.questionTime.toDate() : new Date(question.questionTime);
                    const timeString = questionDate.toLocaleString('ko-KR');
                    
                    // 질문 제목과 내용
                    const questionTitle = question.questionTitle || question.title || '제목 없음';
                    const questionContent = question.questionContent || question.question || '내용 없음';
                    
                    // 사용자 정보 안전하게 처리
                    console.log('질문 데이터:', {
                        questionId: question.id,
                        userName: question.userName,
                        userEmail: question.userEmail,
                        userPhone: question.userPhone,
                        rawData: question
                    });
                    
                    let userName = '익명 사용자';
                    if (question.userName) {
                        userName = question.userName;
                        console.log('✅ userName 사용:', userName);
                    } else if (question.userEmail) {
                        userName = question.userEmail.split('@')[0];
                        console.log('📧 userEmail에서 추출:', userName);
                    } else {
                        console.log('❌ 사용자 정보 없음');
                    }
                    
                    const userEmail = question.userEmail || '이메일 정보 없음';
                    const userPhone = (question.userPhone && question.userPhone !== 'undefined' && question.userPhone !== '정보 없음')
                        ? question.userPhone 
                        : '전화번호 정보 없음';
                    
                    console.log('처리된 사용자 정보:', {
                        userName,
                        userEmail,
                        userPhone
                    });
                    
                    let answerHTML = '';
                    if (question.answer) {
                        const answerDate = question.answeredAt.toDate ? question.answeredAt.toDate() : new Date(question.answeredAt);
                        const answerTimeString = answerDate.toLocaleString('ko-KR');
                        
                        answerHTML = `
                            <div class="answer-section" style="margin-top: 15px; padding: 15px; background: #e8f5e8; border-left: 4px solid #28a745; border-radius: 5px;">
                                <div class="answer-label" style="font-weight: bold; color: #28a745; margin-bottom: 8px;">
                                    ✅ 이메일로 답변 드렸습니다 (${answerTimeString})
                                </div>
                                <div class="answer-note" style="font-size: 14px; color: #666; line-height: 1.5;">
                                    고객님의 이메일로 상세한 답변을 발송해드렸습니다.<br>
                                    이메일을 확인해주시기 바랍니다.
                                </div>
                                ${question.answeredBy ? `<div class="answer-by" style="font-size: 12px; color: #666; margin-top: 8px;">답변자: ${question.answeredBy}</div>` : ''}
                            </div>
                        `;
                    } else {
                        answerHTML = `
                            <div class="pending-answer" style="margin-top: 10px; padding: 15px; background: #fff3cd; border: 1px solid #ffeaa7; border-radius: 5px; color: #856404;">
                                <div style="font-weight: bold; margin-bottom: 5px;">
                                    📧 곧 이메일로 답변드리겠습니다
                                </div>
                                <div style="font-size: 13px; color: #666;">
                                    고객님의 문의사항을 확인 중입니다. 빠른 시일 내에 등록해주신 이메일로 답변을 보내드리겠습니다.
                                </div>
                            </div>
                        `;
                    }
                    
                    commentItem.innerHTML = `
                        <div class="question-header" style="margin-bottom: 15px;">
                            <div class="user-info" style="background: #e3f2fd; padding: 10px; border-radius: 8px; margin-bottom: 10px;">
                                <div class="user-details" style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 10px;">
                                    <div class="user-name" style="font-weight: bold; color: #1976d2; font-size: 14px;">
                                        👤 ${userName}
                                    </div>
                                    <div class="user-contact" style="font-size: 12px; color: #666;">
                                        📧 ${userEmail} | 📞 ${userPhone}
                                    </div>
                                </div>
                            </div>
                            <div class="question-title" style="font-weight: bold; color: #2c3e50; font-size: 16px;">
                                📝 ${questionTitle}
                            </div>
                            <div class="question-time" style="color: #6c757d; font-size: 12px; margin-top: 5px;">
                                🕒 ${timeString}
                            </div>
                        </div>
                        <div class="question-content" style="margin-bottom: 10px; line-height: 1.6; color: #495057; background: #f8f9fa; padding: 15px; border-radius: 8px;">
                            ${questionContent}
                        </div>
                        ${answerHTML}
                    `;
                    
                    commentsList.appendChild(commentItem);
                });
                
                // 나머지 질문 개수 표시
                if (remainingQuestions > 0) {
                    const moreQuestionsItem = document.createElement('div');
                    moreQuestionsItem.className = 'more-questions-notice';
                    moreQuestionsItem.innerHTML = `
                        <div style="text-align: center; padding: 20px; background: #f8f9fa; border: 2px dashed #dee2e6; border-radius: 8px; margin-top: 20px;">
                            <div style="color: #6c757d; font-size: 14px; font-weight: 500;">
                                📄 이 질문외 <strong style="color: #007bff;">${remainingQuestions}개 질문</strong>이 더 있습니다
                            </div>
                            <div style="color: #adb5bd; font-size: 12px; margin-top: 5px;">
                                최신 ${recentQuestions.length}개 질문만 표시됩니다
                            </div>
                        </div>
                    `;
                    commentsList.appendChild(moreQuestionsItem);
                }
            }
        }
    }, (error) => {
        console.error('❌ Firestore 데이터 읽기 오류:', error);
        console.error('오류 코드:', error.code);
        console.error('오류 메시지:', error.message);
        
        const commentsList = document.getElementById('commentsList');
        if (commentsList) {
            commentsList.innerHTML = `
                <div style="text-align: center; padding: 20px; color: #e74c3c; background: #fdf2f2; border: 1px solid #f5c6cb; border-radius: 5px;">
                    <h4>⚠️ 데이터 로드 오류</h4>
                    <p>Firestore에서 데이터를 불러올 수 없습니다.</p>
                    <p><strong>오류:</strong> ${error.message}</p>
                    <p><small>개발자 도구 콘솔을 확인하세요.</small></p>
                </div>
            `;
        }
    });
}

// 관리자용 답변 추가 함수 수정 (더 정확한 업데이트)
async function addAnswerToQuestion(questionId, answer, answeredBy = '관리자') {
    try {
        const questionRef = doc(db, 'questions', questionId);
        
        // 기존 데이터를 먼저 가져온 후 업데이트
        const snapshot = await getDoc(questionRef);
        const existingData = snapshot.data();
        
        if (existingData) {
            const updatedData = {
                ...existingData,
                answer: answer,
                status: 'answered',
                answeredAt: Timestamp.now(),
                answeredBy: answeredBy
            };
            
            await setDoc(questionRef, updatedData);
            console.log('✅ 답변이 성공적으로 저장되었습니다.');
            console.log('답변 정보:', {
                questionTitle: existingData.questionTitle,
                userName: existingData.userName,
                userEmail: existingData.userEmail,
                answer: answer,
                answeredBy: answeredBy
            });
        } else {
            console.error('❌ 질문을 찾을 수 없습니다.');
        }
        
    } catch (error) {
        console.error('❌ 답변 저장 중 오류 발생:', error);
    }
}

// 관리자용 질문 목록 조회 함수 (콘솔에서 사용)
async function getQuestionsList() {
    try {
        console.log('📋 Firestore에서 질문 목록 조회 중...');
        
        const questionsRef = collection(db, 'questions');
        const questionsQuery = query(questionsRef, orderBy('questionTime', 'desc'));
        const snapshot = await getDocs(questionsQuery);
        
        if (snapshot.empty) {
            console.log('❌ 저장된 질문이 없습니다.');
            return;
        }
        
        const questions = [];
        snapshot.forEach((doc) => {
            questions.push({ id: doc.id, ...doc.data() });
        });
        
        console.log('📋 질문 목록:');
        console.log('==========================================');
        console.log(`📊 총 ${questions.length}개의 질문이 있습니다.`);
        console.log('==========================================');
        
        questions.forEach((question, index) => {
            const questionDate = question.questionTime.toDate ? question.questionTime.toDate() : new Date(question.questionTime);
            const timeString = questionDate.toLocaleString('ko-KR');
            
            console.log(`🔹 질문 ${index + 1} - ID: ${question.id}`);
            console.log(`👤 이름: ${question.userName}`);
            console.log(`📧 이메일: ${question.userEmail}`);
            console.log(`📞 전화번호: ${question.userPhone}`);
            console.log(`📝 제목: ${question.questionTitle}`);
            console.log(`💬 내용: ${question.questionContent}`);
            console.log(`🕒 질문시간: ${timeString}`);
            console.log(`📊 상태: ${question.status === 'answered' ? '답변완료' : '답변대기'}`);
            
            if (question.answer) {
                const answerDate = question.answeredAt.toDate ? question.answeredAt.toDate() : new Date(question.answeredAt);
                const answerTimeString = answerDate.toLocaleString('ko-KR');
                console.log(`💬 답변: ${question.answer}`);
                console.log(`🕒 답변시간: ${answerTimeString}`);
                console.log(`👨‍💼 답변자: ${question.answeredBy}`);
            }
            
            console.log('==========================================');
        });
        
        console.log('\n📌 답변 추가 방법:');
        console.log('addAnswerToQuestion("질문ID", "답변내용", "답변자명")');
        console.log('예시: addAnswerToQuestion("abc123", "안녕하세요. 답변드립니다.", "김관리자")');
        
        return questions;
        
    } catch (error) {
        console.error('❌ 질문 목록 조회 중 오류 발생:', error);
        return [];
    }
}

// 디버깅용: 현재 사용자 정보 확인
async function checkCurrentUser() {
    console.log('🔍 현재 사용자 정보 확인:');
    console.log('==========================================');
    
    if (!currentUser) {
        console.log('❌ 로그인되지 않음');
        return;
    }
    
    console.log('✅ Firebase Auth 사용자:');
    console.log(`- UID: ${currentUser.uid}`);
    console.log(`- Email: ${currentUser.email}`);
    console.log(`- DisplayName: ${currentUser.displayName}`);
    console.log(`- EmailVerified: ${currentUser.emailVerified}`);
    
    try {
        const userDataRef = doc(db, 'users', currentUser.uid);
        const userSnapshot = await getDoc(userDataRef);
        
        console.log('\n📝 Firestore 사용자 정보:');
        if (userSnapshot.exists()) {
            const userData = userSnapshot.data();
            console.log(`- 이름: ${userData.name}`);
            console.log(`- 전화번호: ${userData.phone}`);
            console.log(`- 이메일: ${userData.email}`);
            console.log(`- 생성일: ${userData.createdAt && userData.createdAt.toDate ? userData.createdAt.toDate().toLocaleString('ko-KR') : '정보 없음'}`);
            console.log(`- 마지막 로그인: ${userData.lastLoginAt && userData.lastLoginAt.toDate ? userData.lastLoginAt.toDate().toLocaleString('ko-KR') : '정보 없음'}`);
        } else {
            console.log('❌ Firestore에 사용자 정보가 없음');
        }
    } catch (error) {
        console.error('❌ 사용자 정보 조회 오류:', error);
    }
    
    console.log('==========================================');
}

// 디버깅용: 사용자 데이터 다시 저장
async function fixUserData() {
    if (!currentUser) {
        console.log('❌ 로그인이 필요합니다.');
        return;
    }
    
    const name = prompt('사용자 이름을 입력하세요:');
    const phone = prompt('전화번호를 입력하세요 (예: 010-1234-5678):');
    
    if (!name || !phone) {
        console.log('❌ 이름과 전화번호를 모두 입력해주세요.');
        return;
    }
    
    try {
        const userData = {
            name: name,
            phone: phone,
            email: currentUser.email,
            createdAt: Timestamp.now(),
            lastLoginAt: Timestamp.now()
        };
        
        const userRef = doc(db, 'users', currentUser.uid);
        await setDoc(userRef, userData);
        
        // 프로필도 업데이트
        await updateProfile(currentUser, {
            displayName: name
        });
        
        console.log('✅ 사용자 정보가 Firestore에 업데이트되었습니다.');
        console.log('저장된 정보:', userData);
        
    } catch (error) {
        console.error('❌ 사용자 정보 업데이트 오류:', error);
    }
}

// PWA 설치 기능 초기화
function initPWA() {
    let deferredPrompt;
    
    window.addEventListener('beforeinstallprompt', (e) => {
        e.preventDefault();
        deferredPrompt = e;
        
        // 설치 안내 배너 표시 (선택사항)
        showInstallPromotion();
    });

    function showInstallPromotion() {
        // 모바일에서만 설치 안내 표시
        if (window.innerWidth <= 768) {
            const installBanner = document.createElement('div');
            installBanner.style.cssText = `
                position: fixed;
                top: 0;
                left: 0;
                right: 0;
                background: #052f5d;
                color: white;
                padding: 10px 20px;
                text-align: center;
                z-index: 9999;
                font-size: 14px;
            `;
            installBanner.innerHTML = `
                <span>📱 홈 화면에 추가하여 빠르게 접속하세요!</span>
                <button onclick="installApp()" style="
                    background: white; 
                    color: #052f5d; 
                    border: none; 
                    padding: 5px 10px; 
                    margin-left: 10px; 
                    border-radius: 3px;
                    cursor: pointer;
                ">설치</button>
                <button onclick="this.parentElement.remove()" style="
                    background: transparent; 
                    color: white; 
                    border: 1px solid white; 
                    padding: 5px 10px; 
                    margin-left: 5px; 
                    border-radius: 3px;
                    cursor: pointer;
                ">닫기</button>
            `;
            document.body.prepend(installBanner);
        }
    }

    // 전역 함수로 설정
    window.installApp = async function() {
        if (deferredPrompt) {
            deferredPrompt.prompt();
            const { outcome } = await deferredPrompt.userChoice;
            console.log(`User response to the install prompt: ${outcome}`);
            deferredPrompt = null;
        }
    };
}

// 키보드 이벤트 초기화
function initKeyboardEvents() {
    document.addEventListener('keydown', function(event) {
        if (event.key === 'Escape') {
            const brandModal = document.getElementById('brandModal');
            const historyModal = document.getElementById('historyModal');
            const ceoModal = document.getElementById('ceoModal');
            
            if (brandModal && brandModal.classList.contains('show')) {
                closeBrandModal();
            }
            if (historyModal && historyModal.classList.contains('show')) {
                closeHistoryModal();
            }
            if (ceoModal && ceoModal.classList.contains('show')) {
                closeCeoModal();
            }
        }
    });
}

// 반응형 메뉴 처리
window.addEventListener('resize', function() {
    if (window.innerWidth > 768) {
        closeMobileMenu();
    }
});

// 외부 클릭으로 모바일 메뉴 닫기
document.addEventListener('click', function(event) {
    const mobileNav = document.getElementById('mobileNav');
    const mobileMenuBtn = document.querySelector('.mobile-menu-btn');
    
    if (mobileNav && mobileMenuBtn && 
        !mobileNav.contains(event.target) && 
        !mobileMenuBtn.contains(event.target)) {
        closeMobileMenu();
    }
});

// 전역 함수들을 window 객체에 추가 (인라인 이벤트 핸들러를 위해)
window.toggleMobileMenu = toggleMobileMenu;
window.closeMobileMenu = closeMobileMenu;
window.nextSlide = nextSlide;
window.previousSlide = previousSlide;
window.goToSlide = goToSlide;
window.openModal = openModal;
window.closeBrandModal = closeBrandModal;
window.openHistoryModal = openHistoryModal;
window.closeHistoryModal = closeHistoryModal;
window.openCeoModal = openCeoModal;
window.closeCeoModal = closeCeoModal;
window.closeModalOnBackground = closeModalOnBackground;
window.toggleAnswer = toggleAnswer;
window.addAnswerToQuestion = addAnswerToQuestion;
window.getQuestionsList = getQuestionsList;
window.checkCurrentUser = checkCurrentUser;
window.fixUserData = fixUserData;
window.logout = logout;
window.showUserProfile = showUserProfile;

// 디버깅용: 질문 시간을 읽기 쉬운 형태로 변환해서 보기
function convertQuestionTime(timestamp) {
    if (!timestamp) return '시간 정보 없음';
    
    // Firestore Timestamp 객체인지 확인
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    
    // 한국 시간으로 변환
    const koreaTime = date.toLocaleString('ko-KR', {
        year: 'numeric',
        month: '2-digit', 
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        timeZone: 'Asia/Seoul'
    });
    
    return koreaTime;
}

// 디버깅용: 질문 목록을 시간 변환해서 보기
async function getQuestionsWithReadableTime() {
    try {
        console.log('📋 Firestore에서 질문 목록 조회 중 (시간 변환)...');
        
        const questionsRef = collection(db, 'questions');
        const questionsQuery = query(questionsRef, orderBy('questionTime', 'desc'));
        const snapshot = await getDocs(questionsQuery);
        
        if (snapshot.empty) {
            console.log('❌ 저장된 질문이 없습니다.');
            return;
        }
        
        const questions = [];
        snapshot.forEach((doc) => {
            questions.push({ id: doc.id, ...doc.data() });
        });
        
        console.log('📋 질문 목록 (읽기 쉬운 시간):');
        console.log('==========================================');
        console.log(`📊 총 ${questions.length}개의 질문이 있습니다.`);
        console.log('==========================================');
        
        questions.forEach((question, index) => {
            const readableTime = convertQuestionTime(question.questionTime);
            
            console.log(`🔹 질문 ${index + 1} - ID: ${question.id}`);
            console.log(`👤 이름: ${question.userName}`);
            console.log(`📧 이메일: ${question.userEmail}`);
            console.log(`📞 전화번호: ${question.userPhone}`);
            console.log(`📝 제목: ${question.questionTitle}`);
            console.log(`💬 내용: ${question.questionContent}`);
            console.log(`🕒 질문시간: ${readableTime}`);
            console.log(`📊 상태: ${question.status === 'answered' ? '답변완료' : '답변대기'}`);
            
            if (question.answer) {
                const answerTime = convertQuestionTime(question.answeredAt);
                console.log(`💬 답변: ${question.answer}`);
                console.log(`🕒 답변시간: ${answerTime}`);
                console.log(`👨‍💼 답변자: ${question.answeredBy}`);
            }
            
            console.log('==========================================');
        });
        
        return questions;
        
    } catch (error) {
        console.error('❌ 질문 목록 조회 중 오류 발생:', error);
        return [];
    }
}

// 자동 응답 기능
async function sendAutoReply(userName, userEmail) {
    try {
        console.log('🔍 자동 응답 기능 시작:', { userName, userEmail });
        
        // 자동 응답 설정 확인 (localStorage에서 가져오기)
        const autoReplyEnabled = localStorage.getItem('autoReplyEnabled');
        const autoReplyMessage = localStorage.getItem('autoReplyMessage');
        
        console.log('📋 자동 응답 설정 확인:', {
            enabled: autoReplyEnabled,
            message: autoReplyMessage ? '메시지 있음' : '메시지 없음'
        });
        
        // 기본 자동 응답 메시지
        const defaultMessage = `안녕하세요. 중간계 AI 스튜디오입니다.

귀하의 소중한 문의를 잘 받았습니다.
담당자가 확인 후 빠른 시일 내에 상세한 답변을 이메일로 보내드리겠습니다.

추가 문의사항이 있으시면 언제든지 연락해 주세요.
감사합니다.`;
        
        // 자동 응답이 활성화되어 있거나 설정이 없으면 기본값으로 작동
        const shouldSendReply = autoReplyEnabled === 'true' || autoReplyEnabled === null;
        const messageToSend = autoReplyMessage && autoReplyMessage.trim() ? autoReplyMessage : defaultMessage;
        
        if (shouldSendReply) {
            console.log('🔄 자동 응답 발송 중...');
            
            // 개인화된 자동 응답 메시지 생성
            let personalizedMessage = messageToSend
                .replace('{userName}', userName || '고객님')
                .replace('{userEmail}', userEmail || '');
            
            // 자동 응답을 댓글로 추가
            setTimeout(() => {
                addComment(`📧 자동 응답이 발송되었습니다:\n\n${personalizedMessage}`);
                console.log('✅ 자동 응답이 발송되었습니다.');
            }, 1500); // 1.5초 후에 자동 응답 표시
            
        } else {
            console.log('❌ 자동 응답이 명시적으로 비활성화되어 있습니다.');
        }
    } catch (error) {
        console.error('❌ 자동 응답 발송 중 오류:', error);
        
        // 오류가 발생해도 기본 메시지라도 보내기
        setTimeout(() => {
            addComment(`📧 자동 접수 확인: 질문이 정상적으로 접수되었습니다. 빠른 시일 내에 답변드리겠습니다.`);
        }, 1500);
    }
}

// 관리자 페이지에서 자동 응답 설정을 localStorage에 저장하는 함수
function saveAutoReplySettings() {
    try {
        const autoReplyCheckbox = document.getElementById('autoReply');
        const autoReplyMessageTextarea = document.getElementById('autoReplyMessage');
        
        if (autoReplyCheckbox && autoReplyMessageTextarea) {
            localStorage.setItem('autoReplyEnabled', autoReplyCheckbox.checked.toString());
            localStorage.setItem('autoReplyMessage', autoReplyMessageTextarea.value);
            console.log('✅ 자동 응답 설정이 저장되었습니다.');
        }
    } catch (error) {
        console.error('❌ 자동 응답 설정 저장 중 오류:', error);
    }
}

// 페이지 로드시 자동 응답 설정 불러오기
function loadAutoReplySettings() {
    try {
        const autoReplyCheckbox = document.getElementById('autoReply');
        const autoReplyMessageTextarea = document.getElementById('autoReplyMessage');
        
        if (autoReplyCheckbox && autoReplyMessageTextarea) {
            const savedEnabled = localStorage.getItem('autoReplyEnabled') === 'true';
            const savedMessage = localStorage.getItem('autoReplyMessage') || autoReplyMessageTextarea.value;
            
            autoReplyCheckbox.checked = savedEnabled;
            if (savedMessage) {
                autoReplyMessageTextarea.value = savedMessage;
            }
            
            // 설정 변경시 자동 저장
            autoReplyCheckbox.addEventListener('change', saveAutoReplySettings);
            autoReplyMessageTextarea.addEventListener('input', saveAutoReplySettings);
            
            console.log('✅ 자동 응답 설정이 로드되었습니다.');
        }
    } catch (error) {
        console.error('❌ 자동 응답 설정 로드 중 오류:', error);
    }
} 