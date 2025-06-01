# EmailJS 설정 가이드

## 📧 실제 이메일 발송을 위한 EmailJS 설정

현재 시스템은 이메일 발송 **시뮬레이션** 모드로 작동하고 있습니다.
실제 이메일을 발송하려면 아래 단계를 따라주세요.

### 1단계: EmailJS 회원가입
1. https://www.emailjs.com/ 접속
2. **Sign Up Free** 클릭하여 회원가입
3. 이메일 인증 완료

### 2단계: 이메일 서비스 연결
1. EmailJS 대시보드에서 **Email Services** 클릭
2. **Add New Service** 클릭
3. **Gmail** 선택 (또는 원하는 이메일 서비스)
4. **Connect Account** 클릭
5. Gmail 계정 로그인 후 권한 승인
   - ⚠️ **중요**: "나를 대신하여 이메일 전송" 권한 체크 필수!
6. **Create Service** 클릭

### 3단계: 이메일 템플릿 생성
1. **Email Templates** 클릭
2. **Create New Template** 클릭
3. 템플릿 내용 설정:
   ```
   제목: [중간계 AI 스튜디오] {{question_title}} 답변
   
   내용:
   안녕하세요, {{to_name}}님.
   
   중간계 AI 스튜디오입니다.
   문의해 주신 내용에 대해 답변드립니다.
   
   ■ 질문 제목: {{question_title}}
   ■ 질문 내용: {{question_content}}
   
   ■ 답변:
   {{answer_content}}
   
   추가 문의사항이 있으시면 언제든지 연락해 주세요.
   감사합니다.
   
   {{company_name}}
   {{company_email}}
   {{reply_date}}
   ```
4. **To Email**: {{to_email}}
5. **From Name**: {{from_name}}
6. **Save** 클릭

### 4단계: API 키 설정
1. **Account** 메뉴에서 API 키 확인
2. `admin.js` 파일에서 다음 부분 수정:
   ```javascript
   const serviceId = 'YOUR_SERVICE_ID'; // → 실제 Service ID
   const templateId = 'YOUR_TEMPLATE_ID'; // → 실제 Template ID  
   const publicKey = 'YOUR_PUBLIC_KEY'; // → 실제 Public Key
   ```

### 5단계: 키 값 찾기
- **Service ID**: Email Services 페이지에서 확인
- **Template ID**: Email Templates 페이지에서 확인  
- **Public Key**: Account → API Keys에서 확인

## ✅ 설정 완료 후 테스트
1. 관리자 페이지에서 답변 작성
2. 답변 전송 버튼 클릭
3. 콘솔에서 이메일 발송 로그 확인
4. 실제 Gmail에서 답변 수신 확인

## 💡 무료 플랜 한도
- 월 200개 이메일까지 무료
- 그 이후는 유료 플랜 필요

## 🔧 문제 해결
1. **Gmail API 오류**: "나를 대신하여 이메일 전송" 권한 재확인
2. **템플릿 변수 오류**: 템플릿의 {{변수명}}과 코드의 변수명 일치 확인
3. **CORS 오류**: EmailJS는 클라이언트 사이드에서 작동하므로 CORS 문제 없음

설정 완료 후 실제 이메일이 발송됩니다! 