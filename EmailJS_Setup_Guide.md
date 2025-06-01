# EmailJS 설정 가이드

## 📧 현재 상태: 이메일 전송 시뮬레이션 모드

현재 관리자 패널은 **이메일 전송 시뮬레이션 모드**로 작동합니다.
- ✅ 답변은 Firebase에 정상 저장됩니다
- ✅ 관리자 페이지에서 답변 완료로 표시됩니다  
- 📧 실제 이메일은 전송되지 않지만, 브라우저 콘솔에서 전송될 이메일 내용을 확인할 수 있습니다

## 🎭 시뮬레이션 모드 확인 방법

1. 관리자 페이지에서 질문에 답변 작성
2. "답변 전송" 클릭
3. 브라우저 **F12 → Console** 탭 확인
4. `=== 이메일 전송 시뮬레이션 ===` 메시지와 함께 실제 전송될 이메일 내용 확인

## 🚀 실제 이메일 전송 설정 방법

실제 이메일 전송을 원한다면 다음 중 하나를 선택하세요:

### 옵션 1: EmailJS 무료 서비스 설정

1. [https://www.emailjs.com](https://www.emailjs.com) 접속
2. **Sign Up** 클릭하여 무료 계정 생성
3. **Email Services** → **Add New Service** → **Gmail** 선택
4. Gmail 계정 연동 완료
5. **Email Templates** → **Create New Template** 클릭
6. 다음 템플릿 설정:

```
Template Name: Answer Template
Subject: {{subject}}
Content:
{{message}}

From: {{from_name}}
Reply To: {{reply_to}}
```

7. **Account** → **API Keys**에서 Public Key 확인
8. `admin.js` 파일 수정:

```javascript
// 495행 근처
const publicKey = 'YOUR_ACTUAL_PUBLIC_KEY'; // 실제 Public Key로 변경

// 2127행 근처  
const serviceId = 'YOUR_SERVICE_ID';     // 실제 Service ID로 변경
const templateId = 'YOUR_TEMPLATE_ID';   // 실제 Template ID로 변경
```

### 옵션 2: Gmail SMTP 직접 연동 (백엔드 필요)

백엔드 API를 통해 Gmail SMTP를 직접 사용할 수 있습니다.

### 옵션 3: 다른 이메일 서비스

- SendGrid
- Mailgun  
- AWS SES
- Nodemailer

## 🔧 현재 시뮬레이션 코드 위치

`public/admin.js` 파일의 다음 함수들에서 이메일 전송을 처리합니다:

- `sendAnswerEmail()` (2086행 근처)
- `simulateEmailSending()` (2185행 근처)

## ✅ 장점

**시뮬레이션 모드의 장점:**
- 답변 기능 완전 작동
- Firebase 저장 확인 가능
- 이메일 내용 미리보기 가능
- 실제 이메일 전송 없이 테스트 가능

## 📞 문의

실제 이메일 전송 설정이 필요하시면 개발팀에 문의해주세요.

**연락처:** midcampus31@gmail.com

## 📧 이메일 자동 답변 기능 설정 방법

현재 관리자 패널에서 답변을 작성하면 Firebase에는 저장되지만 실제 이메일은 전송되지 않습니다. 
이는 EmailJS 서비스 설정이 완료되지 않았기 때문입니다.

## 🚀 설정 단계

### 1. EmailJS 계정 생성
1. [https://www.emailjs.com](https://www.emailjs.com) 접속
2. **Sign Up** 클릭하여 계정 생성
3. 이메일 인증 완료

### 2. Email Service 연결
1. EmailJS 대시보드에서 **Email Services** 클릭
2. **Add New Service** 버튼 클릭
3. **Gmail** 선택 (추천)
4. 본인의 Gmail 계정으로 연결 승인
5. Service ID 확인 및 복사 (예: `service_abc123xyz`)

### 3. Email Template 생성
1. EmailJS 대시보드에서 **Email Templates** 클릭
2. **Create New Template** 버튼 클릭
3. 다음 템플릿 내용 입력:

```html
제목: [중간계 AI 스튜디오] {{question_title}} 문의에 대한 답변

내용:
안녕하세요 {{to_name}}님,

중간계 AI 스튜디오입니다.
문의해 주신 "{{question_title}}" 에 대해 답변드립니다.

===== 원래 문의 내용 =====
{{question_content}}

===== 답변 내용 =====
{{answer_content}}

추가 문의사항이 있으시면 언제든지 연락해 주세요.
감사합니다.

{{admin_name}}
{{company_name}}
이메일: {{contact_email}}
웹사이트: {{website}}

답변일시: {{reply_date}}
```

4. Template ID 확인 및 복사 (예: `template_xyz789abc`)

### 4. Public Key 확인
1. EmailJS 대시보드에서 **Account** > **API Keys** 클릭
2. Public Key 확인 및 복사 (예: `user_abc123xyz`)

### 5. 코드 설정
`public/admin.js` 파일을 다음과 같이 수정:

```javascript
// 줄 번호 약 457 근처 - initializeEmailJS 함수
const publicKey = 'YOUR_EMAILJS_PUBLIC_KEY'; // 복사한 Public Key로 교체
```

```javascript
// 줄 번호 약 2064 근처 - sendAnswerEmail 함수
const serviceId = 'YOUR_SERVICE_ID';      // 복사한 Service ID로 교체
const templateId = 'YOUR_TEMPLATE_ID';    // 복사한 Template ID로 교체
```

### 6. 설정 완료 확인
1. 브라우저에서 관리자 페널 새로고침
2. 개발자 도구 콘솔에서 "✅ EmailJS 초기화 완료" 메시지 확인
3. 테스트 답변 작성 및 전송
4. 실제 이메일 수신 확인

## 📝 템플릿 변수 설명

EmailJS 템플릿에서 사용 가능한 변수들:

- `{{to_email}}` - 수신자 이메일
- `{{to_name}}` - 수신자 이름
- `{{question_title}}` - 질문 제목
- `{{question_content}}` - 질문 내용
- `{{answer_content}}` - 답변 내용
- `{{admin_name}}` - 답변한 관리자 이름
- `{{company_name}}` - 회사명
- `{{contact_email}}` - 연락처 이메일
- `{{website}}` - 웹사이트 주소
- `{{reply_date}}` - 답변 일시

## 🔧 트러블슈팅

### "EmailJS 라이브러리가 로드되지 않았습니다" 오류
- 인터넷 연결 확인
- 브라우저 새로고침
- 개발자 도구에서 네트워크 오류 확인

### "이메일 전송 실패: 400" 오류
- Service ID가 올바른지 확인
- Template ID가 올바른지 확인
- Public Key가 올바른지 확인
- Gmail 계정 연결 상태 확인

### "수신자 이메일 주소가 없습니다" 오류
- 질문 작성 시 이메일 필드가 제대로 입력되었는지 확인
- Firebase 데이터에 이메일 정보가 저장되어 있는지 확인

## 💡 추천 설정

1. **Gmail 필터 설정**: 중간계 AI 스튜디오 관련 이메일이 스팸으로 분류되지 않도록 Gmail 필터 설정
2. **템플릿 다양화**: 질문 유형별로 다른 템플릿 생성 (일반 문의, 기술 지원, 서비스 안내 등)
3. **모니터링**: EmailJS 대시보드에서 이메일 전송 현황 정기 확인

## 📞 지원

설정 과정에서 문제가 발생하면:
1. EmailJS 공식 문서: [https://www.emailjs.com/docs/](https://www.emailjs.com/docs/)
2. 개발자 도구 콘솔 메시지 확인
3. 네트워크 오류 여부 확인

---

설정 완료 후에는 답변 작성 시 실제 이메일이 자동으로 전송됩니다! 🎉 