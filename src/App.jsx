/**
 * 역할: 메인 앱 — 상태 관리 + 화면 전환 (input → loading → result)
 * 주요 기능: Gemini 감정 분류, 큐레이션 키워드 기반 맛집 검색, 전체 플로우 제어
 * 의존성: services/gemini, services/naver, data/keywords
 */
import { useState } from 'react'
import CustomCursor from './components/CustomCursor'
import InputScreen from './components/InputScreen'
import ResultScreen from './components/ResultScreen'
import LoadingScreen from './components/LoadingScreen'
import ErrorMessage from './components/ErrorMessage'
import { analyzeEmotion } from './services/gemini'
import { searchWithVerification } from './services/naver'
import { EMOTION_MENU_KEYWORDS, FOOD_HINT_KEYWORDS } from './data/keywords'

/** 사용자 입력에서 음식 키워드 직접 감지 — Gemini 실패/누락 대비 1차 방어선 */
function detectLocalFoodHint(userInput) {
  const keys = Object.keys(FOOD_HINT_KEYWORDS)
  return keys.find((key) => userInput.includes(key)) || null
}

/** Gemini API 실패 시 키워드 기반 로컬 감정 분류 — 네트워크 없이도 동작 */
const LOCAL_EMOTION_KEYWORDS = {
  anger:      ['화나', '화남', '화가', '열받', '짜증', '억울', '분노', '빡치', '빡쳐', '열나', '욕'],
  joy:        ['행복', '기쁘', '기뻐', '기쁨', '설레', '설렘', '신나', '신남', '뿌듯', '좋아', '좋다', '최고', '완벽', '대박', '신기', '즐거', '즐겁'],
  depression: ['우울', '외로', '허전', '공허', '쓸쓸', '공허'],
  sadness:    ['슬프', '슬퍼', '눈물', '그립', '그리워', '상실', '서글'],
  burnout:    ['지쳐', '지침', '야근', '퇴근하고싶', '퇴근하고 싶', '힘들', '탈진', '무기력', '번아웃', '번아웃', '피곤', '피로'],
  anxiety:    ['불안', '걱정', '초조', '긴장', '의욕 없', '의욕없', '막막'],
}
function detectLocalEmotion(userInput) {
  for (const [emotion, keywords] of Object.entries(LOCAL_EMOTION_KEYWORDS)) {
    if (keywords.some((kw) => userInput.includes(kw))) return emotion
  }
  return 'anxiety' // 감지 불가 시 기본값
}

/** foodHint → 키워드 배열 변환: 정확 일치 → 부분 일치 → null */
function resolveFoodHint(foodHint) {
  if (!foodHint) return null
  // 1. 정확 일치
  if (FOOD_HINT_KEYWORDS[foodHint]) return FOOD_HINT_KEYWORDS[foodHint]
  // 2. 부분 일치 — Gemini가 조사/변형 형태로 반환할 때 대응 (예: "마라탕이" → "마라탕")
  const keys = Object.keys(FOOD_HINT_KEYWORDS)
  const matched = keys.find((key) => foodHint.includes(key) || key.includes(foodHint))
  return matched ? FOOD_HINT_KEYWORDS[matched] : null
}

export default function App() {
  const [step, setStep] = useState('input')
  const [emotion, setEmotion] = useState(null)
  const [keyword, setKeyword] = useState('')
  const [foodHintState, setFoodHintState] = useState(null)
  const [imageKeyword, setImageKeyword] = useState('')
  const [restaurants, setRestaurants] = useState([])
  const [isFallback, setIsFallback] = useState(false)
  const [analysisFailed, setAnalysisFailed] = useState(false)
  const [error, setError] = useState(null)
  const [restaurantError, setRestaurantError] = useState(null)

  /** 전체 분석 + 검색 플로우 */
  async function handleSubmit(userInput) {
    setStep('loading')
    setError(null)

    try {
      // Gemini 성공/실패와 무관하게 로컬 감지는 항상 수행 — try 밖에서 초기화
      const localFoodHint = detectLocalFoodHint(userInput)
      let emotionKey, foodHint = localFoodHint

      let failed = false
      try {
        // 1. Gemini 감정 분류 — 감정 + foodHint 반환
        const result = await analyzeEmotion(userInput)
        emotionKey = result.emotion
        // 로컬 감지 우선 — Gemini foodHint는 로컬에 없는 경우만 보완
        foodHint = localFoodHint || result.foodHint
      } catch (geminiErr) {
        // Gemini 실패 시 로컬 키워드 감정 분류로 대체 — API 장애/쿼터 초과 대비
        console.error('[Gemini 오류] 로컬 감정 분류로 대체:', geminiErr?.message)
        emotionKey = detectLocalEmotion(userInput)
        failed = true
      }

      setEmotion(emotionKey)
      setFoodHintState(foodHint)
      setAnalysisFailed(failed)

      // 2. 큐레이션 키워드로 맛집 검색
      const hintKeywords = resolveFoodHint(foodHint)
      const menuKeywords = hintKeywords || EMOTION_MENU_KEYWORDS[emotionKey]
      // 검색 성공/실패와 무관하게 감정 기반 메뉴명/이미지는 항상 표시
      const defaultKeyword = foodHint || menuKeywords[0]
      setKeyword(defaultKeyword)
      setImageKeyword(defaultKeyword)

      try {
        setRestaurantError(null)
        // foodHint 키워드는 셔플 없이 구체적인 것부터 — 감정 키워드만 랜덤 다양성 적용
        const { keyword: usedKeyword, results, isFallback: fallback } = await searchWithVerification(menuKeywords, { shuffle: hintKeywords === null })
        setKeyword(usedKeyword)
        setRestaurants(results)
        setIsFallback(fallback)
        // 이미지는 실제 검색에 사용된 키워드 기준 — foodHint 있으면 우선
        setImageKeyword(foodHint || usedKeyword)
      } catch {
        setRestaurantError('맛집 검색에 실패했어요. 잠시 후 다시 시도해주세요.')
        setRestaurants([])
      }

      setStep('result')
    } catch (err) {
      setError('오류가 발생했어요. 잠시 후 다시 시도해주세요.')
      setStep('input')
    }
  }

  /** 초기화 */
  function handleReset() {
    setStep('input')
    setEmotion(null)
    setKeyword('')
    setFoodHintState(null)
    setImageKeyword('')
    setRestaurants([])
    setIsFallback(false)
    setAnalysisFailed(false)
    setError(null)
    setRestaurantError(null)
  }

  return (
    <main className="min-h-dvh bg-bg">
      <CustomCursor />
      {step === 'input' && (
        <div className="fade-enter-active">
          {error && (
            <div className="px-6 pt-6">
              <ErrorMessage message={error} />
            </div>
          )}
          <InputScreen onSubmit={handleSubmit} />
        </div>
      )}

      {step === 'loading' && <LoadingScreen />}

      {step === 'result' && (
        <div className="fade-enter-active">
          <ResultScreen
            emotion={emotion}
            keyword={keyword}
            foodHint={imageKeyword}
            restaurants={restaurants}
            isFallback={isFallback}
            analysisFailed={analysisFailed}
            restaurantError={restaurantError}
            onReset={handleReset}
          />
        </div>
      )}
    </main>
  )
}
