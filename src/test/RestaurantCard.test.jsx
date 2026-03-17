import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import RestaurantCard from '../components/RestaurantCard'

const base = { title: '맛집', address: '서울 송파구', link: '', mapx: '', mapy: '' }

describe('RestaurantCard', () => {
  it('keywords가 없으면 배지를 렌더링하지 않는다', () => {
    render(<RestaurantCard restaurant={{ ...base, keywords: [] }} index={0} />)
    expect(screen.queryByText('음식이 맛있어요')).toBeNull()
  })

  it('keywords가 있으면 displayName을 렌더링한다', () => {
    const keywords = [
      { displayName: '음식이 맛있어요', iconUrl: 'https://ssl.pstatic.net/emoji1.png' },
      { displayName: '친절해요', iconUrl: 'https://ssl.pstatic.net/emoji2.png' },
    ]
    render(<RestaurantCard restaurant={{ ...base, keywords }} index={0} />)
    expect(screen.getByText('음식이 맛있어요')).toBeInTheDocument()
    expect(screen.getByText('친절해요')).toBeInTheDocument()
  })

  it('keywords prop이 없어도 정상 렌더링된다', () => {
    render(<RestaurantCard restaurant={base} index={0} />)
    expect(screen.getByText('맛집')).toBeInTheDocument()
  })
})
