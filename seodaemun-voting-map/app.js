// 서대문구 갑 선거구 투표 지지도 지도 - 메인 애플리케이션

'use strict';

// ============================================================
// 전역 상태
// ============================================================
const AppState = {
  selectedDong: null,
  mapMode: 'current', // 'current' | 'prediction'
  charts: {}
};

// ============================================================
// 초기화
// ============================================================
document.addEventListener('DOMContentLoaded', () => {
  initTabs();
  initMap();
  initCharts();
  initPredictionSection();
  initDongCards();
  renderDongDetail(null);
});

// ============================================================
// 탭 네비게이션
// ============================================================
function initTabs() {
  const tabs = document.querySelectorAll('.nav-tab');
  const contents = document.querySelectorAll('.tab-content');

  tabs.forEach(tab => {
    tab.addEventListener('click', () => {
      const target = tab.dataset.tab;

      tabs.forEach(t => t.classList.remove('active'));
      contents.forEach(c => c.classList.remove('active'));

      tab.classList.add('active');
      const targetContent = document.getElementById(`tab-${target}`);
      if (targetContent) {
        targetContent.classList.add('active');
      }

      // 차트 리사이즈 트리거
      Object.values(AppState.charts).forEach(chart => {
        if (chart && typeof chart.resize === 'function') {
          setTimeout(() => chart.resize(), 50);
        }
      });
    });
  });
}

// ============================================================
// SVG 지도 초기화
// ============================================================
function initMap() {
  const svg = document.getElementById('electoral-map');
  if (!svg) return;

  const dongs = Object.keys(ELECTION_DATA.dongData);

  // 폴리곤 및 레이블 렌더링
  dongs.forEach(dongName => {
    const data = ELECTION_DATA.svgPaths[dongName];
    const dongInfo = ELECTION_DATA.dongData[dongName];
    if (!data || !dongInfo) return;

    const color = getDongColor(dongName);

    // 폴리곤 생성
    const polygon = document.createElementNS('http://www.w3.org/2000/svg', 'polygon');
    polygon.setAttribute('points', data.points);
    polygon.setAttribute('fill', color);
    polygon.setAttribute('class', 'dong-polygon');
    polygon.dataset.dong = dongName;

    // 이름 레이블
    const label = document.createElementNS('http://www.w3.org/2000/svg', 'text');
    label.setAttribute('x', data.labelX);
    label.setAttribute('y', data.labelY - 6);
    label.setAttribute('class', 'dong-label');
    label.textContent = dongName;

    // 지지율 레이블
    const rateLabel = document.createElementNS('http://www.w3.org/2000/svg', 'text');
    rateLabel.setAttribute('x', data.labelX);
    rateLabel.setAttribute('y', data.labelY + 10);
    rateLabel.setAttribute('class', 'dong-rate-label');
    rateLabel.textContent = `민주 ${dongInfo.supportRate.progressive}%`;
    rateLabel.dataset.dong = dongName;

    // 이벤트 등록
    polygon.addEventListener('click', () => selectDong(dongName));
    polygon.addEventListener('mouseenter', (e) => showTooltip(e, dongName));
    polygon.addEventListener('mousemove', (e) => moveTooltip(e));
    polygon.addEventListener('mouseleave', () => hideTooltip());

    svg.appendChild(polygon);
    svg.appendChild(label);
    svg.appendChild(rateLabel);
  });

  // 지도 모드 버튼 초기화
  document.querySelectorAll('.mode-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.mode-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      AppState.mapMode = btn.dataset.mode;
      updateMapColors();
    });
  });
}

function selectDong(dongName) {
  // 이전 선택 해제
  document.querySelectorAll('.dong-polygon').forEach(p => p.classList.remove('selected'));

  if (AppState.selectedDong === dongName) {
    AppState.selectedDong = null;
    renderDongDetail(null);
    return;
  }

  AppState.selectedDong = dongName;
  const polygon = document.querySelector(`.dong-polygon[data-dong="${dongName}"]`);
  if (polygon) polygon.classList.add('selected');

  renderDongDetail(dongName);
}

function updateMapColors() {
  const dongs = Object.keys(ELECTION_DATA.dongData);
  dongs.forEach(dongName => {
    const polygon = document.querySelector(`.dong-polygon[data-dong="${dongName}"]`);
    const rateLabel = document.querySelector(`.dong-rate-label[data-dong="${dongName}"]`);
    if (!polygon) return;

    let color, rate;
    if (AppState.mapMode === 'prediction') {
      color = getDongPredictionColor(dongName);
      const pred = ELECTION_DATA.prediction2026.dongPredictions[dongName];
      rate = pred ? pred.progressive : 0;
      if (rateLabel) rateLabel.textContent = `예측 ${rate}%`;
    } else {
      color = getDongColor(dongName);
      const dong = ELECTION_DATA.dongData[dongName];
      rate = dong ? dong.supportRate.progressive : 0;
      if (rateLabel) rateLabel.textContent = `민주 ${rate}%`;
    }
    polygon.setAttribute('fill', color);
  });
}

