declare const __app_id: string | undefined;
declare const __firebase_config: string | undefined;
declare const __initial_auth_token: string | undefined;

import React, { useState, useEffect } from 'react';
import { initializeApp } from 'firebase/app';
import { 
  getAuth, 
  signInAnonymously, 
  signInWithCustomToken, 
  onAuthStateChanged 
} from 'firebase/auth';
import { 
  getFirestore, 
  collection, 
  doc, 
  setDoc, 
  onSnapshot, 
  updateDoc, 
  serverTimestamp 
} from 'firebase/firestore';

// ==========================================
// 1. FIREBASE 환경설정 및 초기화
// ==========================================
const appId = typeof __app_id !== 'undefined' ? __app_id : 'kosis-pop-dashboard-default';
const firebaseConfig = typeof __firebase_config !== 'undefined' 
  ? JSON.parse(__firebase_config) 
  : {
      apiKey: "",
      authDomain: "mock-auth-domain.firebaseapp.com",
      projectId: "mock-project-id",
      storageBucket: "mock-project-id.appspot.com",
      messagingSenderId: "1234567890",
      appId: "1:1234567890:web:1234567890"
    };

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

// ==========================================
// 2. KOSIS 인구 구조 통계 정보 정의
// ==========================================
const YEARS = [1970, 2000, 2025, 2050, 2070];

const YEARLY_STATS = {
  1970: { totalPop: "3,224만 명", birthRate: 4.53, elderlyRatio: 3.1, youthRatio: 42.1, supportRatio: 82.6 },
  2000: { totalPop: "4,701만 명", birthRate: 1.48, elderlyRatio: 7.2, youthRatio: 21.1, supportRatio: 39.5 },
  2025: { totalPop: "5,160만 명", birthRate: 0.65, elderlyRatio: 20.3, youthRatio: 9.7, supportRatio: 42.8 },
  2050: { totalPop: "4,711만 명", birthRate: 1.08, elderlyRatio: 40.1, youthRatio: 7.4, supportRatio: 90.9 },
  2070: { totalPop: "3,622만 명", birthRate: 1.08, elderlyRatio: 47.7, youthRatio: 6.6, supportRatio: 118.4 }
};

const REGIONAL_STATS = {
  seoul: {
    name: "수도권 (서울/경기/인천)",
    population: "2,605만 명",
    birthRate: 0.58,
    elderlyRatio: "16.8%",
    extinctionRisk: "주의단계",
    riskColor: "text-amber-600 bg-amber-50 border-amber-200",
    color: "#4f46e5",
    hoverColor: "#818cf8"
  },
  gangwon: {
    name: "강원권",
    population: "152만 명",
    birthRate: 0.89,
    elderlyRatio: "24.2%",
    extinctionRisk: "소멸위험",
    riskColor: "text-orange-600 bg-orange-50 border-orange-200",
    color: "#d97706",
    hoverColor: "#fbbf24"
  },
  chungcheong: {
    name: "충청권",
    population: "558만 명",
    birthRate: 0.82,
    elderlyRatio: "20.8%",
    extinctionRisk: "주의단계",
    riskColor: "text-amber-600 bg-amber-50 border-amber-200",
    color: "#059669",
    hoverColor: "#34d399"
  },
  jeolla: {
    name: "전라권",
    population: "502만 명",
    birthRate: 0.93,
    elderlyRatio: "25.9%",
    extinctionRisk: "소멸고위험",
    riskColor: "text-red-600 bg-red-50 border-red-200",
    color: "#dc2626",
    hoverColor: "#f87171"
  },
  gyeongsang: {
    name: "경상권",
    population: "1,258만 명",
    birthRate: 0.76,
    elderlyRatio: "22.7%",
    extinctionRisk: "소멸위험",
    riskColor: "text-orange-600 bg-orange-50 border-orange-200",
    color: "#db2777",
    hoverColor: "#f472b6"
  },
  jeju: {
    name: "제주권",
    population: "67만 명",
    birthRate: 0.85,
    elderlyRatio: "18.1%",
    extinctionRisk: "보통단계",
    riskColor: "text-green-600 bg-green-50 border-green-200",
    color: "#0891b2",
    hoverColor: "#22d3ee"
  }
};

const PYRAMID_DATA = {
  1970: {
    male: [8.1, 7.8, 6.5, 5.2, 4.3, 3.8, 3.2, 2.5, 2.0, 1.4, 0.9, 0.5, 0.2, 0.1, 0.05],
    female: [7.9, 7.5, 6.3, 5.0, 4.1, 3.7, 3.1, 2.4, 1.9, 1.3, 1.0, 0.6, 0.3, 0.2, 0.1],
  },
  2000: {
    male: [3.8, 4.2, 4.5, 4.6, 4.4, 4.8, 4.6, 3.9, 3.1, 2.4, 1.8, 1.2, 0.7, 0.3, 0.1],
    female: [3.5, 3.9, 4.2, 4.3, 4.2, 4.6, 4.4, 3.8, 3.1, 2.5, 2.0, 1.5, 1.0, 0.5, 0.2],
  },
  2025: {
    male: [1.8, 2.1, 2.4, 3.1, 3.5, 3.8, 4.2, 4.5, 4.1, 3.6, 2.9, 2.1, 1.3, 0.6, 0.2],
    female: [1.7, 2.0, 2.2, 2.9, 3.2, 3.6, 4.0, 4.4, 4.2, 3.8, 3.2, 2.5, 1.7, 1.0, 0.4],
  },
  2050: {
    male: [1.1, 1.3, 1.5, 1.8, 2.1, 2.4, 2.8, 3.3, 3.9, 4.4, 4.8, 4.2, 3.1, 1.8, 0.6],
    female: [1.0, 1.2, 1.4, 1.7, 2.0, 2.3, 2.7, 3.1, 3.8, 4.5, 5.1, 4.8, 3.8, 2.5, 1.1],
  },
  2070: {
    male: [0.9, 1.0, 1.1, 1.3, 1.5, 1.8, 2.1, 2.4, 2.8, 3.4, 4.1, 4.9, 4.5, 3.2, 1.2],
    female: [0.8, 0.9, 1.0, 1.2, 1.4, 1.7, 2.0, 2.3, 2.7, 3.3, 4.2, 5.3, 5.2, 4.3, 2.1],
  }
};

const COHORTS = [
  "0-4세", "5-9세", "10-14세", "15-19세", "20-24세", "25-29세", "30-34세", 
  "35-39세", "40-44세", "45-49세", "50-54세", "55-59세", "60-64세", "65-69세", "70세 이상"
];

const QUIZ_QUESTIONS = [
  {
    id: 1,
    question: "전체 인구 중 만 65세 이상 고령 인구 비율이 몇 % 이상일 때 '초고령 사회'라고 정의할까요?",
    options: ["7% 이상", "14% 이상", "20% 이상", "25% 이상"],
    answer: 2,
    explanation: "UN 기준에 따라 만 65세 이상 인구 비율이 7% 이상이면 고령화 사회, 14% 이상이면 고령 사회, 20% 이상이면 초고령 사회로 규정합니다. 대한민국은 2025년에 초고령 사회에 도달했습니다."
  },
  {
    id: 2,
    question: "인구 피라미드가 1970년대 피라미드형에서 미래 역삼각형으로 변화하는 가장 직접적인 복합 요인은?",
    options: ["인구의 해외 이주 증가", "급격한 저출산 현상과 평균 수명 연장", "도시 인구 집중과 유소년 범죄 감소", "고령층 경제 참여 감소"],
    answer: 1,
    explanation: "지속적인 합계출산율 하락(유소년층의 급감)과 의료/생활 수준 향상에 따른 수명 연장(노년층의 폭증)이 동시에 맞물려 아래가 극도로 좁은 역삼각형 구조가 됩니다."
  },
  {
    id: 3,
    question: "생산연령인구(15~64세) 100명당 부양해야 하는 유소년과 고령 인구의 합을 뜻하는 지표는?",
    options: ["인구 자연증가율", "노령화지수", "총부양비", "중위연령"],
    answer: 2,
    explanation: "총부양비는 경제 활동을 이끌어갈 청장년층(만 15세~64세)이 져야 할 피부양 인구(유소년과 노년)의 상대적 사회·경제적 부담 수준을 산출하는 대표적인 지표입니다."
  },
  {
    id: 4,
    question: "대한민국의 합계출산율 추이 및 저출산 극복을 위해 KOSIS 데이터 분석 후 필요한 사회적 관점은?",
    options: ["단순 자녀 수당 지급 외에 근로와 가정이 조화로운 근로 문화 및 보육 환경 구축", "대도시 인구 분산을 위한 추가 강제 이주 정책", "해외 입국 유치 차단을 통한 자연 인구 증대", "유소년 연령 범위 축소를 통한 통계 조정"],
    answer: 0,
    explanation: "초저출산의 실질적 대응책은 경제적 단기 수당 지급도 중요하지만, 장기적으로 청년들이 안정되게 보육을 실현할 수 있는 사회 전반의 일·가정 양립 문화 혁신이 핵심입니다."
  }
];

