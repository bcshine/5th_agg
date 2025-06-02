/**
 * Import function triggers from their respective submodules:
 *
 * const {onCall} = require("firebase-functions/v2/https");
 * const {onDocumentWritten} = require("firebase-functions/v2/firestore");
 *
 * See a full list of supported triggers at https://firebase.google.com/docs/functions
 */

const {onRequest} = require("firebase-functions/v2/https");
const logger = require("firebase-functions/logger");
const { onDocumentCreated } = require("firebase-functions/v2/firestore");
const { getFirestore } = require("firebase-admin/firestore");
const { initializeApp } = require("firebase-admin/app");
const nodemailer = require("nodemailer");

// Create and deploy your first functions
// https://firebase.google.com/docs/functions/get-started

// exports.helloWorld = onRequest((request, response) => {
//   logger.info("Hello logs!", {structuredData: true});
//   response.send("Hello from Firebase!");
// });

// Firebase Admin 초기화
initializeApp();
const db = getFirestore();

/**
 * Gmail SMTP transporter 생성
 * @return {Object} nodemailer transporter
 * Updated: 2025-06-01 - Fixed function name issue
 */
const createTransporter = () => {
  return nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: process.env.GMAIL_EMAIL || 'bcshin03@gmail.com',
      pass: process.env.GMAIL_PASSWORD || 'cadclodgdwczwslh'
    }
  });
};

/**
 * emails 컬렉션에 새 문서가 생성될 때 자동으로 이메일 전송
 */
exports.sendEmailOnCreate = onDocumentCreated(
  "emails/{emailId}",
  async (event) => {
    const emailData = event.data.data();
    const emailId = event.params.emailId;
    
    logger.info("📧 새 이메일 요청 감지", { 
      emailId, 
      to: emailData.to,
      subject: emailData.subject 
    });

    try {
      // 이미 처리된 이메일인지 확인
      if (emailData.status !== 'pending') {
        logger.info("이미 처리된 이메일", { emailId, status: emailData.status });
        return;
      }

      // 이메일 전송 상태를 'sending'으로 업데이트
      await db.collection('emails').doc(emailId).update({
        status: 'sending',
        processedAt: new Date()
      });

      // 이메일 내용 구성
      const htmlContent = createEmailHTML(emailData);
      
      // 이메일 전송 설정 - Updated for admin name display
      const mailOptions = {
        from: `${emailData.adminName} <${emailData.adminEmail}>`,
        to: emailData.to,
        subject: emailData.subject,
        html: htmlContent,
        replyTo: emailData.adminEmail
      };

      // 이메일 전송
      const transporter = createTransporter();
      const result = await transporter.sendMail(mailOptions);
      
      logger.info("✅ 이메일 전송 성공", { 
        emailId, 
        messageId: result.messageId,
        to: emailData.to 
      });

      // 전송 성공 상태로 업데이트
      await db.collection('emails').doc(emailId).update({
        status: 'sent',
        sentAt: new Date(),
        messageId: result.messageId
      });

    } catch (error) {
      logger.error("❌ 이메일 전송 실패", { 
        emailId, 
        error: error.message,
        stack: error.stack 
      });

      // 전송 실패 상태로 업데이트
      await db.collection('emails').doc(emailId).update({
        status: 'failed',
        failedAt: new Date(),
        errorMessage: error.message
      });
    }
  }
);

/**
 * 이메일 HTML 템플릿 생성
 * @param {Object} emailData 이메일 데이터
 * @return {string} HTML 템플릿 문자열
 */
