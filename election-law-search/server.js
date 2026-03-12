/**
 * 공직선거법 AI 법령 검색 시스템 - Server
 *
 * 3-Agent Architecture:
 *  Agent 1 (법령 수집 에이전트): 공직선거법 전체 구조 수집 및 캐싱
 *  Agent 2 (법조문 검색 에이전트): 질문 분석 → 관련 법조문 검색 (streaming)
 *  Agent 3 (판례/사례 에이전트): 관련 판례·기사·유권해석 검색 (streaming + web_search)
 */

'use strict';

const express = require('express');
const Anthropic = require('@anthropic-ai/sdk');
const path = require('path');

const app = express();
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

// ────────────────────────────────────────────────────────────
// System prompts
// ────────────────────────────────────────────────────────────

const SYSTEM_AGENT2 = `당신은 대한민국 공직선거법 전문 법조문 검색 에이전트입니다.

사용자의 질문을 분석하여 관련된 공직선거법 조문(및 시행령·시행규칙)을 정확하게 찾아 상세히 설명합니다.

**답변 형식 (반드시 준수):**

## 📋 관련 법조문

### [조문 번호] [조문 제목]
> **법문:** [정확한 조문 전문 또는 핵심 내용]

**해설:** [질문과의 연관성, 적용 범위, 해석 방법 등]

---

### [다음 관련 조문]
> **법문:** ...

**해설:** ...

---

## 💡 종합 해석
[여러 조문을 종합한 최종 답변]

**규정:** 관련 시행령·시행규칙이 있으면 반드시 포함하세요.
**정확성:** 법문은 최대한 정확하게, 모르면 핵심 내용만 서술하세요.
**범위:** 직접 관련 조문 + 간접 관련 조문 모두 포함하세요.`;

const SYSTEM_AGENT3 = `당신은 공직선거법 관련 판례·사례·동향 검색 전문 에이전트입니다.

사용자의 질문과 관련된 판례, 헌법재판소 결정, 선거관리위원회 유권해석, 최신 뉴스를 찾아 설명합니다.

**답변 형식 (반드시 준수):**

## ⚖️ 관련 판례 및 결정

### 📚 대법원·헌법재판소 판례
[사건 번호, 선고일, 판결 요지 포함]

### 🏛️ 선거관리위원회 유권해석
[관련 유권해석 번호·내용]

### 📰 관련 사례 및 동향
[실제 선거에서의 적용 사례, 최근 이슈]

---

## 📌 실무적 시사점
[판례·사례를 바탕으로 한 실무 적용 포인트]

**주의:** 정확하지 않은 판례 번호는 사용하지 마세요. 불확실한 경우 "유사 판례로는..." 형식으로 기술하세요.`;

// ────────────────────────────────────────────────────────────
// Agent 1: 법령 구조 수집 (캐시 포함)
// ────────────────────────────────────────────────────────────

let lawStructureCache = null;
let lawStructureLoading = false;

async function fetchLawStructure() {
  if (lawStructureCache) return lawStructureCache;
  if (lawStructureLoading) {
    // Wait until loaded
    await new Promise((resolve) => {
      const check = setInterval(() => {
        if (!lawStructureLoading) { clearInterval(check); resolve(); }
      }, 300);
    });
    return lawStructureCache;
  }

  lawStructureLoading = true;

  try {
    const response = await anthropic.messages.create({
      model: 'claude-opus-4-6',
      max_tokens: 8192,
      thinking: { type: 'adaptive' },
      system: `당신은 대한민국 공직선거법 전문가입니다. 법령 구조를 정확하고 체계적으로 정리합니다.`,
      messages: [{
        role: 'user',
        content: `공직선거법의 전체 장별 구조와 주요 조문을 다음 JSON 형식으로 정리해주세요.
JSON 외의 내용은 절대 출력하지 말고, 반드시 순수 JSON만 출력하세요:

{
  "laws": [
    {
      "id": "election_law",
      "name": "공직선거법",
      "fullName": "공직선거법 (公職選擧法)",
      "lastAmended": "2024년 최종 개정",
      "description": "간단 설명",
      "chapters": [
        {
          "number": "제1장",
          "title": "총칙",
          "range": "제1조~제9조",
          "keyArticles": [
            { "no": "제1조", "title": "목적", "summary": "공직선거의 공정성 확보 및 민주정치 발전" }
          ]
        }
      ]
    },
    {
      "id": "election_law_enforcement_decree",
      "name": "공직선거법 시행령",
      "fullName": "공직선거법 시행령",
      "lastAmended": "최근 개정",
      "description": "간단 설명",
      "chapters": []
    },
    {
      "id": "election_law_enforcement_rule",
      "name": "공직선거법 시행규칙",
      "fullName": "공직선거법 시행규칙",
      "lastAmended": "최근 개정",
      "description": "간단 설명",
      "chapters": []
    }
  ],
  "relatedLaws": [
    { "name": "선거관리위원회법", "description": "선거관리위원회 조직 및 운영" },
    { "name": "정치자금법", "description": "정치자금의 적법한 조달 및 사용" },
    { "name": "정당법", "description": "정당의 설립·운영 관련" }
  ]
}

공직선거법은 제1장(총칙)부터 제15장(벌칙)까지 포함하고, 각 장의 주요 조문(최소 3~5개)을 상세히 포함해주세요.`
      }]
    });

    let text = '';
    for (const block of response.content) {
      if (block.type === 'text') { text = block.text; break; }
    }

    // Extract JSON
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      try {
        lawStructureCache = JSON.parse(jsonMatch[0]);
      } catch {
        lawStructureCache = { raw: text };
      }
    } else {
      lawStructureCache = { raw: text };
    }
  } catch (err) {
    console.error('[Agent1] Error fetching law structure:', err.message);
    lawStructureCache = { error: '법령 구조 로딩 실패', message: err.message };
  } finally {
    lawStructureLoading = false;
  }

  return lawStructureCache;
}

