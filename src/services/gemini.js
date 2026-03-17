/**
 * 역할: Gemini API를 사용한 감정 분류 + 음식 힌트 추출 (클라이언트 직접 호출)
 * 주요 기능: 사용자 텍스트 → 감정 + 추천 이유 + foodHint(명시된 음식/음료) 반환
 * 의존성: @google/generative-ai, 환경변수 VITE_GEMINI_API_KEY
 */
import { GoogleGenerativeAI } from '@google/generative-ai'
import { EMOTION_KEYS } from '../data/emotions'

const MODEL_NAME = 'gemini-2.0-flash'

const SYSTEM_PROMPT = `당신은 감정 분류 전문가입니다. 사용자의 텍스트를 읽고 감정을 분류하고, 직접 언급한 음식/음료가 있으면 추출하세요.

## 감정 분류 기준
- anger (분노): 화남, 짜증, 열받음, 억울함
- depression (우울): 우울, 외로움, 허전함, 공허함
- sadness (슬픔): 슬픔, 눈물, 그리움, 상실감, 서글픔
- burnout (번아웃): 지침, 과로, 탈진, 무기력
- joy (기쁨): 기쁨, 설렘, 신남, 뿌듯함
- anxiety (불안): 불안, 걱정, 초조, 의욕 없음

## foodHint 규칙
- 사용자 메시지에 음식/음료 단어가 실제로 등장한 경우에만 해당 단어를 foodHint에 넣기
- 반드시 조사 없는 순수 명사 형태로 추출: "마라탕이 땡겨" → "마라탕", "치킨 먹고싶어" → "치킨"
- "술이 땡긴다" → foodHint: "술", "파스타 먹고싶어" → foodHint: "파스타"
- "마라탕 땡기네" → foodHint: "마라탕", "라면 생각난다" → foodHint: "라면"
- 음식/음료 언급이 없으면 반드시 foodHint: null — 절대 음식을 추천하거나 임의로 만들어 넣지 않기
- 여러 개 언급 시 가장 먼저 나온 하나만 선택
- **중요**: foodHint는 사용자가 직접 쓴 단어 그대로만 — 문장, 제안, 추천 문구 절대 금지

## 예시
입력: "오늘 상사한테 엄청 깨졌어 진짜 열받아"
출력: {"emotion":"anger","reason":"직장에서 질책을 받아 화가 난 상황","foodHint":null}

입력: "술이 땡긴다 오늘 너무 힘들어"
출력: {"emotion":"burnout","reason":"힘든 하루를 보내고 술로 위로받고 싶은 상황","foodHint":"술"}

입력: "시험 망했어... 아무것도 하기 싫다"
출력: {"emotion":"depression","reason":"시험 결과로 좌절감과 의욕 저하를 느끼는 상황","foodHint":null}

입력: "보고싶다... 너무 슬프다"
출력: {"emotion":"sadness","reason":"그리움과 슬픔이 밀려오는 상황","foodHint":null}

입력: "야근 3일째... 퇴근하고 싶다"
출력: {"emotion":"burnout","reason":"연속 야근으로 체력과 정신이 소진된 상황","foodHint":null}

입력: "기분 좋아서 파스타 먹고싶다"
출력: {"emotion":"joy","reason":"좋은 기분에 맛있는 음식을 즐기고 싶은 상황","foodHint":"파스타"}

입력: "마라탕 떙기네"
출력: {"emotion":"joy","reason":"특정 음식이 먹고 싶어 설레는 상황","foodHint":"마라탕"}

입력: "치킨 땡겨"
출력: {"emotion":"joy","reason":"특정 음식이 먹고 싶어 설레는 상황","foodHint":"치킨"}

입력: "행복하다"
출력: {"emotion":"joy","reason":"행복함을 직접 표현한 상황","foodHint":null}

입력: "기분이 너무 좋아"
출력: {"emotion":"joy","reason":"좋은 기분을 느끼는 상황","foodHint":null}

입력: "오늘 너무 힘들었어"
출력: {"emotion":"burnout","reason":"힘든 하루를 보낸 상황","foodHint":null}

## 규칙
- 반드시 위 6가지 감정 중 하나만 선택
- reason은 1줄 한국어로 간결하게
- JSON 형식으로만 응답: {"emotion":"...","reason":"...","foodHint":"..." 또는 null}`

/** 사용자 텍스트를 분석하여 감정과 추천 이유를 반환 */
export async function analyzeEmotion(userInput) {
  const apiKey = import.meta.env.VITE_GEMINI_API_KEY
  if (!apiKey) {
    throw new Error('Gemini API 키가 설정되지 않았습니다.')
  }

  const genAI = new GoogleGenerativeAI(apiKey)
  const model = genAI.getGenerativeModel({
    model: MODEL_NAME,
    generationConfig: {
      maxOutputTokens: 500,
      temperature: 0.3,
    },
    systemInstruction: SYSTEM_PROMPT,
  })

  const result = await model.generateContent(userInput)
  const raw = result.response.text().trim()

  // JSON 블록만 추출 (```json ... ``` 래핑 대응)
  const jsonMatch = raw.match(/\{[\s\S]*\}/)
  if (!jsonMatch) {
    throw new Error('Gemini 응답에서 JSON을 추출할 수 없습니다.')
  }

  const parsed = JSON.parse(jsonMatch[0])

  // 감정 키워드 유효성 검증
  let emotion = parsed.emotion?.trim().toLowerCase()
  if (!EMOTION_KEYS.includes(emotion)) {
    // 부분 매칭 시도
    const matched = EMOTION_KEYS.find((key) => emotion?.includes(key))
    emotion = matched || 'anxiety'
  }

  const reason = typeof parsed.reason === 'string' ? parsed.reason : ''

  // foodHint: 사용자가 명시한 음식/음료 (없으면 null)
  const foodHint = typeof parsed.foodHint === 'string' ? parsed.foodHint : null

  return { emotion, reason, foodHint }
}
