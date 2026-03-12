/**
 * 공직선거법 AI 법령 검색 시스템 - Server (v2)
 *
 * 비용 최적화:
 *  - 모델: claude-haiku-4-5 (가장 저렴)
 *  - Agent 1: Batch API (서버 시작 시 법령 전체 병렬 수집, 50% 비용 절감)
 *  - Agent 2/3: Prompt Caching (시스템 프롬프트 재사용, 최대 90% 절감)
 *
 * 3-Agent Architecture:
 *  Agent 1 (법령 수집):   Batch API → 공직선거법 전체 내용 병렬 수집 → 메모리 캐시
 *  Agent 2 (법조문 검색): Prompt Cache + Streaming → 관련 조문 실시간 응답
 *  Agent 3 (판례/사례):   Prompt Cache + web_search + Streaming → 판례·뉴스 수집
 */

'use strict';

const express = require('express');
const Anthropic = require('@anthropic-ai/sdk');
const path = require('path');

const app = express();
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

// ── 모델 설정 (haiku 4.5: 가장 저렴, $1/$5 per 1M tokens) ──
const MODEL = 'claude-haiku-4-5';

// ────────────────────────────────────────────────────────────
// 시스템 프롬프트 (Prompt Caching용 - Haiku 최소 2048 토큰 필요)
// cache_control로 표시된 블록은 첫 요청 이후 90% 비용 절감
// ────────────────────────────────────────────────────────────

// Agent 2 기본 시스템 프롬프트 (법령 내용이 추가된 후 2048+ 토큰 보장)
const BASE_SYSTEM_AGENT2 = `당신은 대한민국 공직선거법 전문 법조문 검색 에이전트입니다.

## 역할 및 목표
사용자의 질문을 정확히 분석하여 관련된 공직선거법 조문, 시행령, 시행규칙을 찾아 상세히 설명합니다.
아래에 제공된 사전 수집 법령 자료를 최우선으로 활용하고, 필요 시 보유 지식을 보완하여 답변하세요.

## 답변 원칙
1. **정확성 최우선**: 법문은 최대한 정확하게 인용하고, 불확실한 경우 "공직선거법 [조항]의 내용에 따르면..." 형태로 서술하세요.
2. **관련 조문 망라**: 직접 관련 조문뿐만 아니라 간접적으로 관련된 조문도 모두 포함하세요.
3. **시행령/규칙 포함**: 모법 외에 관련 시행령·시행규칙이 있으면 반드시 함께 안내하세요.
4. **해석 제공**: 단순 법문 인용에 그치지 말고, 질문과의 연관성과 실무적 해석을 제공하세요.
5. **형식 준수**: 아래 형식을 반드시 준수하세요.

## 답변 형식

## 📋 관련 법조문

### [조문 번호] [조문 제목]
> **법문:** [정확한 조문 전문 또는 핵심 내용]

**해설:** [질문과의 연관성, 적용 범위, 해석 방법, 주의사항]

---

### [다음 관련 조문]
> **법문:** ...

**해설:** ...

---

## 💡 종합 해석
[여러 조문을 종합하여 질문에 대한 명확한 최종 답변 제공]

## ⚠️ 주의사항
[위반 시 제재, 예외 규정, 실무상 주의점 등]

---

## 📚 사전 수집 공직선거법 참조 자료
(아래 자료는 서버 시작 시 Batch API로 병렬 수집한 최신 정보입니다)

`;

