/**
 * 역할: Step 1 — 감정 입력 화면
 * 주요 기능: AIInput으로 텍스트 입력, 엔터 제출
 */
import { AIInput } from './AIInput'

export default function InputScreen({ onSubmit }) {
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center px-6">
      <div className="w-full max-w-md">
        {/* 그래픽 장식 요소: 위계질서를 위한 작은 아이콘 */}
        <div className="flex justify-center mb-3" style={{ cursor: 'none', pointerEvents: 'none' }}>
          <img
            src="/cook3.svg"
            alt="cook graphic"
            className="w-auto h-18 animate-wobble"
            style={{ cursor: 'none' }}
          />
        </div>

        <p
          className="mb-3 text-center leading-snug" style={{ fontSize: '46px', color: '#1F2327', fontFamily: 'MemomentKkukkukk, sans-serif' }}
        >
          지금 기분에 딱 맞는<br />맛집을 찾아드릴게요.
        </p>

        <AIInput
          placeholders={[
            "상사한테 깨져서 너무 매운게 당겨요..🔥",
            "첫 데이트라 설레는데 분위기 좋은 곳 있을까요? 💕",
            "시험 끝! 친구들이랑 시끌벅적하게 놀고 싶어요 🍻",
            "비도 오고 센치한데 조용히 혼밥하고 싶어요 ☔️",
            "프로젝트 성공해서 기분 최고! 맛있는거 먹을래 🥩",
            "월요일이라 축 처지는데 당 충전이 필요해.. 🍰",
          ]}
          onSubmit={onSubmit}
          maxHeight={300}
        />
      </div>
    </div>
  )
}