// ============================================================
// 툴팁
// ============================================================
function showTooltip(event, dongName) {
  const tooltip = document.getElementById('map-tooltip');
  if (!tooltip) return;

  const dong = ELECTION_DATA.dongData[dongName];
  if (!dong) return;

  const mode = AppState.mapMode;
  let progRate, consRate;

  if (mode === 'prediction') {
    const pred = ELECTION_DATA.prediction2026.dongPredictions[dongName];
    progRate = pred ? pred.progressive : dong.supportRate.progressive;
    consRate = pred ? pred.conservative : dong.supportRate.conservative;
  } else {
    progRate = dong.supportRate.progressive;
    consRate = dong.supportRate.conservative;
  }

  tooltip.innerHTML = `
    <div class="tooltip-name">${dongName}</div>
    <div class="tooltip-row">
      <span class="label">인구</span>
      <span class="value">${dong.population.toLocaleString()}명</span>
    </div>
    <div class="tooltip-row">
      <span class="label">유권자</span>
      <span class="value">${dong.voters.toLocaleString()}명</span>
    </div>
    <div class="tooltip-row">
      <span class="label">${mode === 'prediction' ? '예측' : ''} 진보</span>
      <span class="value prog">${progRate}%</span>
    </div>
    <div class="tooltip-row">
      <span class="label">${mode === 'prediction' ? '예측' : ''} 보수</span>
      <span class="value cons">${consRate}%</span>
    </div>
  `;

  tooltip.classList.add('visible');
  moveTooltip(event);
}

function moveTooltip(event) {
  const tooltip = document.getElementById('map-tooltip');
  if (!tooltip) return;

  const x = event.clientX + 14;
  const y = event.clientY - 10;
  const maxX = window.innerWidth - tooltip.offsetWidth - 20;
  const maxY = window.innerHeight - tooltip.offsetHeight - 20;

  tooltip.style.left = `${Math.min(x, maxX)}px`;
  tooltip.style.top = `${Math.min(y, maxY)}px`;
}

function hideTooltip() {
  const tooltip = document.getElementById('map-tooltip');
  if (tooltip) tooltip.classList.remove('visible');
}

// ============================================================
// 동 상세 정보 패널
// ============================================================
function renderDongDetail(dongName) {
  const panel = document.getElementById('dong-detail-panel');
  if (!panel) return;

  if (!dongName) {
    panel.innerHTML = `
      <div class="dong-detail">
        <div class="dong-detail-title">동을 선택하세요</div>
        <div class="dong-detail-subtitle">지도에서 행정동을 클릭하면 상세 정보를 확인할 수 있습니다.</div>
        <div style="color: var(--text-secondary); font-size: 0.82rem; margin-top: 12px; line-height: 1.7;">
          서대문구 갑 선거구는 7개 행정동으로 구성되어 있으며,<br>
          현 국회의원은 더불어민주당 <strong style="color: var(--text-primary);">김동아</strong> 의원입니다.
        </div>
      </div>
    `;
    return;
  }

  const dong = ELECTION_DATA.dongData[dongName];
  if (!dong) return;

  panel.classList.add('highlighted');

  const ageRows = Object.entries(dong.ageGroups).map(([age, pct]) => `
    <div class="age-bar-row">
      <div class="age-bar-label">${age}</div>
      <div class="age-bar-track">
        <div class="age-bar-fill" style="width: ${pct}%"></div>
      </div>
      <div class="age-bar-value">${pct}%</div>
    </div>
  `).join('');

  const categoryLabels = {
    strong_progressive: '진보 강세',
    progressive_lean: '진보 우세',
    competitive_progressive: '경합 진보 우세',
    competitive: '경합',
    competitive_conservative: '경합 보수 우세'
  };

  panel.innerHTML = `
    <div class="dong-detail highlighted">
      <div class="dong-detail-title">${dongName}</div>
      <div class="dong-detail-subtitle">${categoryLabels[dong.category] || ''} | ${dong.housingType}</div>

      <div class="support-bar-wrapper">
        <div class="support-bar-label">
          <span class="prog">민주 ${dong.supportRate.progressive}%</span>
          <span class="cons">보수 ${dong.supportRate.conservative}%</span>
        </div>
        <div class="support-bar">
          <div class="prog-fill" style="width: ${dong.supportRate.progressive}%"></div>
          <div class="cons-fill" style="width: ${dong.supportRate.conservative}%"></div>
        </div>
      </div>

      <ul class="dong-info-list">
        <li><strong>인구수</strong> ${dong.population.toLocaleString()}명</li>
        <li><strong>유권자</strong> ${dong.voters.toLocaleString()}명</li>
        <li><strong>주거유형</strong> ${dong.housingType}</li>
        <li><strong>특성</strong> ${dong.characteristics}</li>
      </ul>

      <div class="age-chart-wrapper">
        <div class="age-chart-title">연령대별 구성</div>
        <div class="age-bars">${ageRows}</div>
      </div>

      <div style="margin-top: 14px; font-size: 0.78rem; color: var(--text-secondary); line-height: 1.6; background: rgba(255,255,255,0.03); padding: 10px; border-radius: 6px; border: 1px solid var(--border-color);">
        ${dong.description}
      </div>
    </div>
  `;
}