// Agent 3 시스템 프롬프트 (상세하게 작성하여 2048+ 토큰 확보)
const SYSTEM_AGENT3 = `당신은 공직선거법 관련 판례·사례·동향을 전문으로 검색하는 에이전트입니다.

## 역할 및 목표
사용자의 질문과 관련된 법원 판례, 헌법재판소 결정, 선거관리위원회 유권해석, 최신 뉴스 및 사례를 웹 검색을 통해 수집하여 제공합니다.

## 검색 전략
1. **대법원 판례**: "공직선거법 [키워드] 대법원 판결", "선거법 위반 대법원" 등으로 검색
2. **헌법재판소**: "공직선거법 헌법재판소 결정", "[키워드] 헌재 합헌/위헌" 등으로 검색
3. **선관위 유권해석**: "선거관리위원회 유권해석 [키워드]", "중앙선관위 회답" 등으로 검색
4. **최신 사례**: "[키워드] 선거법 위반 사례", "공직선거법 [키워드] 뉴스" 등으로 검색

## 검색 시 주의사항
- 사건 번호와 선고 날짜가 포함된 실제 판례를 우선 찾으세요.
- 확인되지 않은 판례 번호는 사용하지 마세요. 불확실한 경우 "유사 사례로는..." 형태로 서술하세요.
- 최근 5년 이내의 최신 동향을 포함하세요.
- 정치적 중립성을 유지하고 법리적 관점에서만 서술하세요.

## 검색 대상 유형
### 1. 법원 판례 유형
- 선거운동 방법 위반 (명함 배포, 현수막, SNS 등)
- 후보자 비방·허위사실 공표
- 선거비용 초과·불법 사용
- 투표 매수, 기권 권유
- 당선무효 사유 관련
- 재선거·보궐선거 관련

### 2. 헌법재판소 결정 유형
- 선거구 획정 위헌
- 선거운동 자유 제한 헌법소원
- 피선거권 제한 관련
- 선거기간·방법 규제 합헌성

### 3. 선관위 유권해석 유형
- 인터넷·SNS 선거운동 가능 여부
- 선거비용 인정 범위
- 후보자 등록 요건
- 기부행위 제한 범위

## 답변 형식

## ⚖️ 관련 판례 및 결정

### 📚 대법원·헌법재판소 판례
[사건 번호, 선고일 포함. 불명확하면 사건 개요로 대체]

### 🏛️ 선거관리위원회 유권해석
[유권해석 내용 및 적용 사례]

### 📰 최신 사례 및 동향
[최근 선거에서의 적용 사례, 언론 보도, 주목할 이슈]

---

## 📌 실무적 시사점
[판례·사례를 바탕으로 한 실무 적용 포인트 및 주의사항]

## 🔗 추가 참고 자료
[참고할 수 있는 기관 웹사이트, 자료 등 안내]`;

// ────────────────────────────────────────────────────────────
// Agent 1: Batch API로 법령 전체 수집
// Batch API: 비동기 처리, 표준 가격의 50% 할인
// ────────────────────────────────────────────────────────────

