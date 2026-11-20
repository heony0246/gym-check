(() => {
  'use strict';

  // ---------- constants ----------
  const STORE_KEY = 'gymcheck:v1';
  const DEFAULT_PARTS = [
    { id: 'chest', name: '가슴', color: '#FF5D5D' },
    { id: 'back', name: '등', color: '#4F9BFF' },
    { id: 'legs', name: '하체', color: '#3DDC97' },
    { id: 'arms', name: '팔', color: '#FF9F43' },
    { id: 'shoulders', name: '어깨', color: '#A78BFA' },
    { id: 'abs', name: '복근', color: '#FFD43B' },
    { id: 'cardio', name: '유산소', color: '#38D9F5' },
  ];
  const PART_EN = { chest: 'CHEST', back: 'BACK', legs: 'LEGS', arms: 'ARMS', shoulders: 'SHOULDERS', abs: 'ABS', cardio: 'CARDIO' };
  // How each part reads in "___ DAY" on the 오운완 photo.
  const DAY_EN = { chest: 'CHEST', back: 'BACK', legs: 'LEG', arms: 'ARM', shoulders: 'SHOULDER', abs: 'ABS', cardio: 'CARDIO' };
  const VOLT = '#D4FF3F';
  const CUSTOM_COLORS = ['#F472B6', '#818CF8', '#A3E635', '#2DD4BF', '#FB7185', '#94A3B8', '#E879F9', '#C08457'];
  const WEEKDAYS = ['일', '월', '화', '수', '목', '금', '토'];
  const WEEKDAYS_EN = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];
  const MAX_NAME = 8;

  // ---------- exercise catalog (for the optional sets × kg log) ----------
  // [id, name, part, equipment, kind]. part is a built-in part id, or 'full' for
  // whole-body moves. kind says what a set holds; see EX_KINDS.
  const EXERCISES = [
    ["barbell-bench-press", "벤치프레스", "chest", "바벨", "wr"],
    ["incline-bench-press", "인클라인 벤치프레스", "chest", "바벨", "wr"],
    ["decline-bench-press", "디클라인 벤치프레스", "chest", "바벨", "wr"],
    ["dumbbell-bench-press", "덤벨 프레스", "chest", "덤벨", "wr"],
    ["incline-dumbbell-press", "인클라인 덤벨 프레스", "chest", "덤벨", "wr"],
    ["decline-dumbbell-press", "디클라인 덤벨 프레스", "chest", "덤벨", "wr"],
    ["dumbbell-fly", "덤벨 플라이", "chest", "덤벨", "wr"],
    ["incline-dumbbell-fly", "인클라인 덤벨 플라이", "chest", "덤벨", "wr"],
    ["dumbbell-pullover", "덤벨 풀오버", "chest", "덤벨", "wr"],
    ["smith-machine-bench-press", "스미스 벤치프레스", "chest", "스미스 머신", "wr"],
    ["smith-incline-press", "스미스 인클라인 프레스", "chest", "스미스 머신", "wr"],
    ["chest-press-machine", "체스트 프레스", "chest", "머신", "wr"],
    ["incline-chest-press-machine", "인클라인 체스트 프레스", "chest", "머신", "wr"],
    ["decline-chest-press-machine", "디클라인 체스트 프레스", "chest", "머신", "wr"],
    ["wide-chest-press-plate-loaded", "와이드 체스트 프레스", "chest", "머신", "wr"],
    ["pec-deck-fly", "펙덱 플라이 (버터플라이)", "chest", "머신", "wr"],
    ["cable-crossover", "케이블 크로스오버", "chest", "케이블", "wr"],
    ["low-to-high-cable-fly", "로우 투 하이 케이블 플라이", "chest", "케이블", "wr"],
    ["chest-dips", "딥스 (가슴)", "chest", "딥스대", "r"],
    ["push-up", "푸시업", "chest", "맨몸", "r"],
    ["deadlift", "데드리프트", "back", "바벨", "wr"],
    ["barbell-row", "바벨 로우 (벤트오버 로우)", "back", "바벨", "wr"],
    ["pendlay-row", "펜들레이 로우", "back", "바벨", "wr"],
    ["rack-pull", "랙 풀", "back", "바벨 · 파워랙", "wr"],
    ["t-bar-row", "T바 로우", "back", "T바 · 머신", "wr"],
    ["one-arm-dumbbell-row", "원암 덤벨 로우", "back", "덤벨", "wr"],
    ["pull-up", "풀업 (턱걸이)", "back", "철봉", "r"],
    ["chin-up", "친업", "back", "철봉", "r"],
    ["assisted-pull-up", "어시스티드 풀업", "back", "머신", "r"],
    ["lat-pulldown", "랫풀다운", "back", "케이블 · 머신", "wr"],
    ["close-grip-lat-pulldown", "클로즈그립 랫풀다운", "back", "케이블", "wr"],
    ["seated-cable-row", "시티드 케이블 로우", "back", "케이블", "wr"],
    ["seated-row-machine", "시티드 로우 머신", "back", "머신", "wr"],
    ["high-row-machine", "하이 로우 머신", "back", "머신", "wr"],
    ["low-row-machine", "로우 로우 머신", "back", "머신", "wr"],
    ["iso-lateral-row-mid-row", "미드 로우 (아이소 래터럴 로우)", "back", "머신", "wr"],
    ["iso-lateral-d-y-row", "DY 로우", "back", "머신", "wr"],
    ["straight-arm-pulldown", "스트레이트 암 풀다운", "back", "케이블", "wr"],
    ["pullover-machine", "풀오버 머신", "back", "머신", "wr"],
    ["chest-supported-row", "체스트 서포티드 로우", "back", "머신 · T바 머신", "wr"],
    ["back-extension", "백 익스텐션", "back", "백 익스텐션 벤치", "r"],
    ["lower-back-extension-machine", "로어백 익스텐션 머신", "back", "머신", "wr"],
    ["good-morning", "굿모닝", "back", "바벨", "wr"],
    ["barbell-back-squat", "스쿼트 (백스쿼트)", "legs", "바벨 · 파워랙", "wr"],
    ["front-squat", "프론트 스쿼트", "legs", "바벨 · 파워랙", "wr"],
    ["smith-machine-squat", "스미스 스쿼트", "legs", "스미스 머신", "wr"],
    ["goblet-squat", "고블릿 스쿼트", "legs", "덤벨 · 케틀벨", "wr"],
    ["hack-squat", "핵 스쿼트", "legs", "머신", "wr"],
    ["squat-machine", "스쿼트 머신 (파워 스쿼트)", "legs", "머신", "wr"],
    ["belt-squat", "벨트 스쿼트", "legs", "머신", "wr"],
    ["v-squat-pendulum-squat", "브이 스쿼트 · 펜듈럼 스쿼트", "legs", "머신", "wr"],
    ["leg-press", "레그 프레스 (45도)", "legs", "머신", "wr"],
    ["seated-leg-press", "시티드 레그 프레스 (수평)", "legs", "머신", "wr"],
    ["leg-extension", "레그 익스텐션", "legs", "머신", "wr"],
    ["lying-leg-curl", "라잉 레그 컬", "legs", "머신", "wr"],
    ["seated-leg-curl", "시티드 레그 컬", "legs", "머신", "wr"],
    ["standing-leg-curl", "스탠딩 레그 컬", "legs", "머신", "wr"],
    ["kneeling-leg-curl", "닐링 레그 컬", "legs", "머신", "wr"],
    ["glute-ham-raise", "글루트 햄 레이즈 (GHD)", "legs", "GHD", "r"],
    ["romanian-deadlift", "루마니안 데드리프트", "legs", "바벨 · 덤벨", "wr"],
    ["stiff-leg-deadlift", "스티프 레그 데드리프트", "legs", "바벨", "wr"],
    ["sumo-deadlift", "스모 데드리프트", "legs", "바벨", "wr"],
    ["lunge", "런지 (워킹 런지)", "legs", "덤벨 · 맨몸", "wr"],
    ["bulgarian-split-squat", "불가리안 스플릿 스쿼트", "legs", "덤벨", "wr"],
    ["step-up", "스텝업", "legs", "덤벨 · 박스", "wr"],
    ["hip-thrust", "힙 쓰러스트", "legs", "바벨 · 머신", "wr"],
    ["standing-hip-thrust", "스탠딩 힙 쓰러스트", "legs", "머신", "wr"],
    ["glute-bridge", "글루트 브릿지", "legs", "맨몸 · 바벨", "wr"],
    ["hip-abduction", "힙 어브덕션 (아웃타이)", "legs", "머신", "wr"],
    ["standing-abductor", "스탠딩 어브덕션", "legs", "머신", "wr"],
    ["hip-adduction", "힙 어덕션 (이너타이)", "legs", "머신", "wr"],
    ["cable-glute-kickback", "케이블 킥백", "legs", "케이블", "wr"],
    ["glute-kickback-machine", "글루트 킥백 머신", "legs", "머신", "wr"],
    ["multi-hip-machine", "멀티 힙 머신", "legs", "머신", "wr"],
    ["reverse-hyperextension", "리버스 하이퍼 익스텐션", "legs", "머신", "wr"],
    ["calf-raise", "카프 레이즈 (스탠딩 · 시티드)", "legs", "머신", "wr"],
    ["donkey-calf-raise", "동키 카프 레이즈", "legs", "머신", "wr"],
    ["tibia-dorsi-flexion", "티비아 레이즈 (정강이)", "legs", "머신", "wr"],
    ["overhead-press", "오버헤드 프레스 (밀리터리 프레스)", "shoulders", "바벨", "wr"],
    ["dumbbell-shoulder-press", "덤벨 숄더 프레스", "shoulders", "덤벨", "wr"],
    ["arnold-press", "아놀드 프레스", "shoulders", "덤벨", "wr"],
    ["smith-shoulder-press", "스미스 숄더 프레스", "shoulders", "스미스 머신", "wr"],
    ["shoulder-press-machine", "숄더 프레스 머신", "shoulders", "머신", "wr"],
    ["iso-lateral-super-incline-press", "슈퍼 인클라인 프레스", "shoulders", "머신", "wr"],
    ["viking-press", "바이킹 프레스", "shoulders", "머신", "wr"],
    ["lateral-raise", "사이드 레터럴 레이즈", "shoulders", "덤벨", "wr"],
    ["cable-lateral-raise", "케이블 레터럴 레이즈", "shoulders", "케이블", "wr"],
    ["lateral-raise-machine", "레터럴 레이즈 머신", "shoulders", "머신", "wr"],
    ["front-raise", "프론트 레이즈", "shoulders", "덤벨 · 원판 · 케이블", "wr"],
    ["rear-delt-raise", "벤트오버 레터럴 레이즈 (후면)", "shoulders", "덤벨", "wr"],
    ["reverse-pec-deck", "리버스 펙덱 (후면)", "shoulders", "머신", "wr"],
    ["face-pull", "페이스 풀", "shoulders", "케이블", "wr"],
    ["upright-row", "업라이트 로우", "shoulders", "바벨 · 케이블", "wr"],
    ["shrug", "슈러그 (승모)", "shoulders", "바벨 · 덤벨 · 머신", "wr"],
    ["barbell-curl", "바벨 컬", "arms", "바벨", "wr"],
    ["ez-bar-curl", "EZ바 컬", "arms", "EZ바", "wr"],
    ["dumbbell-curl", "덤벨 컬", "arms", "덤벨", "wr"],
    ["hammer-curl", "해머 컬", "arms", "덤벨", "wr"],
    ["incline-dumbbell-curl", "인클라인 덤벨 컬", "arms", "덤벨 · 벤치", "wr"],
    ["concentration-curl", "컨센트레이션 컬", "arms", "덤벨", "wr"],
    ["preacher-curl", "프리처 컬", "arms", "EZ바 · 덤벨", "wr"],
    ["biceps-curl-machine", "바이셉스 컬 머신", "arms", "머신", "wr"],
    ["cable-curl", "케이블 컬", "arms", "케이블", "wr"],
    ["spider-curl", "스파이더 컬", "arms", "덤벨 · EZ바", "wr"],
    ["skull-crusher", "라잉 트라이셉스 익스텐션 (스컬 크러셔)", "arms", "EZ바", "wr"],
    ["close-grip-bench-press", "클로즈그립 벤치프레스", "arms", "바벨", "wr"],
    ["triceps-pushdown", "케이블 푸시다운 (로프 · 바)", "arms", "케이블", "wr"],
    ["overhead-triceps-extension", "오버헤드 트라이셉스 익스텐션", "arms", "덤벨 · 케이블", "wr"],
    ["triceps-kickback", "덤벨 킥백", "arms", "덤벨", "wr"],
    ["triceps-dips", "딥스 (삼두)", "arms", "딥스대", "r"],
    ["bench-dips", "벤치 딥스", "arms", "벤치", "r"],
    ["triceps-extension-machine", "트라이셉스 익스텐션 머신", "arms", "머신", "wr"],
    ["seated-dip-machine", "시티드 딥스 머신", "arms", "머신", "wr"],
    ["wrist-curl", "리스트 컬", "arms", "바벨 · 덤벨", "wr"],
    ["reverse-wrist-curl", "리버스 리스트 컬", "arms", "바벨 · 덤벨", "wr"],
    ["reverse-curl", "리버스 컬", "arms", "EZ바", "wr"],
    ["gripper", "그립 머신", "arms", "머신 · 악력기", "wr"],
    ["crunch", "크런치", "abs", "맨몸", "r"],
    ["bicycle-crunch", "바이시클 크런치", "abs", "맨몸", "r"],
    ["cable-crunch", "케이블 크런치", "abs", "케이블", "wr"],
    ["ab-crunch-machine", "앱 크런치 머신", "abs", "머신", "wr"],
    ["oblique-crunch-machine", "오블리크 크런치 머신", "abs", "머신", "wr"],
    ["decline-sit-up", "디클라인 싯업", "abs", "복근 보드 · 디클라인 벤치", "r"],
    ["rotary-torso-machine", "토르소 로테이션 머신", "abs", "머신", "wr"],
    ["lying-leg-raise", "레그 레이즈", "abs", "맨몸", "r"],
    ["hanging-leg-raise", "행잉 레그 레이즈", "abs", "철봉", "r"],
    ["captain-s-chair-leg-raise", "캡틴스 체어 레그 레이즈", "abs", "캡틴스 체어", "r"],
    ["toes-to-bar", "토 투 바", "abs", "철봉", "r"],
    ["russian-twist", "러시안 트위스트", "abs", "맨몸 · 원판", "r"],
    ["ab-wheel-rollout", "앱 롤아웃", "abs", "앱휠", "r"],
    ["dead-bug", "데드버그", "abs", "맨몸", "r"],
    ["mountain-climber", "마운틴 클라이머", "abs", "맨몸", "r"],
    ["plank", "플랭크", "abs", "맨몸", "t"],
    ["side-plank", "사이드 플랭크", "abs", "맨몸", "t"],
    ["treadmill", "러닝머신 (걷기 · 달리기 · 경사 걷기 · 무동력)", "cardio", "트레드밀", "cardio"],
    ["stair-climber-stepmill", "천국의 계단", "cardio", "스텝밀", "cardio"],
    ["stepper", "스텝퍼", "cardio", "스텝퍼", "cardio"],
    ["stationary-recumbent-bike", "실내 사이클 (업라이트 · 좌식)", "cardio", "사이클", "cardio"],
    ["air-bike-assault-bike", "에어바이크", "cardio", "에어바이크", "cardio"],
    ["elliptical", "일립티컬", "cardio", "크로스 트레이너", "cardio"],
    ["arc-trainer", "아크 트레이너", "cardio", "아크 트레이너", "cardio"],
    ["jacob-s-ladder", "제이콥스 래더", "cardio", "제이콥스 래더", "cardio"],
    ["rowing-machine", "로잉머신", "cardio", "로잉머신", "cardio"],
    ["skierg", "스키 에르그", "cardio", "스키 에르그", "cardio"],
    ["jump-rope", "줄넘기", "cardio", "줄넘기", "cardio"],
    ["burpee", "버피", "cardio", "맨몸", "r"],
    ["battle-rope", "배틀로프", "cardio", "배틀로프", "t"],
    ["box-jump", "박스 점프", "cardio", "박스", "r"],
    ["kettlebell-swing", "케틀벨 스윙", "full", "케틀벨", "wr"],
    ["power-clean", "클린", "full", "바벨", "wr"],
    ["thruster", "쓰러스터", "full", "바벨 · 덤벨", "wr"],
    ["farmer-s-walk", "파머스 워크", "full", "덤벨 · 케틀벨", "wt"],
    ["sled-push", "슬레드 푸시", "full", "슬레드", "wr"],
    ["wall-ball", "월볼", "full", "메디신볼", "wr"],
  ];
  // Fields per kind: [field, unit, keyboard, optional]. t is seconds, or minutes for cardio.
  const EX_KINDS = {
    wr: [['w', 'kg', 'decimal'], ['r', '회', 'numeric']],
    r: [['r', '회', 'numeric'], ['w', '+kg', 'decimal', true]],
    t: [['t', '초', 'numeric']],
    wt: [['w', 'kg', 'decimal'], ['t', '초', 'numeric']],
    cardio: [['t', '분', 'numeric'], ['d', 'km', 'decimal', true]],
  };
  const EXERCISE_MAP = new Map(EXERCISES.map(([id, name, part, equip, kind]) => [id, { id, name, part, equip, kind }]));

  // ---------- recommended routines ----------
  // Each part has slots in workout order (big compound lift first, isolation last).
  // A slot is [sets, reps, candidates]; a candidate is an exercise id, or
  // [id, sets, reps, first] to override (first: goes to the front, e.g. deadlifts).
  // Reps are 'low-high'; '' means as many as you can; time for planks/cardio.
  const ROUTINE_SLOTS = {
    chest: [
      [4, '6-10', ['barbell-bench-press', 'barbell-bench-press', 'dumbbell-bench-press', 'smith-machine-bench-press', 'chest-press-machine']],
      [3, '8-12', ['incline-dumbbell-press', 'incline-bench-press', 'smith-incline-press', 'incline-chest-press-machine']],
      [3, '10-12', ['chest-press-machine', 'wide-chest-press-plate-loaded', 'decline-chest-press-machine', 'dumbbell-bench-press', 'decline-bench-press', ['chest-dips', 3, '']]],
      [3, '12-15', ['pec-deck-fly', 'dumbbell-fly', 'incline-dumbbell-fly', 'cable-crossover', 'low-to-high-cable-fly']],
      [3, '12-15', [['push-up', 3, ''], ['chest-dips', 3, ''], 'cable-crossover', 'dumbbell-pullover']],
    ],
    back: [
      [4, '8-12', ['lat-pulldown', 'lat-pulldown', ['pull-up', 4, ''], ['assisted-pull-up', 4, '8-12'], 'close-grip-lat-pulldown', ['chin-up', 4, '']]],
      [4, '8-10', ['barbell-row', 't-bar-row', 'pendlay-row', 'iso-lateral-row-mid-row', 'iso-lateral-d-y-row', 'chest-supported-row']],
      [3, '10-12', ['seated-cable-row', 'seated-row-machine', 'low-row-machine', 'high-row-machine']],
      [3, '10-15', ['one-arm-dumbbell-row', 'straight-arm-pulldown', 'pullover-machine', 'high-row-machine']],
      [3, '12-15', [['back-extension', 3, '12-15'], 'lower-back-extension-machine', ['deadlift', 3, '5', true], ['rack-pull', 3, '5', true]]],
    ],
    legs: [
      [4, '6-10', ['barbell-back-squat', 'barbell-back-squat', 'front-squat', 'smith-machine-squat', 'hack-squat', 'v-squat-pendulum-squat', 'squat-machine', 'belt-squat']],
      [4, '10-12', ['leg-press', 'leg-press', 'seated-leg-press', ['bulgarian-split-squat', 3, '8-10'], ['lunge', 3, '10-12']]],
      [3, '8-10', ['romanian-deadlift', 'stiff-leg-deadlift', 'hip-thrust', ['glute-ham-raise', 3, '']]],
      [3, '12-15', ['leg-extension', ['goblet-squat', 3, '12-15'], ['step-up', 3, '10-12']]],
      [3, '12-15', ['lying-leg-curl', 'seated-leg-curl', 'kneeling-leg-curl', 'standing-leg-curl']],
      [4, '15-20', ['calf-raise', 'donkey-calf-raise', ['hip-abduction', 3, '15-20'], ['hip-adduction', 3, '15-20'], ['glute-kickback-machine', 3, '12-15']]],
    ],
    shoulders: [
      [4, '8-12', ['overhead-press', 'dumbbell-shoulder-press', 'shoulder-press-machine', 'smith-shoulder-press', 'arnold-press', 'viking-press']],
      [4, '12-15', ['lateral-raise', 'cable-lateral-raise', 'lateral-raise-machine']],
      [3, '12-15', ['reverse-pec-deck', 'rear-delt-raise', 'face-pull']],
      [3, '10-12', ['arnold-press', 'front-raise', 'upright-row', 'iso-lateral-super-incline-press', 'shoulder-press-machine']],
      [3, '10-15', ['shrug', 'face-pull', 'upright-row']],
    ],
    arms: [
      [3, '8-12', ['barbell-curl', 'ez-bar-curl', 'dumbbell-curl', 'preacher-curl', 'biceps-curl-machine']],
      [3, '8-12', ['close-grip-bench-press', 'skull-crusher', ['triceps-dips', 3, ''], 'seated-dip-machine', 'triceps-extension-machine']],
      [3, '10-12', ['hammer-curl', 'incline-dumbbell-curl', 'cable-curl', 'concentration-curl', 'spider-curl']],
      [3, '12-15', ['triceps-pushdown', 'overhead-triceps-extension', 'triceps-kickback', ['bench-dips', 3, '']]],
      [3, '12-15', ['reverse-curl', 'wrist-curl', 'hammer-curl', 'cable-curl']],
    ],
    abs: [
      [3, '10-15', ['hanging-leg-raise', 'captain-s-chair-leg-raise', 'lying-leg-raise', 'toes-to-bar']],
      [3, '12-15', ['cable-crunch', 'ab-crunch-machine', 'decline-sit-up', 'crunch']],
      [3, '45', ['plank', 'side-plank', ['dead-bug', 3, '12'], ['ab-wheel-rollout', 3, '10']]],
      [3, '15-20', ['russian-twist', 'rotary-torso-machine', 'oblique-crunch-machine', 'bicycle-crunch']],
    ],
    cardio: [
      [1, '20-30', ['treadmill', 'stationary-recumbent-bike', 'elliptical', 'arc-trainer', 'rowing-machine']],
      [1, '10-15', ['stair-climber-stepmill', 'stepper', 'air-bike-assault-bike', 'jump-rope', 'skierg', 'jacob-s-ladder']],
    ],
    full: [
      [3, '5', ['power-clean', 'thruster']],
      [3, '15', ['kettlebell-swing', 'wall-ball']],
      [3, '40', ['farmer-s-walk', ['sled-push', 3, '6']]],
    ],
  };

  // Routine 1 of each part: the classic order. The other 9 are drawn from the slots.
  const CLASSIC_ROUTINES = {
    chest: [['barbell-bench-press', 4, '8-10'], ['incline-dumbbell-press', 3, '10-12'], ['chest-press-machine', 3, '10-12'],
      ['pec-deck-fly', 3, '12-15'], ['cable-crossover', 3, '12-15'], ['chest-dips', 3, '']],
    back: [['deadlift', 3, '5'], ['lat-pulldown', 4, '10-12'], ['barbell-row', 4, '8-10'],
      ['seated-cable-row', 3, '10-12'], ['one-arm-dumbbell-row', 3, '10-12'], ['pull-up', 3, '']],
    legs: [['barbell-back-squat', 4, '8-10'], ['leg-press', 4, '10-12'], ['romanian-deadlift', 3, '8-10'],
      ['leg-extension', 3, '12-15'], ['lying-leg-curl', 3, '12-15'], ['calf-raise', 4, '15-20']],
    shoulders: [['dumbbell-shoulder-press', 4, '8-12'], ['lateral-raise', 4, '12-15'], ['shoulder-press-machine', 3, '10-12'],
      ['reverse-pec-deck', 3, '12-15'], ['face-pull', 3, '12-15'], ['shrug', 3, '10-12']],
    arms: [['barbell-curl', 3, '10-12'], ['triceps-pushdown', 3, '12-15'], ['hammer-curl', 3, '10-12'],
      ['skull-crusher', 3, '10-12'], ['incline-dumbbell-curl', 3, '10-12'], ['overhead-triceps-extension', 3, '12-15']],
    abs: [['hanging-leg-raise', 3, '10-15'], ['cable-crunch', 3, '12-15'], ['plank', 3, '45'],
      ['ab-wheel-rollout', 3, '10'], ['russian-twist', 3, '20']],
    cardio: [['treadmill', 1, '20-30'], ['stair-climber-stepmill', 1, '15-20']],
  };

  // >>> collected routines
  // Real routines collected from fitness sites (see routine-sources.md), per part.
  // [exercise id, sets, reps]; reps '' = as many as you can.
  const COLLECTED_ROUTINES = {
    chest: [
      [["dumbbell-bench-press", 3, "6"], ["incline-bench-press", 3, "8"], ["chest-dips", 2, "10"], ["push-up", 2, "10"]],
      [["dumbbell-fly", 3, "20"], ["dumbbell-bench-press", 4, "6"], ["incline-bench-press", 3, "8"], ["incline-dumbbell-press", 3, "12"], ["cable-crossover", 4, "15"], ["push-up", 2, ""]],
      [["barbell-bench-press", 4, "6-12"], ["incline-dumbbell-press", 3, "10-15"], ["chest-dips", 2, ""], ["cable-crossover", 3, "12-15"]],
      [["barbell-bench-press", 3, "5-8"], ["incline-dumbbell-press", 3, "5-8"], ["decline-bench-press", 3, "8-10"], ["dumbbell-fly", 3, "8-10"], ["low-to-high-cable-fly", 3, "8-10"], ["chest-dips", 2, ""]],
      [["incline-dumbbell-press", 4, "10-12"], ["chest-press-machine", 4, "10-12"], ["pec-deck-fly", 3, "10-12"], ["cable-crossover", 3, "10-12"], ["incline-dumbbell-fly", 3, "10-12"]],
      [["incline-bench-press", 3, "5-8"], ["incline-dumbbell-fly", 3, "8-10"], ["low-to-high-cable-fly", 3, "8-10"], ["dumbbell-pullover", 3, "5-8"], ["incline-dumbbell-press", 3, "12-15"], ["incline-chest-press-machine", 3, "12-15"]],
      [["incline-bench-press", 5, "5"], ["chest-dips", 4, "6-8"], ["dumbbell-bench-press", 3, "8-10"], ["cable-crossover", 4, "8-12"], ["dumbbell-pullover", 3, "8-12"]],
      [["barbell-bench-press", 4, "6-12"], ["cable-crossover", 4, "15"], ["incline-bench-press", 4, "6-12"], ["low-to-high-cable-fly", 4, "15"], ["chest-dips", 4, "6-12"], ["push-up", 3, ""]],
      [["barbell-bench-press", 5, "5"], ["incline-bench-press", 5, "5"], ["incline-dumbbell-press", 4, "8"], ["incline-dumbbell-fly", 4, "10"], ["push-up", 4, "12"]],
      [["barbell-bench-press", 5, "8"], ["cable-crossover", 5, "12"], ["incline-dumbbell-press", 4, "12"], ["incline-dumbbell-fly", 4, "12"], ["dumbbell-pullover", 3, "15"], ["push-up", 3, "15"]],
      [["barbell-bench-press", 3, "3-5"], ["dumbbell-fly", 3, "8-12"], ["incline-bench-press", 3, "3-5"], ["cable-crossover", 3, "8-12"], ["push-up", 3, "8-12"]],
      [["incline-bench-press", 4, "6-12"], ["dumbbell-fly", 4, "6-12"], ["dumbbell-bench-press", 4, "6-12"], ["dumbbell-pullover", 4, "6-12"], ["cable-crossover", 4, "6-12"]],
      [["incline-bench-press", 3, "4-6"], ["incline-dumbbell-press", 3, "8"], ["incline-dumbbell-fly", 3, "8-12"], ["push-up", 3, "12"]],
      [["decline-bench-press", 3, "4-6"], ["decline-dumbbell-press", 3, "8"], ["dumbbell-fly", 3, "8-12"], ["push-up", 3, "12"]],
      [["barbell-bench-press", 3, "4-6"], ["incline-bench-press", 3, "4-6"], ["decline-bench-press", 3, "4-6"], ["chest-dips", 3, "8-12"]],
      [["dumbbell-bench-press", 3, "8-12"], ["incline-dumbbell-press", 3, "8-12"], ["decline-dumbbell-press", 3, "8-12"], ["chest-dips", 3, "8-12"]],
      [["barbell-bench-press", 5, "6-20"], ["incline-bench-press", 5, "10-15"], ["dumbbell-fly", 5, "10-15"], ["chest-dips", 5, "15"], ["dumbbell-pullover", 5, "15-20"]],
      [["dumbbell-bench-press", 3, "10-14"], ["incline-bench-press", 4, "8-14"], ["decline-dumbbell-press", 4, "8-14"], ["incline-dumbbell-fly", 3, "8-12"], ["cable-crossover", 3, "8-12"]],
      [["dumbbell-fly", 3, "10-12"], ["push-up", 3, "10-12"], ["dumbbell-bench-press", 3, "10-12"], ["cable-crossover", 3, "10-12"]],
      [["barbell-bench-press", 5, "3-5"], ["dumbbell-bench-press", 5, "3-5"], ["smith-incline-press", 3, "3-5"], ["decline-bench-press", 3, "3-5"]],
      [["decline-bench-press", 4, "12"], ["dumbbell-bench-press", 4, "12"], ["dumbbell-fly", 4, "10"], ["low-to-high-cable-fly", 4, "15"], ["chest-press-machine", 3, ""]],
      [["incline-bench-press", 4, "12"], ["incline-dumbbell-press", 4, "8"], ["dumbbell-pullover", 4, "12"], ["incline-dumbbell-fly", 4, "12"], ["low-to-high-cable-fly", 4, "15-20"]],
      [["barbell-bench-press", 4, "6"], ["incline-dumbbell-press", 3, "8"], ["incline-dumbbell-fly", 4, "15"], ["cable-crossover", 4, "15"], ["chest-press-machine", 2, "12"]],
      [["chest-press-machine", 3, "8-12"], ["dumbbell-bench-press", 3, "8-12"], ["pec-deck-fly", 2, "12-15"], ["push-up", 2, ""]],
      [["barbell-bench-press", 4, "6-10"], ["incline-dumbbell-press", 3, "8-12"], ["chest-press-machine", 3, "10-15"], ["cable-crossover", 3, "12-15"]],
      [["pec-deck-fly", 3, "12-15"], ["barbell-bench-press", 4, "8-10"], ["incline-dumbbell-press", 3, "10"], ["chest-dips", 3, "10"]],
      [["push-up", 2, "10-15"], ["dumbbell-bench-press", 3, "8-12"], ["incline-dumbbell-press", 3, "8-12"], ["pec-deck-fly", 3, "12-15"], ["cable-crossover", 3, "12-15"]],
      [["pec-deck-fly", 3, "15-20"], ["barbell-bench-press", 4, "8-10"], ["incline-dumbbell-press", 3, "10-12"], ["cable-crossover", 3, "12-15"]],
      [["barbell-bench-press", 5, "5"], ["incline-dumbbell-press", 3, "6-8"], ["chest-dips", 3, "6-8"], ["pec-deck-fly", 3, "12"]],
      [["incline-dumbbell-press", 4, "8-12"], ["smith-machine-bench-press", 4, "8-10"], ["push-up", 3, "10-15"]],
      [["incline-bench-press", 5, "12"], ["dumbbell-bench-press", 5, "12"], ["chest-dips", 5, "12"], ["pec-deck-fly", 5, "12"]],
      [["pec-deck-fly", 3, "12-15"], ["smith-incline-press", 4, "8-12"], ["incline-dumbbell-press", 3, "8-12"], ["dumbbell-fly", 3, "12-15"]],
      [["chest-press-machine", 3, "8-12"], ["decline-chest-press-machine", 3, "10-12"], ["incline-chest-press-machine", 3, "8-12"]],
      [["incline-chest-press-machine", 4, "8-12"], ["wide-chest-press-plate-loaded", 4, "8-12"], ["chest-dips", 3, "10-15"], ["pec-deck-fly", 3, "12-15"]],
      [["chest-press-machine", 3, "10-12"], ["incline-chest-press-machine", 2, "10-12"], ["pec-deck-fly", 2, "12-15"], ["push-up", 2, "8-12"]],
      [["incline-dumbbell-fly", 4, "15-20"], ["incline-dumbbell-press", 4, "8-15"], ["chest-press-machine", 4, "8-15"], ["dumbbell-pullover", 4, "8-15"], ["chest-dips", 4, "10-15"]],
      [["dumbbell-fly", 3, "10-15"], ["dumbbell-bench-press", 4, "8-12"], ["dumbbell-pullover", 3, "10-15"]],
      [["push-up", 4, "10-15"], ["dumbbell-bench-press", 3, "12-15"], ["dumbbell-fly", 3, "12-15"], ["dumbbell-pullover", 3, "15"]],
      [["barbell-bench-press", 5, "5-8"], ["incline-bench-press", 4, "8"], ["chest-dips", 4, ""], ["dumbbell-fly", 4, "12"], ["cable-crossover", 4, "15"]],
      [["decline-chest-press-machine", 4, "8-12"], ["chest-press-machine", 4, "8-12"], ["cable-crossover", 4, "12-15"], ["dumbbell-pullover", 3, "12-15"]],
    ],
    back: [
      [["chin-up", 5, "8-10"], ["barbell-row", 5, "8-10"], ["t-bar-row", 5, "8-10"], ["deadlift", 5, "8-10"]],
      [["close-grip-lat-pulldown", 3, "10"], ["seated-cable-row", 4, "10"], ["straight-arm-pulldown", 4, "12"], ["lat-pulldown", 4, "12"], ["back-extension", 4, "12-15"]],
      [["lat-pulldown", 4, "10"], ["chest-supported-row", 4, "10"], ["close-grip-lat-pulldown", 4, "10"], ["seated-cable-row", 4, "12"], ["seated-row-machine", 4, "12"], ["lower-back-extension-machine", 4, "15"]],
      [["chin-up", 6, "10-12"], ["barbell-row", 4, "10-12"], ["seated-cable-row", 4, "12"], ["back-extension", 4, "10-12"]],
      [["deadlift", 5, "5"], ["pull-up", 4, ""], ["barbell-row", 4, "8"], ["back-extension", 3, "15"]],
      [["chin-up", 2, "6-8"], ["barbell-row", 2, "10-12"], ["deadlift", 2, "8-10"]],
      [["t-bar-row", 4, "6-8"], ["barbell-row", 4, "8-10"], ["lat-pulldown", 4, "10-12"], ["chin-up", 3, "6-8"], ["seated-cable-row", 3, "8-10"]],
      [["deadlift", 5, "5"], ["pull-up", 4, "8"], ["seated-cable-row", 3, "10"], ["pullover-machine", 3, "12"]],
      [["rack-pull", 3, "5"], ["pull-up", 4, "10-12"], ["barbell-row", 4, "6-8"], ["one-arm-dumbbell-row", 3, "10"], ["seated-cable-row", 3, "12-15"], ["pullover-machine", 2, "10-15"]],
      [["deadlift", 3, "5"], ["pull-up", 3, "8"], ["one-arm-dumbbell-row", 3, "10"], ["back-extension", 3, "12"]],
      [["deadlift", 3, "6"], ["barbell-row", 3, "6"], ["assisted-pull-up", 2, "10"]],
      [["deadlift", 3, "6-8"], ["barbell-row", 3, "8-10"], ["lat-pulldown", 3, "8-12"], ["straight-arm-pulldown", 2, "12-15"]],
      [["seated-cable-row", 4, "12-15"], ["one-arm-dumbbell-row", 4, "10-15"], ["pull-up", 3, "12-15"], ["back-extension", 2, ""]],
      [["pendlay-row", 4, "8"], ["one-arm-dumbbell-row", 3, "12"], ["straight-arm-pulldown", 3, "12"], ["lat-pulldown", 3, "12"]],
      [["pull-up", 5, "5"], ["chest-supported-row", 4, "8-10"], ["lat-pulldown", 4, "8-10"], ["seated-cable-row", 4, "12-15"]],
      [["straight-arm-pulldown", 3, "10-12"], ["high-row-machine", 3, "10-12"], ["barbell-row", 3, "10-12"], ["assisted-pull-up", 3, "10-12"], ["t-bar-row", 3, "10-12"], ["one-arm-dumbbell-row", 3, "10-12"]],
      [["rack-pull", 4, "4"], ["chin-up", 4, "6"], ["t-bar-row", 4, "8"], ["one-arm-dumbbell-row", 2, "15"], ["straight-arm-pulldown", 3, "10-12"], ["back-extension", 3, "10-12"]],
      [["deadlift", 3, "5"], ["chin-up", 4, "6"], ["t-bar-row", 4, "8-12"], ["lat-pulldown", 3, "8-12"], ["straight-arm-pulldown", 2, "12"], ["back-extension", 3, "12"]],
      [["rack-pull", 4, "4"], ["pull-up", 3, "8"], ["seated-cable-row", 3, "8-12"], ["close-grip-lat-pulldown", 3, "8-12"], ["chest-supported-row", 3, "8-12"], ["back-extension", 3, "12"]],
      [["lat-pulldown", 5, "10-15"], ["t-bar-row", 5, "8-15"], ["one-arm-dumbbell-row", 4, "12-15"], ["seated-row-machine", 4, "10-12"], ["seated-cable-row", 3, "25"], ["straight-arm-pulldown", 3, "12-15"]],
      [["straight-arm-pulldown", 6, "15"], ["pull-up", 5, ""], ["t-bar-row", 5, "10-15"], ["lat-pulldown", 5, "8-15"], ["one-arm-dumbbell-row", 4, "15-20"], ["seated-cable-row", 4, "20-30"], ["back-extension", 4, "30"]],
      [["lat-pulldown", 3, "12"], ["seated-cable-row", 3, "12"], ["deadlift", 3, "12"]],
      [["deadlift", 4, "8"], ["seated-cable-row", 4, "10-12"], ["lat-pulldown", 4, "10-12"], ["barbell-row", 4, "10-12"], ["t-bar-row", 4, "10-12"], ["one-arm-dumbbell-row", 4, "10-12"], ["pull-up", 4, "10"]],
      [["lat-pulldown", 3, "12-16"], ["close-grip-lat-pulldown", 3, "12-16"], ["seated-cable-row", 3, "10"], ["one-arm-dumbbell-row", 3, "10"], ["barbell-row", 3, "10"]],
      [["pull-up", 3, "5-8"], ["deadlift", 5, "5"], ["pendlay-row", 3, "6"], ["lat-pulldown", 2, "12-15"]],
      [["straight-arm-pulldown", 3, "10-15"], ["lat-pulldown", 3, "10-15"], ["pullover-machine", 3, "8-10"], ["barbell-row", 3, "8-10"], ["seated-row-machine", 3, "10-15"]],
      [["lat-pulldown", 5, "10"], ["chest-supported-row", 3, "10-12"], ["pullover-machine", 2, "10-12"]],
      [["lat-pulldown", 5, "15-20"], ["seated-cable-row", 4, "15-20"], ["close-grip-lat-pulldown", 3, "15-20"], ["t-bar-row", 4, "10-15"], ["rack-pull", 4, "10"]],
      [["lat-pulldown", 4, "15-20"], ["t-bar-row", 4, "15-20"], ["one-arm-dumbbell-row", 4, "15-20"], ["seated-cable-row", 4, "15-20"], ["pull-up", 4, "15-20"]],
      [["barbell-row", 3, "6-8"], ["seated-cable-row", 3, "8-12"], ["close-grip-lat-pulldown", 3, "12"], ["back-extension", 3, "12"]],
      [["one-arm-dumbbell-row", 3, "8-12"], ["barbell-row", 3, "6-8"], ["lat-pulldown", 3, "15"], ["good-morning", 3, "12-15"]],
      [["lat-pulldown", 4, "10-15"], ["seated-cable-row", 4, "8-12"], ["barbell-row", 4, "10-12"], ["back-extension", 4, "12"]],
      [["close-grip-lat-pulldown", 4, "8-12"], ["pull-up", 4, "8-12"], ["barbell-row", 4, "6-15"], ["straight-arm-pulldown", 4, "12-25"], ["back-extension", 4, "12-15"]],
      [["barbell-row", 4, "6-10"], ["lat-pulldown", 3, "8-10"], ["seated-cable-row", 3, "10"], ["high-row-machine", 3, "10-12"], ["pullover-machine", 3, "12-15"]],
      [["close-grip-lat-pulldown", 4, "8-12"], ["t-bar-row", 4, "6-10"], ["seated-cable-row", 3, "10-12"], ["straight-arm-pulldown", 3, "12-15"]],
      [["lat-pulldown", 3, "8-10"], ["barbell-row", 3, "8-10"], ["deadlift", 2, "8-10"]],
      [["pull-up", 3, "6-10"], ["one-arm-dumbbell-row", 3, "10-12"], ["chest-supported-row", 2, "12"], ["back-extension", 2, "12-15"]],
      [["deadlift", 5, "10"], ["lat-pulldown", 3, "10"], ["t-bar-row", 3, "12"], ["chest-supported-row", 3, "10"], ["pull-up", 3, ""]],
      [["lat-pulldown", 2, "10-15"], ["straight-arm-pulldown", 2, "12-15"], ["high-row-machine", 2, "12-15"], ["iso-lateral-row-mid-row", 2, "12-15"]],
      [["chest-supported-row", 3, "15"], ["lat-pulldown", 3, "15"], ["straight-arm-pulldown", 3, "15"], ["low-row-machine", 2, "15-20"], ["high-row-machine", 2, "15-20"], ["seated-cable-row", 1, "10-12"]],
    ],
    legs: [
      [["barbell-back-squat", 3, "6"], ["romanian-deadlift", 3, "8"], ["bulgarian-split-squat", 3, "10"], ["seated-leg-curl", 3, "12"], ["leg-extension", 2, "12"], ["calf-raise", 3, "15"]],
      [["front-squat", 4, "6"], ["romanian-deadlift", 3, "8"], ["leg-press", 3, "10"], ["reverse-hyperextension", 3, "10"], ["lunge", 2, "12"], ["calf-raise", 6, "12-15"]],
      [["goblet-squat", 3, "12-15"], ["romanian-deadlift", 3, "10"], ["hip-thrust", 4, "8-10"], ["hip-abduction", 2, "15-20"], ["sumo-deadlift", 3, "10-12"]],
      [["smith-machine-squat", 4, "8-10"], ["lying-leg-curl", 3, "10-12"], ["hack-squat", 3, "8-12"], ["leg-extension", 3, "12-15"], ["standing-abductor", 2, "12-15"], ["hip-adduction", 2, "12-15"], ["cable-glute-kickback", 2, "12-15"], ["leg-press", 3, "12"], ["calf-raise", 3, "10-12"]],
      [["calf-raise", 3, "15"], ["standing-leg-curl", 3, "10-20"], ["lying-leg-curl", 3, "12"], ["front-squat", 4, "6-12"], ["hack-squat", 3, "10-20"], ["leg-extension", 3, "20"]],
      [["leg-extension", 4, "8-12"], ["front-squat", 4, "10-12"], ["leg-press", 3, "10-12"], ["hack-squat", 7, "5-7"], ["stiff-leg-deadlift", 4, "10-12"], ["lying-leg-curl", 4, "10-12"], ["seated-leg-curl", 7, "5-7"], ["calf-raise", 10, "15-20"]],
      [["romanian-deadlift", 3, "10"], ["goblet-squat", 3, "10"], ["hack-squat", 3, "12"], ["cable-glute-kickback", 3, "10"], ["stiff-leg-deadlift", 3, "15"], ["hip-thrust", 6, "10"]],
      [["barbell-back-squat", 10, "10"], ["lying-leg-curl", 10, "10"], ["lunge", 4, "8-10"], ["step-up", 3, "12"], ["leg-extension", 3, ""]],
      [["leg-extension", 6, "20"], ["leg-press", 5, "28"], ["hack-squat", 4, "10"], ["squat-machine", 4, "15"], ["barbell-back-squat", 4, "10"], ["lying-leg-curl", 4, "15"], ["seated-leg-curl", 4, "15"]],
      [["barbell-back-squat", 3, "12-20"], ["leg-extension", 4, "10"], ["lunge", 3, "10"]],
      [["lying-leg-curl", 3, "8-12"], ["romanian-deadlift", 5, "5"], ["lunge", 3, "12"]],
      [["leg-press", 3, "8-12"], ["barbell-back-squat", 5, "5"], ["hack-squat", 3, "12"], ["leg-extension", 3, "15"]],
      [["barbell-back-squat", 2, "20"], ["leg-press", 5, "20"], ["hack-squat", 2, "20"], ["leg-extension", 5, "20"], ["stiff-leg-deadlift", 2, "20"], ["lying-leg-curl", 5, "20"], ["calf-raise", 6, "20"]],
      [["leg-press", 3, "10-15"], ["leg-extension", 2, "10"], ["lying-leg-curl", 2, "10"], ["calf-raise", 2, "10-12"]],
      [["hack-squat", 3, "10-15"], ["leg-press", 3, "15"], ["leg-extension", 3, "15"]],
      [["hip-thrust", 6, "5"], ["romanian-deadlift", 6, "5"], ["calf-raise", 6, "12"]],
      [["stiff-leg-deadlift", 3, "10-12"], ["seated-leg-curl", 3, "7-9"], ["standing-leg-curl", 3, "4-6"]],
      [["barbell-back-squat", 6, "8-15"], ["stiff-leg-deadlift", 4, "12"], ["leg-press", 4, "8"], ["leg-extension", 4, "12"], ["lying-leg-curl", 4, "8"]],
      [["goblet-squat", 3, "8-12"], ["lunge", 3, "8-12"], ["step-up", 3, "15-20"], ["bulgarian-split-squat", 3, "8-12"], ["stiff-leg-deadlift", 3, "10-12"], ["lying-leg-curl", 3, "10-15"]],
      [["hip-thrust", 4, "8-12"], ["bulgarian-split-squat", 3, "8-10"], ["romanian-deadlift", 3, "10-12"], ["cable-glute-kickback", 3, "12-15"], ["hip-abduction", 2, "15-20"], ["glute-bridge", 1, ""]],
      [["hip-thrust", 4, "8-12"], ["barbell-back-squat", 4, "6-10"], ["romanian-deadlift", 3, "8-12"], ["bulgarian-split-squat", 2, "8"], ["glute-bridge", 2, "12-15"]],
      [["front-squat", 3, "6-8"], ["romanian-deadlift", 3, "4-8"], ["bulgarian-split-squat", 3, "12-15"], ["leg-extension", 3, "10"], ["lying-leg-curl", 3, "10"], ["calf-raise", 4, "15-20"]],
      [["barbell-back-squat", 3, "4-6"], ["hack-squat", 3, "8-12"], ["glute-ham-raise", 3, "8-10"], ["lunge", 3, "15-20"], ["hip-thrust", 3, "8-12"], ["calf-raise", 3, "20"]],
      [["barbell-back-squat", 5, "5"], ["leg-press", 4, "8"], ["leg-extension", 4, "8-12"], ["lying-leg-curl", 4, "8-12"]],
      [["romanian-deadlift", 5, "5"], ["hack-squat", 4, "8-10"], ["lunge", 4, "8"], ["calf-raise", 4, "12"]],
      [["seated-leg-curl", 3, "12-20"], ["lunge", 3, "30"], ["lying-leg-curl", 3, "10-12"], ["hip-thrust", 3, "15-25"], ["glute-bridge", 3, "20-30"]],
      [["leg-press", 2, "10-12"], ["lying-leg-curl", 2, "10-15"], ["hip-thrust", 2, "10-12"], ["calf-raise", 2, "12-15"]],
      [["barbell-back-squat", 3, "6-10"], ["romanian-deadlift", 3, "8-12"], ["lunge", 3, "8-12"], ["lying-leg-curl", 3, "10-15"], ["calf-raise", 3, "12-20"]],
      [["leg-press", 3, "8-12"], ["goblet-squat", 3, "8-12"], ["lying-leg-curl", 3, "10-15"], ["calf-raise", 3, "12-20"]],
      [["barbell-back-squat", 4, "5-8"], ["romanian-deadlift", 3, "6-10"], ["leg-press", 3, "10-15"], ["bulgarian-split-squat", 3, "8-12"], ["lying-leg-curl", 3, "10-15"], ["calf-raise", 4, "12-20"]],
      [["goblet-squat", 3, "8"], ["step-up", 2, "10"], ["leg-extension", 1, "15"], ["lying-leg-curl", 1, "15"], ["calf-raise", 3, "10"]],
      [["barbell-back-squat", 3, "6-8"], ["hip-thrust", 4, "8-12"], ["leg-press", 3, "12-15"], ["leg-extension", 3, "8-15"], ["lying-leg-curl", 3, "8-15"], ["calf-raise", 1, "60"]],
      [["lunge", 2, "20"], ["front-squat", 4, "6-12"], ["hip-thrust", 4, "6-8"], ["romanian-deadlift", 4, "10-12"], ["leg-extension", 3, "8"], ["lying-leg-curl", 3, "8"], ["calf-raise", 4, "20"]],
      [["leg-extension", 3, "15"], ["front-squat", 4, "6"], ["leg-press", 3, "6-12"], ["bulgarian-split-squat", 3, "12-15"], ["lying-leg-curl", 2, "8-10"], ["calf-raise", 2, "20"]],
      [["romanian-deadlift", 4, "8"], ["leg-press", 3, "8"], ["hip-thrust", 3, "8-12"], ["lying-leg-curl", 3, "12"], ["glute-ham-raise", 2, "5"], ["leg-extension", 2, "15"]],
      [["barbell-back-squat", 8, "5-20"], ["hack-squat", 5, "10-15"], ["leg-extension", 5, "10-15"], ["lying-leg-curl", 6, "10-15"], ["calf-raise", 6, "10-15"]],
      [["goblet-squat", 3, "5-8"], ["lunge", 3, "8-12"], ["leg-extension", 3, "8-12"], ["lying-leg-curl", 3, "8-12"], ["calf-raise", 3, "8-12"]],
      [["barbell-back-squat", 4, "5-12"], ["bulgarian-split-squat", 3, "10-15"], ["leg-extension", 3, "10-15"], ["lying-leg-curl", 3, "10-15"], ["calf-raise", 3, "10-15"]],
      [["leg-press", 4, "15-20"], ["romanian-deadlift", 4, "15-20"], ["bulgarian-split-squat", 4, "15-20"], ["seated-leg-curl", 4, "15-20"], ["lunge", 2, ""]],
      [["stiff-leg-deadlift", 3, "15-30"], ["step-up", 3, "30-40"], ["goblet-squat", 3, "15-30"], ["hip-abduction", 3, "15-30"]],
    ],
    shoulders: [
      [["overhead-press", 3, "5"], ["upright-row", 3, "10"], ["lateral-raise", 3, "10"], ["front-raise", 3, "10"], ["rear-delt-raise", 3, "12"]],
      [["overhead-press", 4, "6-8"], ["upright-row", 3, "8-10"], ["front-raise", 3, "10-12"], ["shrug", 3, "12-15"]],
      [["dumbbell-shoulder-press", 3, "6"], ["lateral-raise", 3, "12"], ["face-pull", 3, "15"]],
      [["overhead-press", 3, "6"], ["lateral-raise", 3, "12"], ["rear-delt-raise", 3, "15"]],
      [["overhead-press", 3, "3"], ["dumbbell-shoulder-press", 3, "6-8"], ["lateral-raise", 3, "12-15"], ["face-pull", 2, "20"]],
      [["arnold-press", 3, "8-10"], ["lateral-raise", 2, "10-12"], ["cable-lateral-raise", 2, "12-15"], ["rear-delt-raise", 2, "15-20"], ["face-pull", 2, "20"]],
      [["dumbbell-shoulder-press", 3, "8"], ["lateral-raise", 3, "15"], ["shrug", 2, "20"]],
      [["dumbbell-shoulder-press", 3, "8-10"], ["lateral-raise", 3, "15"], ["rear-delt-raise", 3, "15"], ["upright-row", 3, "12"], ["front-raise", 3, "12"]],
      [["shoulder-press-machine", 4, "12-15"], ["cable-lateral-raise", 4, "12-15"], ["rear-delt-raise", 4, "12-15"], ["reverse-pec-deck", 4, "12-15"]],
      [["dumbbell-shoulder-press", 4, "6-10"], ["upright-row", 3, "8-10"], ["rear-delt-raise", 3, "8-12"], ["lateral-raise", 3, "8-12"], ["front-raise", 3, "8-12"]],
      [["overhead-press", 4, "8-12"], ["lateral-raise", 3, "10-12"], ["rear-delt-raise", 3, "10-12"], ["front-raise", 3, "10-12"], ["upright-row", 3, "10-12"], ["reverse-pec-deck", 3, "10-12"]],
      [["shoulder-press-machine", 3, "12"], ["lateral-raise", 3, "12"], ["front-raise", 3, "12"], ["reverse-pec-deck", 3, "12"]],
      [["overhead-press", 4, "8"], ["upright-row", 3, "8-10"], ["lateral-raise", 6, "10-12"]],
      [["overhead-press", 4, "8-12"], ["arnold-press", 4, "8-12"], ["front-raise", 6, "10-12"]],
      [["cable-lateral-raise", 4, "8-10"], ["front-raise", 3, "10"], ["reverse-pec-deck", 3, "10"], ["shoulder-press-machine", 3, "8-10"], ["upright-row", 3, "10-12"]],
      [["overhead-press", 4, "6-10"], ["lateral-raise", 3, ""], ["dumbbell-shoulder-press", 3, ""], ["face-pull", 3, "15"]],
      [["overhead-press", 4, "6-10"], ["lateral-raise", 4, "6-15"], ["reverse-pec-deck", 4, "6-15"], ["face-pull", 4, "8-12"]],
      [["overhead-press", 4, "4"], ["shrug", 4, "4"], ["dumbbell-shoulder-press", 4, "6-8"], ["upright-row", 3, "8-10"], ["cable-lateral-raise", 3, "8-12"], ["face-pull", 3, "10-12"]],
      [["shrug", 3, "8-12"], ["upright-row", 3, "8-12"], ["dumbbell-shoulder-press", 3, "8-12"], ["lateral-raise", 3, "8-12"], ["front-raise", 3, "8-12"]],
      [["lateral-raise", 5, "10-20"], ["face-pull", 3, "10-20"], ["upright-row", 3, "10-20"]],
      [["dumbbell-shoulder-press", 4, "10-12"], ["front-raise", 4, "10-12"], ["lateral-raise", 4, "10-12"], ["reverse-pec-deck", 4, "10-12"]],
      [["dumbbell-shoulder-press", 6, "6-12"], ["lateral-raise", 6, "8-15"], ["rear-delt-raise", 5, "8-12"], ["front-raise", 5, "10-12"]],
      [["smith-shoulder-press", 5, "8-15"], ["lateral-raise", 5, "8-15"], ["rear-delt-raise", 4, "10-12"], ["front-raise", 4, "10-12"], ["cable-lateral-raise", 4, "10-12"]],
      [["dumbbell-shoulder-press", 5, "8-20"], ["front-raise", 5, "12"], ["shoulder-press-machine", 5, "8-20"], ["upright-row", 5, "12"], ["lateral-raise", 5, "8-20"], ["reverse-pec-deck", 5, "10"], ["rear-delt-raise", 5, "8-20"], ["lateral-raise-machine", 5, "15"]],
      [["overhead-press", 3, "6-8"], ["lateral-raise", 3, "12"], ["front-raise", 3, "12"], ["rear-delt-raise", 3, "15"]],
      [["dumbbell-shoulder-press", 4, "8-10"], ["lateral-raise", 3, "12"], ["rear-delt-raise", 3, "12"]],
      [["shoulder-press-machine", 4, "10-12"], ["cable-lateral-raise", 4, "10-12"], ["front-raise", 4, "10-12"], ["reverse-pec-deck", 4, "12"]],
      [["cable-lateral-raise", 3, "10-20"], ["arnold-press", 3, "6-12"], ["rear-delt-raise", 3, "12"]],
      [["overhead-press", 4, "8-12"], ["lateral-raise", 4, "8-12"], ["smith-shoulder-press", 4, "8-12"], ["rear-delt-raise", 4, "8-12"], ["upright-row", 4, "8-12"]],
      [["lateral-raise", 5, "15-30"], ["shoulder-press-machine", 5, "15-30"], ["reverse-pec-deck", 5, "15-30"]],
      [["dumbbell-shoulder-press", 5, "15"], ["front-raise", 5, "15"], ["lateral-raise", 5, "15"], ["rear-delt-raise", 5, "15"]],
      [["dumbbell-shoulder-press", 3, "10-12"], ["lateral-raise", 3, "10-12"], ["front-raise", 3, "10-12"], ["rear-delt-raise", 3, "10-12"]],
      [["shoulder-press-machine", 3, "8-12"], ["lateral-raise", 3, "12-15"], ["reverse-pec-deck", 3, "12-15"]],
      [["overhead-press", 3, "10-12"], ["lateral-raise", 3, "10-12"], ["rear-delt-raise", 3, "10-12"], ["shrug", 3, "10-12"]],
      [["overhead-press", 4, "6-12"], ["lateral-raise", 4, "10-15"], ["rear-delt-raise", 4, "10-15"], ["upright-row", 4, "10-15"], ["front-raise", 4, "10-15"], ["shrug", 3, "10-15"]],
      [["dumbbell-shoulder-press", 3, "6-8"], ["lateral-raise", 3, "10"], ["reverse-pec-deck", 2, "10"], ["shrug", 3, "6-8"]],
      [["overhead-press", 4, "5"], ["upright-row", 3, "15-20"], ["face-pull", 5, "10-15"], ["shrug", 3, "8"]],
      [["overhead-press", 6, "2-5"], ["lateral-raise", 4, "6-9"], ["rear-delt-raise", 3, "10-13"], ["face-pull", 3, "10-13"]],
      [["overhead-press", 6, "2-5"], ["lateral-raise", 4, "6-9"], ["lateral-raise-machine", 3, "10-13"], ["reverse-pec-deck", 3, "10-13"]],
      [["overhead-press", 5, "5"], ["lateral-raise", 4, "10"], ["upright-row", 3, "15"], ["face-pull", 3, "15"], ["shoulder-press-machine", 4, "12"], ["shrug", 3, "15"]],
    ],
    arms: [
      [["barbell-curl", 3, "8"], ["dumbbell-curl", 3, "10"], ["hammer-curl", 3, "10"], ["skull-crusher", 3, "8"], ["triceps-kickback", 3, "10"], ["overhead-triceps-extension", 3, "10"]],
      [["close-grip-bench-press", 3, "4-6"], ["overhead-triceps-extension", 2, "8-12"], ["barbell-curl", 3, "4-6"], ["dumbbell-curl", 2, "8-12"], ["cable-curl", 3, "15"], ["reverse-wrist-curl", 3, "25"]],
      [["bench-dips", 3, "6-8"], ["skull-crusher", 2, "8-12"], ["overhead-triceps-extension", 2, "12"], ["incline-dumbbell-curl", 3, "4-6"], ["spider-curl", 2, "8-12"], ["cable-curl", 3, "15"], ["wrist-curl", 2, "50"]],
      [["ez-bar-curl", 3, "6-8"], ["hammer-curl", 3, "12"], ["concentration-curl", 3, "15"], ["seated-dip-machine", 3, "6-8"], ["skull-crusher", 3, "8-12"], ["overhead-triceps-extension", 3, "15"], ["wrist-curl", 2, "50"]],
      [["close-grip-bench-press", 3, "6-8"], ["hammer-curl", 3, "12"], ["biceps-curl-machine", 2, "15"], ["skull-crusher", 3, "6-8"], ["overhead-triceps-extension", 3, "8-12"], ["triceps-pushdown", 3, "15"]],
      [["barbell-curl", 3, "4-6"], ["close-grip-bench-press", 3, "6-8"], ["incline-dumbbell-curl", 2, "8-12"], ["skull-crusher", 2, "8-12"], ["biceps-curl-machine", 2, "15"], ["triceps-pushdown", 2, "15"], ["wrist-curl", 2, "50"], ["reverse-wrist-curl", 2, "50"]],
      [["ez-bar-curl", 2, "8-10"], ["skull-crusher", 2, "8-10"], ["cable-curl", 2, "12-15"], ["triceps-pushdown", 2, "12-15"]],
      [["barbell-curl", 3, "6-8"], ["incline-dumbbell-curl", 3, "8-10"], ["concentration-curl", 3, "12-15"], ["close-grip-bench-press", 3, "6-8"], ["overhead-triceps-extension", 3, "8-10"], ["triceps-pushdown", 3, "12-15"], ["wrist-curl", 2, "10-12"], ["reverse-wrist-curl", 2, "10-12"]],
      [["cable-curl", 3, "10-12"], ["triceps-pushdown", 3, "10-12"], ["reverse-curl", 3, "12-15"], ["triceps-kickback", 2, "15-20"]],
      [["triceps-dips", 4, "4-6"], ["hammer-curl", 3, "6-8"], ["close-grip-bench-press", 3, "6-8"]],
      [["ez-bar-curl", 4, "8-12"], ["dumbbell-curl", 4, "8-12"], ["hammer-curl", 4, "8-12"], ["biceps-curl-machine", 3, "8-12"], ["triceps-pushdown", 4, "15-20"], ["overhead-triceps-extension", 4, "15"], ["skull-crusher", 3, "12-15"]],
      [["biceps-curl-machine", 3, "10"], ["seated-dip-machine", 3, "10"], ["cable-curl", 3, "15"], ["overhead-triceps-extension", 3, "15"]],
      [["cable-curl", 3, "15"], ["triceps-pushdown", 3, "15"], ["biceps-curl-machine", 3, "10"], ["seated-dip-machine", 3, "10"], ["incline-dumbbell-curl", 3, "12"], ["overhead-triceps-extension", 3, "12"]],
      [["cable-curl", 3, "15"], ["triceps-pushdown", 3, "15"], ["hammer-curl", 3, "10"], ["biceps-curl-machine", 3, "10"], ["seated-dip-machine", 3, "10"], ["incline-dumbbell-curl", 3, "12"], ["overhead-triceps-extension", 3, "12"]],
      [["bench-dips", 5, "5-10"], ["incline-dumbbell-curl", 3, "12"], ["skull-crusher", 3, "12"], ["overhead-triceps-extension", 3, "15"], ["cable-curl", 3, "15"]],
      [["incline-dumbbell-curl", 4, "12"], ["skull-crusher", 4, "12"], ["triceps-dips", 4, "6-10"], ["cable-curl", 4, "15"], ["overhead-triceps-extension", 5, "15"]],
      [["triceps-dips", 5, "8"], ["cable-curl", 4, "12"], ["triceps-pushdown", 4, "12"], ["ez-bar-curl", 3, "15"], ["skull-crusher", 3, "15"]],
      [["ez-bar-curl", 3, "12"], ["cable-curl", 3, "25"], ["triceps-dips", 3, "6"], ["skull-crusher", 3, "12"], ["triceps-pushdown", 3, "25"]],
      [["triceps-dips", 4, "6-10"], ["dumbbell-curl", 3, "10"], ["overhead-triceps-extension", 3, "10"], ["cable-curl", 3, "10"], ["triceps-pushdown", 3, "10"]],
      [["barbell-curl", 3, "6-12"], ["hammer-curl", 3, "6-12"], ["cable-curl", 3, "6-12"]],
      [["skull-crusher", 3, "6-12"], ["overhead-triceps-extension", 3, "6-12"], ["triceps-pushdown", 3, "6-12"]],
      [["incline-dumbbell-curl", 3, "8-12"], ["preacher-curl", 3, "8-12"], ["cable-curl", 3, "10-15"], ["close-grip-bench-press", 3, "6-10"], ["overhead-triceps-extension", 3, "8-12"], ["triceps-pushdown", 3, "10-15"]],
      [["close-grip-bench-press", 6, "6-10"], ["triceps-pushdown", 6, "6-10"], ["overhead-triceps-extension", 10, "6-10"], ["barbell-curl", 5, "8-12"], ["incline-dumbbell-curl", 5, "8-12"], ["concentration-curl", 5, "10"], ["dumbbell-curl", 5, "10"]],
      [["incline-dumbbell-curl", 4, "8-10"], ["triceps-pushdown", 4, "8-10"], ["dumbbell-curl", 4, "10"], ["overhead-triceps-extension", 4, "10"], ["preacher-curl", 4, "10"], ["skull-crusher", 4, "10"], ["concentration-curl", 4, "10"], ["reverse-curl", 4, "10-12"], ["wrist-curl", 4, "10-12"]],
      [["seated-dip-machine", 4, "15-20"], ["biceps-curl-machine", 4, "15-20"], ["close-grip-bench-press", 4, "10-12"], ["cable-curl", 4, "10-12"], ["overhead-triceps-extension", 4, "10-12"], ["hammer-curl", 4, "10-12"], ["triceps-pushdown", 4, "11-20"]],
      [["cable-curl", 3, "12-15"], ["triceps-pushdown", 3, "12-15"], ["skull-crusher", 3, "12-15"], ["dumbbell-curl", 3, "12-15"], ["barbell-curl", 3, "12-15"], ["triceps-kickback", 3, "12-15"], ["overhead-triceps-extension", 3, "12-15"], ["hammer-curl", 3, "12-15"], ["wrist-curl", 3, ""]],
      [["cable-curl", 3, "15"], ["overhead-triceps-extension", 3, "15"], ["dumbbell-curl", 3, "15"], ["close-grip-bench-press", 3, "15"], ["concentration-curl", 3, "15"], ["triceps-dips", 3, "15"]],
      [["ez-bar-curl", 4, "10-12"], ["incline-dumbbell-curl", 3, "10-12"], ["hammer-curl", 3, "12-15"]],
      [["close-grip-bench-press", 4, "8"], ["incline-dumbbell-curl", 4, "10-15"], ["overhead-triceps-extension", 4, "10-15"], ["wrist-curl", 3, "10-15"]],
      [["ez-bar-curl", 4, "6-8"], ["skull-crusher", 4, "8-12"], ["incline-dumbbell-curl", 3, "10-15"], ["overhead-triceps-extension", 3, "10-15"], ["hammer-curl", 3, "10-15"], ["wrist-curl", 3, "10-15"]],
      [["barbell-curl", 3, "6-8"], ["hammer-curl", 3, "8"], ["preacher-curl", 3, "12"], ["close-grip-bench-press", 3, "6"], ["skull-crusher", 3, "6-8"], ["triceps-pushdown", 3, "8"], ["overhead-triceps-extension", 3, "12"]],
      [["barbell-curl", 2, "6"], ["skull-crusher", 2, "6"], ["preacher-curl", 2, "10"], ["overhead-triceps-extension", 2, "10"], ["cable-curl", 2, "15"], ["triceps-pushdown", 2, "15"]],
      [["barbell-curl", 3, "8"], ["preacher-curl", 3, "12"], ["cable-curl", 3, "20"]],
      [["bench-dips", 3, "8-15"], ["skull-crusher", 4, "8-15"], ["overhead-triceps-extension", 3, "8-15"], ["barbell-curl", 4, "8-15"], ["dumbbell-curl", 3, "8-15"], ["hammer-curl", 3, "8-15"]],
      [["skull-crusher", 3, "12-15"], ["triceps-pushdown", 3, "15-20"], ["barbell-curl", 3, "12-15"]],
      [["close-grip-bench-press", 4, "8-12"], ["skull-crusher", 3, "8-12"], ["triceps-pushdown", 3, "8-12"], ["overhead-triceps-extension", 3, "8-12"]],
      [["dumbbell-curl", 3, "4-8"], ["hammer-curl", 3, "4-8"], ["wrist-curl", 2, "8-10"], ["overhead-triceps-extension", 3, "4-8"], ["triceps-extension-machine", 3, "4-8"], ["triceps-pushdown", 3, "4-8"]],
      [["barbell-curl", 4, "12-15"], ["dumbbell-curl", 4, "12-15"], ["preacher-curl", 4, "12-15"], ["hammer-curl", 4, "12-15"], ["skull-crusher", 4, "12-15"], ["triceps-pushdown", 8, "12-15"], ["triceps-kickback", 4, "12-15"]],
      [["close-grip-bench-press", 4, "6-8"], ["skull-crusher", 4, "6-8"], ["triceps-pushdown", 4, "20-25"]],
      [["overhead-triceps-extension", 5, "6-8"], ["close-grip-bench-press", 5, "6-8"], ["skull-crusher", 5, "6-8"], ["triceps-pushdown", 5, "6-8"]],
      [["triceps-dips", 3, "6-8"], ["overhead-triceps-extension", 3, "8-10"], ["triceps-kickback", 3, "10-12"]],
      [["hammer-curl", 3, "7-9"], ["incline-dumbbell-curl", 3, "7-9"], ["barbell-curl", 3, "7-9"]],
      [["close-grip-bench-press", 4, "6-8"], ["overhead-triceps-extension", 3, "10-15"], ["triceps-pushdown", 3, "10-15"]],
    ],
    abs: [
      [["cable-crunch", 3, "12-15"], ["oblique-crunch-machine", 3, "24"], ["crunch", 3, "12"], ["lying-leg-raise", 3, "12-15"]],
      [["russian-twist", 3, "24"], ["bicycle-crunch", 3, "24"], ["cable-crunch", 3, "12-15"], ["lying-leg-raise", 3, "8"]],
      [["russian-twist", 3, "24"], ["ab-crunch-machine", 3, "8-12"], ["oblique-crunch-machine", 3, "16"], ["crunch", 3, "8-12"]],
      [["hanging-leg-raise", 3, "15"], ["russian-twist", 4, "10"], ["decline-sit-up", 4, "12"], ["cable-crunch", 3, "15"]],
      [["cable-crunch", 3, "10-12"], ["rotary-torso-machine", 3, "10-12"], ["lying-leg-raise", 3, "10-12"]],
      [["crunch", 4, "12"], ["bicycle-crunch", 4, "20"], ["hanging-leg-raise", 4, "8-12"]],
      [["lying-leg-raise", 4, "6"], ["cable-crunch", 4, "12"], ["rotary-torso-machine", 4, "12"]],
      [["lying-leg-raise", 2, "10-12"], ["mountain-climber", 2, "10-12"], ["oblique-crunch-machine", 2, "10"], ["dead-bug", 2, "12-15"]],
      [["plank", 2, ""], ["hanging-leg-raise", 2, "10-12"], ["ab-wheel-rollout", 2, "10-12"], ["mountain-climber", 2, "12-15"]],
      [["cable-crunch", 3, "6-10"], ["hanging-leg-raise", 3, "6-10"], ["oblique-crunch-machine", 3, "6-10"]],
      [["crunch", 3, "15"], ["captain-s-chair-leg-raise", 3, "15"], ["ab-wheel-rollout", 3, "15"], ["bicycle-crunch", 3, "15"]],
      [["lying-leg-raise", 3, "15-20"], ["rotary-torso-machine", 3, "10-15"], ["crunch", 3, "10-15"]],
      [["ab-wheel-rollout", 3, "8"], ["rotary-torso-machine", 3, "10"], ["hanging-leg-raise", 3, "12"], ["crunch", 2, "20"]],
      [["ab-wheel-rollout", 2, ""], ["hanging-leg-raise", 2, "10"], ["oblique-crunch-machine", 2, "15"], ["plank", 2, ""]],
      [["hanging-leg-raise", 3, "8-10"], ["rotary-torso-machine", 3, "8-10"], ["lying-leg-raise", 3, "8-10"], ["cable-crunch", 3, "8-10"]],
      [["hanging-leg-raise", 3, "6"], ["cable-crunch", 3, "10-12"], ["rotary-torso-machine", 2, "10-12"], ["oblique-crunch-machine", 2, "10-12"]],
      [["ab-wheel-rollout", 3, "5-10"], ["hanging-leg-raise", 3, "5-10"], ["rotary-torso-machine", 2, "8-12"], ["cable-crunch", 3, "8-12"]],
      [["cable-crunch", 3, "10-15"], ["rotary-torso-machine", 3, "10-12"], ["russian-twist", 3, "15-20"], ["lying-leg-raise", 3, "12-15"]],
      [["crunch", 3, "16"], ["bicycle-crunch", 3, "16"], ["captain-s-chair-leg-raise", 3, "14"], ["lying-leg-raise", 3, "16"], ["plank", 3, ""]],
      [["crunch", 3, "30"], ["ab-wheel-rollout", 3, "20"], ["hanging-leg-raise", 3, "25"], ["decline-sit-up", 3, "20"], ["cable-crunch", 3, "30"]],
      [["decline-sit-up", 2, "10"], ["captain-s-chair-leg-raise", 2, "10"], ["rotary-torso-machine", 2, "10"], ["crunch", 2, "10"], ["ab-wheel-rollout", 2, "10"]],
      [["bicycle-crunch", 2, "12"], ["russian-twist", 2, "12"], ["rotary-torso-machine", 2, "12"], ["captain-s-chair-leg-raise", 2, "12"]],
      [["hanging-leg-raise", 3, "20"], ["cable-crunch", 3, "20"], ["russian-twist", 3, "20"], ["plank", 3, "60"], ["decline-sit-up", 3, "30"]],
      [["ab-wheel-rollout", 3, "10"], ["russian-twist", 3, "10"], ["crunch", 3, "10"], ["lying-leg-raise", 3, "10"]],
      [["hanging-leg-raise", 3, "8-15"], ["cable-crunch", 3, "12-15"], ["plank", 3, "30-60"], ["ab-wheel-rollout", 3, "10-15"], ["lying-leg-raise", 3, "12-20"]],
      [["plank", 4, "60"], ["crunch", 3, "15"], ["oblique-crunch-machine", 3, "12"], ["cable-crunch", 3, "10"], ["ab-wheel-rollout", 3, "10-12"], ["hanging-leg-raise", 1, ""]],
      [["ab-wheel-rollout", 3, "10-12"], ["lying-leg-raise", 4, "12-15"], ["plank", 3, "60"]],
      [["cable-crunch", 3, "10-15"], ["hanging-leg-raise", 3, "10-15"], ["dead-bug", 3, "10-15"], ["crunch", 2, ""]],
      [["cable-crunch", 3, "12"], ["hanging-leg-raise", 3, "12-15"], ["plank", 3, "20"], ["side-plank", 2, ""]],
      [["plank", 3, ""], ["side-plank", 2, "45"], ["crunch", 2, ""]],
      [["rotary-torso-machine", 2, "10"], ["russian-twist", 2, "10"], ["bicycle-crunch", 2, "10"], ["plank", 2, "30"]],
      [["toes-to-bar", 2, ""], ["plank", 2, ""], ["cable-crunch", 3, "8"]],
      [["dead-bug", 2, "20"], ["rotary-torso-machine", 2, "20"], ["plank", 4, "30-60"]],
      [["side-plank", 3, "30"], ["dead-bug", 3, "12"], ["plank", 3, "20"]],
      [["lying-leg-raise", 3, "12"], ["crunch", 3, "20"], ["plank", 3, "40"]],
      [["crunch", 3, "15"], ["lying-leg-raise", 3, "12"], ["plank", 3, "30"], ["bicycle-crunch", 3, "20"]],
      [["crunch", 3, "20"], ["oblique-crunch-machine", 2, "20"], ["lying-leg-raise", 3, "10"]],
      [["plank", 2, "10-20"], ["dead-bug", 2, "14"], ["oblique-crunch-machine", 2, "12-20"]],
      [["crunch", 3, "10"], ["lying-leg-raise", 5, "15"], ["bicycle-crunch", 5, "15"], ["plank", 5, "30"], ["oblique-crunch-machine", 5, "15"]],
      [["crunch", 3, "8-20"], ["lying-leg-raise", 3, "10-15"], ["plank", 3, "30"]],
    ],
  };
  // <<< collected routines

  // A tiny seeded random (mulberry32), so the same 10 routines come out every time.
  function seededRandom(seed) {
    let a = seed;
    return () => {
      a = (a + 0x6D2B79F5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  // Up to 10 different routines per part: one random candidate per slot, no repeats.
  function drawRoutines(slots, seed, classic) {
    const rnd = seededRandom(seed);
    const out = [];
    const seen = new Set();
    if (classic) {
      out.push(classic.map(([id, sets, range]) => ({ id, sets, range })));
      seen.add(classic.map(c => c[0]).join(','));
    }
    for (let tries = 0; out.length < 10 && tries < 300; tries++) {
      const used = new Set();
      const items = [];
      for (const [sets, range, candidates] of slots) {
        const pool = candidates.map(c => (Array.isArray(c) ? c : [c, sets, range])).filter(([id]) => EXERCISE_MAP.has(id) && !used.has(id));
        if (!pool.length) continue;
        const pick = pool[Math.floor(rnd() * pool.length)];
        used.add(pick[0]);
        items.push(pick);
      }
      items.sort((a, b) => Number(Boolean(b[3])) - Number(Boolean(a[3])));
      const key = items.map(i => i[0]).join(',');
      if (seen.has(key)) continue;
      seen.add(key);
      out.push(items.map(([id, sets, range]) => ({ id, sets, range })));
    }
    return out;
  }

  // Parts with collected routines use those (after the classic); the rest are drawn from slots.
  const ROUTINES = Object.fromEntries(Object.entries(ROUTINE_SLOTS).map(([pid, slots], i) => {
    const collected = COLLECTED_ROUTINES[pid];
    if (!collected) return [pid, drawRoutines(slots, 7919 * (i + 3), CLASSIC_ROUTINES[pid])];
    const toItems = list => list.filter(([id]) => EXERCISE_MAP.has(id)).map(([id, sets, range]) => ({ id, sets, range }));
    const classic = CLASSIC_ROUTINES[pid] ? [toItems(CLASSIC_ROUTINES[pid])] : [];
    const key = items => items.map(it => it.id).join();
    const seen = new Set(classic.map(key));
    return [pid, classic.concat(collected.map(toItems).filter(items => items.length >= 3 && !seen.has(key(items)) && seen.add(key(items))))];
  }));


  // One logged set: any of w (kg), r (reps), t (time), d (km).
  function cleanSet(src) {
    if (!src || typeof src !== 'object') return null;
    const out = {};
    for (const [f, max] of [['w', 1000], ['r', 1000], ['t', 100000], ['d', 1000]]) {
      if (src[f] === undefined || src[f] === null || src[f] === '') continue;
      const v = Number(src[f]);
      if (Number.isFinite(v) && v >= 0 && v <= max) out[f] = Math.round(v * 100) / 100;
    }
    return Object.keys(out).length ? out : null;
  }
  const STALE_DAYS = 7;
  // Bump together with version.json on every release so phones notice the update.
  const APP_VERSION = '2.4.0';
  const CACHE_PREFIX = 'gym-check';

  const svg = (d, w = 2.4) =>
    `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="${w}" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="${d}"/></svg>`;
  const ICON = {
    check: svg('M5 12.5l4.5 4.5L19 7.5', 3.2),
    prev: svg('M15 5l-7 7 7 7'),
    next: svg('M9 5l7 7-7 7'),
    chart: svg('M5 20v-7M12 20V5M19 20v-10', 2.2),
    refresh: svg('M20 11a8 8 0 1 0-2.3 5.7M20 4v7h-7', 2.2),
    plus: svg('M12 5v14M5 12h14', 2.4),
    close: svg('M6 6l12 12M18 6L6 18', 2.4),
    pencil: svg('M4 20h4L18.6 9.4a2.1 2.1 0 0 0-3-3L5 17v3zM13.5 8.5l2 2', 2.1),
    trash: svg('M4.5 7h15M10 11v5.5M14 11v5.5M6.5 7l.8 11.6A1.6 1.6 0 0 0 8.9 20h6.2a1.6 1.6 0 0 0 1.6-1.4L17.5 7M9.5 7V4.5h5V7', 2.1),
    camera: svg('M4 8.5A2.5 2.5 0 0 1 6.5 6h1.6l1.4-2h5l1.4 2h1.6A2.5 2.5 0 0 1 20 8.5v8a2.5 2.5 0 0 1-2.5 2.5h-11A2.5 2.5 0 0 1 4 16.5zM12 15.6a3.1 3.1 0 1 0 0-6.2 3.1 3.1 0 0 0 0 6.2z', 2.1),
  };

  const $ = (s, el = document) => el.querySelector(s);
  const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const pct = (a, b) => (b > 0 ? Math.round((a / b) * 100) : 0);

  // ---------- dates (all local time) ----------
  const pad = n => String(n).padStart(2, '0');
  const keyOf = d => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  const parseKey = k => { const [y, m, d] = k.split('-').map(Number); return new Date(y, m - 1, d); };
  const today = () => { const d = new Date(); d.setHours(0, 0, 0, 0); return d; };
  const addDays = (d, n) => { const x = new Date(d); x.setDate(x.getDate() + n); return x; };
  const daysBetween = (a, b) => Math.round((b - a) / 86400000);
  const daysInYear = y => (new Date(y, 1, 29).getDate() === 29 ? 366 : 365);
  const startOfWeek = d => addDays(d, -((d.getDay() + 6) % 7)); // 월요일 시작
  const firstOfMonth = d => new Date(d.getFullYear(), d.getMonth(), 1);
  const fmtKicker = d => `${pad(d.getMonth() + 1)}.${pad(d.getDate())} ${WEEKDAYS_EN[d.getDay()]}`;
  const fmtLong = d => `${d.getMonth() + 1}월 ${d.getDate()}일 ${WEEKDAYS[d.getDay()]}요일`;
  const fmtDot = d => `${d.getFullYear()}.${d.getMonth() + 1}.${d.getDate()}`;

  // ---------- state ----------
  function defaultState() {
    return { version: 1, parts: DEFAULT_PARTS.map(p => ({ ...p })), records: {}, weeklyGoal: 4, lastBackup: null, photoFormat: 'orig', social: null, owner: null, cloud: { syncedAt: 0, dirty: false }, logs: {}, customEx: [] };
  }

  // Validates anything that comes from storage or a backup file.
  function normalize(src) {
    if (!src || typeof src !== 'object' || !src.records || typeof src.records !== 'object') {
      throw new Error('짐첵 백업 파일이 아니에요');
    }
    const out = defaultState();

    if (Array.isArray(src.parts)) {
      const seen = new Set();
      const parts = [];
      for (const p of src.parts) {
        if (!p || typeof p.id !== 'string' || typeof p.name !== 'string' || seen.has(p.id)) continue;
        seen.add(p.id);
        const def = DEFAULT_PARTS.find(d => d.id === p.id);
        parts.push({
          id: p.id,
          name: p.name.trim().slice(0, MAX_NAME) || (def ? def.name : '부위'),
          color: /^#[0-9a-f]{6}$/i.test(p.color) ? p.color : (def ? def.color : '#94A3B8'),
        });
      }
      if (parts.length) out.parts = parts;
    }

    const order = out.parts.map(p => p.id);
    for (const [k, v] of Object.entries(src.records)) {
      if (!/^\d{4}-\d{2}-\d{2}$/.test(k) || !Array.isArray(v)) continue;
      const set = new Set(v);
      const arr = order.filter(id => set.has(id));
      if (arr.length) out.records[k] = arr;
    }

    // Exercises added by hand, then the sets × kg log ({ date: [{ ex, sets }] }).
    if (Array.isArray(src.customEx)) {
      const seenEx = new Set();
      for (const e of src.customEx) {
        if (!e || typeof e.id !== 'string' || !/^u_[a-z0-9]{1,20}$/.test(e.id) || typeof e.name !== 'string' || seenEx.has(e.id)) continue;
        const name = e.name.trim().slice(0, 30);
        if (!name) continue;
        seenEx.add(e.id);
        out.customEx.push({ id: e.id, name, part: typeof e.part === 'string' ? e.part.slice(0, 40) : 'full', kind: EX_KINDS[e.kind] ? e.kind : 'wr' });
        if (out.customEx.length >= 300) break;
      }
    }
    if (src.logs && typeof src.logs === 'object' && !Array.isArray(src.logs)) {
      const known = new Set([...EXERCISE_MAP.keys(), ...out.customEx.map(e => e.id)]);
      for (const [k, list] of Object.entries(src.logs)) {
        if (!/^\d{4}-\d{2}-\d{2}$/.test(k) || !Array.isArray(list)) continue;
        const day = [];
        for (const e of list) {
          if (!e || !known.has(e.ex) || !Array.isArray(e.sets) || day.some(x => x.ex === e.ex)) continue;
          const sets = e.sets.map(cleanSet).filter(Boolean).slice(0, 30);
          if (sets.length) day.push({ ex: e.ex, sets });
          if (day.length >= 40) break;
        }
        if (day.length) out.logs[k] = day;
      }
    }

    if (Number.isInteger(src.weeklyGoal) && src.weeklyGoal >= 1 && src.weeklyGoal <= 7) out.weeklyGoal = src.weeklyGoal;
    if (src.photoFormat === 'orig' || src.photoFormat === 'story') out.photoFormat = src.photoFormat;
    const so = src.social;
    if (so && typeof so.token === 'string' && so.token.length <= 100 && typeof so.userId === 'string'
      && typeof so.handle === 'string' && typeof so.nickname === 'string') {
      out.social = {
        token: so.token,
        userId: so.userId,
        handle: so.handle.slice(0, 20),
        nickname: so.nickname.slice(0, 12),
        crewWins: Number.isInteger(so.crewWins) && so.crewWins >= 0 ? so.crewWins : 0,
      };
    }
    // Whose records these are: set on login, kept after logout, so logging in as someone
    // else never merges them into that account. (Older saves: the logged-in account.)
    const ow = src.owner;
    if (ow && typeof ow.id === 'string' && ow.id.length <= 64 && typeof ow.handle === 'string') {
      out.owner = { id: ow.id, handle: ow.handle.slice(0, 20) };
    } else if (out.social) {
      out.owner = { id: out.social.userId, handle: out.social.handle };
    }
    if (typeof src.lastBackup === 'string' && !Number.isNaN(Date.parse(src.lastBackup))) out.lastBackup = src.lastBackup;
    if (src.cloud && Number.isFinite(src.cloud.syncedAt)) out.cloud = { syncedAt: src.cloud.syncedAt, dirty: src.cloud.dirty === true };
    return out;
  }

  function load() {
    let raw = null;
    try { raw = localStorage.getItem(STORE_KEY); } catch (e) { return defaultState(); }
    if (!raw) return defaultState();
    try {
      return normalize(JSON.parse(raw));
    } catch (e) {
      // Keep the unreadable copy instead of silently overwriting it.
      try { localStorage.setItem(`${STORE_KEY}:broken`, raw); } catch (_) { /* ignore */ }
      return defaultState();
    }
  }

  function save() {
    if (state.social && state.social.token) noteCloudChange();
    try {
      localStorage.setItem(STORE_KEY, JSON.stringify(state));
      return true;
    } catch (e) {
      toast('저장하지 못했어요. 저장 공간을 확인해 주세요');
      return false;
    }
  }

  let state = load();
  // Cloud backup bookkeeping (see "cloud backup" below). sig = what the server last
  // got from us (or what we last loaded), to notice when records actually change.
  // photosOnServer / photoFails: day photos the server has, and ones that failed to upload.
  const cloud = { sig: cloudSig(), timer: 0, pushing: null, again: false, syncing: null, lastPull: 0, note: '', photosKnown: false, photosOnServer: new Set(), photoFails: new Set() };
  const ui = {
    tab: 'today',
    calMonth: firstOfMonth(today()),
    statsYear: today().getFullYear(),
    statsPage: (() => { try { const p = localStorage.getItem('gymcheck:statsPage'); return ['summary', 'badges', 'lifts'].includes(p) ? p : 'summary'; } catch (e) { return 'summary'; } })(),
    badgeSheet: null, // the badge shown in the bottom sheet
    sheetDate: null,
    partSheet: null, // { id (null = new), color } while the part sheet is open
    exSheet: null, // the exercise picker / set editor / history in the bottom sheet
    popId: null,
    latestVersion: null,
    updating: false,
    pwForm: false, // settings: the change-password form is open
    delForm: null, // settings: the delete-account form ({ passwordSet, busy }) while open
  };

  // ---------- queries ----------
  const partById = id => state.parts.find(p => p.id === id);
  const dayParts = key => state.records[key] || [];
  const attended = key => dayParts(key).length > 0;

  function lastDoneMap(uptoKey) {
    const m = {};
    for (const [k, arr] of Object.entries(state.records)) {
      if (k > uptoKey) continue;
      for (const id of arr) if (!m[id] || k > m[id]) m[id] = k;
    }
    return m;
  }

  // Consecutive attended days, ending today (or yesterday if today isn't checked yet).
  function streak(t) {
    let d = attended(keyOf(t)) ? t : addDays(t, -1);
    let n = 0;
    while (attended(keyOf(d))) { n++; d = addDays(d, -1); }
    return n;
  }

  function weekCount(t) {
    let n = 0;
    for (let d = startOfWeek(t); d <= t; d = addDays(d, 1)) if (attended(keyOf(d))) n++;
    return n;
  }

  function yearStats(y) {
    const months = Array(12).fill(0);
    const parts = {};
    let days = 0;
    const prefix = `${y}-`;
    for (const [k, arr] of Object.entries(state.records)) {
      if (!k.startsWith(prefix) || !arr.length) continue;
      days++;
      months[Number(k.slice(5, 7)) - 1]++;
      for (const id of arr) parts[id] = (parts[id] || 0) + 1;
    }
    return { days, months, parts };
  }

  // ---------- badges ----------
  // Worked out from the records (and saved 오운완 photos) alone, so a restored backup or a
  // new phone shows the same set without storing anything extra.
  function badgeStats() {
    const keys = Object.keys(state.records).filter(k => state.records[k].length).sort();
    let bestStreak = 0;
    let run = 0;
    let prev = null;
    let comeback = false;
    let maxPartsDay = 0;
    let mondays = 0;
    let weekend = false;
    let xmas = false;
    let newYear = false;
    const partCounts = {};
    const weeks = new Map(); // monday key → { n, parts }
    const months = {};
    for (const k of keys) {
      const d = parseKey(k);
      const arr = state.records[k];
      const gap = prev ? daysBetween(prev, d) : 0;
      run = gap === 1 ? run + 1 : 1;
      if (run > bestStreak) bestStreak = run;
      if (gap > 14) comeback = true;
      prev = d;
      if (arr.length > maxPartsDay) maxPartsDay = arr.length;
      for (const id of arr) partCounts[id] = (partCounts[id] || 0) + 1;
      const dow = d.getDay();
      if (dow === 1) mondays++;
      if (dow === 6 && attended(keyOf(addDays(d, 1)))) weekend = true;
      if (k.endsWith('-12-25')) xmas = true;
      if (k.endsWith('-01-01')) newYear = true;
      const wk = keyOf(startOfWeek(d));
      const w = weeks.get(wk) || { n: 0, parts: new Set() };
      w.n++;
      for (const id of arr) w.parts.add(id);
      weeks.set(wk, w);
      const m = k.slice(0, 7);
      months[m] = (months[m] || 0) + 1;
    }
    let bestGoalRun = 0;
    let goalRun = 0;
    let lastMet = null;
    let allParts = false;
    let perfectWeek = false;
    for (const wk of [...weeks.keys()].sort()) {
      const w = weeks.get(wk);
      const d = parseKey(wk);
      if (w.n === 7) perfectWeek = true;
      if (state.parts.length > 1 && state.parts.every(p => w.parts.has(p.id))) allParts = true;
      if (w.n < state.weeklyGoal) { lastMet = null; continue; }
      goalRun = lastMet && daysBetween(lastMet, d) === 7 ? goalRun + 1 : 1;
      if (goalRun > bestGoalRun) bestGoalRun = goalRun;
      lastMet = d;
    }
    const fullMonth = Object.entries(months).some(([m, n]) => n === new Date(Number(m.slice(0, 4)), Number(m.slice(5, 7)), 0).getDate());
    const years = {};
    for (const k of keys) years[k.slice(0, 4)] = (years[k.slice(0, 4)] || 0) + 1;
    return {
      first: keys[0] || null, months, years,
      total: keys.length, bestStreak, bestGoalRun, bestMonth: Math.max(0, ...Object.values(months)), fullMonth,
      partCounts, maxPartsDay, allParts, photos: photoThumbs.size,
      perfectWeek, weekend, mondays, xmas, newYear, comeback,
      crewWins: (state.social && state.social.crewWins) || 0,
    };
  }

  // Each group has its own medal colour and shape on the 기록 tab.
  const BADGE_GROUPS = [
    { id: 'days', name: '누적 출석', color: '#D4FF3F', shape: 'circle' },
    { id: 'streak', name: '연속 출석', color: '#FF8A3D', shape: 'square' },
    { id: 'goal', name: '주간 목표', color: '#7FB2FF', shape: 'shield' },
    { id: 'month', name: '한 달', color: '#B794FF', shape: 'circle' },
    { id: 'parts', name: '부위', color: '#D4FF3F', shape: 'square' },
    { id: 'photo', name: '오운완 사진', color: '#F4F4F0', shape: 'circle' },
    { id: 'special', name: '스페셜', color: '#FFD43B', shape: 'shield' },
    { id: 'crew', name: '크루 1등', color: '#FF8FB1', shape: 'square' },
  ];
  const flag = v => [v ? 1 : 0, 1];
  const BADGES = [
    ...[
      [1, '첫 출석', '헬스장 첫 체크'], [10], [25], [50], [75], [100], [150], [200], [300],
      [365, '365일', '누적 1년치 출석'], [500], [1000],
    ].map(([n, name, desc]) => ({
      id: `days${n}`, group: 'days', num: String(n), unit: n === 1 ? 'Day' : 'Days',
      name: name || `${n}일`, desc: desc || `누적 ${n}일 출석`, of: s => [s.total, n],
    })),
    ...[
      [3, '3일 연달아 출석'], [5, '5일 연달아 출석'], [7, '일주일 내내 출석'], [10, '10일 연달아 출석'],
      [14, '2주 내내 출석'], [21, '3주 내내 출석'], [30, '한 달 내내 출석'],
    ].map(([n, desc]) => ({
      id: `streak${n}`, group: 'streak', num: String(n), unit: 'Streak', name: `${n}일 연속`, desc, of: s => [s.bestStreak, n],
    })),
    ...[
      [1, '주간 목표 달성', '한 주 목표 처음 달성'], [2, '', '2주 내리 목표 달성'], [4, '', '한 달 내리 목표 달성'],
      [8, '', '두 달 내리 목표 달성'], [12, '', '석 달 내리 목표 달성'], [26, '', '반년 내리 목표 달성'],
      [52, '', '1년 내내 목표 달성'],
    ].map(([n, name, desc]) => ({
      id: `goal${n}`, group: 'goal', num: String(n), unit: n === 1 ? 'Week' : 'Weeks',
      name: name || `${n}주 연속 목표`, desc, of: s => [s.bestGoalRun, n],
    })),
    ...[10, 15, 20, 25].map(n => ({
      id: `month${n}`, group: 'month', num: String(n), unit: 'A month', name: `한 달 ${n}일`, desc: `한 달에 ${n}일 출석`, of: s => [s.bestMonth, n],
    })),
    { id: 'monthFull', group: 'month', num: 'Full', unit: 'Month', name: '한 달 개근', desc: '한 달 하루도 안 빠짐', of: s => flag(s.fullMonth) },
    ...DEFAULT_PARTS.map(p => ({
      id: `part-${p.id}`, group: 'parts', num: '30', unit: PART_EN[p.id], color: p.color,
      name: `${p.name} 30번`, desc: `${p.name} 운동 30번`, of: s => [s.partCounts[p.id] || 0, 30],
    })),
    { id: 'allParts', group: 'parts', num: 'All', unit: 'Parts', rainbow: true, name: '올라운더', desc: '한 주에 모든 부위', of: s => flag(s.allParts) },
    { id: 'fullDay', group: 'parts', num: '4+', unit: 'In a day', name: '풀코스', desc: '하루에 4부위 이상', of: s => [s.maxPartsDay, 4] },
    ...[[1, '첫 오운완', '오운완 사진 처음 저장'], [10], [30], [100]].map(([n, name, desc]) => ({
      id: `photo${n}`, group: 'photo', num: String(n), unit: n === 1 ? 'Photo' : 'Photos',
      name: name || `오운완 ${n}장`, desc: desc || `오운완 사진 ${n}장 저장`, of: s => [s.photos, n],
    })),
    { id: 'perfectWeek', group: 'special', num: '7/7', unit: 'Week', name: '완벽한 한 주', desc: '월~일 7일 모두 출석', of: s => flag(s.perfectWeek) },
    { id: 'weekend', group: 'special', num: 'S+S', unit: 'Weekend', name: '주말 반납', desc: '토·일 이틀 다 출석', of: s => flag(s.weekend) },
    { id: 'mondays', group: 'special', num: '10', unit: 'Mondays', name: '월요병 없음', desc: '월요일 출석 10번', of: s => [s.mondays, 10] },
    { id: 'xmas', group: 'special', num: '12.25', unit: 'Xmas', name: '메리 운동마스', desc: '크리스마스에 출석', of: s => flag(s.xmas) },
    { id: 'newYear', group: 'special', num: '1.1', unit: 'New year', name: '새해 첫 운동', desc: '1월 1일에 출석', of: s => flag(s.newYear) },
    { id: 'comeback', group: 'special', num: 'Back', unit: 'Comeback', name: '다시 시작', desc: '2주 넘게 쉬다가 복귀', of: s => flag(s.comeback) },
    ...[[1, '크루 1등', '크루에서 한 주 1등'], [5], [10], [25]].map(([n, name, desc]) => ({
      id: `crewWin${n}`, group: 'crew', num: String(n), unit: n === 1 ? 'Win' : 'Wins',
      name: name || `크루 1등 ${n}번`, desc: desc || `크루에서 한 주 1등 ${n}번`, of: s => [s.crewWins, n],
    })),
  ];

  // Badges that never run out: one per month (attend MONTH_GOAL days that month) and
  // one set per year (50·100·150·200 days in that year's season). They start from the
  // month / year of the first check-in and grow as time passes.
  const MONTH_GOAL = 12;
  const SEASON_STEPS = [50, 100, 150, 200];
  const MONTH_SHORT = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const MONTH_COLORS = ['#7FB2FF', '#B794FF', '#FF8FB1', '#9BE15D', '#3DDC97', '#38D9F5', '#FFD43B', '#FF8A3D', '#FF6B6B', '#FFB067', '#D4FF3F', '#F4F4F0'];
  const SEASON_COLORS = ['#D4FF3F', '#38D9F5', '#FF8FB1', '#FFD43B', '#B794FF'];
  const GROUP_STYLE = { monthly: { shape: 'circle' }, season: { shape: 'shield' } };

  function timedBadges(s) {
    const t = today();
    const start = s.first ? parseKey(s.first) : t;
    const out = [];
    for (let d = new Date(start.getFullYear(), start.getMonth(), 1); d <= t; d = new Date(d.getFullYear(), d.getMonth() + 1, 1)) {
      const y = d.getFullYear();
      const m = d.getMonth();
      const key = `${y}-${pad(m + 1)}`;
      out.push({
        id: `m${key}`, group: 'monthly', num: String(m + 1), unit: `${MONTH_SHORT[m]} ${y}`, color: MONTH_COLORS[m],
        name: `${y}년 ${m + 1}월`, desc: `${m + 1}월에 ${MONTH_GOAL}일 출석`, current: key === keyOf(t).slice(0, 7),
        of: st => [st.months[key] || 0, MONTH_GOAL],
      });
    }
    for (let y = start.getFullYear(); y <= t.getFullYear(); y++) {
      for (const n of SEASON_STEPS) {
        out.push({
          id: `s${y}-${n}`, group: 'season', year: y, num: String(n), unit: `${y} Season`, color: SEASON_COLORS[y % SEASON_COLORS.length],
          name: `${y} 시즌 ${n}일`, label: `${n}일`, desc: `${y}년에 ${n}일 출석`, listDesc: `시즌 ${n}일 출석`, of: st => [st.years[y] || 0, n],
        });
      }
    }
    return out;
  }

  const allBadges = s => BADGES.concat(timedBadges(s));

  function earnedBadges(s = badgeStats()) {
    return new Set(allBadges(s).filter(b => { const [n, goal] = b.of(s); return n >= goal; }).map(b => b.id));
  }

  function newBadges(before) {
    const s = badgeStats();
    const now = earnedBadges(s);
    return allBadges(s).filter(b => now.has(b.id) && !before.has(b.id));
  }

  function medal(b, on, cls = '') {
    const g = BADGE_GROUPS.find(x => x.id === b.group) || GROUP_STYLE[b.group];
    const size = [b.num.length >= 4 && 'long-num', b.unit.length >= 7 && 'long-unit', b.rainbow && 'rainbow'].filter(Boolean).join(' ');
    return `<span class="medal ${g.shape}${on ? ' on' : ''}${size ? ` ${size}` : ''}${cls}" style="--mc:${b.color || g.color}" aria-hidden="true">
      <b class="d">${b.num}</b><small>${b.unit}</small></span>`;
  }

  // ---------- mutations ----------
  function toggle(key, id) {
    const cur = new Set(dayParts(key));
    const on = !cur.has(id);
    if (on) cur.add(id); else cur.delete(id);
    const arr = state.parts.map(p => p.id).filter(x => cur.has(x));
    if (arr.length) state.records[key] = arr; else delete state.records[key];
    save();
    if (on && navigator.vibrate) navigator.vibrate(8);
    return on;
  }

  function nextColor() {
    const used = new Set(state.parts.map(p => p.color.toUpperCase()));
    return CUSTOM_COLORS.find(c => !used.has(c)) || CUSTOM_COLORS[state.parts.length % CUSTOM_COLORS.length];
  }

  // Saves the part sheet: a new part, or a new name / colour for an existing one.
  function savePart() {
    const ps = ui.partSheet;
    if (!ps) return;
    const input = $('#part-name');
    const name = input.value.trim().slice(0, MAX_NAME);
    if (!name) { input.focus(); toast('이름을 입력해 주세요'); return; }
    if (state.parts.some(p => p.name === name && p.id !== ps.id)) { toast('이미 있는 부위예요'); return; }
    if (ps.id) {
      const p = partById(ps.id);
      if (!p) return;
      p.name = name;
      p.color = ps.color;
      toast(`'${name}' 바꿨어요`);
    } else {
      // Bringing back a deleted built-in part keeps its id, so its badge counts again.
      const def = DEFAULT_PARTS.find(d => d.name === name && !partById(d.id));
      state.parts.push(def ? { ...def, color: ps.color } : { id: `c_${Date.now().toString(36)}`, name, color: ps.color });
      toast(`'${name}' 추가했어요`);
    }
    save();
    closeSheet();
    renderCurrent();
  }

  function deletePart(id) {
    const p = partById(id);
    if (!p) return;
    if (state.parts.length <= 1) { toast('부위는 하나 이상 있어야 해요'); return; }
    const uses = Object.values(state.records).filter(a => a.includes(id)).length;
    const msg = `'${p.name}' 부위를 지울까요?` + (uses ? `\n이 부위 기록 ${uses}회도 같이 지워져요.` : '');
    if (!confirm(msg)) return;
    state.parts = state.parts.filter(x => x.id !== id);
    for (const [k, a] of Object.entries(state.records)) {
      const rest = a.filter(x => x !== id);
      if (rest.length) state.records[k] = rest; else delete state.records[k];
    }
    save();
    closeSheet();
    renderCurrent();
    toast(`'${p.name}' 지웠어요`);
  }

  function setGoal(delta) {
    const g = Math.min(7, Math.max(1, state.weeklyGoal + delta));
    if (g === state.weeklyGoal) return;
    state.weeklyGoal = g;
    save();
    renderCurrent();
  }

  // ---------- backup ----------
  // The backup file carries records and every saved 오운완 photo (as data URLs).
  // Building it is async, and iOS only opens the share sheet straight from a tap,
  // so it's two steps: "내보내기" prepares the file, "저장하기" shares it.
  let exportFile = null;
  let exportInfo = null;
  let exporting = false;

  function blobToDataURL(blob) {
    return new Promise((resolve, reject) => {
      const r = new FileReader();
      r.onload = () => resolve(r.result);
      r.onerror = () => reject(r.error);
      r.readAsDataURL(blob);
    });
  }

  const fmtSize = bytes => (bytes >= 1048576 ? `${(bytes / 1048576).toFixed(1)}MB` : `${Math.max(1, Math.round(bytes / 1024))}KB`);

  async function prepareExport() {
    if (exporting) return;
    exporting = true;
    exportFile = null;
    renderCurrent();
    toast('백업 파일 만드는 중…');
    try {
      const photos = {};
      if ('indexedDB' in window) {
        for (const key of await photoStore.keys()) {
          const blob = await photoStore.full(key);
          if (blob) photos[key] = await blobToDataURL(blob);
        }
      }
      // Records and photos only: the login token and sync status stay on this phone.
      const { social: _social, owner: _owner, cloud: _cloud, ...data } = state;
      const payload = JSON.stringify({ app: 'gym-check', format: 2, exportedAt: new Date().toISOString(), ...data, photos });
      exportFile = new File([payload], `gym-check-backup-${keyOf(today())}.json`, { type: 'application/json' });
      exportInfo = { photos: Object.keys(photos).length, size: exportFile.size };
      toast('준비됐어요. 저장하기를 눌러 주세요');
    } catch (e) {
      toast('백업 파일을 만들지 못했어요');
    }
    exporting = false;
    renderCurrent();
  }

  async function shareExport() {
    if (!exportFile) return;
    if (!(await shareOrDownload(exportFile))) return; // cancelled: keep the file for another try
    exportFile = null;
    exportInfo = null;
    state.lastBackup = new Date().toISOString();
    save();
    renderCurrent();
    toast('백업 파일을 저장했어요');
  }

  function exportButton(primary = false) {
    if (exportFile) return '<button class="btn primary" data-action="export-share">저장하기</button>';
    return `<button class="btn${primary ? ' primary' : ''}" data-action="export"${exporting ? ' disabled' : ''}>${exporting ? '만드는 중…' : '내보내기'}</button>`;
  }

  async function importData(file) {
    let parsed;
    let next;
    try {
      parsed = JSON.parse(await file.text());
      next = normalize(parsed);
    } catch (e) {
      toast(e instanceof SyntaxError ? '파일을 읽을 수 없어요' : e.message);
      return;
    }
    const photos = parsed.photos && typeof parsed.photos === 'object'
      ? Object.entries(parsed.photos).filter(([k, v]) => /^\d{4}-\d{2}-\d{2}$/.test(k) && typeof v === 'string' && v.startsWith('data:image/'))
      : [];
    // A file never logs anyone in (older ones carried a token; it's ignored): this phone
    // keeps its own login, and the records become that account's.
    next.social = state.social;
    next.owner = state.social ? state.owner : null;
    next.cloud = state.cloud; // this phone's sync status, not the file's
    const days = Object.keys(next.records).length;
    const nowDays = Object.keys(state.records).length;
    const msg = `백업 파일: 출석 기록 ${days}일${photos.length ? `, 사진 ${photos.length}장` : ''}\n`
      + `지금 기록(${nowDays}일)을 이 파일 내용으로 바꿀까요?`
      + (photos.length ? '\n사진은 지금 있는 사진에 더해지고, 같은 날짜는 파일 사진으로 바뀌어요.' : '');
    if (!confirm(msg)) return;
    state = next;
    save();
    ui.statsYear = today().getFullYear();
    renderCurrent();

    let ok = 0;
    for (const [key, url] of photos) {
      try {
        const blob = await (await fetch(url)).blob();
        await storeDayPhoto(key, blob);
        ok++;
      } catch (e) { /* skip a broken photo */ }
      if (photos.length > 2) toast(`사진 가져오는 중… ${ok}/${photos.length}`);
    }
    renderCurrent();
    toast(`기록 ${days}일${photos.length ? `, 사진 ${ok}장` : ''}을 가져왔어요`);
    if (loggedIn()) cloudSync();
  }

  function downloadFile(file) {
    const url = URL.createObjectURL(file);
    const a = document.createElement('a');
    a.href = url;
    a.download = file.name;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 2000);
  }

  // ---------- 오운완 photo ----------
  // "CHEST DAY", "CHEST & BACK DAY", "CHEST · BACK · ARM DAY"; custom parts use their own name.
  function photoHeadline(parts) {
    if (!parts.length) return 'WORKOUT DONE';
    if (parts.length > 4) return 'FULL BODY DAY';
    const words = parts.map(p => DAY_EN[p.id] || p.name);
    return `${words.join(parts.length === 2 ? ' & ' : ' · ')} DAY`;
  }

  async function loadImage(file) {
    if ('createImageBitmap' in window) {
      try { return await createImageBitmap(file, { imageOrientation: 'from-image' }); } catch (e) { /* fall back */ }
    }
    const url = URL.createObjectURL(file);
    try {
      const img = new Image();
      img.src = url;
      await img.decode();
      return img;
    } finally {
      URL.revokeObjectURL(url);
    }
  }

  // Canvas text needs the web fonts loaded first; give up after a moment (offline) and use fallbacks.
  async function ensurePhotoFonts(text) {
    if (!document.fonts || !document.fonts.load) return;
    const loads = [
      document.fonts.load('italic 900 100px "Barlow Condensed"', text),
      document.fonts.load('italic 800 100px "Barlow Condensed"', text),
      document.fonts.load('800 40px "Pretendard Variable"', text),
      document.fonts.load('600 40px "Pretendard Variable"', text),
    ];
    await Promise.race([Promise.all(loads).catch(() => {}), new Promise(r => setTimeout(r, 2500))]);
  }

  function roundRect(ctx, x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
  }

  // Largest size (up to maxSize) at which the headline fits; splits onto two lines if it must.
  function fitHeadline(ctx, text, maxW, maxSize, minSize) {
    const font = s => `italic 900 ${s}px "Barlow Condensed", "Pretendard Variable", sans-serif`;
    const fits = (lines, s) => { ctx.font = font(s); return lines.every(l => ctx.measureText(l).width <= maxW); };
    const step = maxSize * 0.04;
    for (let s = maxSize; s >= minSize; s -= step) if (fits([text], s)) return { size: s, lines: [text] };

    const words = text.split(' ');
    let lines = [text];
    let best = Infinity;
    ctx.font = font(maxSize);
    for (let i = 1; i < words.length; i++) {
      const a = words.slice(0, i).join(' ');
      const b = words.slice(i).join(' ');
      const w = Math.max(ctx.measureText(a).width, ctx.measureText(b).width);
      if (w < best) { best = w; lines = [a, b]; }
    }
    for (let s = maxSize; s >= minSize * 0.6; s -= step) if (fits(lines, s)) return { size: s, lines };
    return { size: minSize * 0.6, lines };
  }

  // ---- selfie detection ----
  // iOS shows the front camera mirrored while shooting but saves the photo un-mirrored,
  // so selfies look flipped. iPhone photos name the lens in EXIF ("... front camera ..."),
  // which lets us flip those back automatically. Best effort: any parse problem → false.
  // EXIF of a JPEG (lens, orientation, the day it was taken), or null.
  async function exifOf(file) {
    try {
      const v = new DataView(await file.slice(0, 256 * 1024).arrayBuffer());
      if (v.getUint16(0) !== 0xFFD8) return null; // not a JPEG
      let off = 2;
      while (off + 10 <= v.byteLength) {
        const marker = v.getUint16(off);
        if ((marker & 0xFF00) !== 0xFF00 || marker === 0xFFDA) return null; // scan data: no EXIF
        if (marker === 0xFFE1 && v.getUint32(off + 4) === 0x45786966) return readExif(v, off + 10); // APP1 "Exif"
        off += 2 + v.getUint16(off + 2);
      }
    } catch (e) { /* unreadable EXIF */ }
    return null;
  }

  const isUnmirroredSelfie = exif => Boolean(exif) && /front/i.test(exif.lens) && ![2, 4, 5, 7].includes(exif.orientation);

  // The day a photo was taken: its EXIF date, else the file's date. Crew proofs need today's.
  const takenKey = (exif, file) => (exif && /^\d{4}-\d{2}-\d{2}$/.test(exif.taken) ? exif.taken
    : file.lastModified ? keyOf(new Date(file.lastModified)) : null);

  function readExif(v, tiff) {
    const little = v.getUint16(tiff) === 0x4949;
    const u16 = o => v.getUint16(tiff + o, little);
    const u32 = o => v.getUint32(tiff + o, little);
    const entry = (ifd, tag) => {
      const n = u16(ifd);
      for (let i = 0; i < n; i++) if (u16(ifd + 2 + i * 12) === tag) return ifd + 2 + i * 12;
      return -1;
    };
    const ifd0 = u32(4);
    const o = entry(ifd0, 0x0112);
    const orientation = o < 0 ? 1 : u16(o + 8);
    let lens = '';
    let taken = '';
    const exifPtr = entry(ifd0, 0x8769);
    if (exifPtr >= 0) {
      const exifIfd = u32(exifPtr + 8);
      const l = entry(exifIfd, 0xA434); // LensModel
      if (l >= 0) {
        const count = u32(l + 4);
        const start = count > 4 ? u32(l + 8) : l + 8;
        for (let i = 0; i < count - 1 && i < 120; i++) lens += String.fromCharCode(v.getUint8(tiff + start + i));
      }
      const t = entry(exifIfd, 0x9003); // DateTimeOriginal, "YYYY:MM:DD HH:MM:SS"
      if (t >= 0) {
        const start = u32(t + 8);
        for (let i = 0; i < 10; i++) taken += String.fromCharCode(v.getUint8(tiff + start + i));
        taken = taken.replace(/:/g, '-');
      }
    }
    return { lens, orientation, taken };
  }

  // Puts the photo in the frame. Story frames (9:16) take portrait photos edge to edge;
  // wider photos sit full-width over a blurred, darkened copy of themselves.
  function drawPhotoFrame(ctx, src, W, H, flip, story) {
    const pw = src.width;
    const ph = src.height;
    const cover = (dx, dy, dw, dh) => {
      const s = Math.max(dw / pw, dh / ph);
      ctx.drawImage(src, dx + (dw - pw * s) / 2, dy + (dh - ph * s) / 2, pw * s, ph * s);
    };
    ctx.save();
    if (flip) { ctx.translate(W, 0); ctx.scale(-1, 1); }
    if (!story) {
      ctx.drawImage(src, 0, 0, W, H);
    } else if (pw / ph <= 0.8) {
      cover(0, 0, W, H);
    } else {
      ctx.filter = 'blur(40px)';
      cover(-80, -80, W + 160, H + 160);
      ctx.filter = 'none';
      ctx.fillStyle = 'rgba(0,0,0,.45)';
      ctx.fillRect(0, 0, W, H);
      const h = W * ph / pw;
      ctx.drawImage(src, 0, (H - h) / 2, W, h);
    }
    ctx.restore();
  }

  async function composePhoto(src, flip, format) {
    const story = format === 'story';
    const t = photoKey ? parseKey(photoKey) : today();
    const tk = keyOf(t);
    const done = new Set(dayParts(tk));
    const parts = state.parts.filter(p => done.has(p.id));
    const headline = photoHeadline(parts);
    const dateLine = `${t.getFullYear()}.${pad(t.getMonth() + 1)}.${pad(t.getDate())} ${WEEKDAYS_EN[t.getDay()]}`;
    // Gym days this year up to and including the photo's date, e.g. "30/365".
    const yearPrefix = `${t.getFullYear()}-`;
    const yearCount = Object.entries(state.records).filter(([k, a]) => k.startsWith(yearPrefix) && k <= tk && a.length).length;
    const badgeText = `${yearCount}/${daysInYear(t.getFullYear())}`;
    const KR = '"Pretendard Variable", sans-serif';
    // The day's logged exercises: top set and how many sets, shown above the headline.
    const logged = (state.logs[tk] || []).map(e => ({ ex: exById(e.ex), sets: e.sets })).filter(e => e.ex);
    const lifts = logged.map(({ ex, sets }) => [shortName(ex.name), setText(ex.kind, bestSet(ex, [{ sets }])) + (sets.length > 1 ? ` · ${sets.length}세트` : '')]);

    await ensurePhotoFonts(headline + dateLine + badgeText + lifts.flat().join(''));

    let W = 1080;
    let H = 1920;
    if (!story) {
      const scale = Math.min(1, 1600 / Math.max(src.width, src.height));
      W = Math.round(src.width * scale);
      H = Math.round(src.height * scale);
    }
    const canvas = document.createElement('canvas');
    canvas.width = W;
    canvas.height = H;
    const ctx = canvas.getContext('2d');
    drawPhotoFrame(ctx, src, W, H, flip, story);

    const u = Math.min(W, H) / 100;
    const m = 6 * u; // side margin
    // Instagram lays its own UI over the top and bottom of a story; keep clear of it.
    const top = story ? Math.round(H * 0.11) : m;
    const bottom = story ? Math.round(H * 0.13) : m;

    // Darken top and bottom so the text reads on any photo.
    let g = ctx.createLinearGradient(0, H * 0.45, 0, H);
    g.addColorStop(0, 'rgba(0,0,0,0)');
    g.addColorStop(1, 'rgba(0,0,0,.75)');
    ctx.fillStyle = g;
    ctx.fillRect(0, H * 0.45, W, H * 0.55);
    const topShade = Math.max(H * 0.2, top + 22 * u);
    g = ctx.createLinearGradient(0, 0, 0, topShade);
    g.addColorStop(0, 'rgba(0,0,0,.45)');
    g.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, topShade);

    // Top left: date.
    ctx.textBaseline = 'middle';
    ctx.shadowColor = 'rgba(0,0,0,.35)';
    ctx.shadowBlur = 2 * u;
    ctx.fillStyle = '#FFFFFF';
    ctx.font = `italic 800 ${5.6 * u}px "Barlow Condensed", sans-serif`;
    const badgeH = 7.6 * u;
    const rowY = top + badgeH / 2;
    ctx.fillText(dateLine, m, rowY);

    // Top right: this year's count, "30/365".
    ctx.shadowBlur = 0;
    ctx.font = `italic 800 ${5.4 * u}px "Barlow Condensed", ${KR}`;
    const badgeW = ctx.measureText(badgeText).width + 5.6 * u;
    roundRect(ctx, W - m - badgeW, top, badgeW, badgeH, badgeH / 2);
    ctx.fillStyle = VOLT;
    ctx.fill();
    ctx.fillStyle = '#0A0A0B';
    ctx.textAlign = 'center';
    ctx.fillText(badgeText, W - m - badgeW / 2, rowY + 0.3 * u);
    ctx.textAlign = 'left';

    const textMaxW = W - m * 2;

    // Bottom left: the headline.
    ctx.textBaseline = 'alphabetic';
    ctx.shadowColor = 'rgba(0,0,0,.35)';
    ctx.shadowBlur = 2 * u;
    let y = H - bottom;
    const { size, lines } = fitHeadline(ctx, headline, textMaxW, 17 * u, 9 * u);
    ctx.font = `italic 900 ${size}px "Barlow Condensed", ${KR}`;
    ctx.fillStyle = VOLT;
    for (let i = lines.length - 1; i >= 0; i--) {
      ctx.fillText(lines[i], m, y);
      y -= size * 0.9;
    }

    // Above it: every exercise, name in white and the top set in volt. Many exercises
    // get smaller type, then two columns, so the block stays under ~40% of the photo.
    if (lifts.length) {
      const base = y - 1.4 * u;
      const room = Math.min(base - (top + 7.6 * u + 6 * u), H * 0.4);
      let cols = 1;
      let rows = lifts.length;
      let fs = 3.8 * u;
      const fits = () => rows * fs * 1.45 <= room;
      while (!fits() && fs > 2.8 * u) fs -= 0.1 * u;
      if (!fits() && lifts.length > 1) {
        cols = 2;
        rows = Math.ceil(lifts.length / 2);
        fs = 3.4 * u;
        while (!fits() && fs > 2.2 * u) fs -= 0.1 * u;
      }
      const colW = textMaxW / cols;
      lifts.forEach(([name, best], i) => {
        const col = cols === 2 ? Math.floor(i / rows) : 0;
        const row = cols === 2 ? i % rows : i;
        const x0 = m + col * colW;
        const ly = base - (rows - 1 - row) * fs * 1.45;
        ctx.font = `700 ${fs}px ${KR}`;
        ctx.fillStyle = '#FFFFFF';
        let label = name;
        while (label.length > 1 && ctx.measureText(label).width > colW * 0.58) label = label.slice(0, -1);
        if (label !== name) label = `${label.trimEnd()}…`;
        ctx.fillText(label, x0, ly);
        if (best) {
          const x = x0 + ctx.measureText(label).width + 1.6 * u;
          ctx.font = `italic 800 ${fs * 1.12}px "Barlow Condensed", ${KR}`;
          ctx.fillStyle = VOLT;
          ctx.fillText(best, x, ly);
        }
      });
    }

    return canvasToJpeg(canvas);
  }

  function canvasToJpeg(canvas) {
    return new Promise((resolve, reject) => {
      canvas.toBlob(b => (b ? resolve(b) : reject(new Error('toBlob failed'))), 'image/jpeg', 0.92);
    });
  }

  // ---- monthly recap card (1080×1920, story size) ----
  const MONTH_EN = ['JANUARY', 'FEBRUARY', 'MARCH', 'APRIL', 'MAY', 'JUNE', 'JULY', 'AUGUST', 'SEPTEMBER', 'OCTOBER', 'NOVEMBER', 'DECEMBER'];

  function monthSummary(y, mo) {
    const t = today();
    const tk = keyOf(t);
    const dim = new Date(y, mo + 1, 0).getDate();
    const keys = Array.from({ length: dim }, (_, i) => keyOf(new Date(y, mo, i + 1)));
    const counts = {};
    let days = 0;
    let run = 0;
    let best = 0;
    for (const k of keys) {
      if (k > tk) break;
      const arr = dayParts(k);
      if (arr.length) {
        days++;
        run++;
        best = Math.max(best, run);
        for (const id of arr) counts[id] = (counts[id] || 0) + 1;
      } else {
        run = 0;
      }
    }
    const isCur = y === t.getFullYear() && mo === t.getMonth();
    const elapsed = isCur ? t.getDate() : dim;
    const top = state.parts
      .map(p => ({ p, n: counts[p.id] || 0 }))
      .sort((a, b) => b.n - a.n)[0];
    return { keys, dim, days, best, rate: pct(days, elapsed), top: top && top.n ? top : null, tk };
  }

  async function composeRecap(y, mo) {
    const W = 1080;
    const H = 1920;
    const P = 90;
    const KR = '"Pretendard Variable", sans-serif';
    const s = monthSummary(y, mo);
    const topText = s.top ? `${s.top.p.name} ${s.top.n}회` : '-';
    const kicker = `${MONTH_EN[mo]} ${y} · RECAP`;

    const thumbs = new Map();
    await Promise.all(s.keys.filter(k => photoThumbs.has(k)).map(async k => {
      const img = new Image();
      img.src = photoThumbs.get(k);
      try { await img.decode(); thumbs.set(k, img); } catch (e) { /* skip */ }
    }));
    await ensurePhotoFonts(`${kicker}${mo + 1}월 결산헬스장 간 날출석률최장 연속최다 부위${topText}월화수목금토일GYMCHEK0123456789/%일`);

    const canvas = document.createElement('canvas');
    canvas.width = W;
    canvas.height = H;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#0A0A0B';
    ctx.fillRect(0, 0, W, H);
    const glow = ctx.createRadialGradient(W * 0.15, H * 0.2, 0, W * 0.15, H * 0.2, W);
    glow.addColorStop(0, 'rgba(212,255,63,.14)');
    glow.addColorStop(1, 'rgba(212,255,63,0)');
    ctx.fillStyle = glow;
    ctx.fillRect(0, 0, W, H);

    ctx.textBaseline = 'alphabetic';
    ctx.fillStyle = VOLT;
    ctx.font = `700 40px "Barlow Condensed", ${KR}`;
    if ('letterSpacing' in ctx) ctx.letterSpacing = '6px';
    ctx.fillText(kicker, P, 200);
    if ('letterSpacing' in ctx) ctx.letterSpacing = '0px';
    ctx.fillStyle = '#F4F4F0';
    ctx.font = `800 84px ${KR}`;
    ctx.fillText(`${mo + 1}월 결산`, P, 300);

    // Big number: days at the gym this month.
    ctx.fillStyle = VOLT;
    ctx.font = `italic 900 330px "Barlow Condensed", ${KR}`;
    const num = String(s.days);
    ctx.fillText(num, P - 8, 610);
    const nw = ctx.measureText(num).width;
    ctx.fillStyle = '#8E8E94';
    ctx.font = `italic 800 92px "Barlow Condensed", ${KR}`;
    ctx.fillText(`/${s.dim}`, P + nw + 4, 610);
    ctx.font = `600 40px ${KR}`;
    ctx.fillText('헬스장 간 날', P, 675);

    // Three stats.
    const stats = [['출석률', `${s.rate}%`], ['최장 연속', `${s.best}일`], ['최다 부위', topText]];
    const colW = (W - P * 2) / 3;
    stats.forEach(([label, value], i) => {
      const x = P + i * colW;
      ctx.fillStyle = '#8E8E94';
      ctx.font = `600 32px ${KR}`;
      ctx.fillText(label, x, 760);
      ctx.fillStyle = '#F4F4F0';
      let size = 64;
      ctx.font = `italic 800 ${size}px "Barlow Condensed", ${KR}`;
      while (ctx.measureText(value).width > colW - 24 && size > 36) {
        size -= 2;
        ctx.font = `italic 800 ${size}px "Barlow Condensed", ${KR}`;
      }
      ctx.fillText(value, x, 832);
    });
    ctx.fillStyle = 'rgba(255,255,255,.08)';
    ctx.fillRect(P, 880, W - P * 2, 2);

    // Month calendar: gym days in lime, days with a saved 오운완 photo show the photo.
    const cell = (W - P * 2) / 7;
    ctx.textAlign = 'center';
    ctx.fillStyle = '#8E8E94';
    ctx.font = `600 30px ${KR}`;
    '월화수목금토일'.split('').forEach((d, i) => ctx.fillText(d, P + cell * i + cell / 2, 950));
    const lead = (new Date(y, mo, 1).getDay() + 6) % 7;
    const rowH = 112;
    const r = 46;
    ctx.textBaseline = 'middle';
    s.keys.forEach((k, i) => {
      const pos = lead + i;
      const cx = P + (pos % 7) * cell + cell / 2;
      const cy = 1030 + Math.floor(pos / 7) * rowH;
      const on = attended(k);
      const img = thumbs.get(k);
      if (img) {
        ctx.save();
        ctx.beginPath();
        ctx.arc(cx, cy, r, 0, Math.PI * 2);
        ctx.clip();
        ctx.drawImage(img, cx - r, cy - r, r * 2, r * 2);
        ctx.restore();
        ctx.strokeStyle = VOLT;
        ctx.lineWidth = 5;
        ctx.beginPath();
        ctx.arc(cx, cy, r + 2, 0, Math.PI * 2);
        ctx.stroke();
      } else if (on) {
        ctx.fillStyle = VOLT;
        ctx.beginPath();
        ctx.arc(cx, cy, r, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#0A0A0B';
        ctx.font = `italic 800 38px "Barlow Condensed", ${KR}`;
        ctx.fillText(String(i + 1), cx, cy + 2);
      } else {
        ctx.fillStyle = k > s.tk ? '#2B2B2F' : '#55555B';
        ctx.font = `italic 700 36px "Barlow Condensed", ${KR}`;
        ctx.fillText(String(i + 1), cx, cy + 2);
      }
    });

    ctx.textBaseline = 'alphabetic';
    ctx.fillStyle = '#55555B';
    ctx.font = `700 30px "Barlow Condensed", ${KR}`;
    ctx.fillText('GYMCHEK', W / 2, 1790);
    ctx.textAlign = 'left';

    return canvasToJpeg(canvas);
  }

  const photoEditor = $('#photo-editor');
  const photoPreview = $('#photo-preview');
  const photoLoading = $('#photo-loading');
  const photoSaveBtn = $('#photo-save');
  let photoSource = null; // the picked photo, kept so a new character can be applied without re-picking
  let photoBlob = null;
  let photoUrl = '';
  let photoSeq = 0;
  let photoFlip = false;
  const photoFlipBtn = $('#photo-flip');

  function setPhotoFlip(on) {
    photoFlip = on;
    photoFlipBtn.setAttribute('aria-pressed', String(on));
  }

  let photoKey = null; // the date the photo belongs to
  let photoTaken = null; // the day the picked photo was taken (crew proofs need today's)

  function startPhoto(key = keyOf(today())) {
    if (!attended(key)) {
      toast(key === keyOf(today()) ? '오늘 한 운동을 먼저 체크해 주세요' : '그날 한 운동을 먼저 체크해 주세요');
      return;
    }
    photoKey = key;
    $('#photo-input').click();
  }

  function syncFormatButtons() {
    document.querySelectorAll('#photo-format button').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.format === state.photoFormat)));
  }

  function pickFormat(format) {
    if (format !== 'orig' && format !== 'story') return;
    state.photoFormat = format;
    save();
    syncFormatButtons();
    renderPhoto();
  }

  // Recap mode reuses the photo screen to preview and share a monthly recap card.
  let recapMode = false;
  let recapFile = null;

  async function openRecap() {
    const y = ui.calMonth.getFullYear();
    const mo = ui.calMonth.getMonth();
    if (!monthSummary(y, mo).days) { toast('이 달은 운동 기록이 없어요'); return; }
    recapMode = true;
    recapFile = null;
    photoEditor.classList.add('recap');
    $('#photo-title').textContent = `${mo + 1}월 결산`;
    photoEditor.hidden = false;
    photoPreview.hidden = true;
    photoLoading.hidden = false;
    photoLoading.textContent = '결산 카드 만드는 중…';
    photoSaveBtn.disabled = true;
    try {
      const blob = await composeRecap(y, mo);
      if (!recapMode) return;
      recapFile = new File([blob], `gym-check-${y}-${pad(mo + 1)}.jpg`, { type: 'image/jpeg' });
      if (photoUrl) URL.revokeObjectURL(photoUrl);
      photoUrl = URL.createObjectURL(blob);
      photoPreview.src = photoUrl;
      await photoPreview.decode().catch(() => {});
      photoPreview.hidden = false;
      photoLoading.hidden = true;
      photoSaveBtn.disabled = false;
    } catch (e) {
      photoLoading.textContent = '결산 카드를 만들지 못했어요';
    }
  }

  function syncPhotoControls() {
    syncFormatButtons();
  }

  async function renderPhoto() {
    if (!photoSource) return;
    const seq = ++photoSeq;
    photoSaveBtn.disabled = true;
    if (photoPreview.hidden) {
      photoLoading.hidden = false;
      photoLoading.textContent = '사진 만드는 중…';
    }
    try {
      const blob = await composePhoto(photoSource, photoFlip, state.photoFormat);
      if (seq !== photoSeq) return; // a newer pick is already rendering
      photoBlob = blob;
      if (photoUrl) URL.revokeObjectURL(photoUrl);
      photoUrl = URL.createObjectURL(blob);
      photoPreview.src = photoUrl;
      await photoPreview.decode().catch(() => {});
      photoPreview.hidden = false;
      photoLoading.hidden = true;
      photoSaveBtn.disabled = false;
    } catch (e) {
      if (seq !== photoSeq) return;
      photoPreview.hidden = true;
      photoLoading.hidden = false;
      photoLoading.textContent = '사진을 만들지 못했어요. 다른 사진을 골라 주세요';
    }
  }

  async function openPhoto(file) {
    photoEditor.hidden = false;
    photoPreview.hidden = true;
    photoLoading.hidden = false;
    photoLoading.textContent = '사진 만드는 중…';
    photoSaveBtn.disabled = true;
    syncPhotoControls();
    try {
      const img = await loadImage(file);
      if (photoSource && photoSource.close) photoSource.close();
      photoSource = img;
      const exif = await exifOf(file);
      setPhotoFlip(isUnmirroredSelfie(exif));
      photoTaken = takenKey(exif, file);
      // Forgot to shoot that day, but the phone's camera has a photo from it: the photo's
      // own taken-date (EXIF) moves it to that day, if that day has a workout checked.
      const exifDay = exif && /^\d{4}-\d{2}-\d{2}$/.test(exif.taken) ? exif.taken : null;
      if (exifDay && exifDay !== photoKey && exifDay <= keyOf(today()) && attended(exifDay)) {
        photoKey = exifDay;
        toast(`사진 찍은 날 ${md(exifDay)}로 올려요`);
      }
    } catch (e) {
      photoLoading.textContent = '이 사진은 열 수 없어요. 다른 사진을 골라 주세요';
      return;
    }
    await renderPhoto();
  }

  function closePhoto() {
    photoEditor.hidden = true;
    photoEditor.classList.remove('recap');
    recapMode = false;
    recapFile = null;
    setPhotoFlip(false);
    photoSeq++;
    photoPreview.removeAttribute('src');
    if (photoUrl) URL.revokeObjectURL(photoUrl);
    if (photoSource && photoSource.close) photoSource.close();
    photoSource = null;
    photoUrl = '';
    photoBlob = null;
    photoTaken = null;
    flushQueuedBadges();
  }

  async function savePhoto() {
    if (recapMode) {
      if (recapFile) shareOrDownload(recapFile);
      return;
    }
    if (!photoBlob) return;
    const key = photoKey || keyOf(today());
    const blob = photoBlob;
    const taken = photoTaken;
    const badgesBefore = earnedBadges();
    // Keep it in the app under its date. Runs alongside the share sheet, which has to
    // open straight from the tap.
    const stored = storeDayPhoto(key, blob, photoSource, photoFlip).then(() => true, () => false);
    await shareOrDownload(new File([blob], `owoonwan-${key}.jpg`, { type: 'image/jpeg' }));
    const ok = await stored;
    let proof = null;
    let backup = Promise.resolve(null);
    if (ok) {
      if (loggedIn()) backup = cloudPutPhoto(key);
      cheer.queued.push(...newBadges(badgesBefore));
      if (inThisWeek(key) && loggedIn()) proof = await sendProof(key, blob, taken);
    }
    const backedUp = await backup;
    renderCurrent();
    const bk = backedUp === false ? ' · 서버 백업은 실패했어요' : '';
    if (!ok) toast('앱에 저장하지 못했어요. 사진은 앨범에 저장해 두세요');
    else if (proof === 'ok') toast(`${md(key)} 오운완 저장 · 크루 인증 완료${bk}`);
    else if (proof === 'old') toast(`저장했어요. 크루 인증은 그날 찍은 사진만 돼요${bk}`);
    else if (proof) toast(`저장했어요. 크루 인증은 못 했어요: ${proof}`);
    else if (backedUp === false) toast(`${md(key)} 오운완 저장 · 서버 백업은 실패했어요. 설정 → 지금 저장으로 다시 올려 주세요`);
    else toast(`${md(key)} 오운완으로 저장했어요`);
  }

  // ---------- 오운완 photo diary ----------
  // Saved photos live in IndexedDB (localStorage is far too small for images), one per
  // date: 'full' holds the finished JPEG, 'thumb' a small square for the calendar.
  const photoStore = (() => {
    let dbp = null;
    const open = () => {
      if (!dbp) {
        dbp = new Promise((resolve, reject) => {
          const req = indexedDB.open('gymcheck-photos', 1);
          req.onupgradeneeded = () => {
            req.result.createObjectStore('full');
            req.result.createObjectStore('thumb');
          };
          req.onsuccess = () => resolve(req.result);
          req.onerror = () => reject(req.error);
        });
        dbp.catch(() => { dbp = null; });
      }
      return dbp;
    };
    const run = async (stores, mode, work) => {
      const db = await open();
      return new Promise((resolve, reject) => {
        const tx = db.transaction(stores, mode);
        let out;
        work(tx, v => { out = v; });
        tx.oncomplete = () => resolve(out);
        tx.onerror = () => reject(tx.error);
        tx.onabort = () => reject(tx.error);
      });
    };
    return {
      put: (key, full, thumb) => run(['full', 'thumb'], 'readwrite', tx => {
        tx.objectStore('full').put(full, key);
        tx.objectStore('thumb').put(thumb, key);
      }),
      full: key => run('full', 'readonly', (tx, done) => {
        const r = tx.objectStore('full').get(key);
        r.onsuccess = () => done(r.result || null);
      }),
      remove: key => run(['full', 'thumb'], 'readwrite', tx => {
        tx.objectStore('full').delete(key);
        tx.objectStore('thumb').delete(key);
      }),
      keys: () => run('full', 'readonly', (tx, done) => {
        const r = tx.objectStore('full').getAllKeys();
        r.onsuccess = () => done(r.result || []);
      }),
      thumbs: () => run('thumb', 'readonly', (tx, done) => {
        const list = [];
        const c = tx.objectStore('thumb').openCursor();
        c.onsuccess = () => {
          const cur = c.result;
          if (cur) { list.push([cur.key, cur.value]); cur.continue(); } else done(list);
        };
      }),
    };
  })();

  const photoThumbs = new Map(); // date key → object URL of its thumbnail
  let sheetPhoto = { key: null, blob: null, url: '' }; // full photo shown in the day sheet

  function setThumb(key, blob) {
    if (photoThumbs.has(key)) URL.revokeObjectURL(photoThumbs.get(key));
    if (blob) photoThumbs.set(key, URL.createObjectURL(blob));
    else photoThumbs.delete(key);
  }

  function clearSheetPhoto() {
    if (sheetPhoto.url) URL.revokeObjectURL(sheetPhoto.url);
    sheetPhoto = { key: null, blob: null, url: '' };
  }

  async function loadSheetPhoto(key) {
    if (sheetPhoto.key === key) return;
    clearSheetPhoto();
    sheetPhoto.key = key;
    try {
      const blob = await photoStore.full(key);
      if (sheetPhoto.key !== key) return;
      sheetPhoto.blob = blob;
      sheetPhoto.url = blob ? URL.createObjectURL(blob) : '';
    } catch (e) { /* show the thumbnail only */ }
    if (ui.sheetDate === key) renderSheet();
  }

  async function loadPhotoThumbs() {
    if (!('indexedDB' in window)) return;
    try {
      for (const [key, blob] of await photoStore.thumbs()) setThumb(key, blob);
      if (photoThumbs.size) renderCurrent();
    } catch (e) { /* nothing saved yet */ }
  }

  // Square crop a bit above centre, where faces usually are. Made from the original
  // photo (no text on it) when we still have it, otherwise from the finished image.
  async function makeThumb(source, flip = false) {
    const own = source instanceof Blob;
    const img = own ? await loadImage(source) : source;
    const s = Math.min(img.width, img.height);
    const c = document.createElement('canvas');
    c.width = c.height = 240;
    const ctx = c.getContext('2d');
    if (flip) { ctx.translate(240, 0); ctx.scale(-1, 1); }
    ctx.drawImage(img, (img.width - s) / 2, (img.height - s) * 0.35, s, s, 0, 0, 240, 240);
    if (own && img.close) img.close();
    return new Promise((resolve, reject) => c.toBlob(b => (b ? resolve(b) : reject(new Error('thumb'))), 'image/jpeg', 0.8));
  }

  async function storeDayPhoto(key, blob, source, flip) {
    const thumb = await makeThumb(source || blob, flip);
    await photoStore.put(key, blob, thumb);
    setThumb(key, thumb);
    if (sheetPhoto.key === key) clearSheetPhoto();
  }

  async function shareOrDownload(file) {
    if (navigator.canShare && navigator.canShare({ files: [file] })) {
      try {
        await navigator.share({ files: [file] });
        return true;
      } catch (e) {
        if (e && e.name === 'AbortError') return false;
      }
    }
    downloadFile(file);
    return true;
  }

  function shareDayPhoto() {
    const k = ui.sheetDate;
    if (!k || sheetPhoto.key !== k || !sheetPhoto.blob) return;
    shareOrDownload(new File([sheetPhoto.blob], `owoonwan-${k}.jpg`, { type: 'image/jpeg' }));
  }

  async function deleteDayPhoto() {
    const k = ui.sheetDate;
    if (!k) return;
    if (!confirm(`${fmtLong(parseKey(k))} 오운완 사진을 지울까요?\n앨범에 저장해 둔 사진은 그대로예요.`)) return;
    try {
      await photoStore.remove(k);
    } catch (e) {
      toast('사진을 지우지 못했어요');
      return;
    }
    setThumb(k, null);
    clearSheetPhoto();
    cloud.photosOnServer.delete(k);
    cloud.photoFails.delete(k);
    renderCurrent();
    toast('사진을 지웠어요');
    if (loggedIn()) api(`/api/backup/photos/${k}`, { method: 'DELETE' }).catch(() => { /* next sync may bring it back */ });
    if (loggedIn() && inThisWeek(k)) {
      api(`/api/proofs/${k}`, { method: 'DELETE' }).then(() => { crew.stale = true; }, () => { /* stays proven */ });
    }
  }

  const md = key => { const d = parseKey(key); return `${d.getMonth() + 1}월 ${d.getDate()}일`; };
  // Monday through today: a crew proof can still be for any of these, if the photo is from that day.
  const inThisWeek = key => key >= weekRange().from && key <= keyOf(today());

  // ---------- exercise log (optional) ----------
  // Sets × kg per exercise per day, on top of the plain check-in. The bottom sheet
  // shows a picker, a set editor, or one exercise's history (ui.exSheet.step).
  const exById = id => EXERCISE_MAP.get(id) || state.customEx.find(e => e.id === id) || null;
  const shortName = n => n.replace(/\s*\(.*\)$/, '');
  const allExercises = () => [...EXERCISE_MAP.values(), ...state.customEx.map(e => ({ ...e, equip: '직접 추가' }))];

  // "4세트 × 8~10회", "3세트 × 45초", "20~30분"
  function routineText(ex, r) {
    const range = r.range.replace('-', '~');
    if (ex.kind === 'cardio') return `${range}분`;
    const each = !range ? '최대' : ex.kind === 't' || ex.kind === 'wt' ? `${range}초` : `${range}회`;
    return `${r.sets}세트 × ${each}`;
  }

  // Empty sets for a first try, with the low end of the range filled in.
  function routineSets(ex, r) {
    const low = parseFloat(r.range);
    const field = ex.kind === 'wr' || ex.kind === 'r' ? 'r' : 't';
    return Array.from({ length: r.sets }, () => (Number.isFinite(low) ? { [field]: low } : {}));
  }

  function setText(kind, s) {
    switch (kind) {
      case 'wr': return `${s.w}kg × ${s.r}`;
      case 'r': return s.w ? `${s.r}회 +${s.w}kg` : `${s.r}회`;
      case 't': return `${s.t}초`;
      case 'wt': return `${s.w}kg · ${s.t}초`;
      case 'cardio': return s.d ? `${s.t}분 · ${s.d}km` : `${s.t}분`;
      default: return '';
    }
  }

  function logSummary(ex, sets) {
    const texts = sets.map(st => setText(ex.kind, st));
    if (texts.every(t => t === texts[0])) return sets.length > 1 ? `${texts[0]} · ${sets.length}세트` : texts[0];
    return texts.length > 3 ? `${texts.slice(0, 3).join(', ')} 외 ${texts.length - 3}세트` : texts.join(', ');
  }

  function exerciseHistory(exId) {
    const out = [];
    for (const [date, list] of Object.entries(state.logs)) {
      const e = list.find(x => x.ex === exId);
      if (e) out.push({ date, sets: e.sets });
    }
    return out.sort((a, b) => (a.date < b.date ? 1 : -1));
  }

  // The heaviest set (weights), most reps (bodyweight), longest (time), farthest (cardio).
  function bestSet(ex, history) {
    let best = null;
    let top = -1;
    for (const { sets } of history) {
      for (const st of sets) {
        const v = ex.kind === 'wr' ? (st.w || 0) * 1e4 + (st.r || 0)
          : ex.kind === 'wt' ? (st.w || 0) * 1e5 + (st.t || 0)
            : ex.kind === 'r' ? (st.r || 0) * 1e4 + (st.w || 0)
              : ex.kind === 'cardio' ? (st.d || 0) * 1e5 + (st.t || 0) : (st.t || 0);
        if (v > top) { top = v; best = st; }
      }
    }
    return best;
  }
  const oneRepMax = (ex, st) => (ex.kind === 'wr' && st && st.w > 0 && st.r > 1 && st.r <= 12 ? Math.round(st.w * (1 + st.r / 30)) : 0);

  function recentExerciseIds() {
    const last = {};
    for (const [date, list] of Object.entries(state.logs)) for (const e of list) if (!last[e.ex] || date > last[e.ex]) last[e.ex] = date;
    return Object.keys(last).sort((a, b) => (last[a] < last[b] ? 1 : -1)).slice(0, 12);
  }

  // The list under the part tiles (오늘 tab) and in a day's sheet.
  function logBlock(date, from) {
    const list = state.logs[date] || [];
    const rows = list.map(e => {
      const ex = exById(e.ex);
      if (!ex) return '';
      const at = `data-ex="${esc(e.ex)}" data-date="${date}" data-from="${from}"`;
      // Tap to edit; swipe left for 수정 / 삭제, like the iOS app.
      return `<div class="swipe">
          <div class="swipe-actions">
            <button class="swipe-btn" data-action="ex-edit" ${at}>${ICON.pencil}<span>수정</span></button>
            <button class="swipe-btn danger" data-action="log-delete" ${at}>${ICON.trash}<span>삭제</span></button>
          </div>
          <button class="log-row swipe-front" data-action="ex-edit" ${at}>
            <span><b>${esc(shortName(ex.name))}</b><small>${esc(logSummary(ex, e.sets))}</small></span>${ICON.next}</button>
        </div>`;
    }).join('');
    return `<div class="log-block">${rows}
        <button class="log-add" data-action="ex-add" data-date="${date}" data-from="${from}">${ICON.plus}<span>${list.length ? '종목 추가' : '종목·무게 기록하기'}</span>${list.length ? '' : '<small>선택</small>'}</button>
      </div>`;
  }

  function openExercisePicker(date, from) {
    ui.sheetDate = null;
    ui.partSheet = null;
    ui.exSheet = { step: 'pick', date, from, filter: dayParts(date).length ? 'today' : 'all', q: '' };
    renderExSheet();
    showSheet();
  }

  // back: where 'back' goes — 'pick', 'day', 'history', or null (close).
  function openExerciseLog(date, exId, back, rec = null, queue = null, qi = 0) {
    const ex = exById(exId);
    if (!ex) return;
    const entry = (state.logs[date] || []).find(e => e.ex === exId);
    const before = exerciseHistory(exId).find(h => h.date < date) || null;
    const source = entry ? entry.sets : before ? before.sets : rec ? routineSets(ex, rec) : [{}];
    const prev = ui.exSheet || {};
    ui.sheetDate = null;
    ui.partSheet = null;
    ui.exSheet = {
      step: 'log', date, ex: exId, back, existing: Boolean(entry), last: before,
      sets: source.map(st => ({ ...st })), from: prev.from, filter: prev.filter, q: prev.q || '', routine: prev.routine,
      queue, qi,
    };
    renderExSheet();
    showSheet();
  }

  // 확인 in the picker: log the ticked exercises one after another.
  function startExerciseQueue() {
    const x = ui.exSheet;
    const queue = (x.selected || []).slice();
    if (!queue.length) return;
    x.selected = [];
    openExerciseLog(x.date, queue[0].id, 'pick', queue[0].rec, queue, 0);
  }

  function nextInQueue(x) {
    if (!x.queue || x.qi >= x.queue.length - 1) return false;
    const n = x.queue[x.qi + 1];
    openExerciseLog(x.date, n.id, 'pick', n.rec, x.queue, x.qi + 1);
    return true;
  }

  function openExerciseHistory(exId) {
    ui.sheetDate = null;
    ui.partSheet = null;
    ui.exSheet = { step: 'history', ex: exId };
    renderExSheet();
    showSheet();
  }

  function exChips() {
    const x = ui.exSheet;
    const today = dayParts(x.date);
    const chips = [];
    if (today.length) chips.push(['today', '오늘 부위']);
    chips.push(['all', '전체']);
    for (const p of state.parts) chips.push([p.id, p.name]);
    chips.push(['full', '전신']);
    return chips.map(([f, label]) => `<button class="pill" data-action="ex-filter" data-filter="${esc(f)}" aria-pressed="${x.filter === f}">${esc(label)}</button>`).join('');
  }

  function renderExList() {
    const x = ui.exSheet;
    const box = $('#ex-list');
    if (!x || !box) return;
    const q = x.q.trim().toLowerCase().replace(/\s+/g, '');
    let pool = allExercises();
    if (q) pool = pool.filter(e => e.name.toLowerCase().replace(/\s+/g, '').includes(q) || e.equip.replace(/\s+/g, '').includes(q));
    else if (x.filter === 'today') { const parts = dayParts(x.date); pool = pool.filter(e => parts.includes(e.part)); }
    else if (x.filter !== 'all') pool = pool.filter(e => e.part === x.filter);
    const recent = recentExerciseIds();
    const rank = e => { const i = recent.indexOf(e.id); return i < 0 ? 99 : i; };
    pool = pool.map((e, i) => ({ e, i })).sort((a, b) => rank(a.e) - rank(b.e) || a.i - b.i).map(o => o.e);
    const done = new Set((state.logs[x.date] || []).map(e => e.ex));
    x.selected = x.selected || [];
    const picked = new Set(x.selected.map(sel => sel.id));
    const checkMark = `<span class="ex-check" aria-hidden="true">${ICON.check}</span>`;
    // Browsing a part (or today's parts): one of its 10 routines on top, picked at random.
    let routine = '';
    if (!q && x.filter !== 'all') {
      const parts = x.filter === 'today' ? dayParts(x.date) : [x.filter];
      const shown = new Set();
      x.routine = x.routine || {};
      for (const pid of parts) {
        const list = ROUTINES[pid] || [];
        if (!list.length) continue;
        if (!(x.routine[pid] < list.length)) x.routine[pid] = Math.floor(Math.random() * list.length);
        const n = x.routine[pid];
        const items = list[n];
        const label = pid === 'full' ? '전신' : (partById(pid) || DEFAULT_PARTS.find(d => d.id === pid) || { name: '' }).name;
        routine += `<div class="ex-group rec-head">
            <span><b>${esc(label)}</b> 추천 루틴</span>
            ${list.length > 1 ? `<button class="rec-shuffle" data-action="ex-shuffle" data-part="${esc(pid)}">${ICON.refresh}<span>다른 루틴</span></button>` : ''}
          </div>` + items.map(({ id, sets, range }, i) => {
          const e = EXERCISE_MAP.get(id);
          shown.add(id);
          return `<button class="ex-row rec${picked.has(id) ? ' sel' : ''}" data-action="ex-toggle" data-ex="${esc(id)}" data-sets="${sets}" data-range="${esc(range)}" aria-pressed="${picked.has(id)}">
            <span class="ex-no d">${i + 1}</span>
            <span><b>${esc(e.name)}</b><small>${esc(routineText(e, { sets, range }))} · ${esc(e.equip)}</small></span>${done.has(id) ? '<i>기록함</i>' : ''}${checkMark}
          </button>`;
        }).join('');
      }
      if (routine) {
        pool = pool.filter(e => !shown.has(e.id));
        routine += '<p class="ex-group">전체 종목</p>';
      }
    }
    const rows = routine + pool.map(e => `
      <button class="ex-row${picked.has(e.id) ? ' sel' : ''}" data-action="ex-toggle" data-ex="${esc(e.id)}" aria-pressed="${picked.has(e.id)}">
        <span><b>${esc(e.name)}</b><small>${esc(e.equip)}${recent.includes(e.id) ? ' · 최근' : ''}</small></span>${done.has(e.id) ? '<i>기록함</i>' : ''}${checkMark}
      </button>`).join('');
    const typed = x.q.trim().slice(0, 30);
    const custom = typed && !pool.some(e => e.name === typed)
      ? `<button class="ex-row ex-custom" data-action="ex-custom"><span><b>'${esc(typed)}' 새 종목으로 추가</b><small>직접 추가</small></span>${ICON.plus}</button>` : '';
    box.innerHTML = rows + custom + (!rows && !custom ? '<p class="note">맞는 종목이 없어요. 검색해서 추가해 보세요</p>' : '');
    const bar = $('#ex-confirm');
    if (bar) {
      bar.hidden = !x.selected.length;
      bar.innerHTML = x.selected.length ? `<button class="photo-cta" data-action="ex-confirm"><span>${x.selected.length}개 선택 · 확인</span></button>` : '';
    }
  }

  function renderExSheet() {
    const x = ui.exSheet;
    if (!x) return;
    if (x.step === 'pick') {
      sheet.innerHTML = `
        <div class="handle" aria-hidden="true"></div>
        <div class="sheet-head">
          <div><p class="kicker">${md(x.date)}</p><h2 id="sheet-title">종목 고르기</h2></div>
          <button class="btn" data-action="ex-back">${x.from === 'day' ? '뒤로' : '닫기'}</button>
        </div>
        <div class="field ex-search"><input id="ex-search" type="search" value="${esc(x.q)}" placeholder="종목 검색" autocomplete="off" autocorrect="off" spellcheck="false" enterkeyhint="search" aria-label="종목 검색"></div>
        <div class="ex-chips" id="ex-chips">${exChips()}</div>
        <div class="ex-list" id="ex-list"></div>
        <div class="ex-confirm" id="ex-confirm" hidden></div>`;
      renderExList();
      return;
    }
    const ex = exById(x.ex);
    if (!ex) { closeSheet(); return; }
    if (x.step === 'history') {
      const h = exerciseHistory(ex.id);
      const best = bestSet(ex, h);
      const orm = oneRepMax(ex, best);
      sheet.innerHTML = `
        <div class="handle" aria-hidden="true"></div>
        <div class="sheet-head">
          <div><p class="kicker">${esc(ex.equip)}</p><h2 id="sheet-title">${esc(shortName(ex.name))}</h2></div>
          <button class="btn" data-action="close-sheet">닫기</button>
        </div>
        ${best ? `<div class="ex-best"><span class="kicker">Best</span><b class="d">${esc(setText(ex.kind, best))}</b>${orm ? `<small>예상 1RM ${orm}kg</small>` : ''}</div>` : ''}
        <div class="ex-history">${h.map(r => `
          <button class="log-row" data-action="ex-edit" data-ex="${esc(ex.id)}" data-date="${r.date}" data-from="history">
            <span><b>${fmtLong(parseKey(r.date))}</b><small>${esc(logSummary(ex, r.sets))}</small></span>${ICON.next}</button>`).join('') || '<p class="note">아직 기록이 없어요.</p>'}</div>`;
      return;
    }
    const fields = EX_KINDS[ex.kind];
    const more = Boolean(x.queue) && x.qi < x.queue.length - 1;
    const rows = x.sets.map((st, i) => `
      <div class="set-row">
        <span class="set-no d">${i + 1}</span>
        ${fields.map(([f, unit, mode, optional]) => `<label class="set-field"><input type="text" inputmode="${mode}" data-set="${i}" data-f="${f}" value="${st[f] === undefined ? '' : esc(st[f])}" placeholder="${optional ? '-' : '0'}" autocomplete="off" aria-label="${i + 1}세트 ${unit}"><span>${unit}</span></label>`).join('')}
        <button class="set-del" data-action="set-del" data-i="${i}" aria-label="${i + 1}세트 지우기">${ICON.close}</button>
      </div>`).join('');
    sheet.innerHTML = `
      <div class="handle" aria-hidden="true"></div>
      <div class="sheet-head">
        <div><p class="kicker">${md(x.date)} · ${esc(ex.equip)}${x.queue && x.queue.length > 1 ? ` · ${x.qi + 1}/${x.queue.length}` : ''}</p><h2 id="sheet-title">${esc(shortName(ex.name))}</h2></div>
        <button class="btn" data-action="ex-back">${x.back ? '뒤로' : '닫기'}</button>
      </div>
      ${x.last ? `<p class="ex-last">지난번 ${shortDay(x.last.date)} · ${esc(logSummary(ex, x.last.sets))}</p>` : ''}
      <div class="set-list">${rows}</div>
      <button class="btn set-add" data-action="set-add">${ICON.plus}<span>세트 추가</span></button>
      <button class="photo-cta" data-action="ex-save"><span>${more ? '저장하고 다음' : '저장'}</span></button>
      ${more ? '<button class="text-btn ex-skip" data-action="ex-skip">이 종목 건너뛰기</button>' : ''}
      ${x.existing ? '<button class="btn danger part-delete" data-action="ex-delete">이 종목 기록 삭제</button>' : ''}`;
  }

  function addCustomExercise() {
    const x = ui.exSheet;
    const name = (x.q || '').trim().slice(0, 30);
    if (!name) return;
    const parts = dayParts(x.date);
    // Under the part being browsed, or today's only part; otherwise 전신 (checks nothing).
    const part = x.filter !== 'all' && x.filter !== 'today' ? x.filter : parts.length === 1 ? parts[0] : 'full';
    const id = `u_${Date.now().toString(36)}`;
    state.customEx.push({ id, name, part, kind: 'wr' });
    save();
    x.selected = (x.selected || []).concat({ id, rec: null });
    x.q = '';
    const input = $('#ex-search');
    if (input) input.value = '';
    renderExList();
  }

  // Reads the editor's sets; a set counts when its required fields are filled.
  function editedSets(ex) {
    const fields = EX_KINDS[ex.kind];
    const out = [];
    for (const raw of ui.exSheet.sets) {
      const st = {};
      let ok = true;
      for (const [f, , , optional] of fields) {
        const v = parseFloat(String(raw[f] === undefined ? '' : raw[f]).replace(',', '.'));
        if (Number.isFinite(v) && v >= 0) st[f] = v;
        else if (!optional) ok = false;
      }
      const clean = ok && cleanSet(st);
      if (clean) out.push(clean);
    }
    return out;
  }

  function saveExercise() {
    const x = ui.exSheet;
    const ex = x && exById(x.ex);
    if (!ex) return;
    const sets = editedSets(ex);
    if (!sets.length) { toast('세트를 하나 이상 채워 주세요'); return; }
    const list = state.logs[x.date] || [];
    const i = list.findIndex(e => e.ex === x.ex);
    if (i >= 0) list[i] = { ex: x.ex, sets }; else list.push({ ex: x.ex, sets });
    state.logs[x.date] = list;
    save();
    // Logging an exercise also checks its part for that day.
    if (state.parts.some(p => p.id === ex.part) && !dayParts(x.date).includes(ex.part)) cheerToggle(x.date, ex.part);
    toast(`${shortName(ex.name)} 저장했어요`);
    if (!nextInQueue(x)) leaveExercise(x);
    renderCurrent();
  }

  function deleteExercise() {
    const x = ui.exSheet;
    const ex = x && exById(x.ex);
    if (!ex || !confirm(`${md(x.date)} ${shortName(ex.name)} 기록을 지울까요?`)) return;
    const rest = (state.logs[x.date] || []).filter(e => e.ex !== x.ex);
    if (rest.length) state.logs[x.date] = rest; else delete state.logs[x.date];
    save();
    toast('기록을 지웠어요');
    leaveExercise(x);
    renderCurrent();
  }

  // 삭제 from a swiped row: no editor open, so nothing to go back to.
  function deleteLog(date, exId) {
    const list = state.logs[date] || [];
    if (!list.some(e => e.ex === exId)) return;
    const rest = list.filter(e => e.ex !== exId);
    if (rest.length) state.logs[date] = rest; else delete state.logs[date];
    save();
    toast('기록을 지웠어요');
    renderCurrent();
  }

  // After saving or deleting, go back to where the editor was opened from.
  function leaveExercise(x) {
    if (x.back === 'history') openExerciseHistory(x.ex);
    else if (x.back === 'day' || x.from === 'day') openSheet(x.date);
    else closeSheet();
  }

  function exerciseBack() {
    const x = ui.exSheet;
    if (!x) return;
    if (x.step === 'log' && x.back === 'pick') {
      ui.exSheet = { step: 'pick', date: x.date, from: x.from, filter: x.filter || 'all', q: x.q || '', routine: x.routine, selected: x.queue ? x.queue.slice(x.qi) : [] };
      renderExSheet();
    } else if (x.step === 'log' && x.back === 'history') openExerciseHistory(x.ex);
    else if ((x.step === 'log' && x.back === 'day') || (x.step === 'pick' && x.from === 'day')) openSheet(x.date);
    else closeSheet();
  }

  // 기록 tab: every exercise logged, latest first, with its best set.
  function liftsSection() {
    const byEx = new Map();
    for (const [date, list] of Object.entries(state.logs)) {
      for (const e of list) {
        if (!byEx.has(e.ex)) byEx.set(e.ex, []);
        byEx.get(e.ex).push({ date, sets: e.sets });
      }
    }
    const rows = [...byEx.entries()]
      .map(([id, h]) => ({ ex: exById(id), h: h.sort((a, b) => (a.date < b.date ? 1 : -1)) }))
      .filter(r => r.ex)
      .sort((a, b) => (a.h[0].date < b.h[0].date ? 1 : -1));
    const body = rows.length ? rows.map(r => {
      const best = bestSet(r.ex, r.h);
      const orm = oneRepMax(r.ex, best);
      return `<button class="lift-row" data-action="ex-history" data-ex="${esc(r.ex.id)}">
          <span class="lift-name"><b>${esc(shortName(r.ex.name))}</b><small>${r.h.length}번 · 마지막 ${shortDay(r.h[0].date)}</small></span>
          <span class="lift-best"><b>${best ? esc(setText(r.ex.kind, best)) : ''}</b>${orm ? `<small>1RM ${orm}kg</small>` : ''}</span>
        </button>`;
    }).join('') : '<p class="note lift-empty">종목을 기록하면 여기 쌓여요</p>';
    return `<section class="block">
        <div class="section-head"><h2>종목별 기록</h2><span class="kicker">All time</span></div>
        ${body}
      </section>`;
  }

  // ---------- account & server ----------
  // An @handle + password account keeps the records and 오운완 photos on the server
  // (a Cloudflare Worker), so a new phone gets everything back on login. This device
  // keeps a session token in state.social (never written into a backup file).
  const LOCAL_API = ['localhost', '127.0.0.1'].includes(location.hostname);
  const API_BASE = LOCAL_API ? 'http://localhost:8787' : 'https://gymchek-api.savetoyou365.workers.dev';
  const HANDLE_RE = /^(?!\.)(?!.*\.$)[a-z0-9._]{3,20}$/;
  const PW_MIN = 6;

  const loggedIn = () => Boolean(state.social && state.social.token);

  async function api(path, { method = 'GET', body, form, raw, as } = {}) {
    const headers = {};
    if (loggedIn()) headers.Authorization = `Bearer ${state.social.token}`;
    let payload;
    if (form) payload = form;
    else if (raw) {
      headers['Content-Type'] = 'image/jpeg';
      payload = raw;
    } else if (body !== undefined) {
      headers['Content-Type'] = 'application/json';
      payload = JSON.stringify(body);
    }
    const sentToken = loggedIn() ? state.social.token : null;
    let res;
    try {
      res = await fetch(API_BASE + path, { method, headers, body: payload });
    } catch (e) {
      throw new Error('인터넷 연결을 확인해 주세요');
    }
    if (res.ok && as === 'blob') return res.blob();
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      if (res.status === 401 && sentToken && loggedIn() && state.social.token === sentToken) sessionEnded();
      const err = new Error(data.error || '잠시 후 다시 시도해 주세요');
      err.status = res.status;
      throw err;
    }
    return data;
  }

  // ---- cloud backup: records and day photos follow the account ----
  // Logged in, every change is sent to the server (private to the account) a moment
  // later, and opening the app pulls. A new phone gets everything back on login. If
  // this phone has unsent changes while another phone also saved, check-ins are merged.
  function cloudData() {
    return { records: state.records, parts: state.parts, weeklyGoal: state.weeklyGoal, photoFormat: state.photoFormat, logs: state.logs, customEx: state.customEx };
  }
  function cloudSig() { return JSON.stringify(cloudData()); }

  function noteCloudChange() {
    const sig = cloudSig();
    if (sig === cloud.sig) return;
    cloud.sig = sig;
    state.cloud.dirty = true;
    clearTimeout(cloud.timer);
    cloud.timer = setTimeout(cloudPush, 1500);
  }

  function resetCloud() {
    clearTimeout(cloud.timer);
    state.cloud = { syncedAt: 0, dirty: false };
    cloud.sig = cloudSig();
    cloud.lastPull = 0;
    cloud.photosKnown = false;
    cloud.photosOnServer = new Set();
    cloud.photoFails = new Set();
  }

  async function cloudPush() {
    clearTimeout(cloud.timer);
    if (!loggedIn() || !state.cloud.dirty) return true;
    if (cloud.pushing) { cloud.again = true; return cloud.pushing; }
    const sig = cloud.sig;
    let ok = false;
    cloud.pushing = (async () => {
      try {
        const { updatedAt } = await api('/api/backup', { method: 'PUT', body: { data: cloudData() } });
        state.cloud.syncedAt = updatedAt;
        if (cloud.sig === sig) state.cloud.dirty = false;
        save();
        ok = true;
      } catch (e) { /* stays dirty: retried on the next change or when the app opens */ }
    })();
    await cloud.pushing;
    cloud.pushing = null;
    if (cloud.again || (ok && state.cloud.dirty)) {
      cloud.again = false;
      cloud.timer = setTimeout(cloudPush, 1500);
    }
    updateCloudStatus();
    return ok;
  }

  // Replaces (or, with merge, unions) this phone's records with the server's.
  // Returns the server copy's signature, to tell whether we still differ from it.
  function applyCloudData(data, merge) {
    const incoming = normalize({ records: data.records, parts: data.parts, weeklyGoal: data.weeklyGoal, photoFormat: data.photoFormat, logs: data.logs, customEx: data.customEx });
    const serverSig = JSON.stringify({ records: incoming.records, parts: incoming.parts, weeklyGoal: incoming.weeklyGoal, photoFormat: incoming.photoFormat, logs: incoming.logs, customEx: incoming.customEx });
    // A backup from an older version has no exercise log; keep this phone's.
    const hasLogs = data.logs !== undefined;
    if (!merge) {
      state.records = incoming.records;
      state.parts = incoming.parts;
      state.weeklyGoal = incoming.weeklyGoal;
      state.photoFormat = incoming.photoFormat;
      if (hasLogs) {
        state.logs = incoming.logs;
        state.customEx = incoming.customEx;
      }
      return serverSig;
    }
    for (const e of incoming.customEx) if (!state.customEx.some(x => x.id === e.id)) state.customEx.push(e);
    for (const [k, list] of Object.entries(incoming.logs)) {
      const mine = state.logs[k] || [];
      state.logs[k] = mine.concat(list.filter(e => !mine.some(x => x.ex === e.ex)));
    }
    const parts = state.parts.slice();
    for (const p of incoming.parts) if (!parts.some(q => q.id === p.id)) parts.push(p);
    const order = parts.map(p => p.id);
    const records = {};
    for (const k of new Set([...Object.keys(state.records), ...Object.keys(incoming.records)])) {
      const set = new Set([...(state.records[k] || []), ...(incoming.records[k] || [])]);
      const arr = order.filter(id => set.has(id));
      if (arr.length) records[k] = arr;
    }
    state.parts = parts;
    state.records = records;
    return serverSig;
  }

  // Pull, settle differences, push, then even out photos. welcome: just logged in here.
  function cloudSync({ welcome = false } = {}) {
    if (!loggedIn()) return Promise.resolve(false);
    if (cloud.syncing) return cloud.syncing;
    cloud.syncing = (async () => {
      let r;
      try {
        r = await api('/api/backup');
      } catch (e) {
        return false;
      }
      cloud.lastPull = Date.now();
      const first = !state.cloud.syncedAt;
      if (!r.data) {
        state.cloud.dirty = true; // nothing on the server yet: send ours
      } else if (first || r.updatedAt > state.cloud.syncedAt) {
        const hadLocal = Object.keys(state.records).length > 0;
        const merge = first ? hadLocal : state.cloud.dirty;
        const before = Object.keys(state.records).length;
        let serverSig;
        try { serverSig = applyCloudData(r.data, merge); } catch (e) { serverSig = null; }
        if (serverSig !== null) {
          state.cloud.syncedAt = r.updatedAt;
          cloud.sig = cloudSig();
          state.cloud.dirty = cloud.sig !== serverSig;
          save();
          renderCurrent();
          const after = Object.keys(state.records).length;
          if (welcome && after > before) toast(`서버에 저장된 출석 기록 ${after}일을 가져왔어요`);
        }
      }
      const pushed = await cloudPush();
      await cloudSyncPhotos(r.photos || []);
      return pushed;
    })();
    const done = cloud.syncing;
    done.finally(() => { cloud.syncing = null; updateCloudStatus(); });
    return done;
  }

  async function cloudSyncPhotos(serverDates) {
    if (!('indexedDB' in window)) return;
    let local;
    try { local = await photoStore.keys(); } catch (e) { return; }
    const onServer = new Set(serverDates);
    cloud.photosOnServer = new Set(serverDates);
    cloud.photosKnown = true;
    for (const k of [...cloud.photoFails]) if (onServer.has(k) || !local.includes(k)) cloud.photoFails.delete(k);
    const here = new Set(local);
    const down = serverDates.filter(k => !here.has(k));
    const up = local.filter(k => !onServer.has(k));
    let got = 0;
    for (const [i, k] of down.entries()) {
      cloud.note = `사진 가져오는 중… ${i + 1}/${down.length}`;
      updateCloudStatus();
      if (down.length > 2) toast(cloud.note);
      try {
        await storeDayPhoto(k, await api(`/api/backup/photos/${k}`, { as: 'blob' }));
        got++;
      } catch (e) { /* try again next time */ }
    }
    for (const [i, k] of up.entries()) {
      cloud.note = `사진 올리는 중… ${i + 1}/${up.length}`;
      updateCloudStatus();
      await cloudPutPhoto(k);
    }
    cloud.note = '';
    updateCloudStatus();
    if (got) {
      renderCurrent();
      toast(`오운완 사진 ${got}장을 가져왔어요`);
    }
  }

  // Uploads one day's photo; remembers the outcome so Settings and the day sheet can say
  // whether the server has it (the next sync retries whatever's missing).
  async function cloudPutPhoto(key) {
    if (!loggedIn()) return false;
    let ok = false;
    try {
      const blob = await photoStore.full(key);
      if (!blob) return false;
      await api(`/api/backup/photos/${key}`, { method: 'PUT', raw: blob });
      ok = true;
    } catch (e) { /* noted below */ }
    if (ok) {
      cloud.photosOnServer.add(key);
      cloud.photoFails.delete(key);
    } else {
      cloud.photoFails.add(key);
    }
    updateCloudStatus();
    if (ui.sheetDate === key) renderSheet();
    return ok;
  }

  // What the day sheet says under a saved photo.
  function photoStatusHtml(key) {
    if (!loggedIn()) return '<p class="photo-status">이 폰에만 저장돼 있어요 · 로그인하면 서버에도 저장돼요</p>';
    if (cloud.photoFails.has(key)) {
      return '<p class="photo-status warn">서버에 못 올렸어요 <button class="link-btn" data-action="day-photo-retry">다시 올리기</button></p>';
    }
    if (cloud.photosOnServer.has(key)) return '<p class="photo-status ok">서버에도 저장됨</p>';
    return `<p class="photo-status">${cloud.photosKnown ? '서버에 올리는 중…' : '서버 저장 확인 중…'}</p>`;
  }

  async function retryDayPhoto() {
    const k = ui.sheetDate;
    if (!k) return;
    const ok = await cloudPutPhoto(k);
    toast(ok ? '서버에 올렸어요' : '이번에도 못 올렸어요. 인터넷 연결을 확인해 주세요');
  }

  function cloudStatusText() {
    if (cloud.note) return cloud.note;
    if (cloud.syncing || cloud.pushing) return '저장 중…';
    if (cloud.photoFails.size) return `사진 ${cloud.photoFails.size}장을 서버에 못 올렸어요 · 지금 저장으로 다시 시도`;
    if (state.cloud.dirty) return '저장 대기 중 · 인터넷이 연결되면 저장돼요';
    if (!state.cloud.syncedAt) return '아직 저장 전';
    const d = new Date(state.cloud.syncedAt);
    const when = keyOf(d) === keyOf(today()) ? `오늘 ${pad(d.getHours())}:${pad(d.getMinutes())}` : `${d.getMonth() + 1}/${d.getDate()} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
    return `기록·사진 자동 저장 · 마지막 ${when}`;
  }

  function updateCloudStatus() {
    const el = $('#cloud-status');
    if (el) el.textContent = cloudStatusText();
  }

  async function manualCloudSync() {
    if (!loggedIn()) return;
    const btn = $('[data-action="cloud-sync"]');
    if (btn) btn.disabled = true;
    updateCloudStatus();
    if (!state.cloud.dirty) state.cloud.dirty = true; // force a fresh upload of the records
    const ok = await cloudSync();
    if (btn) btn.disabled = false;
    if (!ok) toast('저장하지 못했어요. 인터넷 연결을 확인해 주세요');
    else if (cloud.photoFails.size) toast(`기록은 저장했어요. 사진 ${cloud.photoFails.size}장은 못 올렸어요`);
    else toast('서버에 저장했어요');
  }

  // ---- account ----
  // Logged out, Settings shows a small inline form; auth is null, 'login' or 'signup'.
  const account = { auth: null, busy: false, form: { handle: '', password: '' } };
  const fieldValue = sel => ($(sel) ? $(sel).value : '');

  function showLoggedOut(handle) {
    resetCrews();
    account.auth = 'login';
    account.form = { handle: handle || '', password: '' };
    ui.pwForm = false;
    ui.delForm = null;
    renderCurrent();
  }

  // The server no longer knows this device's token (logged out elsewhere, or an old backup).
  function sessionEnded() {
    const handle = state.social.handle;
    state.social = null;
    resetCloud();
    save();
    showLoggedOut(handle);
    toast('로그인이 풀렸어요. 설정에서 다시 로그인해 주세요');
  }

  // Sign up or log in with @handle + password. (The server still keeps a nickname
  // from the feed days; it's simply set to the handle.)
  async function submitAuth() {
    if (account.busy) return;
    const login = account.auth === 'login';
    account.form = { handle: fieldValue('#soc-handle'), password: fieldValue('#soc-password') };
    const handle = account.form.handle.trim().toLowerCase().replace(/^@/, '');
    const password = account.form.password;
    if (!HANDLE_RE.test(handle)) { toast(login ? '아이디를 확인해 주세요' : '아이디는 영문 소문자·숫자·.·_ 로 3~20자예요'); return; }
    if (login && !password) { toast('비밀번호를 입력해 주세요'); return; }
    if (!login && [...password].length < PW_MIN) { toast(`비밀번호는 ${PW_MIN}자 이상이에요`); return; }
    account.busy = true;
    renderCurrent();
    try {
      const { user, token } = login
        ? await api('/api/login', { method: 'POST', body: { handle, password } })
        : await api('/api/users', { method: 'POST', body: { handle, nickname: handle.slice(0, 12), password } });
      // Records left by a different account are swapped out, not merged into this one.
      const prev = state.owner;
      if (prev && prev.id !== user.id && hasLocalData()) {
        const ok = confirm(`이 폰에는 @${prev.handle} 기록이 있어요.\n@${user.handle}로 로그인하면 이 폰의 기록·사진이 @${user.handle} 것으로 바뀌어요.\n@${prev.handle} 기록은 서버에 그대로 있어요.`);
        if (!ok) {
          fetch(API_BASE + '/api/session', { method: 'DELETE', headers: { Authorization: `Bearer ${token}` } }).catch(() => { /* expires unused */ });
          account.busy = false;
          account.form.password = '';
          renderCurrent();
          return;
        }
        await clearLocalData();
      }
      state.owner = { id: user.id, handle: user.handle };
      state.social = { token, userId: user.id, handle: user.handle, nickname: user.nickname };
      resetCloud();
      save();
      account.auth = null;
      account.form = { handle: '', password: '' };
      account.busy = false;
      toast(login ? `@${user.handle}로 로그인했어요` : `@${user.handle} 아이디를 만들었어요`);
      resetCrews();
      renderCurrent();
      cloudSync({ welcome: login }); // brings records and photos back (login) or sends them up (sign-up)
      if (crew.pendingCode) joinCrew(crew.pendingCode);
      else if (ui.tab === 'crew') loadCrews();
    } catch (err) {
      account.busy = false;
      if (login) account.form.password = '';
      toast(err.message);
      renderCurrent();
    }
  }

  const hasLocalData = () => Object.keys(state.records).length > 0 || Object.keys(state.logs).length > 0 || photoThumbs.size > 0;

  // Clears this phone's records and photos (another account's, about to be replaced by
  // the one logging in; they stay in that account's server copy).
  async function clearLocalData() {
    const fresh = defaultState();
    state.records = fresh.records;
    state.parts = fresh.parts;
    state.weeklyGoal = fresh.weeklyGoal;
    state.logs = fresh.logs;
    state.customEx = fresh.customEx;
    if ('indexedDB' in window) {
      try {
        for (const k of await photoStore.keys()) {
          await photoStore.remove(k);
          setThumb(k, null);
        }
      } catch (e) { /* nothing saved */ }
    }
    clearSheetPhoto();
    save();
  }

  async function logOut() {
    if (!loggedIn()) return;
    const handle = state.social.handle;
    if (!confirm(`@${handle}에서 로그아웃할까요?\n기록과 사진은 이 폰에 남아요. 다른 아이디로 로그인하면 그 아이디 기록으로 바뀌어요.`)) return;
    // Everything should be on the server first: another login would replace this phone's copy.
    const saved = await cloudSync();
    if (!loggedIn()) return;
    if (!saved || cloud.photoFails.size) {
      const what = !saved ? '기록' : `사진 ${cloud.photoFails.size}장`;
      if (!confirm(`아직 서버에 못 올린 ${what}이 있어요.\n지금 로그아웃하고 다른 아이디로 로그인하면 이 폰에서 사라져요.\n그래도 로그아웃할까요?`)) return;
    }
    try { await api('/api/session', { method: 'DELETE' }); } catch (e) { /* the token is dropped here either way */ }
    if (state.social) {
      state.social = null;
      resetCloud();
      save();
      showLoggedOut(handle);
    }
    toast('로그아웃했어요');
  }

  async function changePassword() {
    const next = fieldValue('#pw-new');
    if ([...next].length < PW_MIN) { toast(`비밀번호는 ${PW_MIN}자 이상이에요`); return; }
    if (next !== fieldValue('#pw-again')) { toast('두 비밀번호가 달라요'); return; }
    const btn = $('#pw-save');
    if (btn) btn.disabled = true;
    try {
      const r = await api('/api/me/password', { method: 'PUT', body: { password: next } });
      ui.pwForm = false;
      renderCurrent();
      toast(r.endedSessions ? '비밀번호를 바꿨어요 · 다른 기기는 로그아웃됐어요' : '비밀번호를 바꿨어요');
    } catch (err) {
      if (btn) btn.disabled = false;
      toast(err.message);
    }
  }

  async function endOtherSessions() {
    if (!confirm('이 폰만 남기고 다른 기기에서 모두 로그아웃할까요?')) return;
    try {
      const r = await api('/api/sessions/others', { method: 'DELETE' });
      toast(r.endedSessions ? '다른 기기에서 모두 로그아웃했어요' : '로그인된 다른 기기가 없어요');
    } catch (e) {
      toast(e.message);
    }
  }

  // Delete account: asks for the password (or the @handle typed out, for an account
  // made with Apple/Kakao that never set one). This phone's records stay, as nobody's.
  async function openDeleteForm() {
    ui.delForm = { passwordSet: null, busy: false };
    renderCurrent();
    let passwordSet = true;
    try { passwordSet = (await api('/api/me')).passwordSet !== false; } catch (e) { /* ask for the password */ }
    if (!ui.delForm) return;
    ui.delForm.passwordSet = passwordSet;
    renderCurrent();
    const input = $(passwordSet ? '#del-password' : '#del-confirm');
    if (input) input.focus();
  }

  function deleteFormHtml() {
    const f = ui.delForm;
    const field = f.passwordSet === null ? '<p class="note form-note">확인 중…</p>' : f.passwordSet
      ? `<input class="sr-only" type="text" name="username" autocomplete="username" value="${esc(state.social.handle)}" tabindex="-1" aria-hidden="true">
         <input id="del-password" type="password" maxlength="64" placeholder="비밀번호" autocomplete="current-password" enterkeyhint="done" aria-label="비밀번호">`
      : `<input id="del-confirm" type="text" maxlength="21" placeholder="확인용으로 @${esc(state.social.handle)} 입력" autocapitalize="none" autocorrect="off" spellcheck="false" autocomplete="off" enterkeyhint="done" aria-label="아이디 확인">`;
    return `<form class="pw-form" data-form="account-delete" novalidate>
        <p class="auth-title">계정 삭제</p>
        <p class="note form-note">서버에 있는 기록·사진·크루 인증·댓글이 모두 지워지고 되돌릴 수 없어요. 이 폰의 기록은 남아요.</p>
        ${field}
        <div class="pw-actions">
          <button type="button" class="btn" data-action="delete-cancel">취소</button>
          <button type="submit" class="btn danger"${f.busy || f.passwordSet === null ? ' disabled' : ''}>${f.busy ? '지우는 중…' : '계정 삭제'}</button>
        </div>
      </form>`;
  }

  async function deleteAccount() {
    const f = ui.delForm;
    if (!f || f.busy || f.passwordSet === null || !loggedIn()) return;
    const body = f.passwordSet ? { password: fieldValue('#del-password') } : { confirm: fieldValue('#del-confirm') };
    if (f.passwordSet ? !body.password : !body.confirm.trim()) {
      toast(f.passwordSet ? '비밀번호를 입력해 주세요' : '아이디를 입력해 주세요');
      return;
    }
    const handle = state.social.handle;
    if (!confirm(`@${handle} 계정을 지울까요?\n되돌릴 수 없어요.`)) return;
    f.busy = true;
    renderCurrent();
    try {
      await api('/api/me', { method: 'DELETE', body });
    } catch (e) {
      f.busy = false;
      renderCurrent();
      toast(e.message);
      return;
    }
    state.social = null;
    state.owner = null;
    resetCloud();
    save();
    ui.delForm = null;
    resetCrews();
    account.auth = null;
    ui.pwForm = false;
    renderCurrent();
    toast(`@${handle} 계정을 지웠어요`);
  }

  function authFormHtml() {
    const login = account.auth === 'login';
    const f = account.form;
    const label = account.busy ? (login ? '확인 중…' : '만드는 중…') : (login ? '로그인' : '만들기');
    return `<form class="pw-form auth-form" data-form="soc-auth" novalidate>
        <p class="auth-title">${login ? '로그인' : '아이디 만들기'}</p>
        <div class="field handle-field"><span>@</span><input id="soc-handle" name="username" type="text" maxlength="20" value="${esc(f.handle)}" placeholder="${login ? '아이디' : '아이디 (영문·숫자 3~20자)'}" autocapitalize="none" autocomplete="username" autocorrect="off" spellcheck="false" enterkeyhint="next" aria-label="아이디"></div>
        <input id="soc-password" name="password" type="password" maxlength="64" value="${esc(f.password)}" placeholder="${login ? '비밀번호' : `비밀번호 (${PW_MIN}자 이상)`}" autocomplete="${login ? 'current-password' : 'new-password'}" enterkeyhint="go" aria-label="비밀번호">
        ${login ? '' : '<p class="note">비밀번호는 찾을 수 없어요. 꼭 저장해 두세요</p>'}
        <div class="pw-actions">
          <button type="button" class="btn" data-action="auth-cancel">취소</button>
          <button type="submit" class="btn primary"${account.busy ? ' disabled' : ''}>${label}</button>
        </div>
        <p class="auth-switch">${login ? '처음이에요?' : '이미 아이디가 있어요?'}<button type="button" class="link-btn" data-action="auth-open" data-mode="${login ? 'signup' : 'login'}">${login ? '아이디 만들기' : '로그인'}</button></p>
      </form>`;
  }

  // ---- crews ----
  // Invite-only groups (up to 8) racing on how many days this week each member proved
  // with that day's 오운완 photo. list: my crews (null until loaded); board: the
  // selected crew's week; viewer: the proof photo open full screen.
  const CREW_PICK_KEY = 'gymcheck:crew';
  const crew = { list: null, current: null, board: null, error: '', busy: false, stale: true, manage: false, pendingCode: null, viewer: null };
  const partNames = key => dayParts(key).map(id => partById(id)).filter(Boolean).map(p => p.name);
  const shortDay = key => `${Number(key.slice(5, 7))}.${Number(key.slice(8, 10))}`;

  function weekRange() {
    const mon = startOfWeek(today());
    return { from: keyOf(mon), to: keyOf(addDays(mon, 6)), lastFrom: keyOf(addDays(mon, -7)), lastTo: keyOf(addDays(mon, -1)) };
  }

  function resetCrews() {
    Object.assign(crew, { list: null, current: null, board: null, error: '', stale: true, manage: false, viewer: null });
    clearAuthImages();
  }

  // Proof photos need a login in a shared crew (the server checks each time), so they're
  // fetched with the token and shown from memory; a copied link alone opens nothing.
  const authImages = new Map(); // '/img/key' → object URL, or the pending load
  function authImg(path, attrs = '') {
    const url = authImages.get(path);
    return `<img${typeof url === 'string' ? ` src="${esc(url)}"` : ''} data-auth-src="${esc(path)}" ${attrs}>`;
  }
  function loadAuthImage(path) {
    const have = authImages.get(path);
    if (typeof have === 'string') return Promise.resolve(have);
    if (have) return have;
    const pending = api(path, { as: 'blob' }).then(blob => {
      const url = URL.createObjectURL(blob);
      authImages.set(path, url);
      if (authImages.size > 60) { // keep the latest 60
        const [oldKey, oldUrl] = authImages.entries().next().value;
        if (typeof oldUrl === 'string') URL.revokeObjectURL(oldUrl);
        authImages.delete(oldKey);
      }
      return url;
    }, () => { authImages.delete(path); return null; });
    authImages.set(path, pending);
    return pending;
  }
  function hydrateAuthImages(root) {
    for (const img of root.querySelectorAll('img[data-auth-src]')) {
      if (img.getAttribute('src')) continue;
      loadAuthImage(img.dataset.authSrc).then(url => { if (url && img.isConnected && !img.getAttribute('src')) img.src = url; });
    }
  }
  function clearAuthImages() {
    for (const v of authImages.values()) if (typeof v === 'string') URL.revokeObjectURL(v);
    authImages.clear();
  }

  const renderCrewIfShown = () => { if (ui.tab === 'crew') renderCrew(); };

  // Weeks this account came first in a crew; the server keeps the count.
  function noteWins(n) {
    if (!state.social || !Number.isInteger(n)) return;
    const was = state.social.crewWins || 0;
    if (n === was) return;
    const before = earnedBadges();
    state.social.crewWins = n;
    save();
    if (n > was) {
      const fresh = newBadges(before);
      if (fresh.length) openCheer(false, fresh);
      else toast('지난주 크루 1등이에요 🏆');
    }
  }

  async function loadCrews({ quiet = false } = {}) {
    if (!loggedIn()) return;
    if (!quiet) { crew.error = ''; renderCrewIfShown(); }
    try {
      const r = await api('/api/crews');
      crew.list = r.crews;
      crew.error = '';
      noteWins(r.wins);
      let saved = null;
      try { saved = localStorage.getItem(CREW_PICK_KEY); } catch (e) { /* no saved pick */ }
      if (!crew.list.some(c => c.id === crew.current)) {
        crew.current = (crew.list.find(c => c.id === saved) || crew.list[0] || {}).id || null;
        crew.board = null;
      }
    } catch (e) {
      crew.error = e.message;
    }
    if (crew.current) await loadBoard();
    else renderCrewIfShown();
  }

  async function loadBoard() {
    const id = crew.current;
    if (!id) return;
    const w = weekRange();
    try {
      const r = await api(`/api/crews/${id}?from=${w.from}&to=${w.to}&lastFrom=${w.lastFrom}&lastTo=${w.lastTo}`);
      if (crew.current !== id) return;
      crew.board = r;
      crew.stale = false;
      crew.error = '';
      noteWins(r.wins);
    } catch (e) {
      if (e.status === 404 && crew.list) { // left or removed meanwhile
        crew.list = crew.list.filter(c => c.id !== id);
        crew.current = (crew.list[0] || {}).id || null;
        crew.board = null;
        if (crew.current) return loadBoard();
      } else crew.error = e.message;
    }
    renderCrewIfShown();
    if (crew.viewer) renderViewer();
  }

  function pickCrew(id) {
    crew.current = id;
    crew.board = null;
    try { localStorage.setItem(CREW_PICK_KEY, id); } catch (e) { /* picks the first next time */ }
    renderCrewIfShown();
    loadBoard();
  }

  async function createCrew() {
    const input = $('#crew-name');
    const name = input ? input.value.trim() : '';
    if (!name) { if (input) input.focus(); toast('크루 이름을 정해 주세요'); return; }
    if (crew.busy) return;
    crew.busy = true;
    try {
      const { crew: c } = await api('/api/crews', { method: 'POST', body: { name } });
      crew.manage = false;
      crew.list = (crew.list || []).concat(c);
      toast(`'${c.name}' 크루를 만들었어요. 친구를 초대해 보세요`);
      pickCrew(c.id);
    } catch (e) {
      toast(e.message);
    }
    crew.busy = false;
  }

  async function joinCrew(raw) {
    const code = String(raw || '').toUpperCase().replace(/[^A-Z0-9]/g, '');
    crew.pendingCode = null;
    if (code.length !== 6) { toast('초대 코드는 6자리예요'); return; }
    if (crew.busy) return;
    crew.busy = true;
    try {
      const r = await api('/api/crews/join', { method: 'POST', body: { code } });
      crew.manage = false;
      if (!(crew.list || []).some(c => c.id === r.crew.id)) crew.list = (crew.list || []).concat(r.crew);
      toast(r.already ? `이미 '${r.crew.name}' 크루에 있어요` : `'${r.crew.name}' 크루에 들어왔어요`);
      pickCrew(r.crew.id);
    } catch (e) {
      toast(e.message);
    }
    crew.busy = false;
  }

  async function leaveCrew() {
    const c = crew.board && crew.board.crew;
    if (!c || !confirm(`'${c.name}' 크루에서 나갈까요?`)) return;
    try {
      await api(`/api/crews/${c.id}/me`, { method: 'DELETE' });
      crew.list = (crew.list || []).filter(x => x.id !== c.id);
      crew.current = null;
      crew.board = null;
      toast('크루에서 나왔어요');
      loadCrews();
    } catch (e) {
      toast(e.message);
    }
  }

  function shareInvite() {
    const c = crew.board && crew.board.crew;
    if (!c) return;
    const link = `${location.origin}${location.pathname}?crew=${c.code}`;
    const text = `짐첵 '${c.name}' 크루에서 같이 오운완 인증해요! 초대 코드 ${c.code}\n${link}`;
    if (navigator.share) navigator.share({ text }).catch(() => {});
    else if (navigator.clipboard) navigator.clipboard.writeText(text).then(() => toast('초대 링크를 복사했어요'), () => toast(link));
    else toast(link);
  }

  async function myCrewCount() {
    if (crew.list === null) await loadCrews({ quiet: true });
    return (crew.list || []).length;
  }

  // Sends today's saved 오운완 as the proof. 'ok', 'old' (not taken today), an error
  // message, or null when there's no crew to prove to.
  async function sendProof(key, blob, taken) {
    if (!(await myCrewCount())) return null;
    if (taken !== key) return 'old';
    try {
      const form = new FormData();
      form.append('parts', JSON.stringify(partNames(key)));
      form.append('image', new File([await proofJpeg(blob)], `${key}.jpg`, { type: 'image/jpeg' }));
      await api(`/api/proofs/${key}`, { method: 'PUT', form });
      crew.stale = true;
      if (ui.tab === 'crew') loadBoard();
      return 'ok';
    } catch (e) {
      return e.message;
    }
  }

  async function proofJpeg(blob) {
    const img = await loadImage(blob);
    const k = Math.min(1, 1440 / Math.max(img.width, img.height));
    const c = document.createElement('canvas');
    c.width = Math.round(img.width * k);
    c.height = Math.round(img.height * k);
    c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
    if (img.close) img.close();
    return new Promise((resolve, reject) => c.toBlob(b => (b ? resolve(b) : reject(new Error('jpeg'))), 'image/jpeg', 0.85));
  }

  const proofOf = (userId, date) => (crew.board ? crew.board.proofs.find(p => p.userId === userId && p.date === date) : null);

  async function cheerProof(userId, date) {
    const p = proofOf(userId, date);
    if (!p) return;
    const next = !p.fired;
    p.fired = next;
    p.fires += next ? 1 : -1;
    renderCrewIfShown();
    if (crew.viewer) renderViewer();
    if (next && navigator.vibrate) navigator.vibrate(8);
    try {
      const r = await api(`/api/proofs/${userId}/${date}/cheer`, { method: 'POST' });
      p.fired = r.fired;
      p.fires = r.fires;
    } catch (e) {
      p.fired = !next;
      p.fires += next ? -1 : 1;
      toast(e.message);
    }
    renderCrewIfShown();
    if (crew.viewer) renderViewer();
  }

  // ---- proof photo, full screen ----
  const viewerEl = $('#viewer');
  function openViewer(userId, date) {
    crew.viewer = { userId, date, comments: null, draft: '', sending: false };
    renderViewer();
    viewerEl.hidden = false;
    void viewerEl.offsetHeight;
    viewerEl.classList.add('open');
    loadComments();
  }

  async function loadComments() {
    const v = crew.viewer;
    if (!v) return;
    try {
      const r = await api(`/api/proofs/${v.userId}/${v.date}/comments`);
      if (crew.viewer !== v) return;
      v.comments = r.comments;
      const p = proofOf(v.userId, v.date);
      if (p) p.comments = r.comments.length;
    } catch (e) {
      if (crew.viewer === v) v.comments = [];
    }
    renderViewer();
  }

  async function sendComment() {
    const v = crew.viewer;
    const body = (v && v.draft || '').trim();
    if (!v || !body || v.sending) return;
    v.sending = true;
    renderViewer();
    try {
      const { comment } = await api(`/api/proofs/${v.userId}/${v.date}/comments`, { method: 'POST', body: { body } });
      v.comments = (v.comments || []).concat(comment);
      v.draft = '';
      const p = proofOf(v.userId, v.date);
      if (p) p.comments = v.comments.length;
      renderCrewIfShown();
    } catch (e) {
      toast(e.message);
    }
    v.sending = false;
    renderViewer();
    const list = viewerEl.querySelector('.viewer-scroll');
    if (list) list.scrollTop = list.scrollHeight;
  }

  async function deleteComment(id, swiped = false) {
    const v = crew.viewer;
    if (!v || (!swiped && !confirm('이 댓글을 지울까요?'))) return;
    try {
      await api(`/api/comments/${id}`, { method: 'DELETE' });
      v.comments = (v.comments || []).filter(c => c.id !== id);
      const p = proofOf(v.userId, v.date);
      if (p) p.comments = v.comments.length;
      renderCrewIfShown();
      renderViewer();
    } catch (e) {
      toast(e.message);
    }
  }

  const commentTime = ms => { const d = new Date(ms); return `${d.getHours()}:${pad(d.getMinutes())}`; };

  function renderViewer() {
    const v = crew.viewer;
    const p = v && proofOf(v.userId, v.date);
    const m = p && crew.board.members.find(x => x.id === v.userId);
    if (!p || !m) { closeViewer(); return; }
    const comments = v.comments === null ? '<p class="note">댓글 불러오는 중…</p>'
      : v.comments.length ? v.comments.map(c => {
        const row = `<div class="comment${c.canDelete ? ' swipe-front' : ''}">
          <b>@${esc(c.from.handle)}</b><span>${esc(c.body)}</span>
          <small>${commentTime(c.createdAt)}${c.canDelete ? `<button class="link-btn" data-action="comment-delete" data-id="${esc(c.id)}"> · 삭제</button>` : ''}</small>
        </div>`;
        // Mine, or on my proof: swipe left to delete (the small link stays for mouse users).
        return c.canDelete ? `<div class="swipe comment-swipe">
          <div class="swipe-actions"><button class="swipe-btn danger" data-action="comment-delete" data-id="${esc(c.id)}" data-swiped="1">${ICON.trash}<span>삭제</span></button></div>
          ${row}</div>` : row;
      }).join('') : '<p class="note">첫 댓글을 남겨 보세요</p>';
    viewerEl.innerHTML = `
      <div class="viewer-top">
        <span class="viewer-who"><b>@${esc(m.handle)}</b><small>${shortDay(p.date)} · ${esc(p.parts.join('·') || '오운완')}</small></span>
        <button class="icon-btn" data-action="viewer-close" aria-label="닫기">${ICON.close}</button>
      </div>
      <div class="viewer-scroll">
        <div class="viewer-stage">${authImg(p.image, `alt="@${esc(m.handle)}의 오운완"`)}</div>
        <div class="viewer-actions">${m.isMe
          ? `<span class="fire mine">🔥 <span>${p.fires}</span></span>`
          : `<button class="fire${p.fired ? ' on' : ''}" data-action="crew-fire" data-user="${esc(p.userId)}" data-date="${p.date}" aria-pressed="${p.fired}">🔥 <span>${p.fires}</span></button>`}
          <span class="comment-count">댓글 ${p.comments || 0}</span>
        </div>
        <div class="comments">${comments}</div>
      </div>
      <form class="comment-bar" data-form="comment" novalidate>
        <input id="comment-input" type="text" maxlength="200" value="${esc(v.draft)}" placeholder="댓글 달기" autocomplete="off" enterkeyhint="send" aria-label="댓글">
        <button class="btn primary" type="submit"${v.sending ? ' disabled' : ''}>보내기</button>
      </form>`;
    hydrateAuthImages(viewerEl);
  }
  function closeViewer() {
    if (viewerEl.hidden) return;
    crew.viewer = null;
    viewerEl.classList.remove('open');
    setTimeout(() => { if (!crew.viewer) { viewerEl.hidden = true; viewerEl.innerHTML = ''; } }, 220);
  }

  function crewFormsHtml() {
    return `
      <div class="section-head"><h2>크루 만들기</h2><span class="kicker">New</span></div>
      <form class="group crew-form" data-form="crew-create" novalidate>
        <div class="field"><input id="crew-name" type="text" maxlength="12" placeholder="크루 이름 (예: 아침반)" enterkeyhint="done" autocomplete="off" aria-label="크루 이름"><button class="btn primary" type="submit">만들기</button></div>
      </form>
      <div class="section-head"><h2>초대 코드로 들어가기</h2><span class="kicker">Join</span></div>
      <form class="group crew-form" data-form="crew-join" novalidate>
        <div class="field"><input id="crew-code" type="text" maxlength="6" placeholder="6자리 코드" autocapitalize="characters" autocorrect="off" spellcheck="false" enterkeyhint="go" autocomplete="off" aria-label="초대 코드"><button class="btn" type="submit">들어가기</button></div>
      </form>`;
  }

  function renderCrew() {
    const el = views.crew;
    const head = (title, kicker = 'Crew', nav = '') => `<header class="head"><div><p class="kicker">${kicker}</p><h1>${title}</h1></div>${nav}</header>`;
    const intro = `<div class="crew-intro">친구끼리 이번 주 <b>오운완 인증</b> 횟수로 겨뤄요</div>`;

    if (!loggedIn()) {
      el.innerHTML = `${head('크루')}${intro}
        <div class="group">${account.auth ? authFormHtml() : `
          <div class="row"><span class="row-label">로그인하고 시작해요</span></div>
          <div class="auth-buttons">
            <button class="btn" data-action="auth-open" data-mode="login">로그인</button>
            <button class="btn primary" data-action="auth-open" data-mode="signup">아이디 만들기</button>
          </div>`}</div>
        ${crew.pendingCode ? `<p class="note">로그인하면 바로 크루에 들어가요</p>` : ''}`;
      return;
    }
    if (crew.list === null) {
      el.innerHTML = head('크루') + (crew.error
        ? `<p class="crew-empty">${esc(crew.error)}<br><button class="btn" data-action="crew-retry">다시 시도</button></p>`
        : '<p class="crew-empty">불러오는 중…</p>');
      return;
    }
    if (!crew.list.length || crew.manage) {
      el.innerHTML = `${head(crew.list.length ? '크루 추가' : '크루')}${crew.list.length ? '' : intro}${crewFormsHtml()}
        ${crew.list.length ? '<button class="btn more-btn" data-action="crew-add-cancel">돌아가기</button>' : ''}`;
      return;
    }

    const listed = crew.list.find(c => c.id === crew.current) || crew.list[0];
    const chips = crew.list.length > 1 ? `<div class="crew-chips">${crew.list.map(c =>
      `<button class="pill" data-action="crew-pick" data-id="${esc(c.id)}" aria-pressed="${c.id === crew.current}">${esc(c.name)}</button>`).join('')}</div>` : '';
    const b = crew.board && crew.board.crew.id === crew.current ? crew.board : null;
    const invite = '<div class="nav"><button class="pill" data-action="crew-invite">초대</button></div>';
    if (!b) {
      el.innerHTML = head(esc(listed.name), 'Crew', invite) + chips + (crew.error
        ? `<p class="crew-empty">${esc(crew.error)}<br><button class="btn" data-action="crew-retry">다시 시도</button></p>`
        : '<p class="crew-empty">불러오는 중…</p>');
      return;
    }

    const w = weekRange();
    const days = Array.from({ length: 7 }, (_, i) => keyOf(addDays(parseKey(w.from), i)));
    const tk = keyOf(today());
    const byUser = {};
    for (const pr of b.proofs) (byUser[pr.userId] = byUser[pr.userId] || {})[pr.date] = pr;
    const rows = b.members.map(m => ({ ...m, count: Object.keys(byUser[m.id] || {}).length, now: (byUser[m.id] || {})[tk] || null }))
      .sort((x, y) => y.count - x.count || (y.isMe - x.isMe));
    let rank = 0;
    rows.forEach((r, i) => { if (i === 0 || r.count !== rows[i - 1].count) rank = i + 1; r.rank = rank; });
    const best = rows.length ? rows[0].count : 0;
    const board = rows.map(r => `
      <div class="crew-row${r.isMe ? ' me' : ''}${best && r.count === best ? ' lead' : ''}">
        <span class="crew-rank d">${r.rank}</span>
        <span class="crew-name">@${esc(r.handle)}${r.isMe ? '<small>나</small>' : ''}</span>
        <span class="crew-dots" aria-hidden="true">${days.map(k => `<i class="${byUser[r.id] && byUser[r.id][k] ? 'on' : k === tk ? 'today' : k > tk ? 'future' : ''}"></i>`).join('')}</span>
        <span class="crew-count"><b class="d">${r.count}</b>일</span>
      </div>`).join('');
    const proven = rows.filter(r => r.now);
    const strip = proven.length ? `<div class="proof-strip">${proven.map(r => `
      <button class="proof" data-action="crew-view" data-user="${esc(r.id)}" data-date="${tk}" aria-label="@${esc(r.handle)} 오늘 오운완 보기">
        ${authImg(r.now.image, 'alt="" decoding="async"')}
        <span class="proof-who">@${esc(r.handle)}</span>
        <span class="proof-fire${r.now.fired ? ' on' : ''}">🔥 ${r.now.fires}${r.now.comments ? ` 💬 ${r.now.comments}` : ''}</span>
      </button>`).join('')}</div>` : '<p class="note crew-none">아직 아무도 없어요</p>';
    const me = rows.find(r => r.isMe);
    const cta = me && me.now ? '' : `<button class="photo-cta" data-action="crew-shoot">${ICON.camera}<span>${attended(tk) ? '오운완 찍고 인증하기' : '운동 체크하고 오운완으로 인증하기'}</span></button>`;
    const last = b.lastWeek && b.lastWeek.winners.length
      ? `<p class="crew-last">🏆 지난주 1등 <b>${b.lastWeek.winners.map(h => `@${esc(h)}`).join(', ')}</b> · ${b.lastWeek.best}일</p>` : '';
    const alone = b.members.length < 2 ? '<div class="crew-intro">아직 혼자예요. <b>초대</b>로 친구를 불러보세요</div>' : '';

    el.innerHTML = `
      ${head(esc(b.crew.name), `Crew · ${b.crew.members}명`, invite)}
      ${chips}
      ${alone}
      <div class="section-head"><h2>이번 주 순위</h2><span class="kicker">${shortDay(w.from)} – ${shortDay(w.to)}</span></div>
      <div class="crew-board">${board}</div>
      ${last}
      <div class="section-head"><h2>오늘 인증 <span class="count">${proven.length}</span></h2><span class="kicker">Today</span></div>
      ${strip}
      ${cta}
      <p class="note">오운완을 저장하면 자동 인증돼요 · 놓친 날도 그날 찍은 사진이면 돼요<br>인증 사진은 나와 같은 크루에 있는 사람만 볼 수 있어요</p>
      <div class="group crew-manage">
        <div class="row"><span class="row-label">초대 코드</span><b class="code d">${esc(b.crew.code)}</b></div>
        <div class="row"><span class="row-label">다른 크루 만들기·들어가기</span><button class="btn" data-action="crew-add">추가</button></div>
        <div class="row"><span class="row-label">이 크루에서 나가기</span><button class="text-btn danger" data-action="crew-leave">나가기</button></div>
      </div>`;
    hydrateAuthImages(el);
  }

  // ---------- rendering ----------
  const views = {
    today: $('#view-today'),
    calendar: $('#view-calendar'),
    stats: $('#view-stats'),
    crew: $('#view-crew'),
    settings: $('#view-settings'),
  };

  function tile(p, on, sub, action) {
    const pop = ui.popId === p.id && on ? ' pop' : '';
    return `<button class="tile${pop}" data-action="${action}" data-id="${esc(p.id)}" aria-pressed="${on}" style="--c:${p.color}">
      <span class="tile-tag">${PART_EN[p.id] || ''}</span>
      <span class="tile-name">${esc(p.name)}</span>
      <span class="tile-foot">${sub}<span class="tile-check" aria-hidden="true">${ICON.check}</span></span>
    </button>`;
  }

  function backupBanner() {
    if (loggedIn()) return ''; // the account already backs everything up
    const n = Object.keys(state.records).length;
    if (n < 7) return '';
    const since = state.lastBackup ? daysBetween(new Date(state.lastBackup), new Date()) : Infinity;
    if (since < 30) return '';
    const text = state.lastBackup ? `백업한 지 ${since}일 지났어요` : `기록 ${n}일 쌓임. 백업해 둘까요?`;
    return `<div class="banner"><span>${text}</span><button class="btn small primary" data-action="export">백업</button></div>`;
  }

  function renderToday() {
    const t = today();
    const tk = keyOf(t);
    const done = new Set(dayParts(tk));
    const last = lastDoneMap(tk);
    const st = streak(t);
    const wk = weekCount(t);
    const goal = state.weeklyGoal;
    const y = t.getFullYear();
    const yDays = yearStats(y).days;
    const met = wk >= goal;

    const doneNames = state.parts.filter(p => done.has(p.id)).map(p => p.name);
    let title = '오늘 어디 털었어요?';
    if (doneNames.length > 3) title = `오늘 ${doneNames.length}부위 완료`;
    else if (doneNames.length) title = `${esc(doneNames.join('·'))} 완료`;

    const ws = startOfWeek(t);
    const week = Array.from({ length: 7 }, (_, i) => {
      const d = addDays(ws, i);
      const k = keyOf(d);
      const on = attended(k);
      const ph = photoThumbs.get(k);
      const cls = ['wk', on && 'on', k === tk && 'today', d > t && 'future', ph && 'photo'].filter(Boolean).join(' ');
      return `<button class="${cls}" data-action="open-day" data-key="${k}"${d > t ? ' disabled' : ''}${ph ? ` style="--ph:url('${ph}')"` : ''} aria-label="${d.getMonth() + 1}월 ${d.getDate()}일${on ? ', 운동함' : ''}${ph ? ', 사진 있음' : ''}">
        <span class="wk-label">${WEEKDAYS[d.getDay()]}</span><span class="wk-dot">${ph ? '' : on ? ICON.check : d.getDate()}</span></button>`;
    }).join('');

    const tiles = state.parts.map(p => {
      const on = done.has(p.id);
      let label;
      let stale = false;
      if (on) label = '오늘 완료';
      else if (!last[p.id]) label = '기록 없음';
      else {
        const n = daysBetween(parseKey(last[p.id]), t);
        label = n === 1 ? '어제 함' : `${n}일 전`;
        stale = n >= STALE_DAYS;
      }
      return tile(p, on, `<span class="tile-sub${stale ? ' stale' : ''}">${label}</span>`, 'toggle-today');
    }).join('');

    views.today.innerHTML = `
      <header class="head">
        <div>
          <p class="kicker">Today · ${fmtKicker(t)}</p>
          <h1>${title}</h1>
        </div>
      </header>

      ${hasUpdate()
        ? `<div class="banner update"><span>새 버전 v${esc(ui.latestVersion)}이 나왔어요</span><button class="btn small primary" data-action="apply-update">업데이트</button></div>`
        : needsReinstall()
          ? '<div class="banner update"><span>아이콘을 다시 추가하면 화면이 꽉 차요</span><button class="btn small primary" data-action="show-fit">방법</button></div>'
          : ''}

      <section class="hero">
        <div class="hero-top">
          <div>
            <p class="kicker">Streak</p>
            <div class="streak${st ? '' : ' zero'}"><span class="d">${st}</span><span class="streak-unit">일 연속</span></div>
          </div>
          <div class="season">
            <p class="kicker">${y} Season</p>
            <span class="d">${yDays}<small>/${daysInYear(y)}</small></span>
          </div>
        </div>
        <div class="week-head">
          <span>이번 주</span>
          <span class="${met ? 'met' : ''}"><b>${wk}</b> / ${goal}회${met ? ' · 목표 달성' : ''}</span>
        </div>
        <div class="week">${week}</div>
      </section>

      <div class="section-head"><h2>오늘 한 운동</h2><span class="hint">꾹 눌러서 수정</span></div>
      <div class="tiles">${tiles}<button class="tile add-tile" data-action="part-new" aria-label="부위 추가"><span class="add-plus" aria-hidden="true">${ICON.plus}</span><span class="tile-sub">부위 추가</span></button></div>
      ${logBlock(tk, 'today')}
      ${photoThumbs.has(tk)
        ? `<button class="photo-cta has-photo" data-action="open-day" data-key="${tk}"><img src="${photoThumbs.get(tk)}" alt=""><span>오늘 오운완 보기</span></button>`
        : `<button class="photo-cta${done.size ? '' : ' idle'}" data-action="photo">
        ${ICON.camera}<span>${done.size ? `${esc(photoHeadline(state.parts.filter(p => done.has(p.id))))} 오운완 찍기` : '운동 체크하고 오운완 찍기'}</span>
      </button>`}
      ${backupBanner()}`;
  }

  function renderCalendar() {
    const t = today();
    const tk = keyOf(t);
    const m = ui.calMonth;
    const y = m.getFullYear();
    const mo = m.getMonth();
    const lead = (m.getDay() + 6) % 7;
    const dim = new Date(y, mo + 1, 0).getDate();
    const isCurMonth = y === t.getFullYear() && mo === t.getMonth();
    const atLatest = y > t.getFullYear() || (y === t.getFullYear() && mo >= t.getMonth());

    const counts = {};
    let attendedDays = 0;
    let cells = '';
    for (let i = 0; i < lead; i++) cells += '<span class="day empty" aria-hidden="true"></span>';
    for (let d = 1; d <= dim; d++) {
      const k = keyOf(new Date(y, mo, d));
      const arr = dayParts(k);
      const col = (lead + d - 1) % 7;
      if (arr.length) attendedDays++;
      const names = [];
      let dots = '';
      for (const id of arr) {
        counts[id] = (counts[id] || 0) + 1;
        const p = partById(id);
        if (!p) continue;
        names.push(p.name);
        dots += `<i style="background:${p.color}"></i>`;
      }
      const ph = photoThumbs.get(k);
      const cls = ['day', col === 5 && 'sat', col === 6 && 'sun', arr.length && 'attended', k === tk && 'today', ph && 'photo']
        .filter(Boolean).join(' ');
      cells += `<button class="${cls}" data-action="open-day" data-key="${k}"${k > tk ? ' disabled' : ''}${ph ? ` style="--ph:url('${ph}')"` : ''} aria-label="${mo + 1}월 ${d}일${names.length ? `, ${esc(names.join(', '))}` : ''}${ph ? ', 사진 있음' : ''}">
        <span class="num">${d}</span><span class="dots">${dots}</span></button>`;
    }

    const legend = state.parts.map(p => {
      const n = counts[p.id] || 0;
      return `<div class="legend-row${n ? '' : ' zero'}"><i style="background:${p.color}"></i>${esc(p.name)}<b class="d">${n}</b></div>`;
    }).join('');

    views.calendar.innerHTML = `
      <header class="head">
        <div>
          <p class="kicker">Calendar</p>
          <h1>${mo + 1}월<span class="d">${y}</span></h1>
        </div>
        <div class="nav">
          ${isCurMonth ? '' : '<button class="pill" data-action="cal-today">오늘</button>'}
          <button class="icon-btn" data-action="cal-prev" aria-label="이전 달">${ICON.prev}</button>
          <button class="icon-btn" data-action="cal-next" aria-label="다음 달"${atLatest ? ' disabled' : ''}>${ICON.next}</button>
        </div>
      </header>
      <div class="month-stat">
        <span class="d">${attendedDays}</span><span class="unit">일 출석</span>
        <span class="of">${isCurMonth ? '이번 달' : `${mo + 1}월`} ${dim}일 중</span>
      </div>
      <div class="cal">
        <div class="cal-week" aria-hidden="true">
          <span>월</span><span>화</span><span>수</span><span>목</span><span>금</span><span class="sat">토</span><span class="sun">일</span>
        </div>
        <div class="cal-grid">${cells}</div>
      </div>
      <div class="legend">${legend}</div>
      <button class="photo-cta${attendedDays ? '' : ' idle'}" data-action="recap">${ICON.chart}<span>${mo + 1}월 결산 카드 만들기</span></button>
`;
  }

  // The 기록 tab is three pages so each says one thing: 요약 (the season, months, parts),
  // 배지 (what's next, then every badge), 종목 (each lift's best).
  const STATS_PAGES = [['summary', '요약'], ['badges', '배지'], ['lifts', '종목']];
  const STATS_PAGE_KEY = 'gymcheck:statsPage';
  const badgeOn = (b, s) => { const [n, goal] = b.of(s); return n >= goal; };
  // Under a "2026 시즌" or "월간 챌린지" heading the year is already said.
  const badgeShort = b => (b.group === 'monthly' ? `${b.num}월` : b.label || b.name);

  function renderStats() {
    const page = ui.statsPage;
    const seg = `<div class="seg" role="tablist" aria-label="기록 보기">${STATS_PAGES.map(([id, label]) =>
      `<button role="tab" data-action="stats-page" data-page="${id}" aria-selected="${id === page}">${label}</button>`).join('')}</div>`;
    const body = page === 'badges' ? badgesPage() : page === 'lifts' ? liftsSection() : summaryPage();
    views.stats.innerHTML = `
      <header class="head"><div><p class="kicker">Records</p><h1>기록</h1></div></header>
      ${seg}
      ${body}`;
  }

  function summaryPage() {
    const t = today();
    const curY = t.getFullYear();
    const y = ui.statsYear;
    const { days, months, parts } = yearStats(y);
    const dy = daysInYear(y);
    const years = Object.keys(state.records).map(k => Number(k.slice(0, 4)));
    const minY = Math.min(curY, ...years);
    const s = badgeStats();
    const monthKey = keyOf(t).slice(0, 7);
    const monthDays = Object.entries(state.records).filter(([k, a]) => k.startsWith(monthKey) && a.length).length;

    let sub;
    if (y === curY) {
      const elapsed = daysBetween(new Date(y, 0, 1), t) + 1;
      sub = `올해 ${elapsed}일 지났고, 그중 ${days}일 갔어요 (${pct(days, elapsed)}%)`;
    } else {
      sub = `${y}년 출석률 ${pct(days, dy)}%`;
    }

    const maxM = Math.max(10, ...months);
    const bars = months.map((n, i) => {
      const future = y === curY && i > t.getMonth();
      const cur = y === curY && i === t.getMonth();
      // Only months with days get a number; empty ones are a thin line.
      return `<div class="bar-col${cur ? ' current' : ''}${future ? ' future' : ''}">
        <div class="bar-track"><span class="bar-val">${n ? n : ''}</span><i class="bar" style="height:${(n / maxM) * 100}%"></i></div>
        <span class="bar-month">${i + 1}월</span>
      </div>`;
    }).join('');

    const maxP = Math.max(0, ...state.parts.map(p => parts[p.id] || 0));
    const rows = state.parts.map(p => {
      const n = parts[p.id] || 0;
      return `<div class="prow${maxP && n === maxP ? ' top' : ''}">
        <span class="prow-name"><span>${esc(p.name)}</span></span>
        <span class="prow-track"><i style="width:${maxP ? (n / maxP) * 100 : 0}%;background:${p.color}"></i></span>
        <span class="prow-count d">${n}</span>
      </div>`;
    }).join('');
    const tile = (label, n) => `<div class="stat-tile"><span>${label}</span><b class="d">${n}<small>일</small></b></div>`;

    return `
      <div class="season-row">
        <h2>${y} 시즌</h2>
        <div class="nav">
          <button class="icon-btn" data-action="year-prev" aria-label="이전 해"${y <= minY ? ' disabled' : ''}>${ICON.prev}</button>
          <button class="icon-btn" data-action="year-next" aria-label="다음 해"${y >= curY ? ' disabled' : ''}>${ICON.next}</button>
        </div>
      </div>
      <section class="stat-hero compact">
        <div class="mega"><span class="d num">${days}</span><span class="d den">/${dy}</span><span class="unit">일 출석</span></div>
        <div class="progress"><i style="width:${(days / dy) * 100}%"></i></div>
        <p class="sub">${sub}</p>
      </section>
      <div class="stat-tiles">${tile('이번 달', monthDays)}${tile('최장 연속', s.bestStreak)}${tile('총 출석', s.total)}</div>

      <section class="block">
        <div class="section-head"><h2>월별 출석</h2><span class="kicker">Monthly</span></div>
        <div class="bars compact">${bars}</div>
      </section>

      <section class="block">
        <div class="section-head"><h2>부위별 횟수</h2><span class="kicker">By part</span></div>
        ${rows}
      </section>`;
  }

  function badgeGroups(s) {
    const timed = timedBadges(s);
    const seasons = [...new Set(timed.filter(b => b.group === 'season').map(b => b.year))].sort((a, b) => b - a);
    return [
      { id: 'monthly', title: `월간 챌린지 · 한 달 ${MONTH_GOAL}일`, list: timed.filter(b => b.group === 'monthly').reverse() },
      ...seasons.map(y => ({ id: `season${y}`, title: `${y} 시즌`, list: timed.filter(b => b.group === 'season' && b.year === y) })),
      ...BADGE_GROUPS.map(g => ({ id: g.id, title: g.name, list: BADGES.filter(b => b.group === g.id) })),
    ].filter(g => g.list.length);
  }

  function badgesPage() {
    const s = badgeStats();
    const groups = badgeGroups(s);
    const all = groups.flatMap(g => g.list);
    const earned = all.filter(b => badgeOn(b, s)).length;
    // The unearned ones closest to done (past months can't be earned any more).
    const thisMonth = `m${keyOf(today()).slice(0, 7)}`;
    const next = all
      .filter(b => !badgeOn(b, s) && (b.group !== 'monthly' || b.id === thisMonth))
      .map(b => { const [n, goal] = b.of(s); return { b, n, goal, r: n / Math.max(goal, 1) }; })
      .filter(x => x.r > 0)
      .sort((a, b) => b.r - a.r)
      .slice(0, 3);
    const nextHtml = next.length ? `
      <div class="section-head"><h2>다음 배지</h2></div>
      ${next.map(({ b, n, goal, r }) => `
        <button class="next-badge" data-action="badge-open" data-id="${esc(b.id)}">
          ${medal(b, false)}
          <span class="next-badge-body">
            <span class="next-badge-top"><b>${esc(b.name)}</b><small>${n.toLocaleString()} / ${goal.toLocaleString()}</small></span>
            <span class="progress"><i style="width:${r * 100}%"></i></span>
          </span>
        </button>`).join('')}` : '';
    const grid = groups.map(g => {
      const got = g.list.filter(b => badgeOn(b, s)).length;
      return `<div class="badge-group-head"><h3>${esc(g.title)}</h3><span><b class="d">${got}</b> / ${g.list.length}</span></div>
        <div class="badge-grid">${g.list.map(b => {
          const on = badgeOn(b, s);
          return `<button class="badge-cell${on ? ' on' : ''}${b.current ? ' current' : ''}" data-action="badge-open" data-id="${esc(b.id)}" aria-label="${esc(b.name)}, ${on ? '획득' : '미획득'}">
            ${medal(b, on)}<span>${esc(badgeShort(b))}</span></button>`;
        }).join('')}</div>`;
    }).join('');
    return `
      <div class="badge-count"><span class="d">${earned}</span><small>/ ${all.length}개 획득</small></div>
      <div class="progress badge-progress"><i style="width:${all.length ? (earned / all.length) * 100 : 0}%"></i></div>
      ${nextHtml}
      <div class="badge-all">${grid}</div>`;
  }

  // One badge up close, in the bottom sheet.
  function openBadgeSheet(id) {
    const s = badgeStats();
    const b = badgeGroups(s).flatMap(g => g.list).find(x => x.id === id);
    if (!b) return;
    const [n, goal] = b.of(s);
    const on = n >= goal;
    ui.sheetDate = null;
    ui.partSheet = null;
    ui.exSheet = null;
    ui.badgeSheet = id;
    sheet.innerHTML = `
      <div class="handle" aria-hidden="true"></div>
      <div class="badge-detail">
        ${medal(b, on, ' big')}
        <h2 id="sheet-title">${esc(b.name)}</h2>
        <p class="sub">${esc(b.desc)}</p>
        ${on ? '<p class="badge-got">획득했어요</p>' : goal > 1 ? `
          <div class="progress"><i style="width:${(n / goal) * 100}%"></i></div>
          <p class="sub">${n.toLocaleString()} / ${goal.toLocaleString()}</p>` : ''}
        <button class="btn" data-action="close-sheet">닫기</button>
      </div>`;
    showSheet();
  }

  function renderSettings() {
    const goal = state.weeklyGoal;
    const standalone = matchMedia('(display-mode: standalone)').matches || navigator.standalone === true;

    const lastBackup = state.lastBackup ? `마지막 백업 ${fmtDot(new Date(state.lastBackup))}` : '아직 백업한 적 없어요';

    views.settings.innerHTML = `
      <header class="head"><div><p class="kicker">Settings</p><h1>설정</h1></div></header>

      ${needsReinstall() ? `
      <div class="section-head" id="fit-guide"><h2>화면 꽉 채우기</h2><span class="kicker">Fit</span></div>
      <div class="group">
        <p class="install">아이콘을 다시 추가하면 화면이 꽉 차요.<br>
        <b>1</b> 아래 ‘내보내기’로 기록 백업<br>
        <b>2</b> 홈 화면 아이콘을 길게 눌러 삭제 <small>(기록도 지워지니 1단계 백업 먼저)</small><br>
        <b>3</b> Safari로 앱 주소를 열고 <b>새로고침(↻) 한 번</b> → 공유 → ‘홈 화면에 추가’<br>
        <b>4</b> 새 아이콘에서 설정 → ‘가져오기’로 백업 불러오기</p>
        <div class="row">
          <span class="row-label">1단계 · 기록 백업</span>
          ${exportButton(true)}
        </div>
      </div>` : ''}

      <div class="section-head"><h2>앱 업데이트</h2><span class="kicker">v${APP_VERSION}</span></div>
      <div class="group">
        <div class="row">
          <span class="row-label">${hasUpdate() ? `새 버전 v${esc(ui.latestVersion)} 나왔어요` : `지금 버전 v${APP_VERSION}`}<small>기록은 그대로예요</small></span>
          <button class="btn${hasUpdate() ? ' primary' : ''}" data-action="update"${ui.updating ? ' disabled' : ''}>${hasUpdate() ? '업데이트' : '업데이트 확인'}</button>
        </div>
      </div>

      <div class="section-head"><h2>주간 목표</h2><span class="kicker">Goal</span></div>
      <div class="group">
        <div class="row">
          <span class="row-label">일주일에</span>
          <div class="stepper">
            <button data-action="goal-dec" aria-label="목표 줄이기"${goal <= 1 ? ' disabled' : ''}>−</button>
            <output class="d" aria-live="polite">${goal}<small>회</small></output>
            <button data-action="goal-inc" aria-label="목표 늘리기"${goal >= 7 ? ' disabled' : ''}>+</button>
          </div>
        </div>
      </div>

      <div class="section-head"><h2>계정</h2><span class="kicker">Account</span></div>
      <div class="group">
        ${loggedIn() ? `
        <div class="row">
          <span class="row-label">@${esc(state.social.handle)}</span>
          <button class="btn" data-action="soc-logout">로그아웃</button>
        </div>
        <div class="row">
          <span class="row-label">클라우드 저장<small id="cloud-status">${esc(cloudStatusText())}</small></span>
          <button class="btn" data-action="cloud-sync">지금 저장</button>
        </div>
        ${ui.pwForm ? `
        <form class="pw-form" data-form="pw-change" novalidate>
          <input class="sr-only" type="text" name="username" autocomplete="username" value="${esc(state.social.handle)}" tabindex="-1" aria-hidden="true">
          <input id="pw-new" type="password" maxlength="64" placeholder="새 비밀번호 (${PW_MIN}자 이상)" autocomplete="new-password" enterkeyhint="next" aria-label="새 비밀번호">
          <input id="pw-again" type="password" maxlength="64" placeholder="한 번 더 입력" autocomplete="new-password" enterkeyhint="done" aria-label="새 비밀번호 확인">
          <div class="pw-actions">
            <button type="button" class="btn" data-action="pw-cancel">취소</button>
            <button type="submit" class="btn primary" id="pw-save">바꾸기</button>
          </div>
        </form>` : `
        <div class="row">
          <span class="row-label">비밀번호 바꾸기<small>바꾸면 다른 기기는 로그아웃돼요</small></span>
          <button class="btn" data-action="pw-open">바꾸기</button>
        </div>`}
        <div class="row">
          <span class="row-label">다른 기기에서 로그아웃<small>이 폰만 남기고 모두 로그아웃돼요</small></span>
          <button class="btn" data-action="sessions-end">로그아웃</button>
        </div>
        ${ui.delForm ? deleteFormHtml() : `
        <div class="row">
          <span class="row-label">계정 삭제<small>서버의 기록·사진·크루 인증이 모두 지워져요</small></span>
          <button class="text-btn danger" data-action="delete-open">삭제</button>
        </div>`}` : account.auth ? authFormHtml() : `
        <div class="row">
          <span class="row-label">로그인 안 됨<small>로그인하면 기록이 자동 백업돼요</small></span>
        </div>
        <div class="auth-buttons">
          <button class="btn" data-action="auth-open" data-mode="login">로그인</button>
          <button class="btn primary" data-action="auth-open" data-mode="signup">아이디 만들기</button>
        </div>`}
      </div>

      <div class="section-head"><h2>백업</h2><span class="kicker">Backup</span></div>
      <div class="group">
        <div class="row">
          <span class="row-label">기록 내보내기<small>${exportFile ? `준비 완료 · 사진 ${exportInfo.photos}장 · ${fmtSize(exportInfo.size)}` : lastBackup}</small></span>
          ${exportButton()}
        </div>
        <div class="row">
          <span class="row-label">기록 가져오기</span>
          <button class="btn" data-action="import">가져오기</button>
        </div>
      </div>
      <p class="note tight">${loggedIn()
        ? '기록과 사진은 서버에 자동 저장되고 있어요'
        : '기록은 이 폰에만 있어요. 폰 바꾸기 전에 내보내기 해 두세요'}</p>

      ${standalone ? '' : `
      <div class="section-head"><h2>홈 화면에 추가</h2><span class="kicker">Install</span></div>
      <div class="group">
        <p class="install"><b>아이폰</b> Safari 아래 공유 버튼 → ‘홈 화면에 추가’<br><b>안드로이드</b> Chrome 메뉴(⋮) → ‘홈 화면에 추가’</p>
      </div>`}`;
  }

  function renderSheet() {
    const k = ui.sheetDate;
    if (!k) return;
    const d = parseKey(k);
    const done = new Set(dayParts(k));
    const isToday = k === keyOf(today());
    const hasPhoto = photoThumbs.has(k);
    if (hasPhoto && sheetPhoto.key !== k) loadSheetPhoto(k);
    const photoSrc = sheetPhoto.key === k && sheetPhoto.url ? sheetPhoto.url : photoThumbs.get(k);
    const photoBlock = hasPhoto ? `
      <div class="sheet-photo">
        <img src="${photoSrc}" alt="${fmtLong(d)} 오운완 사진">
        <div class="sheet-photo-actions">
          <button class="btn small" data-action="day-photo-share">공유</button>
          <button class="btn small" data-action="day-photo-add">다시 찍기</button>
          <button class="btn small danger" data-action="day-photo-delete">삭제</button>
        </div>
        ${photoStatusHtml(k)}
      </div>` : '';
    sheet.innerHTML = `
      <div class="handle" aria-hidden="true"></div>
      <div class="sheet-head">
        <div>
          <p class="kicker">${isToday ? 'Today · ' : ''}${fmtKicker(d)}</p>
          <h2 id="sheet-title">${fmtLong(d)}</h2>
        </div>
        <button class="btn primary" data-action="close-sheet">완료</button>
      </div>
      ${photoBlock}
      <div class="tiles compact">${state.parts.map(p => tile(p, done.has(p.id), '', 'toggle-day')).join('')}</div>
      ${logBlock(k, 'day')}
      ${!hasPhoto && done.size ? `<button class="photo-cta" data-action="day-photo-add">${ICON.camera}<span>이날 오운완 사진 추가</span></button>` : ''}
      <p class="note">${done.size ? `${done.size}개 부위 체크됨` : '이날은 기록이 없어요'}</p>`;
  }

  const RENDER = { today: renderToday, calendar: renderCalendar, stats: renderStats, crew: renderCrew, settings: renderSettings };

  function renderCurrent() {
    RENDER[ui.tab]();
    if (ui.sheetDate) renderSheet();
    ui.popId = null;
  }

  // Same order as the tab bar (and the iOS app); swiping sideways walks through it.
  const TAB_ORDER = ['today', 'calendar', 'stats', 'crew', 'settings'];

  function setTab(tab) {
    const scroller = $('#views');
    if (ui.tab === tab) { scroller.scrollTo({ top: 0, behavior: 'smooth' }); return; }
    ui.tab = tab;
    for (const [name, el] of Object.entries(views)) el.hidden = name !== tab;
    document.querySelectorAll('.tab').forEach(b => {
      if (b.dataset.tab === tab) b.setAttribute('aria-current', 'page');
      else b.removeAttribute('aria-current');
    });
    $('.tabbar').style.setProperty('--i', String(TAB_ORDER.indexOf(tab)));
    if (tab === 'calendar' && !ui.sheetDate) ui.calMonth = firstOfMonth(today());
    renderCurrent();
    if (tab === 'crew' && loggedIn()) loadCrews({ quiet: crew.list !== null });
    scroller.scrollTop = 0;
  }

  // ---------- sheet ----------
  const sheet = $('#sheet');
  const backdrop = $('#backdrop');
  let sheetTimer = 0;

  function showSheet() {
    clearTimeout(sheetTimer);
    sheet.hidden = false;
    backdrop.hidden = false;
    void sheet.offsetHeight; // commit the closed position before animating
    sheet.classList.add('open');
    backdrop.classList.add('open');
  }

  function openSheet(key) {
    ui.partSheet = null;
    ui.exSheet = null;
    ui.sheetDate = key;
    renderSheet();
    showSheet();
  }

  // id: the part to edit, or null to add one.
  function openPartSheet(id) {
    const p = id ? partById(id) : null;
    ui.sheetDate = null;
    ui.exSheet = null;
    ui.partSheet = { id: p ? p.id : null, color: p ? p.color : nextColor() };
    const colors = [...new Set([...DEFAULT_PARTS.map(d => d.color), ...CUSTOM_COLORS, ...(p ? [p.color] : [])].map(c => c.toUpperCase()))];
    sheet.innerHTML = `
      <div class="handle" aria-hidden="true"></div>
      <div class="sheet-head">
        <div>
          <p class="kicker">${p ? 'Edit part' : 'New part'}</p>
          <h2 id="sheet-title">${p ? '부위 수정' : '부위 추가'}</h2>
        </div>
      </div>
      <form class="part-form" data-form="part-save" novalidate>
        <div class="field"><input id="part-name" type="text" maxlength="${MAX_NAME}" value="${p ? esc(p.name) : ''}" placeholder="이름 (예: 수영)" enterkeyhint="done" autocomplete="off" aria-label="부위 이름"></div>
        <div class="swatches" role="group" aria-label="색상">${colors.map(c => `<button type="button" class="swatch" style="--c:${c}" data-action="pick-color" data-color="${c}" aria-pressed="${c === ui.partSheet.color.toUpperCase()}" aria-label="색상 ${c}"></button>`).join('')}</div>
        <div class="part-buttons">
          <button class="photo-cta" type="submit"><span>${p ? '저장' : '추가'}</span></button>
          <button type="button" class="btn part-cancel" data-action="close-sheet">취소</button>
        </div>
        ${p ? `<button type="button" class="btn danger part-delete" data-action="part-delete" data-id="${esc(p.id)}">이 부위 삭제</button>` : ''}
      </form>`;
    showSheet();
    if (!p) requestAnimationFrame(() => { const i = $('#part-name'); if (i) i.focus(); });
  }

  function closeSheet() {
    if (!ui.sheetDate && !ui.partSheet && !ui.exSheet && !ui.badgeSheet) return;
    ui.sheetDate = null;
    ui.partSheet = null;
    ui.exSheet = null;
    ui.badgeSheet = null;
    clearSheetPhoto();
    sheet.classList.remove('open');
    backdrop.classList.remove('open');
    sheetTimer = setTimeout(() => { sheet.hidden = true; backdrop.hidden = true; }, 320);
  }

  // ---------- toast ----------
  let toastTimer = 0;
  function toast(msg) {
    const el = $('#toast');
    el.textContent = msg;
    el.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => el.classList.remove('show'), 2200);
  }

  // ---------- check-in celebration ----------
  // Comes up a beat after the last tap, so ticking several parts in a row isn't cut off.
  // The full "N번째 출석" screen shows once a day; new badges show whenever they're earned.
  const CHEER_KEY = 'gymcheck:cheered';
  const cheer = { before: null, today: false, timer: 0, closeTimer: 0, queued: [] };
  const cheerEl = $('#cheer');

  function cheerToggle(key, id) {
    if (!cheer.before) cheer.before = earnedBadges();
    if (key === keyOf(today())) cheer.today = true;
    const on = toggle(key, id);
    clearTimeout(cheer.timer);
    cheer.timer = setTimeout(showCheer, 1300);
    return on;
  }

  function cheeredToday() {
    try { return localStorage.getItem(CHEER_KEY) === keyOf(today()); } catch (e) { return false; }
  }

  function countUp(node, to) {
    if (to < 2 || matchMedia('(prefers-reduced-motion: reduce)').matches) { node.textContent = to; return; }
    const start = performance.now();
    const dur = Math.min(1100, 500 + to * 6);
    const step = now => {
      const p = Math.min(1, (now - start) / dur);
      node.textContent = Math.round(to * (1 - (1 - p) ** 3));
      if (p < 1 && cheerEl.classList.contains('open')) requestAnimationFrame(step);
      else node.textContent = to;
    };
    node.textContent = 0;
    requestAnimationFrame(step);
  }

  function showCheer() {
    const before = cheer.before || new Set();
    const touchedToday = cheer.today;
    cheer.before = null;
    cheer.today = false;
    const fresh = newBadges(before);
    const tk = keyOf(today());
    const checkIn = touchedToday && attended(tk) && !cheeredToday();
    if (!checkIn && !fresh.length) return;
    if (!$('#photo-editor').hidden) { cheer.queued.push(...fresh); return; } // shown when the photo screen closes
    if (checkIn) { try { localStorage.setItem(CHEER_KEY, tk); } catch (e) { /* shows again later, that's all */ } }
    openCheer(checkIn, fresh);
  }

  // Badges earned while the photo screen was open (saving a 오운완 counts toward some).
  function flushQueuedBadges() {
    const seen = new Set();
    const list = cheer.queued.splice(0).filter(b => !seen.has(b.id) && seen.add(b.id));
    if (list.length) setTimeout(() => openCheer(false, list), 280);
  }

  function openCheer(checkIn, fresh) {
    const t = today();
    const tk = keyOf(t);
    const y = t.getFullYear();
    const n = yearStats(y).days;
    const st = streak(t);
    const wk = weekCount(t);
    const goal = state.weeklyGoal;
    const names = state.parts.filter(p => dayParts(tk).includes(p.id)).map(p => p.name);
    const meta = [names.join('·'), st > 1 ? `${st}일 연속` : '', `이번 주 ${wk}/${goal}회${wk >= goal ? ' 달성' : ''}`].filter(Boolean);
    const badgeRows = fresh.map(b => `<div class="cheer-badge">${medal(b, true)}<span class="cheer-badge-text"><b>${esc(b.name)}</b><small>${esc(b.desc)}</small></span></div>`).join('');

    cheerEl.innerHTML = checkIn ? `
      <div class="cheer-body">
        <p class="kicker">${y} Season · Day ${n}</p>
        <div class="cheer-num d">${n}</div>
        <p class="cheer-title">올해 ${n}번째 출석</p>
        <p class="cheer-meta">${esc(meta.join(' · '))}</p>
        ${badgeRows ? `<div class="cheer-badges"><p class="kicker">New badge</p>${badgeRows}</div>` : ''}
      </div>
      <div class="cheer-actions">
        ${photoThumbs.has(tk) ? '' : `<button class="photo-cta" data-action="cheer-photo">${ICON.camera}<span>오운완 찍기</span></button>`}
        <button class="btn" data-action="cheer-close">닫기</button>
      </div>` : `
      <div class="cheer-body solo">
        <p class="kicker">New badge</p>
        <div class="cheer-medals">${fresh.map(b => medal(b, true, ' big')).join('')}</div>
        <p class="cheer-title">${esc(fresh.map(b => b.name).join(' · '))}</p>
        <p class="cheer-meta">${esc(fresh.map(b => b.desc).join(' · '))}</p>
      </div>
      <div class="cheer-actions"><button class="btn primary" data-action="cheer-close">좋아요</button></div>`;

    clearTimeout(cheer.closeTimer);
    cheerEl.hidden = false;
    void cheerEl.offsetHeight; // commit the hidden state so the entrance animates
    cheerEl.classList.add('open');
    const num = cheerEl.querySelector('.cheer-num');
    if (num) countUp(num, n);
    if (navigator.vibrate) navigator.vibrate([12, 60, 18]);
    cheerEl.querySelector('.cheer-actions .btn').focus({ preventScroll: true });
  }

  function closeCheer() {
    if (cheerEl.hidden) return;
    cheerEl.classList.remove('open');
    cheer.closeTimer = setTimeout(() => { cheerEl.hidden = true; cheerEl.innerHTML = ''; }, 240);
  }

  // ---------- calendar navigation ----------
  function shiftMonth(delta) {
    const t = today();
    const next = new Date(ui.calMonth.getFullYear(), ui.calMonth.getMonth() + delta, 1);
    if (next > firstOfMonth(t)) return;
    ui.calMonth = next;
    renderCalendar();
  }

  let suppressClickUntil = 0;

  // ---------- sideways drags: swipe rows and tab paging (like the iOS app) ----------
  // One finger moving more sideways than up/down either slides a row open to show
  // 수정/삭제, or pages to the next/previous tab with that page following the finger.
  // Up/down movement is left to the browser (touch-action: pan-y), so scrolling is untouched.
  const SWIPE_BTN = 74;
  const SLIDE = 'transform 280ms var(--ease-out)';
  let openRow = null;
  let drag = null;

  const rowFront = row => row.querySelector('.swipe-front');
  const rowReveal = row => row.querySelectorAll('.swipe-btn').length * SWIPE_BTN;
  function slideRow(row, x, animate) {
    const front = rowFront(row);
    if (!front) return;
    clearTimeout(row._hide);
    front.style.transition = animate ? SLIDE : 'none';
    front.style.transform = x ? `translate3d(${x}px,0,0)` : '';
    // The buttons sit behind the row; keep them hidden unless it's moved aside.
    if (x) row.classList.add('shown');
    else if (animate) row._hide = setTimeout(() => row.classList.remove('shown'), 290);
    else row.classList.remove('shown');
  }

  function openSwipe(row) {
    if (openRow && openRow !== row) closeSwipe();
    slideRow(row, -rowReveal(row), true);
    openRow = row;
  }

  function closeSwipe(row = openRow) {
    if (!row) return;
    if (row.isConnected) slideRow(row, 0, true);
    if (openRow === row) openRow = null;
  }

  // The page that a sideways drag pulls in from the side.
  function peekTab(d, dir) {
    const tab = TAB_ORDER[d.idx + dir] || null;
    if (d.peekTab === tab) return;
    if (d.peek) { d.peek.hidden = true; d.peek.classList.remove('peek'); d.peek.style.cssText = ''; }
    d.peek = null;
    d.peekTab = tab;
    d.dir = dir;
    if (!tab) return;
    if (tab === 'calendar' && !ui.sheetDate) ui.calMonth = firstOfMonth(today());
    RENDER[tab]();
    const el = views[tab];
    el.classList.add('peek');
    el.style.top = `${d.scroller.scrollTop}px`;
    el.style.transition = 'none';
    el.hidden = false;
    d.peek = el;
  }

  function movePage(d, dx) {
    peekTab(d, dx < 0 ? 1 : -1);
    // Nothing on that side: resist, like the end of a pager.
    const x = d.peek ? dx : dx / (1 + Math.abs(dx) / (d.w * 0.25)) * 0.6;
    d.x = x;
    d.cur.style.transition = 'none';
    d.cur.style.transform = `translate3d(${x}px,0,0)`;
    if (d.peek) d.peek.style.transform = `translate3d(${x + d.dir * d.w}px,0,0)`;
  }

  function endPage(d, vx) {
    const flung = Math.abs(vx) > 0.35 && Math.sign(vx) === -d.dir;
    const go = d.peek && (Math.abs(d.x) > d.w * 0.3 || flung) && Math.sign(d.x) === -d.dir;
    const { cur, peek, scroller } = d;
    cur.style.transition = SLIDE;
    cur.style.transform = go ? `translate3d(${-d.dir * d.w}px,0,0)` : '';
    if (peek) {
      peek.style.transition = SLIDE;
      peek.style.transform = go ? 'translate3d(0,0,0)' : `translate3d(${d.dir * d.w}px,0,0)`;
    }
    if (go) $('.tabbar').style.setProperty('--i', String(d.idx + d.dir));
    setTimeout(() => {
      cur.style.cssText = '';
      if (peek) { peek.classList.remove('peek'); peek.style.cssText = ''; }
      scroller.classList.remove('paging');
      if (go) setTab(d.peekTab);
      else if (peek) peek.hidden = true;
    }, 290);
  }

  document.addEventListener('pointerdown', e => {
    if (!e.isPrimary || e.button > 0 || drag?.settling) return;
    // Another pointer while one is still dragging (its release was lost): settle that one first.
    if (drag?.mode) endDrag({ pointerId: drag.id, clientX: drag.lastX }, true);
    if (drag?.settling) return;
    const row = e.target.closest('.swipe');
    const scroller = e.target.closest('#views');
    if (!row && !scroller) return;
    if (e.target.closest('input, textarea, select, [contenteditable], .badge-row, .proof-strip, .crew-chips, .ex-chips')) return;
    drag = { x0: e.clientX, y0: e.clientY, id: e.pointerId, row, scroller, touch: e.pointerType !== 'mouse', mode: null, samples: [] };
  });

  document.addEventListener('pointermove', e => {
    const d = drag;
    if (!d || e.pointerId !== d.id) return;
    const dx = e.clientX - d.x0;
    const dy = e.clientY - d.y0;
    if (!d.mode) {
      if (Math.abs(dx) < 8 && Math.abs(dy) < 8) return;
      if (Math.abs(dx) <= Math.abs(dy) * 1.2) { drag = null; return; }
      if (d.row && (dx < 0 || d.row === openRow)) {
        d.mode = 'row';
        d.start = d.row === openRow ? -rowReveal(d.row) : 0;
        if (openRow && openRow !== d.row) closeSwipe();
        openRow = d.row;
      } else if (d.scroller && d.touch && !ui.sheetDate) {
        d.mode = 'page';
        closeSwipe();
        d.w = d.scroller.clientWidth;
        d.cur = views[ui.tab];
        d.idx = TAB_ORDER.indexOf(ui.tab);
        d.peekTab = undefined;
        d.scroller.classList.add('paging');
      } else { drag = null; return; }
      d.x0 = e.clientX; // start from here, so the content doesn't jump by the slop
      try { e.target.setPointerCapture(e.pointerId); } catch {}
    }
    const mx = e.clientX - d.x0;
    d.lastX = e.clientX;
    d.samples.push({ x: e.clientX, t: e.timeStamp });
    if (d.samples.length > 6) d.samples.shift();
    if (d.mode === 'row') {
      const reveal = rowReveal(d.row);
      const x = d.start + mx;
      // Past the buttons it gets heavier, like iOS.
      slideRow(d.row, x < -reveal ? -reveal + (x + reveal) * 0.25 : Math.min(0, x), false);
    } else {
      movePage(d, mx);
    }
  });

  function endDrag(e, cancelled) {
    const d = drag;
    if (!d || e.pointerId !== d.id) return;
    drag = null;
    if (!d.mode) return;
    suppressClickUntil = Date.now() + 350; // the release isn't a tap
    const first = d.samples[0];
    const last = d.samples[d.samples.length - 1];
    const vx = first && last && last.t > first.t ? (last.x - first.x) / (last.t - first.t) : 0;
    if (d.mode === 'row') {
      const projected = d.start + (e.clientX - d.x0) + vx * 150;
      if (!cancelled && projected < -rowReveal(d.row) / 2) openSwipe(d.row); else closeSwipe(d.row);
    } else {
      drag = { settling: true };
      endPage(d, cancelled ? 0 : vx);
      setTimeout(() => { if (drag?.settling) drag = null; }, 300);
    }
  }
  document.addEventListener('pointerup', e => endDrag(e, false));
  document.addEventListener('pointercancel', e => endDrag(e, true));

  // A tap right after a drag does nothing; while a row is open, a tap anywhere else
  // just closes it (its own buttons still work), like iOS lists.
  document.addEventListener('click', e => {
    if (Date.now() < suppressClickUntil) {
      e.preventDefault();
      e.stopImmediatePropagation();
      return;
    }
    if (!openRow) return;
    if (openRow.isConnected && e.target.closest('.swipe-actions') && openRow.contains(e.target)) { closeSwipe(); return; }
    closeSwipe();
    e.preventDefault();
    e.stopImmediatePropagation();
  }, true);

  // ---------- long-press a part tile → edit it ----------
  let hold = null;
  const endHold = () => {
    if (!hold) return;
    clearTimeout(hold.timer);
    hold.el.classList.remove('holding');
    hold = null;
  };
  views.today.addEventListener('pointerdown', e => {
    const el = e.target.closest('.tile[data-action="toggle-today"]');
    if (!el || e.button > 0) return;
    endHold();
    hold = { el, x: e.clientX, y: e.clientY };
    el.classList.add('holding');
    hold.timer = setTimeout(() => {
      const id = el.dataset.id;
      endHold();
      suppressClickUntil = Date.now() + 700;
      if (navigator.vibrate) navigator.vibrate(12);
      openPartSheet(id);
    }, 480);
  });
  views.today.addEventListener('pointermove', e => {
    if (hold && Math.hypot(e.clientX - hold.x, e.clientY - hold.y) > 10) endHold();
  });
  ['pointerup', 'pointercancel', 'pointerleave'].forEach(t => views.today.addEventListener(t, endHold));
  views.today.addEventListener('contextmenu', e => {
    const el = e.target.closest('.tile[data-action="toggle-today"]');
    if (!el) return;
    e.preventDefault();
    endHold();
    openPartSheet(el.dataset.id);
  });

  // ---------- events ----------
  document.addEventListener('click', e => {
    const el = e.target.closest('[data-action]');
    if (!el || el.disabled) return;
    const id = el.dataset.id;

    switch (el.dataset.action) {
      case 'tab':
        setTab(el.dataset.tab);
        break;
      case 'toggle-today':
        if (Date.now() < suppressClickUntil) return; // the tap that ended a long-press
        ui.popId = cheerToggle(keyOf(today()), id) ? id : null;
        renderCurrent();
        break;
      case 'toggle-day':
        ui.popId = cheerToggle(ui.sheetDate, id) ? id : null;
        renderCurrent();
        break;
      case 'cheer-close':
        closeCheer();
        break;
      case 'cheer-photo':
        closeCheer();
        startPhoto();
        break;
      case 'open-day':
        if (Date.now() < suppressClickUntil) return;
        openSheet(el.dataset.key);
        break;
      case 'close-sheet':
        closeSheet();
        break;
      case 'cal-prev': shiftMonth(-1); break;
      case 'cal-next': shiftMonth(1); break;
      case 'cal-today':
        ui.calMonth = firstOfMonth(today());
        renderCalendar();
        break;
      case 'year-prev': ui.statsYear--; renderStats(); break;
      case 'stats-page':
        ui.statsPage = el.dataset.page;
        try { localStorage.setItem(STATS_PAGE_KEY, ui.statsPage); } catch (e) { /* remembered for this visit only */ }
        renderStats();
        break;
      case 'badge-open': openBadgeSheet(el.dataset.id); break;
      case 'year-next': ui.statsYear++; renderStats(); break;
      case 'goal-dec': setGoal(-1); break;
      case 'goal-inc': setGoal(1); break;
      case 'pick-color':
        if (ui.partSheet) ui.partSheet.color = el.dataset.color;
        document.querySelectorAll('.swatch').forEach(s => s.setAttribute('aria-pressed', String(s === el)));
        break;
      case 'part-new': openPartSheet(null); break;
      case 'ex-add': openExercisePicker(el.dataset.date, el.dataset.from); break;
      case 'ex-edit': openExerciseLog(el.dataset.date, el.dataset.ex, { today: null, day: 'day', history: 'history' }[el.dataset.from] || null); break;
      case 'ex-history': openExerciseHistory(el.dataset.ex); break;
      case 'ex-toggle': {
        const x = ui.exSheet;
        x.selected = x.selected || [];
        const at = x.selected.findIndex(sel => sel.id === el.dataset.ex);
        if (at >= 0) x.selected.splice(at, 1);
        else x.selected.push({ id: el.dataset.ex, rec: el.dataset.sets ? { sets: Number(el.dataset.sets), range: el.dataset.range } : null });
        renderExList();
        break;
      }
      case 'ex-confirm': startExerciseQueue(); break;
      case 'ex-skip':
        if (!nextInQueue(ui.exSheet)) leaveExercise(ui.exSheet);
        break;
      case 'ex-shuffle': {
        const pid = el.dataset.part;
        const count = (ROUTINES[pid] || []).length;
        const cur = ui.exSheet.routine[pid];
        let next = cur;
        while (count > 1 && next === cur) next = Math.floor(Math.random() * count);
        ui.exSheet.routine[pid] = next;
        renderExList();
        break;
      }
      case 'ex-filter':
        ui.exSheet.filter = el.dataset.filter;
        $('#ex-chips').innerHTML = exChips();
        renderExList();
        break;
      case 'ex-custom': addCustomExercise(); break;
      case 'ex-back': exerciseBack(); break;
      case 'ex-save': saveExercise(); break;
      case 'ex-delete': deleteExercise(); break;
      case 'set-add': {
        const sets = ui.exSheet.sets;
        sets.push({ ...(sets[sets.length - 1] || {}) });
        renderExSheet();
        break;
      }
      case 'set-del':
        ui.exSheet.sets.splice(Number(el.dataset.i), 1);
        if (!ui.exSheet.sets.length) ui.exSheet.sets.push({});
        renderExSheet();
        break;
      case 'crew-retry': loadCrews(); break;
      case 'crew-pick': pickCrew(id); break;
      case 'crew-invite': shareInvite(); break;
      case 'crew-leave': leaveCrew(); break;
      case 'crew-add':
        crew.manage = true;
        renderCrew();
        break;
      case 'crew-add-cancel':
        crew.manage = false;
        renderCrew();
        break;
      case 'crew-shoot':
        if (attended(keyOf(today()))) startPhoto();
        else { setTab('today'); toast('오늘 한 운동을 먼저 체크해 주세요'); }
        break;
      case 'crew-view': openViewer(el.dataset.user, el.dataset.date); break;
      case 'crew-fire': cheerProof(el.dataset.user, el.dataset.date); break;
      case 'viewer-close': closeViewer(); break;
      case 'comment-delete': deleteComment(id, el.dataset.swiped === '1'); break;
      case 'log-delete': deleteLog(el.dataset.date, el.dataset.ex); break;
      case 'part-delete': deletePart(id); break;
      case 'export':
        if (ui.tab !== 'settings') setTab('settings');
        prepareExport();
        break;
      case 'export-share': shareExport(); break;
      case 'photo-format': pickFormat(el.dataset.format); break;
      case 'recap': openRecap(); break;
      case 'auth-open':
        account.auth = el.dataset.mode === 'login' ? 'login' : 'signup';
        account.form.password = '';
        renderCurrent();
        requestAnimationFrame(() => { const i = $(account.form.handle ? '#soc-password' : '#soc-handle'); if (i) i.focus(); });
        break;
      case 'auth-cancel':
        account.auth = null;
        account.form = { handle: '', password: '' };
        renderCurrent();
        break;
      case 'soc-logout': logOut(); break;
      case 'cloud-sync': manualCloudSync(); break;
      case 'pw-open':
        ui.pwForm = true;
        renderCurrent();
        requestAnimationFrame(() => { const i = $('#pw-new'); if (i) i.focus(); });
        break;
      case 'pw-cancel':
        ui.pwForm = false;
        renderCurrent();
        break;
      case 'import': $('#import-file').click(); break;
      case 'update': manualUpdate(); break;
      case 'photo': startPhoto(); break;
      case 'day-photo-add': startPhoto(ui.sheetDate); break;
      case 'day-photo-share': shareDayPhoto(); break;
      case 'day-photo-delete': deleteDayPhoto(); break;
      case 'day-photo-retry': retryDayPhoto(); break;
      case 'sessions-end': endOtherSessions(); break;
      case 'delete-open': openDeleteForm(); break;
      case 'delete-cancel':
        ui.delForm = null;
        renderCurrent();
        break;
      case 'photo-retake': $('#photo-input').click(); break;
      case 'photo-save': savePhoto(); break;
      case 'photo-close': closePhoto(); break;
      case 'photo-flip':
        setPhotoFlip(!photoFlip);
        renderPhoto();
        break;
      case 'apply-update': applyUpdate(); break;
      case 'show-fit':
        setTab('settings');
        requestAnimationFrame(() => { const g = $('#fit-guide'); if (g) g.scrollIntoView({ block: 'start' }); });
        break;
    }
  });

  document.addEventListener('submit', e => {
    if (e.target.matches('[data-form="part-save"]')) {
      e.preventDefault();
      savePart();
    } else if (e.target.matches('[data-form="comment"]')) {
      e.preventDefault();
      sendComment();
    } else if (e.target.matches('[data-form="crew-create"]')) {
      e.preventDefault();
      createCrew();
    } else if (e.target.matches('[data-form="crew-join"]')) {
      e.preventDefault();
      joinCrew(fieldValue('#crew-code'));
    } else if (e.target.matches('[data-form="soc-auth"]')) {
      e.preventDefault();
      submitAuth();
    } else if (e.target.matches('[data-form="pw-change"]')) {
      e.preventDefault();
      changePassword();
    } else if (e.target.matches('[data-form="account-delete"]')) {
      e.preventDefault();
      deleteAccount();
    }
  });

  $('#import-file').addEventListener('change', e => {
    const file = e.target.files && e.target.files[0];
    e.target.value = '';
    if (file) importData(file);
  });

  // Account forms: Enter moves to the next field; Enter in the last one submits.
  const NEXT_FIELD = { 'soc-handle': ['#soc-password'], 'pw-new': ['#pw-again'] };
  document.addEventListener('keydown', e => {
    if (e.key !== 'Enter' || e.isComposing || !NEXT_FIELD[e.target.id]) return;
    const next = NEXT_FIELD[e.target.id].map(s => $(s)).find(Boolean);
    if (!next) return;
    e.preventDefault();
    next.focus();
  });
  document.addEventListener('input', e => {
    if (e.target.id === 'comment-input' && crew.viewer) crew.viewer.draft = e.target.value;
    else if (e.target.id === 'ex-search' && ui.exSheet) { ui.exSheet.q = e.target.value; renderExList(); }
    else if (e.target.dataset.set !== undefined && ui.exSheet && ui.exSheet.sets) {
      const st = ui.exSheet.sets[Number(e.target.dataset.set)];
      if (st) st[e.target.dataset.f] = e.target.value;
    } else if (e.target.id === 'soc-handle') account.form.handle = e.target.value = e.target.value.toLowerCase().replace(/\s/g, '');
    else if (e.target.id === 'soc-password') account.form.password = e.target.value;
  });

  $('#photo-input').addEventListener('change', e => {
    const file = e.target.files && e.target.files[0];
    e.target.value = '';
    if (file) openPhoto(file);
  });

  document.addEventListener('keydown', e => {
    if (e.key !== 'Escape') return;
    if (!viewerEl.hidden) closeViewer();
    else if (!photoEditor.hidden) closePhoto();
    else closeSheet();
  });

  // ---------- app updates ----------
  const hasUpdate = () => Boolean(ui.latestVersion && ui.latestVersion !== APP_VERSION);

  // Icons added before v1.3.0 used status-bar-style black-translucent, which iOS saves
  // with the icon. It leaves the bottom of the screen empty (the web view is short by the
  // status bar height) and only re-adding the icon fixes it. Spot that case so the app
  // can explain what to do.
  let safeProbe = null;
  function needsReinstall() {
    if (navigator.standalone !== true) return false;
    if (!safeProbe) {
      safeProbe = document.createElement('div');
      safeProbe.style.cssText = 'position:fixed;top:0;left:0;width:0;height:0;visibility:hidden;pointer-events:none;padding-top:env(safe-area-inset-top)';
      document.body.appendChild(safeProbe);
    }
    const top = parseFloat(getComputedStyle(safeProbe).paddingTop) || 0;
    const full = innerHeight >= innerWidth ? Math.max(screen.width, screen.height) : Math.min(screen.width, screen.height);
    return top > 20 && full - innerHeight >= top - 2;
  }

  // Returns the version on the server, or null when offline.
  async function fetchLatestVersion() {
    try {
      const res = await fetch(`version.json?t=${Date.now()}`, { cache: 'no-store' });
      if (!res.ok) return null;
      const { version } = await res.json();
      return typeof version === 'string' ? version : null;
    } catch (e) {
      return null;
    }
  }

  let lastCheck = 0;
  async function checkForUpdate() {
    if (Date.now() - lastCheck < 60_000) return;
    lastCheck = Date.now();
    const latest = await fetchLatestVersion();
    if (!latest || latest === ui.latestVersion) return;
    ui.latestVersion = latest;
    if (hasUpdate() && (ui.tab === 'today' || ui.tab === 'settings')) renderCurrent();
  }

  // Throws away the offline copy and reloads, so the newest files come from the server.
  // Records live in localStorage and are not touched.
  async function applyUpdate() {
    if (ui.updating) return;
    ui.updating = true;
    toast('최신 버전으로 바꾸는 중…');
    try {
      const reg = navigator.serviceWorker && await navigator.serviceWorker.getRegistration();
      if (reg) await reg.update().catch(() => {});
      if (window.caches) {
        const keys = await caches.keys();
        await Promise.all(keys.filter(k => k.startsWith(CACHE_PREFIX)).map(k => caches.delete(k)));
      }
    } catch (e) { /* reload anyway */ }
    location.reload();
  }

  async function manualUpdate() {
    if (ui.updating) return;
    const latest = await fetchLatestVersion();
    if (!latest) { toast('인터넷 연결을 확인해 주세요'); return; }
    ui.latestVersion = latest;
    if (hasUpdate()) applyUpdate();
    else { toast(`이미 최신 버전이에요 (v${APP_VERSION})`); renderCurrent(); }
  }

  // The app may stay open past midnight; refresh dates when it comes back.
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState !== 'visible') return;
    renderCurrent();
    checkForUpdate();
    if (ui.tab === 'crew' && loggedIn()) loadBoard();
  });

  // If the app is left open on screen, roll over to the new day right after midnight.
  function scheduleMidnightRefresh() {
    const now = new Date();
    const next = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1, 0, 0, 5);
    setTimeout(() => { renderCurrent(); scheduleMidnightRefresh(); }, next - now);
  }



  // ---------- boot ----------
  // Crew invite links carry ?crew=CODE. (Old ?u=handle profile links just open the app.)
  const inviteCode = (new URLSearchParams(location.search).get('crew') || '').toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 6);
  if (location.search) history.replaceState(null, '', location.pathname);
  renderCurrent();
  if (inviteCode) {
    crew.pendingCode = inviteCode;
    setTab('crew');
    if (loggedIn()) joinCrew(inviteCode);
  } else if (loggedIn()) {
    setTimeout(() => loadCrews({ quiet: true }), 2000); // notices last week's crew win
  }
  loadPhotoThumbs();
  scheduleMidnightRefresh();
  setTimeout(checkForUpdate, 800);
  if (loggedIn()) setTimeout(() => cloudSync(), 1200);
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible' && loggedIn() && Date.now() - cloud.lastPull > 5 * 60 * 1000) cloudSync();
  });

  if (navigator.storage && navigator.storage.persist) navigator.storage.persist().catch(() => {});

  const isLocalDev = ['localhost', '127.0.0.1', '[::1]'].includes(location.hostname);
  if ('serviceWorker' in navigator && !isLocalDev) {
    addEventListener('load', () => {
      navigator.serviceWorker.register('./sw.js', { updateViaCache: 'none' }).catch(() => {});
    });
  }
})();
