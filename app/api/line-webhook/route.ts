
// import { NextRequest, NextResponse } from 'next/server';
// import crypto from 'crypto';
// import { prisma } from '@/lib/prisma';

// // Add your LINE Channel Secret here
// const CHANNEL_SECRET = process.env.LINE_CHANNEL_SECRET || '';
// const CHANNEL_ACCESS_TOKEN = process.env.LINE_CHANNEL_ACCESS_TOKEN || '';

// // In-memory session storage (use Redis in production)
// const userSessions = new Map<string, {
//   step: 'awaiting_area' | 'awaiting_question' | 'awaiting_confirmation';
//   currentQuestion: number;
//   area?: string;
//   reportId?: string;
// }>();

// // Question list
// const questions = [
//   'あなたの好きな数字はなんですか？ 入力してください。',
//   'あなたの二番目に好きな色はなんですか？',
//   '質問3をここに入力',
//   '質問4をここに入力',
//   '質問5をここに入力',
//   '質問6をここに入力',
//   '質問7をここに入力',
//   '質問8をここに入力',
//   '質問9をここに入力',
//   '質問10をここに入力',
//   '質問11をここに入力',
//   '質問12をここに入力',
//   '質問13をここに入力',
//   '質問14をここに入力',
//   '質問15をここに入力',
//   '質問16をここに入力',
//   '質問17をここに入力',
//   '質問18をここに入力',
//   '質問19をここに入力',
//   '質問20をここに入力',
// ];

// // Verify LINE signature
// function verifySignature(body: string, signature: string): boolean {
//   if (!CHANNEL_SECRET) return true; // Skip verification in development
  
//   const hash = crypto
//     .createHmac('sha256', CHANNEL_SECRET)
//     .update(body)
//     .digest('base64');
  
//   return hash === signature;
// }

// // Send reply message to LINE
// async function replyMessage(replyToken: string, messages: any[]) {
//   const response = await fetch('https://api.line.me/v2/bot/message/reply', {
//     method: 'POST',
//     headers: {
//       'Content-Type': 'application/json',
//       'Authorization': `Bearer ${CHANNEL_ACCESS_TOKEN}`,
//     },
//     body: JSON.stringify({
//       replyToken,
//       messages,
//     }),
//   });

//   if (!response.ok) {
//     throw new Error(`LINE API error: ${response.status}`);
//   }

//   return response.json();
// }

// export async function POST(request: NextRequest) {
//   try {
//     // Get raw body for signature verification
//     const body = await request.text();
//     const signature = request.headers.get('x-line-signature') || '';

//     // Verify signature
//     if (!verifySignature(body, signature)) {
//       return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
//     }

//     // Parse the webhook data
//     const data = JSON.parse(body);
    
//     // Process each event
//     for (const event of data.events) {
//       // Only handle message events
//       if (event.type !== 'message' || event.message.type !== 'text') {
//         continue;
//       }

//       const userId = event.source.userId;
//       const userMessage = event.message.text.trim();
//       const session = userSessions.get(userId);

//       // Start flow: User sends "報告"
//       if (userMessage === '報告') {
//         userSessions.set(userId, { 
//           step: 'awaiting_area',
//           currentQuestion: 0
//         });
        
//         await replyMessage(event.replyToken, [
//           {
//             type: 'text',
//             text: '七の日報告ですね。あなたの地区を選んでください。\n1. せんげん台\n2. 北越\n3. 門前\n4. 新越\n5. 吉松\n6. 三郷',
//           },
//         ]);
//       }
//       // Step 1: Handle area selection (1-6)
//       else if (session?.step === 'awaiting_area' && ['1', '2', '3', '4', '5', '6'].includes(userMessage)) {
//         const districts = ['せんげん台', '北越', '門前', '新越', '吉松', '三郷'];
//         const selectedDistrict = districts[parseInt(userMessage) - 1];
        
//         // Create initial report in MongoDB
//         const report = await prisma.report.create({
//           data: {
//             area: selectedDistrict,
//           },
//         });
        
//         userSessions.set(userId, {
//           step: 'awaiting_question',
//           currentQuestion: 1,
//           area: selectedDistrict,
//           reportId: report.id,
//         });
        
//         await replyMessage(event.replyToken, [
//           {
//             type: 'text',
//             text: `${selectedDistrict}ですね。\n${questions[0]}`,
//           },
//         ]);
//       }
//       // Step 2+: Handle Q1-Q20 answers
//       else if (session?.step === 'awaiting_question') {
//         const questionNumber = session.currentQuestion;
//         const fieldName = `Q${questionNumber}`;
        