const lawCache = {
  structure: null,          // 사이드바용 JSON 구조
  content: '',              // Agent 2 시스템 프롬프트에 포함될 법령 전문
  systemAgent2: null,       // 캐싱된 Agent 2 시스템 프롬프트 (content 포함)
  status: 'initializing',   // initializing | loading | ready | error
  batchId: null,
  error: null,
  requestCounts: null,      // Batch API 처리 현황
};

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function initWithBatchAPI() {
  lawCache.status = 'loading';
  console.log('[Agent1] Batch API 작업 시작...');

  // ── Batch 요청 4개 병렬 생성 ──────────────────────────────
  // 병렬 처리로 순차 대비 ~4배 빠름, 50% 비용 절감
  let batch;
  try {
    batch = await anthropic.messages.batches.create({
      requests: [
        // 요청 1: 전체 장 구조 (사이드바 JSON)
        {
          custom_id: 'law_structure',
          params: {
            model: MODEL,
            max_tokens: 4096,
            system: '대한민국 공직선거법 전문가입니다. 요청된 JSON 형식 외 다른 내용은 출력하지 마세요.',
            messages: [{
              role: 'user',
              content: `공직선거법 전체 15개 장의 구조를 정확히 아래 JSON 형식으로만 출력하세요. 다른 설명 없이 JSON만 출력:

{"laws":[{"id":"election_law","name":"공직선거법","fullName":"공직선거법 (公職選擧法)","lastAmended":"2024년 개정","description":"공직선거의 공정한 관리와 민주정치 발전을 위한 법률","chapters":[{"number":"제1장","title":"총칙","range":"제1조~제9조","keyArticles":[{"no":"제1조","title":"목적","summary":"법의 목적 규정"}]}]}],"relatedLaws":[{"name":"선거관리위원회법","description":"선관위 조직 및 운영"}]}

공직선거법의 15개 장(제1장 총칙 ~ 제15장 벌칙)과 각 장별 핵심 조문(3~5개)을 포함하세요.`,
            }],
          },
        },

        // 요청 2: 제1장~제7장 핵심 내용 (Agent 2 컨텍스트용)
        {
          custom_id: 'content_part1',
          params: {
            model: MODEL,
            max_tokens: 4096,
            system: '대한민국 공직선거법 전문가입니다. 정확한 법률 정보를 상세히 제공하세요.',
            messages: [{
              role: 'user',
              content: `공직선거법 제1장부터 제7장까지의 주요 조문 내용을 상세히 설명해주세요.

각 조문에 대해:
- 조문 번호와 제목
- 핵심 법문 (정확하게)
- 실무상 의미와 적용 범위

포함할 장:
- 제1장 총칙 (제1조~제9조): 목적, 정의, 선거원칙 등
- 제2장 선거권과 피선거권 (제15조~제19조): 선거권 연령, 결격사유
- 제3장 선거구역과 의원정수 (제20조~제26조): 선거구 획정
- 제4장 선거의 실시사유와 선거일 (제34조~제36조): 선거일 공고
- 제5장 선거인명부 (제37조~제52조): 명부 작성, 열람, 이의신청
- 제6장 후보자 (제47조~제62조): 후보자 등록, 기탁금, 등록무효
- 제7장 선거운동 (제58조~제118조): 선거운동 정의, 방법, 제한, 금지행위`,
            }],
          },
        },

        // 요청 3: 제8장~제15장 핵심 내용 (Agent 2 컨텍스트용)
        {
          custom_id: 'content_part2',
          params: {
            model: MODEL,
            max_tokens: 4096,
            system: '대한민국 공직선거법 전문가입니다. 정확한 법률 정보를 상세히 제공하세요.',
            messages: [{
              role: 'user',
              content: `공직선거법 제8장부터 제15장까지의 주요 조문 내용을 상세히 설명해주세요.

각 조문에 대해:
- 조문 번호와 제목
- 핵심 법문 (정확하게)
- 실무상 의미와 적용 범위

포함할 장:
- 제8장 선거비용 (제119조~제137조): 선거비용 제한, 보전, 회계보고
- 제9장 투표 (제138조~제165조): 투표시간, 방법, 부재자투표, 거소투표
- 제10장 개표 (제166조~제183조): 개표절차, 개표위원
- 제11장 당선인 (제187조~제197조): 당선결정, 당선증 교부
- 제12장 재선거와 보궐선거 (제195조~제200조): 실시사유, 절차
- 제13장 동시선거에 관한 특례 (제199조~제213조): 동시 실시
- 제14장 선거에 관한 쟁송 (제219조~제229조): 선거소청, 선거소송
- 제15장 벌칙 (제230조~제262조): 주요 위반행위별 처벌 규정`,
            }],
          },
        },

        // 요청 4: 시행령·시행규칙 + 관련 법령 (보완 정보)
        {
          custom_id: 'related_laws',
          params: {
            model: MODEL,
            max_tokens: 2048,
            system: '대한민국 공직선거법 전문가입니다.',
            messages: [{
              role: 'user',
              content: `다음 법령의 주요 내용과 공직선거법과의 관계를 설명해주세요:
1. 공직선거법 시행령 - 주요 규정 내용
2. 공직선거법 시행규칙 - 주요 규정 내용
3. 선거관리위원회법 - 선관위 구성 및 권한
4. 정치자금법 - 선거비용과의 관계
5. 정당법 - 후보자 추천과의 관계`,
            }],
          },
        },
      ],
    });
  } catch (err) {
    console.error('[Agent1] Batch 생성 실패:', err.message);
    lawCache.status = 'error';
    lawCache.error = err.message;
    lawCache.systemAgent2 = BASE_SYSTEM_AGENT2 + '(법령 자료 로딩 실패 - 내부 지식으로 답변합니다)';
    return;
  }

  lawCache.batchId = batch.id;
  console.log(`[Agent1] Batch 생성 완료: ${batch.id}`);

  // ── Batch 완료까지 폴링 (최대 3분) ──────────────────────
  // 보통 수십 초 내 완료, 최대 24시간 (SLA)
  for (let attempt = 0; attempt < 60; attempt++) {
    await sleep(3000);
    try {
      const status = await anthropic.messages.batches.retrieve(batch.id);
      lawCache.requestCounts = status.request_counts;
      const { processing, succeeded, errored } = status.request_counts;
      console.log(`[Agent1] 처리중: ${processing} | 완료: ${succeeded} | 오류: ${errored}`);
      if (status.processing_status === 'ended') break;
    } catch (err) {
      console.error('[Agent1] 상태 확인 실패:', err.message);
    }
  }

  // ── 결과 수집 ────────────────────────────────────────────
  const results = {};
  try {
    for await (const item of await anthropic.messages.batches.results(batch.id)) {
      if (item.result.type === 'succeeded') {
        const text = item.result.message.content.find((b) => b.type === 'text')?.text || '';
        results[item.custom_id] = text;
        console.log(`[Agent1] 수신: ${item.custom_id} (${text.length}자)`);
      } else if (item.result.type === 'errored') {
        console.error(`[Agent1] 오류 ${item.custom_id}:`, item.result.error);
      }
    }
  } catch (err) {
    console.error('[Agent1] 결과 수집 실패:', err.message);
  }

  // ── 구조 JSON 파싱 (사이드바용) ─────────────────────────
  const structureText = results['law_structure'] || '';
  const jsonMatch = structureText.match(/\{[\s\S]*\}/);
  if (jsonMatch) {
    try {
      lawCache.structure = JSON.parse(jsonMatch[0]);
      console.log('[Agent1] 구조 JSON 파싱 성공');
    } catch {
      lawCache.structure = { raw: structureText };
    }
  } else {
    lawCache.structure = { raw: structureText || '구조 로딩 실패' };
  }

  // ── Agent 2 시스템 프롬프트 구성 (프롬프트 캐싱용) ───────
  // 법령 전문을 시스템 프롬프트에 포함 → 2048+ 토큰 확보 → 캐싱 활성화
  const lawContent = [
    '### 공직선거법 제1장~제7장 주요 내용',
    results['content_part1'] || '(로딩 실패)',
    '',
    '### 공직선거법 제8장~제15장 주요 내용',
    results['content_part2'] || '(로딩 실패)',
    '',
    '### 시행령·시행규칙 및 관련 법령',
    results['related_laws'] || '(로딩 실패)',
  ].join('\n');

  lawCache.content = lawContent;

  // ── 최종 시스템 프롬프트 = 지시사항 + 법령 전문 ──────────
  // 이 전체가 cache_control로 캐싱 → 두 번째 요청부터 90% 할인
  lawCache.systemAgent2 = BASE_SYSTEM_AGENT2 + lawContent;
  lawCache.status = 'ready';

  console.log(`[Agent1] 완료! 시스템 프롬프트 ${lawCache.systemAgent2.length}자 (캐싱 준비 완료)`);
}