function createEmailHTML(emailData) {
  const { 
    toName, 
    questionTitle, 
    questionContent, 
    answerContent, 
    adminName, 
    companyName 
  } = emailData;

  const styles = `
    body { 
      font-family: 'Malgun Gothic', '맑은 고딕', Arial, sans-serif; 
      line-height: 1.6; 
      color: #333; 
      margin: 0; 
      padding: 0; 
      background-color: #f4f4f4; 
    }
    .container { 
      max-width: 600px; 
      margin: 20px auto; 
      background: white; 
      border-radius: 8px; 
      overflow: hidden; 
      box-shadow: 0 2px 10px rgba(0,0,0,0.1); 
    }
    .header { 
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); 
      color: white; 
      padding: 30px; 
      text-align: center; 
    }
    .header h1 { 
      margin: 0; 
      font-size: 24px; 
      font-weight: 600; 
    }
    .content { 
      padding: 30px; 
    }
    .question-box { 
      background: #f8f9fa; 
      border-left: 4px solid #007bff; 
      padding: 15px; 
      margin: 20px 0; 
      border-radius: 4px; 
    }
    .answer-box { 
      background: #e8f5e8; 
      border-left: 4px solid #28a745; 
      padding: 15px; 
      margin: 20px 0; 
      border-radius: 4px; 
    }
    .footer { 
      background: #f8f9fa; 
      padding: 20px; 
      text-align: center; 
      font-size: 14px; 
      color: #666; 
      border-top: 1px solid #e5e5e5; 
    }
    .greeting { 
      font-size: 16px; 
      margin-bottom: 20px; 
    }
    .label { 
      font-weight: 600; 
      color: #333; 
      margin-bottom: 8px; 
    }
    .signature { 
      margin-top: 30px; 
      padding-top: 20px; 
      border-top: 1px solid #e5e5e5; 
      font-size: 14px; 
      color: #666; 
    }
  `;

  return `
    <!DOCTYPE html>
    <html lang="ko">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>문의 답변</title>
      <style>${styles}</style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>${companyName}</h1>
          <p>문의 답변 메일</p>
        </div>
        
        <div class="content">
          <div class="greeting">
            안녕하세요, <strong>${toName}</strong>님!<br>
            문의해 주셔서 감사합니다.
          </div>
          
          <div class="question-box">
            <div class="label">📝 고객님의 문의</div>
            <h3 style="margin: 10px 0; color: #333;">${questionTitle}</h3>
            <p style="margin: 10px 0; white-space: pre-line;">${questionContent}</p>
          </div>
          
          <div class="answer-box">
            <div class="label">💬 답변 내용</div>
            <p style="margin: 10px 0; white-space: pre-line;">${answerContent}</p>
          </div>
          
          <div class="signature">
            <p><strong>${adminName}</strong><br>
            ${companyName}</p>
            
            <p style="margin-top: 20px; font-size: 13px; color: #888;">
              추가 문의사항이 있으시면 언제든지 연락해 주세요.<br>
              이 메일에 직접 답장하시거나 bcshin03@gmail.com으로 연락해 주시기 바랍니다.
            </p>
          </div>
        </div>
        
        <div class="footer">
          <p>© 2025 ${companyName}. All rights reserved.</p>
          <p>이 메일은 자동으로 발송된 메일입니다.</p>
        </div>
      </div>
    </body>
    </html>
  `;
}

/**
 * 테스트용 HTTP 함수
 */
exports.testEmailFunction = onRequest(async (request, response) => {
  try {
    const testEmailData = {
      type: 'test',
      to: 'bcshin03@gmail.com',
      toName: '테스트 사용자',
      subject: '[테스트] 중간계 AI 스튜디오 이메일 시스템',
      questionTitle: '테스트 질문입니다',
      questionContent: '이것은 이메일 시스템 테스트입니다.',
      answerContent: '테스트 답변입니다. 시스템이 정상적으로 작동하고 있습니다.',
      adminName: '관리자',
      companyName: '중간계 AI 스튜디오',
      status: 'pending'
    };

    // 테스트 이메일 생성
    const docRef = await db.collection('emails').add({
      ...testEmailData,
      createdAt: new Date()
    });

    response.json({
      success: true,
      message: '테스트 이메일이 생성되었습니다.',
      emailId: docRef.id
    });

  } catch (error) {
    logger.error("테스트 이메일 생성 실패", error);
    response.status(500).json({
      success: false,
      error: error.message
    });
  }
});