//         // Validate that input is a number
//         if (!/^\d+$/.test(userMessage)) {
//           await replyMessage(event.replyToken, [
//             {
//               type: 'text',
//               text: '数字を入力してください。',
//             },
//           ]);
//           return NextResponse.json({ success: true });
//         }
        
//         // Convert string to integer
//         const answerNumber = parseInt(userMessage, 10);
        
//         // Update the current question answer in MongoDB
//         await prisma.report.update({
//           where: { id: session.reportId },
//           data: { [fieldName]: answerNumber },
//         });
        
//         // Check if we have more questions
//         if (questionNumber < 20) {
//           // Move to next question
//           userSessions.set(userId, {
//             ...session,
//             currentQuestion: questionNumber + 1,
//           });
          
//           await replyMessage(event.replyToken, [
//             {
//               type: 'text',
//               text: questions[questionNumber],
//             },
//           ]);
//         } else {
//           // All questions completed - show summary for confirmation
//           const report = await prisma.report.findUnique({
//             where: { id: session.reportId },
//           });
          
//           if (!report) {
//             throw new Error('Report not found');
//           }
          
//           // Build summary message
//           let summary = `【入力内容の確認】\n\n地区: ${report.area}\n`;
//           for (let i = 1; i <= 20; i++) {
//             const answer = report[`Q${i}` as keyof typeof report];
//             summary += `Q${i}: ${answer}\n`;
//           }
//           summary += '\nこれで登録して良いですか？\n1. はい\n2. いいえ';
          
//           userSessions.set(userId, {
//             ...session,
//             step: 'awaiting_confirmation',
//           });
          
//           await replyMessage(event.replyToken, [
//             {
//               type: 'text',
//               text: summary,
//             },
//           ]);
//         }
//       }
//       // Step 3: Handle confirmation
//       else if (session?.step === 'awaiting_confirmation') {
//         if (userMessage === '1') {
//           // Confirm and save
//           userSessions.delete(userId);
          
//           await replyMessage(event.replyToken, [
//             {
//               type: 'text',
//               text: '報告を保存しました。ありがとうございました！',
//             },
//           ]);
//         } else if (userMessage === '2') {
//           // Cancel and delete report
//           await prisma.report.delete({
//             where: { id: session.reportId },
//           });
          
//           userSessions.delete(userId);
          
//           await replyMessage(event.replyToken, [
//             {
//               type: 'text',
//               text: '登録をキャンセルしました。最初からやり直す場合は「報告」と入力してください。',
//             },
//           ]);
//         } else {
//           // Invalid input
//           await replyMessage(event.replyToken, [
//             {
//               type: 'text',
//               text: '1 または 2 を入力してください。\n1. はい\n2. いいえ',
//             },
//           ]);
//         }
//       }
//     }

//     return NextResponse.json({ success: true });
//   } catch (error) {
//     console.error('Webhook error:', error);
//     return NextResponse.json(
//       { error: 'Internal server error' },
//       { status: 500 }
//     );
//   }
// }

// // Handle GET requests (for webhook verification)
// export async function GET() {
//   return NextResponse.json({ status: 'LINE webhook endpoint is running' });
// }

import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { prisma } from '@/lib/prisma';

// Add your LINE Channel Secret here
const CHANNEL_SECRET = process.env.LINE_CHANNEL_SECRET || '';
const CHANNEL_ACCESS_TOKEN = process.env.LINE_CHANNEL_ACCESS_TOKEN || '';

// In-memory session storage (use Redis in production)
const userSessions = new Map<string, {
  step: 'awaiting_area' | 'awaiting_question' | 'awaiting_confirmation';
  currentQuestion: number;
  area?: string;
  reportId?: string;
}>();

// Question list
const questions = [
  '❶12月伝道着地見込み　三帰者人数',
  '❷12月伝道着地見込み　入会者人数',
  '❸ふれ愛活動(11/27〜12/17の期間)',
  '❹ふれ愛活動筋親数',
  '❺月一程度、支部に来る信者数',
  '❼まだ定期的には支部に来ない信者数',
  '❽再訪可能で、今月ふれ愛できた一般人数',
  '❾新規開拓でふれ愛できた一般人数',
  // '質問10をここに入力',
  // '質問11をここに入力',
  // '質問12をここに入力',
  // '質問13をここに入力',
  // '質問14をここに入力',
  // '質問15をここに入力',
  // '質問16をここに入力',
  // '質問17をここに入力',
  // '質問18をここに入力',
  // '質問19をここに入力',
  // '質問20をここに入力',
];

// Total number of active questions (drives the Q&A flow)
const TOTAL_QUESTIONS = questions.length;

