/**
 * 역할: 감정 매핑 테이블 — 한글명, 영문키, 이미지 경로 관리
 * 참고: 이미지는 public/images/에 감정별 1장씩 배치
 */

export const EMOTIONS = {
  anger: {
    key: 'anger',
    label: '분노',
    description: '화남, 짜증, 열받음',
    image: '/images/anger.jpg',
  },
  depression: {
    key: 'depression',
    label: '우울',
    description: '슬픔, 우울, 외로움, 서글픔, 허전함',
    image: '/images/depression.jpg',
  },
  burnout: {
    key: 'burnout',
    label: '번아웃',
    description: '지침, 과로, 탈진',
    image: '/images/burnout.jpg',
  },
  joy: {
    key: 'joy',
    label: '기쁨',
    description: '기쁨, 설렘, 신남',
    image: '/images/joy.jpg',
  },
  anxiety: {
    key: 'anxiety',
    label: '불안',
    description: '불안, 무기력, 의욕 없음',
    image: '/images/anxiety.jpg',
  },
  sadness: {
    key: 'sadness',
    label: '슬픔',
    description: '슬픔, 눈물, 그리움, 상실감',
    image: '/images/sadness.jpg',
  },
}

export const EMOTION_KEYS = Object.keys(EMOTIONS)
