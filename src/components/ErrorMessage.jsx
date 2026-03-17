/**
 * 역할: 에러 메시지 표시 컴포넌트
 */
export default function ErrorMessage({ message, onRetry }) {
  return (
    <div className="flex flex-col items-center gap-4 py-8">
      <p className="text-center text-sm" style={{ color: '#555555' }}>
        {message}
      </p>
      {onRetry && (
        <button
          onClick={onRetry}
          className="rounded-xl border px-5 py-2 text-sm transition-colors"
          style={{ borderColor: '#E0E0E0', color: '#1F2327' }}
        >
          다시 시도하기
        </button>
      )}
    </div>
  )
}
