# 🔑 Firebase API 키 설정 가이드

## 로그인 기능이 작동하지 않는 이유
현재 `firebase-config.js` 파일에 실제 Firebase API 키가 설정되지 않아서 로그인이 안 됩니다.

## 🚀 Firebase API 키 설정 방법

### 1단계: Firebase 콘솔 접속
1. **https://console.firebase.google.com/** 접속
2. Google 계정으로 로그인

### 2단계: 프로젝트 확인/생성
1. **기존 프로젝트가 있다면**: `mid-ai-5th` 프로젝트 클릭
2. **새 프로젝트 생성이 필요하다면**: 
   - "프로젝트 추가" 클릭
   - 프로젝트 이름: `중간계 AI 스튜디오` 또는 `mid-ai-5th`
   - Google Analytics 설정 (선택사항)

### 3단계: 웹 앱 등록 (처음 설정하는 경우)
1. 프로젝트 홈에서 **웹(</>) 아이콘** 클릭
2. 앱 닉네임: `중간계 AI 웹앱`
3. Firebase Hosting 설정 체크박스 선택
4. "앱 등록" 클릭

### 4단계: API 키 확인
1. 프로젝트 홈에서 **⚙️ 프로젝트 설정** 클릭
2. **"일반"** 탭에서 "내 앱" 섹션까지 스크롤
3. 웹 앱 섹션에서 **"구성"** 라디오 버튼 선택
4. **firebaseConfig** 객체에서 `apiKey` 값 복사

```javascript
// 예시 - 실제 키는 이와 다릅니다
const firebaseConfig = {
  apiKey: "AIzaSyBJn9_abc123def456ghi789jkl012mno", // ← 이 값 복사
  authDomain: "mid-ai-5th.firebaseapp.com",
  // ... 기타 설정
};
```

### 5단계: 프로젝트에 API 키 적용
1. `public/firebase-config.js` 파일 열기
2. `apiKey: "AIzaSyBJn9_abcdefghijklmnopqrstuvwxyz1234"` 부분의 값을 실제 API 키로 교체
3. 파일 저장

### 6단계: Authentication 설정
1. Firebase 콘솔에서 **"Authentication"** 클릭
2. **"시작하기"** 클릭
3. **"Sign-in method"** 탭에서 **"이메일/비밀번호"** 선택
4. **"사용 설정"** 토글 활성화
5. **"저장"** 클릭

## 🔍 설정 완료 확인
1. 브라우저에서 로그인 페이지 접속: `http://localhost:3000/login.html`
2. 이메일/비밀번호로 회원가입 시도
3. 오류 없이 진행되면 설정 완료!

## ❌ 일반적인 문제 해결

### 문제 1: "Firebase App not initialized"
- **해결**: Firebase API 키가 올바르게 설정되었는지 확인

### 문제 2: "API key not valid"
- **해결**: Firebase 콘솔에서 API 키를 다시 복사하여 붙여넣기

### 문제 3: "Domain not authorized"
- **해결**: Firebase 콘솔 → Authentication → Settings → 승인된 도메인에 `localhost` 추가

## 📞 추가 도움이 필요하다면
1. Firebase 콘솔에서 정확한 API 키를 확인했는지 재확인
2. 브라우저 개발자 도구(F12)에서 콘솔 오류 메시지 확인
3. `firebase-config.js` 파일이 올바르게 저장되었는지 확인 