// Normalize full-width numbers to half-width numbers
function normalizeNumber(text: string): string {
  const fullWidthToHalfWidth: { [key: string]: string } = {
    '１': '1', '２': '2', '３': '3', '４': '4', '５': '5',
    '６': '6', '７': '7', '８': '8', '９': '9', '０': '0'
  };
  
  let normalized = text;
  for (const [fw, hw] of Object.entries(fullWidthToHalfWidth)) {
    normalized = normalized.replace(new RegExp(fw, 'g'), hw);
  }
  return normalized;
}

// Verify LINE signature
function verifySignature(body: string, signature: string): boolean {
  if (!CHANNEL_SECRET) return true; // Skip verification in development
  
  const hash = crypto
    .createHmac('sha256', CHANNEL_SECRET)
    .update(body)
    .digest('base64');
  
  return hash === signature;
}

// Send reply message to LINE
async function replyMessage(replyToken: string, messages: any[]) {
  const response = await fetch('https://api.line.me/v2/bot/message/reply', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${CHANNEL_ACCESS_TOKEN}`,
    },
    body: JSON.stringify({
      replyToken,
      messages,
    }),
  });

  if (!response.ok) {
    throw new Error(`LINE API error: ${response.status}`);
  }

  return response.json();
}

export async function POST(request: NextRequest) {
  try {
    // Get raw body for signature verification
    const body = await request.text();
    const signature = request.headers.get('x-line-signature') || '';

    // Verify signature
    if (!verifySignature(body, signature)) {
      return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
    }

    // Parse the webhook data
    const data = JSON.parse(body);
    
    // Process each event
    for (const event of data.events) {
      // Only handle message events
      if (event.type !== 'message' || event.message.type !== 'text') {
        continue;
      }

      const userId = event.source.userId;
      const userMessage = event.message.text.trim();
      const session = userSessions.get(userId);

      // Display matrix: User sends "集計"
      if (userMessage === '集計') {
        try {
          // Calculate date 3 days ago
          const threeDaysAgo = new Date();
          threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);
          
          // Fetch only reports from the last 3 days
          const reports = await prisma.report.findMany({
            where: {
              createdAt: {
                gte: threeDaysAgo, // Greater than or equal to 3 days ago
              },
            },
          });
          
          // Group reports by area
          const areas = ['せんげん台', '北越', '門前', '新越', '吉松', '三郷'];
          
          // Calculate totals for each area and question
          const areaData: { [key: string]: number[] } = {};
          areas.forEach(area => {
            areaData[area] = Array(20).fill(0);
          });
          
          type ReportType = typeof reports[number];
          reports.forEach((report: ReportType) => {
            if (areaData[report.area]) {
              for (let i = 1; i <= 20; i++) {
                const value = report[`Q${i}` as keyof typeof report] as number;
                areaData[report.area][i - 1] += value || 0;
              }
            }
          });
          
          // Calculate grand totals
          const totals = Array(20).fill(0);
          Object.values(areaData).forEach(areaValues => {
            areaValues.forEach((value, index) => {
              totals[index] += value;
            });
          });
          
          // Build 4 message blocks (Q1-5, Q6-10, Q11-15, Q16-20)
          const messages = [];
          
          // Add informational message about date range
          messages.push({
            type: 'text',
            text: `【集計結果】\n過去3日間のデータのみを使用しています。\n（${reports.length}件の報告）\n`,
          });
          
          for (let block = 0; block < 4; block++) {
            const startQ = block * 5 + 1;
            const endQ = startQ + 4;
            
            let message = `地区　　　　　Q${startQ} / Q${startQ+1} / Q${startQ+2} / Q${startQ+3} / Q${startQ+4}\n`;
            
            areas.forEach(area => {
              const values = areaData[area].slice(startQ - 1, endQ);
              message += `${area.padEnd(10, '　')}${values.join(' / ')}\n`;
            });
            
            const totalValues = totals.slice(startQ - 1, endQ);
            message += `合計　　　　　${totalValues.join(' / ')}`;
            
            messages.push({
              type: 'text',
              text: message,
            });
          }
          
          await replyMessage(event.replyToken, messages);
          return NextResponse.json({ success: true });
        } catch (error) {
          console.error('Failed to generate matrix:', error);
          await replyMessage(event.replyToken, [
            {
              type: 'text',
              text: '集計の取得に失敗しました。',
            },
          ]);
          return NextResponse.json({ success: true });
        }
      }

      // Start flow: User sends "報告"
      if (userMessage === '報告') {
        userSessions.set(userId, { 
          step: 'awaiting_area',
          currentQuestion: 0
        });
        
        await replyMessage(event.replyToken, [
          {
            type: 'text',
            text: '七の日報告ですね。あなたの地区を選んでください。\n1. せんげん台\n2. 北越\n3. 門前\n4. 新越\n5. 吉松\n6. 三郷',
          },
        ]);
      }
      // Step 1: Handle area selection (1-6) - accepts both half-width and full-width numbers
      else if (session?.step === 'awaiting_area') {
        // Normalize full-width numbers to half-width
        const normalizedMessage = normalizeNumber(userMessage);
        
        // Check if it's a valid district number (1-6)
        if (!['1', '2', '3', '4', '5', '6'].includes(normalizedMessage)) {
          await replyMessage(event.replyToken, [
            {
              type: 'text',
              text: '無効な選択です。1〜6の番号で選んでください。',
            },
          ]);
          return NextResponse.json({ success: true });
        }
        
        const districts = ['せんげん台', '北越', '門前', '新越', '吉松', '三郷'];
        const selectedDistrict = districts[parseInt(normalizedMessage, 10) - 1];
        
        // Create initial report in MongoDB
        const report = await prisma.report.create({
          data: {
            area: selectedDistrict,
          },
        });
        
        userSessions.set(userId, {
          step: 'awaiting_question',
          currentQuestion: 1,
          area: selectedDistrict,
          reportId: report.id,
        });
        
        await replyMessage(event.replyToken, [
          {
            type: 'text',
            text: `${selectedDistrict}ですね。\n${questions[0]}`,
          },
        ]);
      }
      // Step 2+: Handle Q1-Q20 answers - accepts both half-width and full-width numbers
      else if (session?.step === 'awaiting_question') {
        const questionNumber = session.currentQuestion;
        const fieldName = `Q${questionNumber}`;
        
        // Normalize full-width numbers to half-width
        const normalizedMessage = normalizeNumber(userMessage);
        
        // Validate that input is a number (after normalization)
        if (!/^\d+$/.test(normalizedMessage)) {
          await replyMessage(event.replyToken, [
            {
              type: 'text',
              text: '数字を入力してください。',
            },
          ]);
          return NextResponse.json({ success: true });
        }
        
        // Convert string to integer
        const answerNumber = parseInt(normalizedMessage, 10);
        
        // Update the current question answer in MongoDB
        await prisma.report.update({
          where: { id: session.reportId },
          data: { [fieldName]: answerNumber },
        });
        
        // Check if we have more questions
        if (questionNumber < TOTAL_QUESTIONS) {
          // Move to next question
          userSessions.set(userId, {
            ...session,
            currentQuestion: questionNumber + 1,
          });
          
          await replyMessage(event.replyToken, [
            {
              type: 'text',
              text: questions[questionNumber],
            },
          ]);
        } else {
          // All questions completed - show summary for confirmation
          const report = await prisma.report.findUnique({
            where: { id: session.reportId },
          });
          
          if (!report) {
            throw new Error('Report not found');
          }
          
          // Build summary message
          let summary = `【入力内容の確認】\n\n地区: ${report.area}\n`;
          for (let i = 1; i <= 20; i++) {
            const answer = report[`Q${i}` as keyof typeof report];
            summary += `Q${i}: ${answer}\n`;
          }
          summary += '\nこれで登録して良いですか？\n1. はい\n2. いいえ';
          
          userSessions.set(userId, {
            ...session,
            step: 'awaiting_confirmation',
          });
          
          await replyMessage(event.replyToken, [
            {
              type: 'text',
              text: summary,
            },
          ]);
        }
      }
      // Step 3: Handle confirmation - accepts both half-width and full-width numbers
      else if (session?.step === 'awaiting_confirmation') {
        // Normalize full-width numbers to half-width
        const normalizedMessage = normalizeNumber(userMessage);
        
        if (normalizedMessage === '1') {
          // Confirm and save
          userSessions.delete(userId);
          
          await replyMessage(event.replyToken, [
            {
              type: 'text',
              text: '報告を保存しました。ありがとうございました！',
            },
          ]);
        } else if (normalizedMessage === '2') {
          // Cancel and delete report
          await prisma.report.delete({
            where: { id: session.reportId },
          });
          
          userSessions.delete(userId);
          
          await replyMessage(event.replyToken, [
            {
              type: 'text',
              text: '登録をキャンセルしました。最初からやり直す場合は「報告」と入力してください。',
            },
          ]);
        } else {
          // Invalid input
          await replyMessage(event.replyToken, [
            {
              type: 'text',
              text: '1 または 2 を入力してください。\n1. はい\n2. いいえ',
            },
          ]);
        }
      }
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Webhook error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// Handle GET requests (for webhook verification)
export async function GET() {
  return NextResponse.json({ status: 'LINE webhook endpoint is running' });
}