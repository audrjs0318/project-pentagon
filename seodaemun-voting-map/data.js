// 서대문구 갑 선거구 데이터
// 제22대 기준 (2024년)

const ELECTION_DATA = {
  // 선거구 기본 정보
  districtInfo: {
    name: '서대문구 갑',
    assembly: '제22대',
    year: 2024,
    representative: '김동아',
    party: '더불어민주당',
    totalPopulation: 127500,
    totalVoters: 110800,
    dongs: ['충현동', '천연동', '북아현동', '신촌동', '연희동', '홍제1동', '홍제2동']
  },

  // 동별 상세 데이터
  dongData: {
    '충현동': {
      id: 'chunghyeon',
      population: 19445,
      voters: 17000,
      housingType: '빌라·원룸·상업 혼합',
      characteristics: '충정로역 역세권, 중장년층',
      ageGroups: {
        '20대': 18,
        '30대': 20,
        '40대': 22,
        '50대': 21,
        '60대 이상': 19
      },
      supportRate: {
        progressive: 56,
        conservative: 44
      },
      category: 'progressive_lean', // 진보 우세
      description: '충정로역을 중심으로 상업지역과 주거지역이 혼재하는 지역입니다. 중장년층 비중이 높으며 진보 성향이 우세합니다.'
    },
    '천연동': {
      id: 'cheonyeon',
      population: 16522,
      voters: 14500,
      housingType: '단독주택·빌라',
      characteristics: '독립문·형무소, 고령층 多',
      ageGroups: {
        '20대': 12,
        '30대': 15,
        '40대': 18,
        '50대': 22,
        '60대 이상': 33
      },
      supportRate: {
        progressive: 52,
        conservative: 48
      },
      category: 'competitive_progressive', // 경합 진보 우세
      description: '독립문과 서대문형무소역사관이 위치한 지역으로 고령층 비중이 높습니다. 전통적 주거지역으로 경합 양상을 보입니다.'
    },
    '북아현동': {
      id: 'bugahyeon',
      population: 15385,
      voters: 13000,
      housingType: '재개발 진행 중',
      characteristics: '북아현뉴타운, 재개발 이슈',
      ageGroups: {
        '20대': 15,
        '30대': 22,
        '40대': 25,
        '50대': 20,
        '60대 이상': 18
      },
      supportRate: {
        progressive: 53,
        conservative: 47
      },
      category: 'competitive_progressive', // 경합 진보 우세
      description: '북아현뉴타운 재개발이 진행 중인 지역입니다. 재개발 이슈가 선거에 영향을 미치며 경합 양상을 보입니다.'
    },
    '신촌동': {
      id: 'sinchon',
      population: 20266,
      voters: 16000,
      housingType: '원룸·상업·아파트 혼합',
      characteristics: '대학가, 20대 40%',
      ageGroups: {
        '20대': 40,
        '30대': 22,
        '40대': 15,
        '50대': 13,
        '60대 이상': 10
      },
      supportRate: {
        progressive: 58,
        conservative: 42
      },
      category: 'progressive_lean', // 진보 우세
      description: '이화여대, 연세대 등 대학교가 위치한 대학가 지역입니다. 20대 유권자 비중이 40%로 매우 높아 진보 성향이 두드러집니다.'
    },
    '연희동': {
      id: 'yeonhui',
      population: 20000,
      voters: 18000,
      housingType: '단독·빌라·고급주택',
      characteristics: '고급주거, 장년·고령층',
      ageGroups: {
        '20대': 10,
        '30대': 15,
        '40대': 20,
        '50대': 25,
        '60대 이상': 30
      },
      supportRate: {
        progressive: 53,
        conservative: 47
      },
      category: 'competitive_progressive', // 경합 진보 우세
      description: '고급 주택가로 알려진 연희동은 장년·고령층 비중이 높습니다. 상대적으로 보수 성향이 강해 경합 양상을 보입니다.'
    },
    '홍제1동': {
      id: 'hongje1',
      population: 24558,
      voters: 21500,
      housingType: '아파트 중심',
      characteristics: '대단지 아파트, 30-50대',
      ageGroups: {
        '20대': 12,
        '30대': 25,
        '40대': 28,
        '50대': 20,
        '60대 이상': 15
      },
      supportRate: {
        progressive: 61,
        conservative: 39
      },
      category: 'strong_progressive', // 진보 강세
      description: '대규모 아파트 단지가 밀집한 홍제1동은 30-50대 가족층이 주요 거주자입니다. 진보 성향이 가장 강한 지역입니다.'
    },
    '홍제2동': {
      id: 'hongje2',
      population: 12349,
      voters: 10800,
      housingType: '아파트·빌라 혼합',
      characteristics: '인왕산 인근',
      ageGroups: {
        '20대': 13,
        '30대': 22,
        '40대': 25,
        '50대': 22,
        '60대 이상': 18
      },
      supportRate: {
        progressive: 60,
        conservative: 40
      },
      category: 'strong_progressive', // 진보 강세
      description: '인왕산 자락에 위치한 홍제2동은 아파트와 빌라가 혼재합니다. 진보 성향이 강세를 보이는 지역입니다.'
    }
  },

  // 국회의원 선거 결과 (역대)
  assemblyElections: [
    {
      year: 2024,
      assembly: '22대',
      progressive: 49.0,
      conservative: 45.25,
      other: 5.75,
      winner: '더불어민주당',
      winnerName: '김동아',
      loserName: '이성헌',
      margin: 3.75
    },
    {
      year: 2020,
      assembly: '21대',
      progressive: 62.35,
      conservative: 34.06,
      other: 3.59,
      winner: '더불어민주당',
      margin: 28.29
    },
    {
      year: 2016,
      assembly: '20대',
      progressive: 47.82,
      conservative: 40.61,
      other: 11.57,
      winner: '더불어민주당',
      margin: 7.21
    },
    {
      year: 2012,
      assembly: '19대',
      progressive: 51.38,
      conservative: 45.56,
      other: 3.06,
      winner: '더불어민주당',
      margin: 5.82
    }
  ],

  // 대통령 선거 결과
  presidentialElections: [
    {
      year: 2022,
      progressiveCandidate: '이재명',
      conservativeCandidate: '윤석열',
      progressive: 52.1,
      conservative: 45.2,
      other: 2.7,
      winner: '이재명 (민주)'
    },
    {
      year: 2017,
      progressiveCandidate: '문재인',
      conservativeCandidate: '홍준표',
      progressive: 44.8,
      conservative: 23.5,
      other: 31.7,
      winner: '문재인 (민주)'
    }
  ],

  // 지방선거 결과
  localElections: [
    {
      year: 2022,
      position: '서대문구청장',
      progressive: 44.8,
      conservative: 53.2,
      winner: '이성헌 (국민의힘)',
      winnerParty: '국민의힘'
    },
    {
      year: 2018,
      position: '서대문구청장',
      progressive: 60.2,
      conservative: 36.8,
      winner: '더불어민주당',
      winnerParty: '더불어민주당'
    }
  ],

  // 2026 지방선거 예측
  prediction2026: {
    district: '서대문구 갑',
    type: '국회의원 보궐/지방선거 관련',
    progressive: 51,
    conservative: 46,
    other: 3,
    confidence: '중간',
    factors: [
      '윤석열 탄핵 정국으로 진보 우위 전망',
      '2024년 22대 총선 접전 결과 반영',
      '홍제동 대단지 아파트 진보 강세 유지',
      '연희동·천연동 경합 지역 변수',
      '신촌동 청년층 투표율이 핵심 변수'
    ],
    dongPredictions: {
      '충현동': { progressive: 56, conservative: 44 },
      '천연동': { progressive: 52, conservative: 48 },
      '북아현동': { progressive: 53, conservative: 47 },
      '신촌동': { progressive: 59, conservative: 41 },
      '연희동': { progressive: 53, conservative: 47 },
      '홍제1동': { progressive: 62, conservative: 38 },
      '홍제2동': { progressive: 61, conservative: 39 }
    }
  },

  // SVG 지도 좌표 (뷰박스 0 0 500 600)
  // 실제 서대문구 갑 선거구의 지리적 위치를 반영한 근사 좌표
  svgPaths: {
    '홍제2동': {
      points: '60,40 160,40 175,80 170,130 120,145 60,130 45,90',
      labelX: 110,
      labelY: 90
    },
    '홍제1동': {
      points: '60,130 120,145 170,130 185,160 170,220 130,250 70,240 45,200 40,160',
      labelX: 110,
      labelY: 195
    },
    '연희동': {
      points: '170,130 175,80 240,70 290,80 300,110 285,155 230,160 185,160',
      labelX: 235,
      labelY: 120
    },
    '신촌동': {
      points: '285,155 300,110 370,105 410,115 420,145 410,190 370,210 330,215 300,200',
      labelX: 355,
      labelY: 160
    },
    '천연동': {
      points: '130,250 170,220 185,160 230,160 240,200 235,250 210,280 165,285 130,270',
      labelX: 185,
      labelY: 235
    },
    '북아현동': {
      points: '300,200 330,215 370,210 380,250 370,290 330,310 290,305 270,280 270,250',
      labelX: 325,
      labelY: 255
    },
    '충현동': {
      points: '235,250 240,200 270,250 270,280 290,305 280,345 250,355 220,340 205,310 210,280',
      labelX: 250,
      labelY: 300
    }
  },

  // 색상 체계
  colorScheme: {
    strong_progressive: '#1B4FD8',     // 진보 강세 (60%+)
    progressive_lean: '#4472CA',        // 진보 우세 (55-60%)
    competitive_progressive: '#7BAFD4', // 경합 진보 우세 (52-55%)
    competitive: '#C9C9C9',            // 경합 (50-52%)
    competitive_conservative: '#D4857B',// 경합 보수 우세 (48-50%)
    conservative_lean: '#C0392B',       // 보수 우세
    strong_conservative: '#922B21'      // 보수 강세
  }
};

// 동별 색상 반환 함수
function getDongColor(dongName) {
  const dong = ELECTION_DATA.dongData[dongName];
  if (!dong) return '#C9C9C9';
  return ELECTION_DATA.colorScheme[dong.category] || '#C9C9C9';
}

// 동별 2026 예측 색상
function getDongPredictionColor(dongName) {
  const prediction = ELECTION_DATA.prediction2026.dongPredictions[dongName];
  if (!prediction) return '#C9C9C9';
  const progressive = prediction.progressive;
  if (progressive >= 60) return ELECTION_DATA.colorScheme.strong_progressive;
  if (progressive >= 55) return ELECTION_DATA.colorScheme.progressive_lean;
  if (progressive >= 52) return ELECTION_DATA.colorScheme.competitive_progressive;
  if (progressive >= 50) return ELECTION_DATA.colorScheme.competitive;
  if (progressive >= 48) return ELECTION_DATA.colorScheme.competitive_conservative;
  return ELECTION_DATA.colorScheme.conservative_lean;
}