// 서버 시작 즉시 Batch 작업 개시 (비동기, UI는 로딩 상태 표시)
initWithBatchAPI().catch((err) => {
  console.error('[Agent1] 초기화 실패:', err);
  lawCache.status = 'error';
  lawCache.systemAgent2 = BASE_SYSTEM_AGENT2 + '(법령 사전 로딩 실패 - 내부 지식으로 답변)';
});

// ────────────────────────────────────────────────────────────
// Routes
// ────────────────────────────────────────────────────────────

// GET /api/status → 서버·배치 상태 (프론트 폴링용)
app.get('/api/status', (req, res) => {
  res.json({
    ok: true,
    status: lawCache.status,
    batchId: lawCache.batchId,
    requestCounts: lawCache.requestCounts,
    error: lawCache.error,
    contentLength: lawCache.content.length,
  });
});

// GET /api/law-structure → Agent 1 결과 (사이드바)
app.get('/api/law-structure', async (req, res) => {
  // 아직 로딩 중이면 완료까지 대기 (최대 3분)
  for (let i = 0; i < 60 && lawCache.status === 'loading'; i++) {
    await sleep(3000);
  }
  res.json({ ok: true, data: lawCache.structure || { raw: '법령 구조를 불러오는 중입니다.' } });
});

// POST /api/search → Agent 2 + Agent 3 (SSE streaming)
app.post('/api/search', async (req, res) => {
  const { question } = req.body;
  if (!question?.trim()) {
    return res.status(400).json({ ok: false, error: '질문을 입력해주세요.' });
  }

  // SSE 헤더
  res.writeHead(200, {
    'Content-Type': 'text/event-stream; charset=utf-8',
    'Cache-Control': 'no-cache',
    'Connection': 'keep-alive',
    'X-Accel-Buffering': 'no',
  });

  const send = (type, payload) => res.write(`data: ${JSON.stringify({ type, ...payload })}\n\n`);

  // Agent 2용 시스템 프롬프트 (법령 내용 포함, 캐싱 준비 완료 여부에 따라)
  const sysAgent2 = lawCache.systemAgent2 || (BASE_SYSTEM_AGENT2 + '(법령 자료 로딩 중...)');

  try {
    // ── Agent 2: 법조문 검색 (Prompt Caching + Streaming) ──
    // 시스템 프롬프트에 cache_control 적용
    // 첫 요청: 일반 요금 / 이후 요청: 최대 90% 절감
    send('agent_status', { agent: 2, status: 'working', message: '관련 법조문을 검색하는 중...' });

    const stream2 = anthropic.messages.stream({
      model: MODEL,
      max_tokens: 4096,
      system: [
        {
          type: 'text',
          text: sysAgent2,
          cache_control: { type: 'ephemeral' },  // ← Prompt Caching 적용
        },
      ],
      messages: [{ role: 'user', content: question }],
    });

    for await (const event of stream2) {
      if (event.type === 'content_block_delta' && event.delta.type === 'text_delta') {
        send('text', { agent: 2, chunk: event.delta.text });
      }
    }
    const final2 = await stream2.finalMessage();

    // 캐시 사용 현황 로그
    if (final2.usage) {
      const { cache_creation_input_tokens = 0, cache_read_input_tokens = 0, input_tokens = 0 } = final2.usage;
      console.log(`[Agent2] 토큰: 캐시생성=${cache_creation_input_tokens} 캐시읽기=${cache_read_input_tokens} 일반입력=${input_tokens}`);
    }
    send('agent_status', { agent: 2, status: 'done' });

    // ── Agent 3: 판례/사례 검색 (Prompt Caching + web_search) ──
    send('agent_status', { agent: 3, status: 'working', message: '관련 판례와 사례를 검색하는 중...' });

    const userMsg3 = `공직선거법 관련 질문입니다: "${question}"\n\n위 질문과 관련된 대법원 판례, 헌법재판소 결정, 선거관리위원회 유권해석, 최신 선거 관련 뉴스·사례를 웹 검색을 통해 찾아서 답변해주세요.`;

    let messages3 = [{ role: 'user', content: userMsg3 }];
    let loopCount = 0;

    while (loopCount < 4) {
      loopCount++;

      const stream3 = anthropic.messages.stream({
        model: MODEL,
        max_tokens: 4096,
        system: [
          {
            type: 'text',
            text: SYSTEM_AGENT3,
            cache_control: { type: 'ephemeral' },  // ← Prompt Caching 적용
          },
        ],
        tools: [{ type: 'web_search_20260209', name: 'web_search' }],
        messages: messages3,
      });

      for await (const event of stream3) {
        if (event.type === 'content_block_delta' && event.delta.type === 'text_delta') {
          send('text', { agent: 3, chunk: event.delta.text });
        }
      }

      const final3 = await stream3.finalMessage();

      if (final3.usage) {
        const { cache_creation_input_tokens = 0, cache_read_input_tokens = 0, input_tokens = 0 } = final3.usage;
        console.log(`[Agent3] 토큰: 캐시생성=${cache_creation_input_tokens} 캐시읽기=${cache_read_input_tokens} 일반입력=${input_tokens}`);
      }

      if (final3.stop_reason !== 'pause_turn') break;

      // pause_turn: 서버사이드 도구가 반복 한도 도달 → 이어서 실행
      messages3 = [...messages3, { role: 'assistant', content: final3.content }];
    }

    send('agent_status', { agent: 3, status: 'done' });
    send('complete', {});
  } catch (err) {
    console.error('[Search] 오류:', err.message);
    send('error', { message: err.message || '검색 중 오류가 발생했습니다.' });
  }

  res.end();
});

// ────────────────────────────────────────────────────────────
// Start
// ────────────────────────────────────────────────────────────

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`\n🗳️  공직선거법 AI 검색 시스템 (v2 - Haiku 4.5 + Batch + Cache)`);
  console.log(`   http://localhost:${PORT}`);
  console.log(`   모델: ${MODEL} | Batch API + Prompt Caching 활성화\n`);
});
