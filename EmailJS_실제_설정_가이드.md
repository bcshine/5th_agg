# 📧 실제 EmailJS 계정 5분 설정 가이드

## 🚀 빠른 설정 (5분 소요)

### 1단계: EmailJS 계정 생성
1. **https://www.emailjs.com** 접속
2. **"Sign Up Free"** 클릭
3. 이메일/비밀번호로 계정 생성 (구글 로그인도 가능)
4. 이메일 인증 완료

### 2단계: Gmail 서비스 연결
1. EmailJS 대시보드에서 **"Email Services"** 클릭
2. **"Add New Service"** 버튼 클릭
3. **"Gmail"** 선택
4. **"Connect Account"** 클릭하여 본인 Gmail 연결
5. 서비스 이름: `gmail_service` (기본값 사용)
6. **"Create Service"** 클릭

### 3단계: 이메일 템플릿 생성
1. **"Email Templates"** 클릭
2. **"Create New Template"** 클릭
3. 다음 내용 입력:

**Template Name:** `answer_template`

**Subject:** `[중간계 AI 스튜디오] 문의 답변`

**Content:**
```
안녕하세요 {{to_name}}님,

중간계 AI 스튜디오입니다.
문의해 주신 내용에 대해 답변드립니다.

{{message}}

감사합니다.
중간계 AI 스튜디오
```

4. **"Save"** 클릭

### 4단계: API 키 확인
1. **"Account"** → **"General"** 클릭
2. **"API Keys"** 섹션에서 **Public Key** 복사
3. 서비스 목록에서 **Service ID** 복사
4. 템플릿 목록에서 **Template ID** 복사

### 5단계: 코드에 적용
아래 3개 값을 `admin.js` 파일에 입력:

1. **Public Key** (495행 근처)
2. **Service ID** (2127행 근처)  
3. **Template ID** (2128행 근처)

---

## 💡 빠른 적용 방법

설정 완료 후 아래 내용을 사용자에게 제공하여 즉시 적용할 수 있도록 안내합니다. 