// ============================================================
// Chart.js 차트 초기화
// ============================================================
function initCharts() {
  Chart.defaults.color = '#94a3b8';
  Chart.defaults.borderColor = '#334155';
  Chart.defaults.font.family = "'Noto Sans KR', 'Apple SD Gothic Neo', sans-serif";

  initAssemblyChart();
  initPresidentialChart();
  initLocalChart();
  initVoterChart();
}

// 국회의원 선거 차트
function initAssemblyChart() {
  const ctx = document.getElementById('assembly-chart');
  if (!ctx) return;

  const data = ELECTION_DATA.assemblyElections;
  const labels = data.map(e => `${e.assembly}대 (${e.year})`);

  AppState.charts.assembly = new Chart(ctx, {
    type: 'bar',
    data: {
      labels,
      datasets: [
        {
          label: '진보(민주계)',
          data: data.map(e => e.progressive),
          backgroundColor: 'rgba(68, 114, 202, 0.75)',
          borderColor: '#4472CA',
          borderWidth: 1.5,
          borderRadius: 4
        },
        {
          label: '보수(국힘계)',
          data: data.map(e => e.conservative),
          backgroundColor: 'rgba(192, 57, 43, 0.65)',
          borderColor: '#C0392B',
          borderWidth: 1.5,
          borderRadius: 4
        },
        {
          label: '기타',
          data: data.map(e => e.other),
          backgroundColor: 'rgba(100, 116, 139, 0.55)',
          borderColor: '#64748b',
          borderWidth: 1.5,
          borderRadius: 4
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          position: 'top',
          labels: { padding: 16, font: { size: 12 } }
        },
        tooltip: {
          callbacks: {
            label: ctx => ` ${ctx.dataset.label}: ${ctx.raw.toFixed(2)}%`
          }
        }
      },
      scales: {
        x: {
          grid: { color: 'rgba(51,65,85,0.5)' }
        },
        y: {
          min: 0,
          max: 75,
          grid: { color: 'rgba(51,65,85,0.5)' },
          ticks: {
            callback: v => `${v}%`
          }
        }
      }
    }
  });
}

// 대통령 선거 차트
function initPresidentialChart() {
  const ctx = document.getElementById('presidential-chart');
  if (!ctx) return;

  const data = ELECTION_DATA.presidentialElections;

  AppState.charts.presidential = new Chart(ctx, {
    type: 'bar',
    data: {
      labels: data.map(e => `${e.year}년 대선`),
      datasets: [
        {
          label: '진보 후보',
          data: data.map(e => e.progressive),
          backgroundColor: 'rgba(68, 114, 202, 0.75)',
          borderColor: '#4472CA',
          borderWidth: 1.5,
          borderRadius: 4
        },
        {
          label: '보수 후보',
          data: data.map(e => e.conservative),
          backgroundColor: 'rgba(192, 57, 43, 0.65)',
          borderColor: '#C0392B',
          borderWidth: 1.5,
          borderRadius: 4
        },
        {
          label: '기타',
          data: data.map(e => e.other),
          backgroundColor: 'rgba(100, 116, 139, 0.55)',
          borderColor: '#64748b',
          borderWidth: 1.5,
          borderRadius: 4
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          position: 'top',
          labels: { padding: 16, font: { size: 12 } }
        },
        tooltip: {
          callbacks: {
            afterBody: (ctx) => {
              const idx = ctx[0].dataIndex;
              const election = data[idx];
              return [
                `진보: ${election.progressiveCandidate}`,
                `보수: ${election.conservativeCandidate}`,
                `당선: ${election.winner}`
              ];
            }
          }
        }
      },
      scales: {
        x: { grid: { color: 'rgba(51,65,85,0.5)' } },
        y: {
          min: 0,
          max: 75,
          grid: { color: 'rgba(51,65,85,0.5)' },
          ticks: { callback: v => `${v}%` }
        }
      }
    }
  });
}

