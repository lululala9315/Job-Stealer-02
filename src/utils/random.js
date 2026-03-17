/**
 * 역할: 배열에서 랜덤 요소 선택 유틸
 */

/** 배열에서 무작위 요소 하나를 반환 */
export function pickRandom(arr) {
  return arr[Math.floor(Math.random() * arr.length)]
}
