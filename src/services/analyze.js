/**
 * 역할: 사용자 텍스트 감정 분석 (Gemini API 직접 호출)
 * 주요 기능: 텍스트 → 감정 + 추천 이유 반환
 * 의존성: services/gemini
 */
import { analyzeEmotion } from './gemini'

/** 사용자 텍스트 분석 → { emotion, reason } 반환 */
export { analyzeEmotion }