// 지방선거 차트
function initLocalChart() {
  const ctx = document.getElementById('local-chart');
  if (!ctx) return;

  const data = ELECTION_DATA.localElections;

  AppState.charts.local = new Chart(ctx, {
    type: 'bar',
    data: {
      labels: data.map(e => `${e.year}년 ${e.position}`),
      datasets: [
        {
          label: '진보(민주)',
          data: data.map(e => e.progressive),
          backgroundColor: 'rgba(68, 114, 202, 0.75)',
          borderColor: '#4472CA',
          borderWidth: 1.5,
          borderRadius: 4
        },
        {
          label: '보수(국힘)',
          data: data.map(e => e.conservative),
          backgroundColor: 'rgba(192, 57, 43, 0.65)',
          borderColor: '#C0392B',
          borderWidth: 1.5,
          borderRadius: 4
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          position: 'top',
          labels: { padding: 16, font: { size: 12 } }
        },
        tooltip: {
          callbacks: {
            afterBody: (ctx) => {
              const idx = ctx[0].dataIndex;
              return [`당선: ${data[idx].winner}`];
            }
          }
        }
      },
      scales: {
        x: { grid: { color: 'rgba(51,65,85,0.5)' } },
        y: {
          min: 0,
          max: 75,
          grid: { color: 'rgba(51,65,85,0.5)' },
          ticks: { callback: v => `${v}%` }
        }
      }
    }
  });
}

// 유권자 현황 (도넛 차트)
function initVoterChart() {
  const ctx = document.getElementById('voter-chart');
  if (!ctx) return;

  const dongs = Object.entries(ELECTION_DATA.dongData);
  const labels = dongs.map(([name]) => name);
  const voterCounts = dongs.map(([, d]) => d.voters);

  const colors = [
    '#1B4FD8', '#4472CA', '#7BAFD4', '#60a5fa',
    '#93c5fd', '#bae6fd', '#e0f2fe'
  ];

  AppState.charts.voter = new Chart(ctx, {
    type: 'doughnut',
    data: {
      labels,
      datasets: [{
        data: voterCounts,
        backgroundColor: colors,
        borderColor: '#1e293b',
        borderWidth: 2,
        hoverOffset: 10
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          position: 'right',
          labels: {
            padding: 12,
            font: { size: 11 },
            generateLabels: (chart) => {
              const data = chart.data;
              return data.labels.map((label, i) => ({
                text: `${label}: ${data.datasets[0].data[i].toLocaleString()}명`,
                fillStyle: data.datasets[0].backgroundColor[i],
                strokeStyle: '#1e293b',
                lineWidth: 2,
                index: i
              }));
            }
          }
        },
        tooltip: {
          callbacks: {
            label: ctx => ` ${ctx.raw.toLocaleString()}명 (${((ctx.raw / 110800) * 100).toFixed(1)}%)`
          }
        }
      }
    }
  });
}

// ============================================================
// 2026 예측 섹션
// ============================================================
function initPredictionSection() {
  const pred = ELECTION_DATA.prediction2026;

  // 큰 수치 표시
  const progVal = document.getElementById('pred-progressive');
  const consVal = document.getElementById('pred-conservative');
  if (progVal) progVal.textContent = `${pred.progressive}%`;
  if (consVal) consVal.textContent = `${pred.conservative}%`;

  // 트렌드 바
  const progBar = document.getElementById('pred-trend-prog');
  const consBar = document.getElementById('pred-trend-cons');
  if (progBar) {
    progBar.style.width = `${pred.progressive}%`;
    progBar.textContent = `${pred.progressive}%`;
  }
  if (consBar) {
    consBar.style.width = `${pred.conservative}%`;
    consBar.textContent = `${pred.conservative}%`;
  }

  // 핵심 요인
  const factorsList = document.getElementById('pred-factors');
  if (factorsList && pred.factors) {
    factorsList.innerHTML = pred.factors.map(f => `<li>${f}</li>`).join('');
  }

  // 동별 예측 막대
  const dongPredContainer = document.getElementById('dong-pred-bars');
  if (dongPredContainer) {
    const sorted = Object.entries(pred.dongPredictions)
      .sort((a, b) => b[1].progressive - a[1].progressive);

    dongPredContainer.innerHTML = sorted.map(([name, rates]) => `
      <div class="dong-pred-row">
        <div class="dong-pred-name">${name}</div>
        <div class="dong-pred-bar-track">
          <div class="dong-pred-bar-prog" style="width: ${rates.progressive}%">${rates.progressive}%</div>
          <div class="dong-pred-bar-cons" style="width: ${rates.conservative}%">${rates.conservative}%</div>
        </div>
      </div>
    `).join('');
  }

  // 예측 레이더 차트
  initPredictionChart();
}