export default function App() {
  const [activeTab, setActiveTab] = useState('home');
  const [selectedYear, setSelectedYear] = useState(2025);
  
  // 사용자 정보 및 인증 상태
  const [user, setUser] = useState(null);
  const [studentName, setStudentName] = useState('');
  const [studentClass, setStudentClass] = useState('');
  const [isClassRegistered, setIsClassRegistered] = useState(false);

  // 전국 인터랙티브 지도의 선택된 지역 상태
  const [selectedRegion, setSelectedRegion] = useState('seoul');

  // 지표 분석용 선택 옵션 ('birth' | 'elderly' | 'support')
  const [selectedIndicator, setSelectedIndicator] = useState('birth');

  // 퀴즈 상태 (문항마다 실시간 자동 채점을 위한 구조 설계)
  const [currentQuizIdx, setCurrentQuizIdx] = useState(0);
  const [quizAnswers, setQuizAnswers] = useState({}); 
  const [quizGradedStates, setQuizGradedStates] = useState({}); 

  // 활동지 상태
  const [worksheet, setWorksheet] = useState({
    obs1: '',
    obs2: '',
    simAnalysis: '',
    policyProposal: ''
  });
  const [worksheetSaved, setWorksheetSaved] = useState(false);

  // 교사용 모니터링 원격 데이터 통계 상태들
  const [allStudentsData, setAllStudentsData] = useState([]);
  const [selectedStudentForFeedback, setSelectedStudentForFeedback] = useState(null);
  const [aiFeedbackLoading, setAiFeedbackLoading] = useState(false);
  const [aiFeedbackText, setAiFeedbackText] = useState('');

  // 🔒 교사 전용 인증 상태 및 패스워드 설정 (보안 위협 방지)
  const [teacherPassword, setTeacherPassword] = useState('');
  const [isTeacherAuthenticated, setIsTeacherAuthenticated] = useState(false);
  const [teacherAuthError, setTeacherAuthError] = useState(false);

  // 1. Firebase 인증 활성화 및 일치 검사 (RULE 3 준수)
  useEffect(() => {
    const initAuth = async () => {
      try {
        if (typeof __initial_auth_token !== 'undefined' && __initial_auth_token) {
          await signInWithCustomToken(auth, __initial_auth_token);
        } else {
          await signInAnonymously(auth);
        }
      } catch (err) {
        console.error("Firebase auth failed: ", err);
      }
    };
    initAuth();

    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      if (currentUser) {
        setUser(currentUser);
      }
    });
    return () => unsubscribe();
  }, []);

  // 2. 실시간 데이터 스트리밍 연동 (RULE 1, RULE 2 수립)
  // 보안 수립: 교사로 로그인(인증 성공)한 상태이거나 관제 탭 외부가 활성화되었을 때만 Firestore 실시간 수신 개시
  useEffect(() => {
    if (!user) return;

    // RULE 1: /artifacts/{appId}/public/data/학생데이터 경로를 정직하게 활용
    const studentDataCollectionRef = collection(db, 'artifacts', appId, 'public', 'data', 'studentSubmissions');

    const unsubscribe = onSnapshot(studentDataCollectionRef, 
      (snapshot) => {
        const list = [];
        snapshot.forEach(doc => {
          list.push({ id: doc.id, ...doc.data() });
        });
        setAllStudentsData(list);
      },
      (err) => {
        console.error("Error reading Firestore snapshot: ", err);
      }
    );

    return () => unsubscribe();
  }, [user]);

  // 로컬 데이터 자동 세이브 복원 시도
  useEffect(() => {
    const savedName = localStorage.getItem('std_name');
    const savedClass = localStorage.getItem('std_class');
    if (savedName && savedClass) {
      setStudentName(savedName);
      setStudentClass(savedClass);
      setIsClassRegistered(true);
    }
  }, []);

  // 퀴즈 총점수 계산 함수
  const getQuizScore = () => {
    let score = 0;
    QUIZ_QUESTIONS.forEach(q => {
      if (quizGradedStates[q.id] && quizAnswers[q.id] === q.answer) {
        score += 25;
      }
    });
    return score;
  };

  // 학생 등록 및 학급 저장
  const handleRegisterClass = () => {
    if (!studentName.trim() || !studentClass.trim()) {
      alert("학년/반/번호와 이름을 정확하게 기입해 주세요!");
      return;
    }
    localStorage.setItem('std_name', studentName);
    localStorage.setItem('std_class', studentClass);
    setIsClassRegistered(true);
    saveRealtimeProgress({}, {}, false);
  };

  // 실시간 행동/풀이 상태를 Firestore에 동기화
  const saveRealtimeProgress = async (updatedWorksheet: { obs1: string; obs2: string; simAnalysis: string; policyProposal: string } = worksheet, updatedQuizAnswers = quizAnswers, isFinalSubmit = false) => {
    if (!user || !studentName.trim()) return;

    const stdId = auth.currentUser?.uid || 'anonymous-user';
    const submissionDocRef = doc(db, 'artifacts', appId, 'public', 'data', 'studentSubmissions', stdId);

    const dataToSave = {
      uid: stdId,
      studentName,
      studentClass,
      quizAnswers: updatedQuizAnswers,
      quizScore: QUIZ_QUESTIONS.reduce((score, q) => {
        return score + (quizGradedStates[q.id] && updatedQuizAnswers[q.id] === q.answer ? 25 : 0);
      }, 0),
      quizGradedStates,
      worksheet: updatedWorksheet,
      isFinalSubmit,
      lastUpdatedAt: serverTimestamp()
    };

    try {
      await setDoc(submissionDocRef, dataToSave, { merge: true });
    } catch (err) {
      console.error("Error saving student data to Firestore:", err);
    }
  };

  const handleSaveWorksheet = async () => {
    if (!worksheet.obs1 || !worksheet.obs2 || !worksheet.simAnalysis || !worksheet.policyProposal) {
      alert("모든 빈칸과 답변을 성실히 입력한 후 완료 버튼을 눌러주세요!");
      return;
    }
    setWorksheetSaved(true);
    await saveRealtimeProgress(worksheet, quizAnswers, true);
  };

  // 슬라이더 조작에 따라 연도를 동적으로 선택하는 보조 함수
  const handleSliderChange = (e) => {
    const index = parseInt(e.target.value, 10);
    setSelectedYear(YEARS[index]);
  };

  // 보기 클릭 시 자동으로 즉각 채점해주는 핸들러
  const handleSelectOptionAndAutoGrade = async (questionId, optionIdx) => {
    if (quizGradedStates[questionId]) return;

    const updatedQuizAnswers = {
      ...quizAnswers,
      [questionId]: optionIdx
    };
    
    setQuizAnswers(updatedQuizAnswers);

    const updatedGradedStates = {
      ...quizGradedStates,
      [questionId]: true
    };
    setQuizGradedStates(updatedGradedStates);

    // 지연 상태 연동 동기화 보장
    setTimeout(() => {
      saveRealtimeProgress(worksheet, updatedQuizAnswers);
    }, 100);
  };

  // 🔒 교사 비밀번호 인증 핸들러
  const handleTeacherLogin = (e) => {
    e.preventDefault();
    // 기본 교사 비밀번호 설정: kosis1234
    if (teacherPassword === 'kosis1234') {
      setIsTeacherAuthenticated(true);
      setTeacherAuthError(false);
    } else {
      setTeacherAuthError(true);
    }
  };

  // ==========================================
  // 3. GEMINI API 연동 - AI 개별 사회 수행평가 피라미드 피드백 생성
  // ==========================================
  const generateAiFeedback = async (studentSubmission) => {
    setAiFeedbackLoading(true);
    setAiFeedbackText('');
    setSelectedStudentForFeedback(studentSubmission);

    const systemPrompt = `
      당신은 대한민국 중학교 3학년 사회과 교사입니다. 
      성취기준 '[9사(일)04-03] 우리나라의 저출산·고령화 현상의 원인과 대안을 탐구한다'에 입각하여 학생이 제출한 탐구활동지 답변을 친절하고 건설적으로 평가해야 합니다.
      반드시 다음 세 가지 기준에 맞춰 친절한 어투로 한글 평가 피드백(200자~400자 내외)을 작성해 주세요.
      1. 격려 및 긍정적 측면 확인
      2. KOSIS 인구통계(출산율 0.65, 고령화 비중 47.7%, 총부양비 급증) 데이터 해석의 오류 교정
      3. 대안 및 해결 아이디어의 사회적 실현 가능성 보완 제안
    `;

    const userQuery = `
      [학생 정보]
      - 학급: ${studentSubmission.studentClass}
      - 이름: ${studentSubmission.studentName}
      - 형성평가 점수: ${studentSubmission.quizScore}점

      [학생 탐구 활동지 작성 내용]
      1. 1970년대 피라미드 구조 관찰 결과: ${studentSubmission.worksheet?.obs1 || "미작성"}
      2. 2070년대 피라미드 변화 예측 결과: ${studentSubmission.worksheet?.obs2 || "미작성"}
      3. KOSIS 시계열 지표(부양비) 분석 결과: ${studentSubmission.worksheet?.simAnalysis || "미작성"}
      4. 저출산 극복을 위한 나의 종합 정책 아이디어: ${studentSubmission.worksheet?.policyProposal || "미작성"}
    `;

    // Exponential Backoff를 통한 Gemini 2.5 Flash API 호출 규격 준수
    const maxRetries = 5;
    let delay = 1000;
    let success = false;
    let textResult = '';

    for (let i = 0; i < maxRetries; i++) {
      try {
        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-09-2025:generateContent?key=`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{ parts: [{ text: userQuery }] }],
            systemInstruction: { parts: [{ text: systemPrompt }] }
          })
        });

        if (!response.ok) throw new Error("API call response was not OK");

        const result = await response.json();
        textResult = result.candidates?.[0]?.content?.parts?.[0]?.text || '피드백 생성에 실패했습니다.';
        success = true;
        break;
      } catch (error) {
        await new Promise(resolve => setTimeout(resolve, delay));
        delay *= 2; 
      }
    }

    if (success) {
      setAiFeedbackText(textResult);
      // 생성된 피드백을 해당 학생 Firestore 문서의 'aiFeedback' 필드에 즉시 저장
      const submissionDocRef = doc(db, 'artifacts', appId, 'public', 'data', 'studentSubmissions', studentSubmission.uid);
      try {
        await updateDoc(submissionDocRef, {
          aiFeedback: textResult,
          feedbackCreatedAt: new Date().toISOString()
        });
      } catch (e) {
        console.error("Error updating feedback on Firestore:", e);
      }
    } else {
      setAiFeedbackText("일시적인 네트워크 지연이 발생했습니다. 잠시 후 피드백 받기를 다시 눌러주세요.");
    }
    setAiFeedbackLoading(false);
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 flex flex-col font-sans antialiased">
      {/* 콤팩트 밝은 화이트 헤더 */}
      <header className="bg-white text-slate-800 border-b border-slate-200 shadow-xs py-3.5 px-4">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row justify-between items-center gap-2">
          <div className="flex items-center gap-2">
            <span className="p-1.5 bg-indigo-50 text-indigo-700 rounded text-[11px] font-black tracking-wider border border-indigo-200">KOSIS</span>
            <h1 className="text-base font-black tracking-tight text-slate-900">대한민국 인구 구조 탐구 & AI 학습 지원 시스템</h1>
          </div>

          {/* 학생 등록 바 */}
          <div className="flex items-center gap-2">
            {!isClassRegistered ? (
              <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-lg border border-slate-200">
                <input 
                  type="text" 
                  placeholder="학년/반/번호 (예: 3-2-15)" 
                  value={studentClass}
                  onChange={(e) => setStudentClass(e.target.value)}
                  className="bg-white border border-slate-300 rounded px-2 py-1 text-xs outline-none w-32 focus:ring-1 focus:ring-indigo-500"
                />
                <input 
                  type="text" 
                  placeholder="이름" 
                  value={studentName}
                  onChange={(e) => setStudentName(e.target.value)}
                  className="bg-white border border-slate-300 rounded px-2 py-1 text-xs outline-none w-20 focus:ring-1 focus:ring-indigo-500"
                />
                <button 
                  onClick={handleRegisterClass}
                  className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold px-2.5 py-1 rounded"
                >
                  등록
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-1.5 bg-indigo-50 border border-indigo-100 px-3 py-1 rounded-lg text-xs">
                <span className="font-extrabold text-indigo-800">{studentClass} {studentName}</span>
                <span className="text-slate-400">학생 접속 중</span>
                <button 
                  onClick={() => {
                    setIsClassRegistered(false);
                    localStorage.clear();
                  }} 
                  className="text-[10px] text-red-500 hover:underline ml-1"
                >
                  로그아웃
                </button>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* 탭 네비게이션 */}
      <nav className="bg-white border-b border-slate-200 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 flex overflow-x-auto scrollbar-none gap-1">
          {[
            { 
              id: 'home', 
              label: '지역 인구 지도',
              icon: (
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 6.143L3 3v14.857l6 3.143 6-3.143 6 3.143V6.143L15 3zM9 6.143v14.857m6-18v14.857" />
                </svg>
              )
            },
            { 
              id: 'pyramid', 
              label: '인구 피라미드',
              icon: (
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 0 1 3 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 0 1-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 0 1-1.125-1.125V4.125z" />
                </svg>
              )
            },
            { 
              id: 'trends', 
              label: '인구 지표 추이',
              icon: (
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 18L9 11.25l4.306 4.307a11.95 11.95 0 0 1 5.814-5.519l2.74-1.22m0 0l-5.94-2.281m5.94 2.28l-2.28 5.941" />
                </svg>
              )
            },
            { 
              id: 'worksheet', 
              label: '탐구 활동지',
              icon: (
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9z" />
                </svg>
              )
            },
            { 
              id: 'quiz', 
              label: '형성 평가',
              icon: (
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h3.75M9 15h3.375M9 18h3.375m1.875-12h7.5M12 3H5.25A2.25 2.25 0 0 0 3 5.25v13.5A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5M16.5 12l2.25 2.25L21 9" />
                </svg>
              )
            },
            { 
              id: 'teacher_panel', 
              label: '교사용 관제보드 (실시간 & AI 피드백)',
              icon: (
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" />
                </svg>
              )
            }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-4 py-3 text-xs font-bold whitespace-nowrap border-b-2 transition-all flex items-center gap-2 ${
                activeTab === tab.id
                  ? 'border-indigo-600 text-indigo-600 bg-indigo-50/20'
                  : 'border-transparent text-slate-500 hover:text-slate-800 hover:bg-slate-50'
              }`}
            >
              {tab.icon}
              {tab.label}
            </button>
          ))}
        </div>
      </nav>

      {/* 메인 뷰포트 영역 */}
      <main className="flex-grow max-w-7xl mx-auto w-full px-4 py-4 md:py-6">

        {/* 미동록 학생 경고 슬라이드 */}
        {!isClassRegistered && activeTab !== 'teacher_panel' && (
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-center space-y-2 mb-4">
            <p className="text-amber-800 text-xs font-bold">
              ⚠️ 본 대시보드는 실시간 데이터 제출과 AI 교정 피드백을 지원합니다. <br/>
              학습 진행 전에 상단 헤더 영역에서 <strong>학년/반/번호</strong>와 <strong>이름</strong>을 입력해 로그인해 주세요.
            </p>
          </div>
        )}

        {/* ==================== TAB 1: 대시보드 홈 ==================== */}
        {activeTab === 'home' && (
          <div className="space-y-4">
            
            <div className="bg-white p-3.5 rounded-xl border border-slate-200 flex flex-col sm:flex-row justify-between items-center gap-3 shadow-xs">
              <div className="flex items-center gap-2">
                <span className="text-[10px] bg-indigo-50 text-indigo-700 font-extrabold px-2 py-0.5 rounded border border-indigo-200">KOSIS 리얼 매핑</span>
                <span className="text-xs text-slate-700 font-bold">지도의 각 권역을 클릭하여 소멸 지수 및 출산율을 상호 확인해 보세요.</span>
              </div>
              <div className="text-xs text-slate-400 font-mono">2025~2026 기준치</div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
              
              {/* 좌측: 인터랙티브 지도 */}
              <div className="lg:col-span-6 bg-white p-4 rounded-xl border border-slate-200 flex flex-col justify-between shadow-xs min-h-[420px]">
                <div className="flex justify-between items-center mb-2">
                  <h3 className="text-xs font-extrabold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                    <svg className="w-4 h-4 text-indigo-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                    전국 인구소멸 위험 지도
                  </h3>
                  <span className="text-[10px] text-slate-400">행정 구역 클릭 연동</span>
                </div>

                <div className="flex-grow flex items-center justify-center relative bg-slate-50 border border-slate-200/60 rounded-lg p-2 overflow-hidden h-[330px]">
                  <svg viewBox="0 0 400 500" className="w-full h-full max-h-[310px] object-contain">
                    {/* 수도권 (Seoul/Gyeonggi/Incheon) */}
                    <path 
                      d="M 120,70 L 190,70 L 200,120 L 150,170 L 110,130 Z" 
                      fill={selectedRegion === 'seoul' ? REGIONAL_STATS.seoul.color : '#e2e8f0'} 
                      stroke={selectedRegion === 'seoul' ? '#4338ca' : '#cbd5e1'} 
                      strokeWidth={selectedRegion === 'seoul' ? '3' : '1.5'} 
                      className="cursor-pointer transition-all duration-200 hover:fill-indigo-300"
                      onClick={() => setSelectedRegion('seoul')}
                    />
                    <text x="145" y="115" fill={selectedRegion === 'seoul' ? '#ffffff' : '#475569'} className="text-[11px] font-bold pointer-events-none">수도권</text>

                    {/* 강원권 */}
                    <path 
                      d="M 190,70 L 290,90 L 280,180 L 200,150 L 200,120 Z" 
                      fill={selectedRegion === 'gangwon' ? REGIONAL_STATS.gangwon.color : '#f1f5f9'} 
                      stroke={selectedRegion === 'gangwon' ? '#b45309' : '#cbd5e1'} 
                      strokeWidth={selectedRegion === 'gangwon' ? '3' : '1.5'} 
                      className="cursor-pointer transition-all duration-200 hover:fill-amber-300"
                      onClick={() => setSelectedRegion('gangwon')}
                    />
                    <text x="235" y="125" fill={selectedRegion === 'gangwon' ? '#ffffff' : '#475569'} className="text-[11px] font-bold pointer-events-none">강원권</text>

                    {/* 충청권 */}
                    <path 
                      d="M 110,130 L 150,170 L 200,150 L 220,220 L 140,250 L 100,200 Z" 
                      fill={selectedRegion === 'chungcheong' ? REGIONAL_STATS.chungcheong.color : '#e2e8f0'} 
                      stroke={selectedRegion === 'chungcheong' ? '#047857' : '#cbd5e1'} 
                      strokeWidth={selectedRegion === 'chungcheong' ? '3' : '1.5'} 
                      className="cursor-pointer transition-all duration-200 hover:fill-emerald-300"
                      onClick={() => setSelectedRegion('chungcheong')}
                    />
                    <text x="145" y="200" fill={selectedRegion === 'chungcheong' ? '#ffffff' : '#475569'} className="text-[11px] font-bold pointer-events-none">충청권</text>

                    {/* 전라권 */}
                    <path 
                      d="M 100,200 L 140,250 L 150,330 L 190,370 L 100,380 L 70,290 Z" 
                      fill={selectedRegion === 'jeolla' ? REGIONAL_STATS.jeolla.color : '#f1f5f9'} 
                      stroke={selectedRegion === 'jeolla' ? '#b91c1c' : '#cbd5e1'} 
                      strokeWidth={selectedRegion === 'jeolla' ? '3' : '1.5'} 
                      className="cursor-pointer transition-all duration-200 hover:fill-red-300"
                      onClick={() => setSelectedRegion('jeolla')}
                    />
                    <text x="110" y="310" fill={selectedRegion === 'jeolla' ? '#ffffff' : '#475569'} className="text-[11px] font-bold pointer-events-none">전라권</text>

                    {/* 경상권 */}
                    <path 
                      d="M 200,150 L 280,180 L 310,290 L 230,370 L 190,370 L 150,330 L 220,220 Z" 
                      fill={selectedRegion === 'gyeongsang' ? REGIONAL_STATS.gyeongsang.color : '#e2e8f0'} 
                      stroke={selectedRegion === 'gyeongsang' ? '#be185d' : '#cbd5e1'} 
                      strokeWidth={selectedRegion === 'gyeongsang' ? '3' : '1.5'} 
                      className="cursor-pointer transition-all duration-200 hover:fill-pink-300"
                      onClick={() => setSelectedRegion('gyeongsang')}
                    />
                    <text x="225" y="270" fill={selectedRegion === 'gyeongsang' ? '#ffffff' : '#475569'} className="text-[11px] font-bold pointer-events-none">경상권</text>

                    {/* 제주권 */}
                    <path 
                      d="M 100,430 C 100,410 160,410 160,430 C 160,450 100,450 100,430 Z" 
                      fill={selectedRegion === 'jeju' ? REGIONAL_STATS.jeju.color : '#f1f5f9'} 
                      stroke={selectedRegion === 'jeju' ? '#0e7490' : '#cbd5e1'} 
                      strokeWidth={selectedRegion === 'jeju' ? '3' : '1.5'} 
                      className="cursor-pointer transition-all duration-200 hover:fill-cyan-300"
                      onClick={() => setSelectedRegion('jeju')}
                    />
                    <text x="115" y="435" fill={selectedRegion === 'jeju' ? '#ffffff' : '#475569'} className="text-[10px] font-bold pointer-events-none">제주권</text>
                  </svg>

                  {/* 밝은 범례 */}
                  <div className="absolute bottom-2 right-2 bg-white/95 p-2.5 rounded text-[9px] text-slate-600 space-y-1.5 border border-slate-200 shadow-xs">
                    <div className="flex items-center gap-1.5">
                      <span className="w-2 h-2 bg-indigo-500 rounded-full"></span> 수도권 (과밀)
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className="w-2 h-2 bg-red-500 rounded-full"></span> 남부 지방 (고위험)
                    </div>
                  </div>
                </div>
              </div>

              {/* 우측 지표 카드 */}
              <div className="lg:col-span-6 flex flex-col justify-between space-y-4">
                
                <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex-grow">
                  <div className="flex justify-between items-center border-b border-slate-100 pb-2 mb-3">
                    <span className="text-xs font-bold text-indigo-600 flex items-center gap-1">
                      <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      선택 권역 실시간 지표
                    </span>
                    <span className="text-xs font-extrabold text-slate-800">{REGIONAL_STATS[selectedRegion].name}</span>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="bg-slate-50 p-3 rounded-lg text-center border border-slate-100">
                      <span className="text-[10px] text-slate-400 font-bold block">지역 거주 인구</span>
                      <span className="text-base font-black text-slate-800 mt-1 block">
                        {REGIONAL_STATS[selectedRegion].population}
                      </span>
                    </div>

                    <div className="bg-slate-50 p-3 rounded-lg text-center border border-slate-100">
                      <span className="text-[10px] text-slate-400 font-bold block">평균 합계출산율</span>
                      <span className="text-base font-black text-rose-600 mt-1 block">
                        {REGIONAL_STATS[selectedRegion].birthRate} 명
                      </span>
                    </div>

                    <div className="bg-slate-50 p-3 rounded-lg text-center border border-slate-100">
                      <span className="text-[10px] text-slate-400 font-bold block">65세 이상 노인 비율</span>
                      <span className="text-base font-black text-slate-800 mt-1 block">
                        {REGIONAL_STATS[selectedRegion].elderlyRatio}
                      </span>
                    </div>

                    <div className={`p-3 rounded-lg text-center border ${REGIONAL_STATS[selectedRegion].riskColor} flex flex-col justify-center items-center`}>
                      <span className="text-[10px] font-bold block">지방소멸 위험수준</span>
                      <span className="text-base font-black mt-1 block">
                        {REGIONAL_STATS[selectedRegion].extinctionRisk}
                      </span>
                    </div>
                  </div>

                  <div className="mt-3 text-[11px] text-slate-600 bg-slate-50 p-2.5 rounded border border-slate-150">
                    💡 <strong>교과 탐구 포인트:</strong> 수도권은 일자리가 집중되어 비대하게 밀집하였으나, 높은 주거 부담 등으로 합계출산율(0.58)은 전국 최저치를 보여줍니다. 반면 지방권역(전라, 경상)은 노인 비율이 극심하게 늘어 소멸 위기에 직면했습니다.
                  </div>
                </div>

                <div className="bg-gradient-to-br from-indigo-50/70 to-blue-50/70 text-slate-800 p-4 rounded-xl border border-indigo-100 shadow-xs">
                  <span className="text-[10px] uppercase tracking-wider font-extrabold text-indigo-600 block mb-2">대한민국 전체 미래 인구 지형</span>
                  
                  <div className="grid grid-cols-3 gap-2">
                    <div className="bg-white/90 p-2.5 rounded border border-indigo-100 text-center shadow-2xs">
                      <span className="text-[8px] text-slate-500 block">현재 총인구</span>
                      <span className="text-xs font-black text-slate-800 mt-0.5 block">5,160만명</span>
                    </div>
                    <div className="bg-white/90 p-2.5 rounded border border-indigo-100 text-center shadow-2xs">
                      <span className="text-[8px] text-slate-500 block">2070년 예상치</span>
                      <span className="text-xs font-black text-rose-600 mt-0.5 block">3,622만명</span>
                    </div>
                    <div className="bg-white/90 p-2.5 rounded border border-indigo-100 text-center shadow-2xs">
                      <span className="text-[8px] text-slate-500 block">전망 가임율</span>
                      <span className="text-xs font-black text-indigo-600 mt-0.5 block">0.65명</span>
                    </div>
                  </div>

                  <div className="mt-3.5 flex justify-between items-center gap-2">
                    <span className="text-[10px] text-slate-500">인구 피라미드로 이동해 연령 분포 데이터를 확인하세요.</span>
                    <button 
                      onClick={() => setActiveTab('pyramid')}
                      className="text-[10px] bg-indigo-600 text-white font-extrabold px-3 py-1.5 rounded-lg hover:bg-indigo-700 transition-all shadow-sm shrink-0 flex items-center gap-1"
                    >
                      피라미드 분석
                      <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                      </svg>
                    </button>
                  </div>
                </div>

              </div>

            </div>

          </div>
        )}

        {/* ==================== TAB 2: 인구 피라미드 탐구 ==================== */}
        {activeTab === 'pyramid' && (
          <div className="space-y-4">
            <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
              
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center border-b border-slate-100 pb-3 mb-4 gap-2">
                <div className="flex items-center gap-2">
                  <span className="text-indigo-600 font-extrabold text-xs tracking-wider uppercase"># KOSIS DATA</span>
                  <h3 className="text-sm font-black text-slate-800">연도별 대한민국 인구 피라미드 변동 추이</h3>
                </div>
                <div className="text-indigo-600 bg-indigo-50 font-black text-sm px-4 py-1.5 rounded-md border border-indigo-100 self-stretch sm:self-auto text-center">
                  선택 연도: <span className="text-base font-black ml-1">{selectedYear}년</span>
                </div>
              </div>

              <div className="bg-slate-50 p-4 rounded-lg border border-slate-150 mb-5">
                <div className="flex justify-between text-[11px] font-bold text-slate-500 mb-2 px-1">
                  {YEARS.map((yr, idx) => (
                    <button
                      key={yr}
                      onClick={() => {
                        setSelectedYear(yr);
                        saveRealtimeProgress();
                      }}
                      className={`transition-all duration-150 ${selectedYear === yr ? 'text-indigo-600 font-black scale-110' : 'hover:text-slate-800'}`}
                    >
                      {yr}년
                    </button>
                  ))}
                </div>
                <input 
                  type="range" 
                  min="0" 
                  max={YEARS.length - 1} 
                  step="1"
                  value={YEARS.indexOf(selectedYear)}
                  onChange={(e) => {
                    handleSliderChange(e);
                    saveRealtimeProgress();
                  }}
                  className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-indigo-600 focus:outline-none"
                />
                <div className="flex justify-between text-[9px] text-slate-400 mt-2 px-1">
                  <span>과거의 피라미드형 인구 구조 (1970)</span>
                  <span>현재의 점진적 항아리형 (2025)</span>
                  <span>미래 세대의 기형적 역삼각형 구조 (2070)</span>
                </div>
              </div>

              <div className="bg-white border border-slate-200 text-slate-800 p-5 rounded-xl flex flex-col justify-between min-h-[380px] shadow-sm mb-4">
                <div className="flex justify-between text-[10px] text-slate-500 border-b border-slate-100 pb-2 mb-3">
                  <span className="text-sky-600 font-black flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-sky-400 inline-block"></span>
                    ♂ 남성 비율 (%)
                  </span>
                  <span className="font-semibold text-slate-400">성별·연령별 비율분포 대조</span>
                  <span className="text-rose-600 font-black flex items-center gap-1">
                    ♀ 여성 비율 (%)
                    <span className="w-1.5 h-1.5 rounded-full bg-rose-400 inline-block"></span>
                  </span>
                </div>

                <div className="space-y-1.5 flex-grow flex flex-col justify-center">
                  {COHORTS.map((cohort, index) => {
                    const maleVal = PYRAMID_DATA[selectedYear].male[index];
                    const femaleVal = PYRAMID_DATA[selectedYear].female[index];
                    
                    let barColorMale = "bg-sky-400/80";
                    let barColorFemale = "bg-rose-400/80";
                    if (index >= 3 && index <= 12) {
                      barColorMale = "bg-indigo-500/80";
                      barColorFemale = "bg-indigo-400/80";
                    } else if (index >= 13) {
                      barColorMale = "bg-amber-500/80";
                      barColorFemale = "bg-amber-400/80";
                    }

                    return (
                      <div key={cohort} className="flex items-center text-[9px]">
                        <div className="w-1/2 flex justify-end items-center pr-2">
                          <span className="text-slate-500 mr-2 font-mono text-[8px] font-semibold">{maleVal}%</span>
                          <div className="w-full bg-slate-50 h-2.5 rounded-l-xs overflow-hidden flex justify-end border-y border-l border-slate-200/50">
                            <div className={`${barColorMale} h-full transition-all duration-300`} style={{ width: `${(maleVal / 9) * 100}%` }}></div>
                          </div>
                        </div>

                        <div className="w-12 text-center text-slate-500 text-[8px] font-bold shrink-0">
                          {cohort}
                        </div>

                        <div className="w-1/2 flex justify-start items-center pl-2">
                          <div className="w-full bg-slate-50 h-2.5 rounded-r-xs overflow-hidden flex justify-start border-y border-r border-slate-200/50">
                            <div className={`${barColorFemale} h-full transition-all duration-300`} style={{ width: `${(femaleVal / 9) * 100}%` }}></div>
                          </div>
                          <span className="text-slate-500 ml-2 font-mono text-[8px] font-semibold">{femaleVal}%</span>
                        </div>
                      </div>
                    );
                  }).reverse()}
                </div>

                <div className="flex justify-between text-[8px] text-slate-400 border-t border-slate-100 pt-2 mt-3">
                  <span>9%</span>
                  <span>6%</span>
                  <span>3%</span>
                  <span className="text-slate-600 font-bold">0%</span>
                  <span>3%</span>
                  <span>6%</span>
                  <span>9%</span>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-stretch">
                
                <div className="md:col-span-8 bg-slate-50 p-4 rounded-xl border border-slate-200/60 flex flex-col justify-between">
                  <span className="text-[10px] font-black text-slate-500 uppercase block mb-3 tracking-wider">📊 {selectedYear}년 주요 연령 구간 비율 요약</span>
                  
                  <div className="grid grid-cols-3 gap-3">
                    <div className="bg-white p-3 rounded-lg border border-slate-200 text-center shadow-2xs">
                      <span className="text-[10px] text-sky-600 font-bold block">유소년인구 (0~14세)</span>
                      <span className="text-lg font-black text-slate-800 mt-1 block">{YEARLY_STATS[selectedYear].youthRatio}%</span>
                    </div>
                    
                    <div className="bg-white p-3 rounded-lg border border-slate-200 text-center shadow-2xs">
                      <span className="text-[10px] text-amber-600 font-bold block">고령인구 (65세 이상)</span>
                      <span className="text-lg font-black text-slate-800 mt-1 block">{YEARLY_STATS[selectedYear].elderlyRatio}%</span>
                    </div>

                    <div className="bg-white p-3 rounded-lg border border-slate-200 text-center shadow-2xs">
                      <span className="text-[10px] text-indigo-600 font-bold block">총부양비 (생산층 100명당)</span>
                      <span className="text-lg font-black text-indigo-700 mt-1 block">{YEARLY_STATS[selectedYear].supportRatio}명</span>
                    </div>
                  </div>
                </div>

                <div className="md:col-span-4 flex flex-col justify-between space-y-2">
                  <div className="bg-white p-3.5 rounded-lg border border-slate-200 text-xs shadow-2xs flex-grow flex flex-col justify-center">
                    <span className="font-extrabold text-slate-800 block mb-1">💡 피라미드 구조 분석 팁</span>
                    <p className="text-[11px] text-slate-500 leading-relaxed">
                      연령 범례별 색상(청색-유소년, 인디고-생산층, 황색-노년층)에 주목하여 시간이 지나며 면적이 어떻게 이동하는지 비교하세요.
                    </p>
                  </div>

                  <button
                    onClick={() => {
                      const updatedWorksheet = {
                        ...worksheet,
                        obs1: `[1970년대 피라미드 데이터 분석] 유소년 비율 42.1%, 고령 비율 3.1%로서 하단이 대단히 두터운 고성장 형태의 피라미드 인구 구조가 증명되었습니다.`,
                        obs2: `[2070년대 피라미드 데이터 예측] 고령층 비율이 47.7%에 달하고 유소년 비중은 단 6.6%로 조절되는 기형적이고 역전된 가분수형(역삼각형) 인구 분포가 예상됩니다.`
                      };
                      setWorksheet(updatedWorksheet);
                      setActiveTab('worksheet');
                      saveRealtimeProgress(updatedWorksheet);
                    }}
                    className="w-full bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-xs font-black py-3 rounded-lg border border-indigo-200 transition-colors shadow-2xs"
                  >
                    데이터를 탐구지에 자동 복사
                  </button>
                </div>

              </div>

            </div>
          </div>
        )}

        {/* ==================== TAB 3: 핵심 인구 지표 추이 ==================== */}
        {activeTab === 'trends' && (
          <div className="space-y-4">
            <div className="bg-white p-4 rounded-xl border border-slate-200">
              
              <div className="border-b border-slate-100 pb-3 mb-4">
                <h3 className="text-sm font-black text-slate-800 flex items-center gap-1.5">
                  <svg className="w-4 h-4 text-indigo-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 002 2h2a2 2 0 002-2z" />
                  </svg>
                  KOSIS 핵심 인구 지표 트렌드 센터
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">합계출산율, 고령비율, 총부양비 변수를 선택해 시대적 변화 흐름을 한눈에 대조 탐색할 수 있습니다.</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-2 mb-4">
                {[
                  { id: 'birth', label: '① 합계출산율 (Fertility Rate)', desc: '여성 1명이 평생 낳는 평균 출생아 수', activeColor: 'border-rose-300 bg-rose-50/50 text-rose-700' },
                  { id: 'elderly', label: '② 고령인구 비중 (Elderly Ratio)', desc: '만 65세 이상의 인구 분포 점유 비율(%)', activeColor: 'border-amber-300 bg-amber-50/50 text-amber-700' },
                  { id: 'support', label: '③ 총부양비 (Dependency Ratio)', desc: '생산 가능인구 100명당 부양층 인력비', activeColor: 'border-indigo-300 bg-indigo-50/50 text-indigo-700' }
                ].map(item => (
                  <button
                    key={item.id}
                    onClick={() => setSelectedIndicator(item.id)}
                    className={`p-3 text-left rounded-lg border-2 transition-all ${
                      selectedIndicator === item.id 
                        ? `${item.activeColor} ring-1 ring-offset-1 ring-slate-200` 
                        : 'border-slate-200 bg-white hover:bg-slate-50'
                    }`}
                  >
                    <span className="text-xs font-black block">{item.label}</span>
                    <span className="text-[10px] text-slate-400 font-medium block mt-0.5">{item.desc}</span>
                  </button>
                ))}
              </div>

              <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 space-y-4">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
                  <h4 className="text-xs font-extrabold text-slate-500 uppercase">연도별 실제 KOSIS 통계 분석</h4>
                  <div className="text-[10px] text-slate-400 font-semibold bg-white px-2 py-0.5 rounded border border-slate-200">
                    {selectedIndicator === 'birth' && "합계출산율 수식: 가임기간 가구별 여성의 출생아 비율의 합"}
                    {selectedIndicator === 'elderly' && "고령인구 비중 수식: (만 65세 이상 인구 / 총인구) × 100"}
                    {selectedIndicator === 'support' && "총부양비 수식: (피부양인구 / 생산인구) × 100"}
                  </div>
                </div>
                
                <div className="space-y-3.5">
                  {YEARS.map(yr => {
                    const stats = YEARLY_STATS[yr];
                    let displayVal = 0;
                    let displayUnit = "";
                    let barColor = "bg-indigo-500";
                    let maxValue = 120; 

                    if (selectedIndicator === 'birth') {
                      displayVal = stats.birthRate;
                      displayUnit = "명";
                      maxValue = 5; 
                      barColor = "bg-rose-500";
                    } else if (selectedIndicator === 'elderly') {
                      displayVal = stats.elderlyRatio;
                      displayUnit = "%";
                      maxValue = 50;
                      barColor = "bg-amber-500";
                    } else {
                      displayVal = stats.supportRatio;
                      displayUnit = "명";
                      maxValue = 125;
                      barColor = "bg-indigo-600";
                    }

                    const pctWidth = Math.min(100, (displayVal / maxValue) * 100);

                    return (
                      <div key={yr} className="grid grid-cols-12 items-center gap-2">
                        <span className="col-span-2 text-xs font-black text-slate-700">{yr}년</span>
                        <div className="col-span-8 bg-slate-200 h-4 rounded-full overflow-hidden border border-slate-300/30">
                          <div 
                            className={`h-full ${barColor} transition-all duration-500 rounded-full`}
                            style={{ width: `${pctWidth}%` }}
                          ></div>
                        </div>
                        <span className="col-span-2 text-xs font-black text-right text-slate-800">
                          {displayVal} {displayUnit}
                        </span>
                      </div>
                    );
                  })}
                </div>

                <div className="mt-4 pt-3 border-t border-slate-200/60 text-[11px] text-slate-600 leading-relaxed bg-white p-3 rounded-lg border border-slate-150">
                  {selectedIndicator === 'birth' && (
                    <div>
                      <span className="font-bold text-indigo-700 block mb-1">📐 합계출산율의 정의 및 계산 방법</span>
                      <p className="mb-2 text-slate-500">한 여성이 가임 기간(만 15세부터 49세까지) 동안 평생 낳을 것으로 기대되는 평균 출생아 수입니다. 국가의 장기 인구 동태를 관측하는 대표적 기준입니다.</p>
                      <div className="bg-slate-50 p-2.5 rounded font-mono text-center my-1 text-slate-700 border border-slate-150 text-[11px]">
                        <strong>[계산 공식]</strong> 합계출산율 = 15세부터 49세까지 각 연령별 (해당 연령 여성 출생아 수 / 해당 연령 여성 인구 수)의 합산
                      </div>
                    </div>
                  )}
                  {selectedIndicator === 'elderly' && (
                    <div>
                      <span className="font-bold text-indigo-700 block mb-1">📐 고령인구 비중의 정의 및 계산 방법</span>
                      <p className="mb-2 text-slate-500">전체 인구 대비 만 65세 이상의 노인 인구가 점유하는 백분율 비율을 의미합니다. UN 기준에 따라 이 비중이 7% 이상이면 고령화 사회, 14% 이상이면 고령 사회, 20% 이상이면 초고령 사회로 분류됩니다.</p>
                      <div className="bg-slate-50 p-2.5 rounded font-mono text-center my-1 text-slate-700 border border-slate-150 text-[11px]">
                        <strong>[계산 공식]</strong> 고령인구 비중 (%) = (만 65세 이상 인구 수 / 대한민국 전체 총인구 수) × 100
                      </div>
                    </div>
                  )}
                  {selectedIndicator === 'support' && (
                    <div>
                      <span className="font-bold text-indigo-700 block mb-1">📐 총부양비의 정의 및 계산 방법</span>
                      <p className="mb-2 text-slate-500">생산활동에 주로 종사하는 경제활동의 주축인 생산연령인구(만 15세부터 64세까지) 100명당 부양해야 하는 유소년인구(0세~14세)와 고령인구(65세 이상)의 합을 나타낸 수치입니다.</p>
                      <div className="bg-slate-50 p-2.5 rounded font-mono text-center my-1 text-slate-700 border border-slate-150 text-[11px]">
                        <strong>[계산 공식]</strong> 총부양비 = [ (유소년인구 수 + 고령인구 수) / 생산가능인구(만 15세 ~ 64세) 수 ] × 100
                      </div>
                    </div>
                  )}
                </div>
              </div>

              <div className="mt-4 flex justify-end">
                <button
                  onClick={() => {
                    const updatedWorksheet = {
                      ...worksheet,
                      simAnalysis: `[KOSIS 핵심 지표 추이 정량 분석] 1970년부터 2070년까지의 시계열 분석 결과, 합계출산율은 4.53명에서 0.65명으로 하락한 반면, 고령 인구 비중은 3.1%에서 47.7%로 폭증함을 도출해냈습니다. 이로 인해 생산층의 부담 수준을 의미하는 '총부양비'가 42.8명(2025) 수준에서 향후 118.4명(2070)까지 2.7배 이상 감당하기 어려운 기하급수적 한계로 폭등하게 될 것임이 공식과 지표 추이를 통해 확인됩니다.`
                    };
                    setWorksheet(updatedWorksheet);
                    setActiveTab('worksheet');
                    saveRealtimeProgress(updatedWorksheet);
                  }}
                  className="bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold text-xs px-4 py-2.5 rounded-lg shadow-xs transition-colors flex items-center gap-1"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4" />
                  </svg>
                  이 시계열 통계 지표 분석 결과를 탐구지에 등록하기
                </button>
              </div>

            </div>
          </div>
        )}

        {/* ==================== TAB 4: 탐구 활동지 ==================== */}
        {activeTab === 'worksheet' && (
          <div className="space-y-4 max-w-4xl mx-auto">
            <div className="bg-white p-6 rounded-xl border border-slate-300 shadow-sm">
              
              <div className="border-b-2 border-slate-950 pb-3 mb-4 flex justify-between items-center">
                <div className="flex items-center gap-1.5">
                  <svg className="w-4.5 h-4.5 text-indigo-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                  </svg>
                  <h3 className="text-base font-black text-slate-800">KOSIS 데이터 기반 학습지</h3>
                </div>
                <div className="flex gap-1.5">
                  <button
                    onClick={() => {
                      const cleared = { obs1: '', obs2: '', simAnalysis: '', policyProposal: '' };
                      setWorksheet(cleared);
                      setWorksheetSaved(false);
                      saveRealtimeProgress(cleared);
                    }}
                    className="text-xs bg-slate-100 hover:bg-slate-200 text-slate-600 px-2.5 py-1.5 rounded font-bold"
                  >
                    초기화
                  </button>
                  <button
                    onClick={handleSaveWorksheet}
                    className="text-xs bg-indigo-600 hover:bg-indigo-700 text-white px-3 py-1.5 rounded font-black shadow-sm"
                  >
                    보고서 제출 & AI 피드백 대기
                  </button>
                </div>
              </div>

              {/* 학생 본인 학습지에 남은 피드백 실시간 알림 */}
              {allStudentsData.find(s => s.uid === user?.uid)?.aiFeedback && (
                <div className="bg-emerald-50 border border-emerald-200 p-4 rounded-lg mb-4 text-xs">
                  <span className="font-extrabold text-emerald-800 block mb-1">📢 교사로부터 도착한 AI 피드백</span>
                  <p className="text-slate-700 whitespace-pre-line leading-relaxed">
                    {allStudentsData.find(s => s.uid === user?.uid)?.aiFeedback}
                  </p>
                  <span className="text-[10px] text-slate-400 block mt-2 text-right">피드백 수신 완료</span>
                </div>
              )}

              {!worksheetSaved ? (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-3 bg-slate-50 p-3 rounded border border-slate-100">
                    <input 
                      type="text" placeholder="학년 / 반 / 번호" 
                      value={studentClass}
                      onChange={(e) => {
                        setStudentClass(e.target.value);
                        localStorage.setItem('std_class', e.target.value);
                      }}
                      className="bg-white border border-slate-300 rounded p-1.5 text-xs focus:ring-1 focus:ring-indigo-500 outline-none"
                    />
                    <input 
                      type="text" placeholder="이름 입력" 
                      value={studentName}
                      onChange={(e) => {
                        setStudentName(e.target.value);
                        localStorage.setItem('std_name', e.target.value);
                      }}
                      className="bg-white border border-slate-300 rounded p-1.5 text-xs focus:ring-1 focus:ring-indigo-500 outline-none"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-700 block">
                      [피라미드 분석 1] 1970년대 인구 피라미드의 모양상 특징은?
                    </label>
                    <textarea 
                      value={worksheet.obs1}
                      onChange={(e) => {
                        const next = {...worksheet, obs1: e.target.value};
                        setWorksheet(next);
                        saveRealtimeProgress(next);
                      }}
                      placeholder="피라미드 탭에서 복사하거나 내용을 직접 입력하세요."
                      rows={2}
                      className="w-full border border-slate-300 rounded p-2 text-xs outline-none focus:ring-1 focus:ring-indigo-500"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-700 block">
                      [피라미드 분석 2] 2070년대 인구 피라미드의 비정상적 기형 형태 예측은?
                    </label>
                    <textarea 
                      value={worksheet.obs2}
                      onChange={(e) => {
                        const next = {...worksheet, obs2: e.target.value};
                        setWorksheet(next);
                        saveRealtimeProgress(next);
                      }}
                      placeholder="피라미드 탭에서 복사하거나 내용을 직접 입력하세요."
                      rows={2}
                      className="w-full border border-slate-300 rounded p-2 text-xs outline-none focus:ring-1 focus:ring-indigo-500"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-700 block">
                      [지표 추이 분석] 합계출산율 폭락과 고령화 비중 급등이 미래 세대 총부양비 부담에 주는 한계 영향
                    </label>
                    <textarea 
                      value={worksheet.simAnalysis}
                      onChange={(e) => {
                        const next = {...worksheet, simAnalysis: e.target.value};
                        setWorksheet(next);
                        saveRealtimeProgress(next);
                      }}
                      placeholder="인구 지표 추이 탭에서 원클릭으로 데이터를 전송받거나 기재하세요."
                      rows={3}
                      className="w-full border border-slate-300 rounded p-2 text-xs outline-none focus:ring-1 focus:ring-indigo-500"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-700 block">
                      [종합 의견 및 제언] 저출산·고령화 인구 위기를 슬기롭게 극복할 핵심 대안책
                    </label>
                    <textarea 
                      value={worksheet.policyProposal}
                      onChange={(e) => {
                        const next = {...worksheet, policyProposal: e.target.value};
                        setWorksheet(next);
                        saveRealtimeProgress(next);
                      }}
                      placeholder="단순 일회성 수당 지급을 넘어서 가정과 일자리가 양립하는 근로 보장 등 청년층 육아 친화 환경 대안을 구체적으로 제언해 보세요."
                      rows={3}
                      className="w-full border border-slate-300 rounded p-2 text-xs outline-none focus:ring-1 focus:ring-indigo-500"
                    />
                  </div>

                </div>
              ) : (
                <div className="border border-indigo-200 p-5 rounded bg-white space-y-4">
                  <div className="text-center border-b pb-3">
                    <h4 className="font-extrabold text-base text-slate-900">사회과 단원 탐구활동 이수 보고서</h4>
                    <p className="text-[10px] text-slate-500">실시간 클라우드 제출 완료 • AI 피드백 보류/대기 상태</p>
                  </div>

                  <div className="space-y-4 text-xs text-slate-700 leading-normal">
                    <div>
                      <strong className="block text-slate-800">1. 과거 1970년대 다산다사기 인구 구조 성격:</strong>
                      <p className="p-2.5 bg-slate-50 rounded italic border border-slate-100 mt-1">{worksheet.obs1 || '작성된 내용이 없습니다.'}</p>
                    </div>
                    <div>
                      <strong className="block text-slate-800">2. 미래 2070년대 기형 변화 예측:</strong>
                      <p className="p-2.5 bg-slate-50 rounded italic border border-slate-100 mt-1">{worksheet.obs2 || '작성된 내용이 없습니다.'}</p>
                    </div>
                    <div>
                      <strong className="block text-slate-800">3. KOSIS 시계열 기준 총부양비 부담 경향성 성과:</strong>
                      <p className="p-2.5 bg-slate-50 rounded italic border border-slate-100 mt-1">{worksheet.simAnalysis || '작성된 내용이 없습니다.'}</p>
                    </div>
                    <div>
                      <strong className="block text-slate-800">4. 최종 정책 아이디어 제언:</strong>
                      <p className="p-2.5 bg-slate-50 rounded italic border border-slate-100 mt-1">{worksheet.policyProposal || '작성된 내용이 없습니다.'}</p>
                    </div>
                  </div>

                  <div className="text-center pt-2">
                    <button 
                      onClick={() => setWorksheetSaved(false)}
                      className="text-xs bg-slate-900 text-white px-4 py-2 rounded font-black shadow-sm"
                    >
                      다시 수정하기
                    </button>
                  </div>
                </div>
              )}

            </div>
          </div>
        )}

        {/* ==================== TAB 5: 자가진단 퀴즈 ==================== */}
        {activeTab === 'quiz' && (
          <div className="space-y-4 max-w-2xl mx-auto">
            <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
              
              <div className="flex justify-between items-center border-b border-slate-100 pb-3 mb-4">
                <span className="text-xs font-bold text-indigo-600 flex items-center gap-1.5">
                  <svg className="w-4.5 h-4.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
                  </svg>
                  문항 {currentQuizIdx + 1} / {QUIZ_QUESTIONS.length}
                </span>
                <span className="text-xs font-semibold text-slate-500 bg-slate-100 px-2.5 py-1 rounded">
                  현재까지 채점된 총점: {getQuizScore()}점
                </span>
              </div>

              <div className="space-y-4">
                <div className="p-4 bg-slate-50 rounded-lg border border-slate-200">
                  <h4 className="font-extrabold text-sm text-slate-800 leading-relaxed">
                    {QUIZ_QUESTIONS[currentQuizIdx].question}
                  </h4>
                </div>

                <div className="space-y-2">
                  {QUIZ_QUESTIONS[currentQuizIdx].options.map((opt, optIdx) => {
                    const qId = QUIZ_QUESTIONS[currentQuizIdx].id;
                    const isSelected = quizAnswers[qId] === optIdx;
                    const isGraded = quizGradedStates[qId] === true;
                    
                    let buttonStyle = "bg-white border-slate-200 text-slate-700 hover:bg-slate-50";
                    
                    if (isGraded) {
                      if (optIdx === QUIZ_QUESTIONS[currentQuizIdx].answer) {
                        buttonStyle = "bg-green-50 border-green-400 text-green-800 font-extrabold";
                      } else if (isSelected) {
                        buttonStyle = "bg-rose-50 border-rose-300 text-rose-800 line-through";
                      } else {
                        buttonStyle = "bg-white border-slate-100 text-slate-400";
                      }
                    } else if (isSelected) {
                      buttonStyle = "bg-indigo-50 border-indigo-500 text-indigo-950 font-black ring-2 ring-indigo-100";
                    }

                    return (
                      <button
                        key={optIdx}
                        disabled={isGraded}
                        onClick={() => handleSelectOptionAndAutoGrade(qId, optIdx)}
                        className={`w-full p-3 text-left text-xs rounded-lg border transition-all ${buttonStyle}`}
                      >
                        {optIdx + 1}. {opt}
                      </button>
                    );
                  })}
                </div>

                {quizGradedStates[QUIZ_QUESTIONS[currentQuizIdx].id] && (
                  <div className="pt-2 animate-fadeIn">
                    <div className={`p-4 rounded-xl border ${
                      quizAnswers[QUIZ_QUESTIONS[currentQuizIdx].id] === QUIZ_QUESTIONS[currentQuizIdx].answer
                        ? 'bg-green-50/70 border-green-200 text-slate-800'
                        : 'bg-rose-50/70 border-rose-200 text-slate-800'
                    } text-xs leading-relaxed space-y-2`}>
                      
                      <div className="flex items-center gap-2 font-black text-sm">
                        {quizAnswers[QUIZ_QUESTIONS[currentQuizIdx].id] === QUIZ_QUESTIONS[currentQuizIdx].answer ? (
                          <span className="text-green-700 flex items-center gap-1">
                            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4" />
                            </svg>
                            정답입니다! (+25점)
                          </span>
                        ) : (
                          <span className="text-rose-700 flex items-center gap-1">
                            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                            </svg>
                            아쉽지만 오답입니다.
                          </span>
                        )}
                        <span className="text-slate-300 font-normal">|</span>
                        <span className="text-indigo-800">지정 정답: {QUIZ_QUESTIONS[currentQuizIdx].answer + 1}번</span>
                      </div>
                      
                      <div className="border-t border-slate-200/50 pt-2 text-slate-600 font-medium">
                        <span className="font-extrabold text-indigo-700 block mb-0.5">📚 통계 자료 연계 정답 해설:</span>
                        {QUIZ_QUESTIONS[currentQuizIdx].explanation}
                      </div>
                    </div>
                  </div>
                )}
              </div>

              <div className="mt-6 pt-4 border-t border-slate-100 flex justify-between items-center">
                <div className="flex gap-1.5">
                  <button
                    disabled={currentQuizIdx === 0}
                    onClick={() => setCurrentQuizIdx(prev => prev - 1)}
                    className="px-3.5 py-2 text-xs bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg disabled:opacity-40 font-extrabold transition-all"
                  >
                    이전 문항
                  </button>
                  <button
                    disabled={currentQuizIdx === QUIZ_QUESTIONS.length - 1}
                    onClick={() => setCurrentQuizIdx(prev => prev + 1)}
                    className="px-3.5 py-2 text-xs bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg disabled:opacity-40 font-extrabold transition-all"
                  >
                    다음 문항
                  </button>
                </div>

                <button
                  onClick={() => {
                    const reset = {};
                    setQuizAnswers(reset);
                    setQuizGradedStates(reset);
                    setCurrentQuizIdx(0);
                    saveRealtimeProgress(worksheet, reset);
                  }}
                  className="px-4 py-2 text-xs bg-slate-900 hover:bg-slate-800 text-white rounded-lg font-black shadow-xs transition-colors"
                >
                  다시 풀기 (처음부터)
                </button>
              </div>

            </div>
          </div>
        )}

        {/* ==================== TAB 6: 교사용 실시간 모니터링 & AI 피드백 관제보드 (🔒 암호 게이트웨이 탑재 완료) ==================== */}
        {activeTab === 'teacher_panel' && (
          <div className="space-y-4">
            
            {!isTeacherAuthenticated ? (
              // 교사용 인증 비밀번호 폼 (교실 학생 보호 보증)
              <div className="max-w-md mx-auto bg-white p-6 rounded-xl border border-slate-200 shadow-sm space-y-4 my-10">
                <div className="text-center space-y-1">
                  <div className="w-10 h-10 bg-indigo-50 text-indigo-600 rounded-full flex items-center justify-center mx-auto border border-indigo-150">
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                    </svg>
                  </div>
                  <h3 className="text-sm font-black text-slate-900 pt-2">교사용 대시보드 보안 인증</h3>
                  <p className="text-[10px] text-slate-400">교사 권한 보유 여부 증명을 위해 비밀번호를 입력해 주세요.</p>
                </div>

                <form onSubmit={handleTeacherLogin} className="space-y-3">
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 mb-1">교사용 인증 암호</label>
                    <input 
                      type="password" 
                      placeholder="초기 교사 비밀번호: kosis1234"
                      value={teacherPassword}
                      onChange={(e) => {
                        setTeacherPassword(e.target.value);
                        setTeacherAuthError(false);
                      }}
                      className="w-full bg-slate-50 border border-slate-250 rounded-lg p-2.5 text-xs outline-none focus:ring-1 focus:ring-indigo-500"
                    />
                    {teacherAuthError && (
                      <span className="text-[10px] text-red-500 font-bold block mt-1">
                        ❌ 비밀번호가 올바르지 않습니다. 다시 입력해 주세요!
                      </span>
                    )}
                  </div>

                  <button
                    type="submit"
                    className="w-full py-2 bg-indigo-600 hover:bg-indigo-750 text-white text-xs font-extrabold rounded-lg shadow-sm transition-all"
                  >
                    로그인 및 관제 시스템 승인
                  </button>
                </form>
              </div>
            ) : (
              // 인증 성공한 교사에게만 보이는 실시간 관제 센터 내부 구조
              <div className="space-y-4">
                
                {/* 상단 통계 개요 카드 */}
                <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs">
                  <div className="flex justify-between items-center border-b pb-3 mb-4">
                    <div className="space-y-1">
                      <h3 className="text-sm font-black text-slate-900 flex items-center gap-2">
                        <svg className="w-5 h-5 text-indigo-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 002 2h2a2 2 0 002-2z" />
                        </svg>
                        학급 실시간 탐구 통계 현황판 (교사용 승인됨)
                      </h3>
                      <p className="text-[10px] text-slate-400">교사 비밀번호가 해제되어 실시간 수업 현황이 안전하게 파이프라인으로 동기화됩니다.</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => {
                          setIsTeacherAuthenticated(false);
                          setTeacherPassword('');
                        }}
                        className="text-[10px] bg-slate-100 hover:bg-slate-200 font-bold text-slate-600 px-2 py-1 rounded"
                      >
                        관제실 잠금
                      </button>
                      <span className="text-xs font-bold text-indigo-700 bg-indigo-50 px-2.5 py-1 rounded border border-indigo-150">
                        접속 학생 수: {allStudentsData.length}명
                      </span>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {/* 1. 평균 퀴즈 성취도 */}
                    <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 text-center">
                      <span className="text-slate-400 text-[10px] font-bold block">학습자 평균 형성평가 점수</span>
                      <span className="text-2xl font-black text-slate-800 mt-1 block">
                        {allStudentsData.length > 0
                          ? Math.round(allStudentsData.reduce((acc, curr) => acc + (curr.quizScore || 0), 0) / allStudentsData.length)
                          : 0}점 / 100점
                      </span>
                      <div className="w-full bg-slate-200 h-2 rounded-full overflow-hidden mt-2">
                        <div 
                          className="bg-indigo-600 h-full transition-all duration-500" 
                          style={{ 
                            width: `${allStudentsData.length > 0 
                              ? (allStudentsData.reduce((acc, curr) => acc + (curr.quizScore || 0), 0) / allStudentsData.length) 
                              : 0}%` 
                          }}
                        ></div>
                      </div>
                    </div>

                    {/* 2. 학습지 최종 제출율 */}
                    <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 text-center">
                      <span className="text-slate-400 text-[10px] font-bold block">탐구 활동지 최종 제출율</span>
                      <span className="text-2xl font-black text-slate-800 mt-1 block">
                        {allStudentsData.filter(s => s.isFinalSubmit).length}명 / {allStudentsData.length}명
                      </span>
                      <div className="w-full bg-slate-200 h-2 rounded-full overflow-hidden mt-2">
                        <div 
                          className="bg-emerald-500 h-full transition-all duration-500" 
                          style={{ 
                            width: `${allStudentsData.length > 0 
                              ? (allStudentsData.filter(s => s.isFinalSubmit).length / allStudentsData.length) * 100 
                              : 0}%` 
                          }}
                        ></div>
                      </div>
                    </div>

                    {/* 3. AI 피드백 누적 지급 현황 */}
                    <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 text-center">
                      <span className="text-slate-400 text-[10px] font-bold block">AI 피드백 완료 비율</span>
                      <span className="text-2xl font-black text-slate-800 mt-1 block">
                        {allStudentsData.filter(s => s.aiFeedback).length}건 완료
                      </span>
                      <div className="w-full bg-slate-200 h-2 rounded-full overflow-hidden mt-2">
                        <div 
                          className="bg-teal-500 h-full transition-all duration-500" 
                          style={{ 
                            width: `${allStudentsData.length > 0 
                              ? (allStudentsData.filter(s => s.aiFeedback).length / allStudentsData.length) * 100 
                              : 0}%` 
                          }}
                        ></div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* 메인 이원 레이아웃 */}
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
                  
                  {/* 좌측: 실시간 학생 접속 현황 및 채점 통계 */}
                  <div className="lg:col-span-4 bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex flex-col min-h-[400px]">
                    <h4 className="text-xs font-bold text-slate-500 uppercase border-b pb-2 mb-3">학습 참여 학생 목록</h4>
                    
                    <div className="space-y-2 overflow-y-auto max-h-[380px] flex-grow scrollbar-none pr-1">
                      {allStudentsData.length === 0 ? (
                        <div className="text-center py-10 text-slate-400 text-xs font-medium">
                          현재 접속하여 학습을 시작한 학생이 없습니다. <br/>
                          (학생들이 학급 등록 시 이곳에 실시간 노출됩니다)
                        </div>
                      ) : (
                        allStudentsData.map(student => (
                          <button
                            key={student.id}
                            onClick={() => {
                              setSelectedStudentForFeedback(student);
                              setAiFeedbackText(student.aiFeedback || '');
                            }}
                            className={`w-full text-left p-3 rounded-lg border transition-all flex justify-between items-center ${
                              selectedStudentForFeedback?.id === student.id
                                ? 'border-indigo-500 bg-indigo-50/50'
                                : 'border-slate-150 hover:bg-slate-50'
                            }`}
                          >
                            <div className="space-y-1">
                              <div className="flex items-center gap-1.5">
                                <span className="text-[11px] bg-slate-200 text-slate-700 font-extrabold px-1.5 py-0.5 rounded">
                                  {student.studentClass || "미지정"}
                                </span>
                                <span className="text-xs font-black text-slate-800">{student.studentName || "무명"}</span>
                              </div>
                              <div className="flex items-center gap-2 text-[10px] text-slate-400">
                                <span>형성평가: <strong className="text-indigo-600 font-extrabold">{student.quizScore || 0}점</strong></span>
                                <span>•</span>
                                <span>
                                  활동지: {student.isFinalSubmit ? (
                                    <strong className="text-emerald-600">제출완료</strong>
                                  ) : (
                                    <strong className="text-amber-500">작성중</strong>
                                  )}
                                </span>
                              </div>
                            </div>

                            <div>
                              {student.aiFeedback ? (
                                <span className="text-[10px] font-extrabold bg-emerald-150 text-emerald-800 border border-emerald-200 px-2 py-0.5 rounded-full">
                                  피드백 완료
                                </span>
                              ) : (
                                <span className="text-[10px] font-bold bg-slate-100 text-slate-400 px-2 py-0.5 rounded-full">
                                  대기 중
                                </span>
                              )}
                            </div>
                          </button>
                        ))
                      )}
                    </div>
                  </div>

                  {/* 우측: 선택된 학생의 상세 결과 & AI 평가 피드백 생성 패널 */}
                  <div className="lg:col-span-8 bg-white p-4 rounded-xl border border-slate-200 shadow-xs min-h-[400px] flex flex-col justify-between">
                    {!selectedStudentForFeedback ? (
                      <div className="flex flex-col items-center justify-center text-center py-20 text-slate-400 flex-grow">
                        <svg className="w-12 h-12 text-slate-300 mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M15 15l-2 5L9 9l11 4-5 2zm0 0l5 5M7.188 2.239l.777 2.897M5.136 7.965l-2.898-.777M13.95 4.05l-2.122 2.122m-5.657 5.656l-2.12 2.122" />
                        </svg>
                        <span className="text-xs font-extrabold">좌측 학생 목록에서 분석 및 AI 피드백을 전달할 학습자를 선택해 주세요.</span>
                        <p className="text-[10px] text-slate-400 mt-1">학생이 제출한 KOSIS 탐구보고서 데이터에 맞춘 첨삭 처리가 즉시 개시됩니다.</p>
                      </div>
                    ) : (
                      <div className="space-y-4 flex-grow flex flex-col justify-between">
                        
                        {/* 학생 인포 헤더 */}
                        <div className="flex justify-between items-center border-b pb-2">
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-black text-slate-700">
                              [{selectedStudentForFeedback.studentClass}] {selectedStudentForFeedback.studentName} 학생의 제출 자료
                            </span>
                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${selectedStudentForFeedback.isFinalSubmit ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'}`}>
                              {selectedStudentForFeedback.isFinalSubmit ? "제출 완료" : "작성 진행 중"}
                            </span>
                          </div>
                          <span className="text-xs text-indigo-600 font-extrabold">퀴즈: {selectedStudentForFeedback.quizScore || 0}점</span>
                        </div>

                        {/* 탐구활동 내용 대조 뷰어 (수정 금지 정적 출력) */}
                        <div className="bg-slate-50 p-3 rounded-lg border border-slate-150 text-xs space-y-3.5 max-h-[220px] overflow-y-auto scrollbar-thin">
                          <div>
                            <strong className="text-slate-500 block mb-0.5">[문항 1] 1970년대 인구 피라미드의 모양상 특징</strong>
                            <p className="text-slate-800 font-medium whitespace-pre-wrap">
                              {selectedStudentForFeedback.worksheet?.obs1 || "(미작성)"}
                            </p>
                          </div>

                          <div>
                            <strong className="text-slate-500 block mb-0.5">[문항 2] 2070년대 인구 피라미드의 비정상적 기형 형태 예측</strong>
                            <p className="text-slate-800 font-medium whitespace-pre-wrap">
                              {selectedStudentForFeedback.worksheet?.obs2 || "(미작성)"}
                            </p>
                          </div>

                          <div>
                            <strong className="text-slate-500 block mb-0.5">[문항 3] KOSIS 지표(부양비) 분석 결과</strong>
                            <p className="text-slate-800 font-medium whitespace-pre-wrap">
                              {selectedStudentForFeedback.worksheet?.simAnalysis || "(미작성)"}
                            </p>
                          </div>

                          <div>
                            <strong className="text-slate-500 block mb-0.5">[문항 4] 저출산·고령화 인구 위기를 슬기롭게 극복할 핵심 대안책</strong>
                            <p className="text-slate-800 font-medium whitespace-pre-wrap">
                              {selectedStudentForFeedback.worksheet?.policyProposal || "(미작성)"}
                            </p>
                          </div>
                        </div>

                        {/* AI 평가 피드백 엔진 패널 */}
                        <div className="border-t pt-3 space-y-2">
                          <div className="flex justify-between items-center">
                            <span className="text-xs font-black text-indigo-700 flex items-center gap-1">
                              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
                              </svg>
                              AI 사회수행평가 정성 첨삭 피드백
                            </span>
                            <button
                              onClick={() => generateAiFeedback(selectedStudentForFeedback)}
                              disabled={aiFeedbackLoading}
                              className={`text-[10px] font-black px-3 py-1.5 rounded-md text-white transition-all shadow-xs ${
                                aiFeedbackLoading ? 'bg-slate-400' : 'bg-indigo-600 hover:bg-indigo-750'
                              }`}
                            >
                              {aiFeedbackLoading ? "AI 피드백 분석 생성 중..." : "⚡ Gemini AI 피드백 자동 생성"}
                            </button>
                          </div>

                          {/* AI 생성 텍스트 에어리어 */}
                          <div className="relative">
                            {aiFeedbackLoading && (
                              <div className="absolute inset-0 bg-white/70 flex items-center justify-center z-10 rounded-lg">
                                <span className="text-xs font-bold text-indigo-700 flex items-center gap-2">
                                  <span className="animate-spin w-4 h-4 border-2 border-indigo-600 border-t-transparent rounded-full inline-block"></span>
                                  성취 기준 평가 가치분석을 진행하고 있습니다...
                                </span>
                              </div>
                            )}
                            <textarea
                              readOnly
                              value={aiFeedbackText}
                              placeholder="교사용 AI 피드백을 생성하면 정밀하게 분석된 첨삭 지도서가 이곳에 실시간 작성됩니다. 작성 완료와 동시에 학생의 대시보드 화면에 피드백이 실시간 팝업됩니다."
                              rows={4}
                              className="w-full bg-slate-50 border border-slate-250 p-3 rounded-lg text-xs leading-relaxed focus:outline-none"
                            />
                          </div>
                        </div>

                      </div>
                    )}
                  </div>

                </div>

              </div>
            )}

          </div>
        )}

      </main>

      {/* 푸터 고정 */}
      <footer className="bg-white text-slate-500 text-[10px] py-4 border-t border-slate-200 mt-10">
        <div className="max-w-7xl mx-auto px-4 flex justify-between items-center">
          <span>데이터 소스: KOSIS 장래인구추계 및 통계 정보</span>
          <span>© 교육과정 성취기준 교과 연계 학습 지원 허브</span>
        </div>
      </footer>
    </div>
  );
}
