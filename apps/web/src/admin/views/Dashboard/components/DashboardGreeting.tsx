'use client'

const getGreeting = () => {
  const h = new Date().getHours()
  if (h < 12) return 'Dzień dobry'
  if (h < 18) return 'Dzień dobry'
  return 'Dobry wieczór'
}

const formatDate = () => {
  const now = new Date()
  return now.toLocaleDateString('pl-PL', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })
}

export const DashboardGreeting = () => {
  return (
    <div className="mb-8">
      <h1 className="text-[1.75rem] font-semibold tracking-tight text-[#1A1A1A]">
        {getGreeting()}
      </h1>
      <p className="text-sm text-[#737373] mt-1 capitalize">{formatDate()}</p>
    </div>
  )
}
