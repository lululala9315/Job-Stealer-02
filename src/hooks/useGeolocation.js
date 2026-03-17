/**
 * 역할: 문정역 고정 좌표 반환
 * 참고: GPS 대신 문정역으로 고정
 */

export function useGeolocation() {
  return { lat: 37.485, lng: 127.122 }
}
