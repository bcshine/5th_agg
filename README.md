# 중간계 AI 스튜디오

Firebase 기반의 Q&A 웹 애플리케이션

## 🚀 설치 및 설정

### 1. Firebase 설정 파일 생성

```bash
# 예시 파일을 복사하여 실제 설정 파일 생성
cp firebase-config.example.js firebase-config.js
```

### 2. Firebase 설정값 입력

`firebase-config.js` 파일을 열어서 실제 Firebase 프로젝트 설정값으로 변경하세요:

```javascript
export const firebaseConfig = {
  apiKey: "실제-API-키",
  authDomain: "실제-프로젝트.firebaseapp.com",
  projectId: "실제-프로젝트-ID",
  // ... 나머지 설정값들
};
```

### 3. Firebase 프로젝트 설정

Firebase Console에서 다음을 설정하세요:

1. **Authentication**: 이메일/비밀번호 로그인 활성화
2. **Firestore Database**: 데이터베이스 생성 및 보안 규칙 설정
3. **Hosting**: 웹 호스팅 활성화

### 4. Firestore 보안 규칙

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /{document=**} {
      allow read, write: if request.auth != null;
    }
  }
}
```

## 📁 프로젝트 구조

```
├── index.html          # 메인 페이지
├── admin.html          # 관리자 페이지
├── login.html          # 로그인 페이지
├── script.js           # 메인 JavaScript
├── admin.js            # 관리자 JavaScript
├── firebase-config.js  # Firebase 설정 (Git에서 제외됨)
├── firebase-config.example.js  # 설정 예시 파일
└── .gitignore          # Git 제외 파일 목록
```

## 🔒 보안

- `firebase-config.js` 파일은 민감한 정보를 포함하므로 Git에서 제외됩니다
- `.gitignore`에 설정되어 있어 실수로 커밋되지 않습니다
- 프로덕션 배포 시 환경변수 또는 서버 설정으로 관리하세요

## 🚀 배포

### Firebase Hosting 사용

```bash
# Firebase CLI 로그인
firebase login

# 프로젝트 초기화
firebase init hosting

# 배포
firebase deploy
```

## 📧 문의

문의사항이 있으시면 언제든지 연락해주세요!