// Pre-load on startup
fetchLawStructure().then(() => {
  console.log('[Agent1] 법령 구조 로딩 완료');
}).catch(console.error);

// ────────────────────────────────────────────────────────────
// Routes
// ────────────────────────────────────────────────────────────

// GET /api/law-structure  → Agent 1 result
app.get('/api/law-structure', async (req, res) => {
  try {
    const data = await fetchLawStructure();
    res.json({ ok: true, data });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

// POST /api/search  → Agent 2 + Agent 3 (SSE streaming)
app.post('/api/search', async (req, res) => {
  const { question } = req.body;

  if (!question || !question.trim()) {
    return res.status(400).json({ ok: false, error: '질문을 입력해주세요.' });
  }

  // SSE headers
  res.writeHead(200, {
    'Content-Type': 'text/event-stream; charset=utf-8',
    'Cache-Control': 'no-cache',
    'Connection': 'keep-alive',
    'X-Accel-Buffering': 'no',
  });

  const send = (type, payload) => {
    res.write(`data: ${JSON.stringify({ type, ...payload })}\n\n`);
  };

  try {
    // ── Agent 2: 관련 법조문 검색 ──────────────────────────
    send('agent_status', { agent: 2, status: 'working', message: '관련 법조문을 검색하는 중...' });

    const stream2 = anthropic.messages.stream({
      model: 'claude-opus-4-6',
      max_tokens: 4096,
      thinking: { type: 'adaptive' },
      system: SYSTEM_AGENT2,
      messages: [{ role: 'user', content: question }],
    });

    for await (const event of stream2) {
      if (event.type === 'content_block_delta' && event.delta.type === 'text_delta') {
        send('text', { agent: 2, chunk: event.delta.text });
      }
    }
    await stream2.finalMessage(); // ensure fully consumed
    send('agent_status', { agent: 2, status: 'done' });

    // ── Agent 3: 판례 및 사례 검색 (web_search 사용) ────────
    send('agent_status', { agent: 3, status: 'working', message: '관련 판례와 사례를 검색하는 중...' });

    const userMsgAgent3 = `공직선거법 관련 질문: "${question}"\n\n이 질문과 관련된 대법원 판례, 헌법재판소 결정, 선거관리위원회 유권해석, 최근 뉴스·사례를 웹 검색을 통해 찾아주세요.`;

    let messages3 = [{ role: 'user', content: userMsgAgent3 }];
    let continueLoop = true;
    let loopCount = 0;
    const MAX_LOOPS = 4;

    while (continueLoop && loopCount < MAX_LOOPS) {
      loopCount++;

      const stream3 = anthropic.messages.stream({
        model: 'claude-opus-4-6',
        max_tokens: 4096,
        system: SYSTEM_AGENT3,
        tools: [{ type: 'web_search_20260209', name: 'web_search' }],
        messages: messages3,
      });

      for await (const event of stream3) {
        if (event.type === 'content_block_delta' && event.delta.type === 'text_delta') {
          send('text', { agent: 3, chunk: event.delta.text });
        }
      }

      const finalMsg3 = await stream3.finalMessage();

      if (finalMsg3.stop_reason === 'pause_turn') {
        messages3 = [
          ...messages3,
          { role: 'assistant', content: finalMsg3.content },
        ];
      } else {
        continueLoop = false;
      }
    }

    send('agent_status', { agent: 3, status: 'done' });
    send('complete', {});
  } catch (err) {
    console.error('[Search] Error:', err.message);
    send('error', { message: err.message || '검색 중 오류가 발생했습니다.' });
  }

  res.end();
});

// ────────────────────────────────────────────────────────────
// Start
// ────────────────────────────────────────────────────────────

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`\n🗳️  공직선거법 AI 검색 시스템`);
  console.log(`   http://localhost:${PORT}\n`);
});