function initPredictionChart() {
  const ctx = document.getElementById('prediction-chart');
  if (!ctx) return;

  const pred = ELECTION_DATA.prediction2026;
  const dongs = Object.keys(pred.dongPredictions);
  const progData = dongs.map(d => pred.dongPredictions[d].progressive);
  const consData = dongs.map(d => pred.dongPredictions[d].conservative);

  AppState.charts.prediction = new Chart(ctx, {
    type: 'radar',
    data: {
      labels: dongs,
      datasets: [
        {
          label: '진보(민주) 예측',
          data: progData,
          backgroundColor: 'rgba(68, 114, 202, 0.25)',
          borderColor: '#4472CA',
          pointBackgroundColor: '#4472CA',
          borderWidth: 2,
          pointRadius: 4
        },
        {
          label: '보수(국힘) 예측',
          data: consData,
          backgroundColor: 'rgba(192, 57, 43, 0.15)',
          borderColor: '#C0392B',
          pointBackgroundColor: '#C0392B',
          borderWidth: 2,
          pointRadius: 4
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          position: 'top',
          labels: { padding: 16, font: { size: 12 } }
        }
      },
      scales: {
        r: {
          min: 35,
          max: 70,
          ticks: {
            callback: v => `${v}%`,
            font: { size: 10 },
            stepSize: 5
          },
          grid: { color: 'rgba(51,65,85,0.6)' },
          angleLines: { color: 'rgba(51,65,85,0.6)' },
          pointLabels: { font: { size: 11 }, color: '#94a3b8' }
        }
      }
    }
  });
}

// ============================================================
// 동별 카드 렌더링
// ============================================================
function initDongCards() {
  const container = document.getElementById('dong-cards-container');
  if (!container) return;

  const categoryLabel = {
    strong_progressive: { text: '진보 강세', cls: 'type-strong-progressive' },
    progressive_lean: { text: '진보 우세', cls: 'type-progressive-lean' },
    competitive_progressive: { text: '경합 진보', cls: 'type-competitive-progressive' },
    competitive: { text: '경합', cls: 'type-competitive-progressive' }
  };

  const dongs = Object.entries(ELECTION_DATA.dongData);

  container.innerHTML = dongs.map(([name, dong]) => {
    const cat = categoryLabel[dong.category] || { text: '경합', cls: 'type-competitive-progressive' };
    return `
      <div class="dong-card" onclick="selectDongFromCard('${name}')">
        <div class="dong-card-header">
          <div class="dong-card-name">${name}</div>
          <div class="dong-card-type ${cat.cls}">${cat.text}</div>
        </div>
        <div class="dong-mini-bar">
          <div class="prog" style="width: ${dong.supportRate.progressive}%"></div>
          <div class="cons" style="width: ${dong.supportRate.conservative}%"></div>
        </div>
        <div class="dong-card-stats">
          <div class="dong-card-stat">
            <div class="val prog">${dong.supportRate.progressive}%</div>
            <div class="lbl">진보</div>
          </div>
          <div class="dong-card-stat">
            <div class="val">${dong.population.toLocaleString()}</div>
            <div class="lbl">인구</div>
          </div>
          <div class="dong-card-stat">
            <div class="val cons">${dong.supportRate.conservative}%</div>
            <div class="lbl">보수</div>
          </div>
        </div>
        <div class="dong-card-desc">${dong.description}</div>
      </div>
    `;
  }).join('');
}

function selectDongFromCard(dongName) {
  // 지도 탭으로 전환
  document.querySelectorAll('.nav-tab').forEach(t => t.classList.remove('active'));
  document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));

  const mapTab = document.querySelector('.nav-tab[data-tab="map"]');
  const mapContent = document.getElementById('tab-map');
  if (mapTab) mapTab.classList.add('active');
  if (mapContent) mapContent.classList.add('active');

  selectDong(dongName);
}

// ============================================================
// 유틸리티
// ============================================================
function formatNumber(n) {
  return n.toLocaleString('ko-KR');
}
