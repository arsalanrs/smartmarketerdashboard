interface KPICardsProps {
  metrics: {
    totalVisitors: number
    engagedVisitors: number
    repeatVisitors: number
    highIntentVisitors: number
    newVisitors: number
    returningVisitors: number
  }
  /** Optional: highIntent × 50% match × 10% close × $1k deal */
  estMonthlyRevenue?: number
}

export default function KPICards({ metrics, estMonthlyRevenue }: KPICardsProps) {
  const cards = [
    {
      title: 'Total Visitors',
      value: metrics.totalVisitors.toLocaleString(),
      color: '#1D6E95',
    },
    {
      title: 'Engaged Visitors',
      value: metrics.engagedVisitors.toLocaleString(),
      subtitle: `Score ≥ 3`,
      color: '#1D6E95',
    },
    {
      title: 'Repeat Visitors',
      value: metrics.repeatVisitors.toLocaleString(),
      color: '#FF8C02',
    },
    {
      title: 'High Intent Visitors',
      value: metrics.highIntentVisitors.toLocaleString(),
      subtitle: `Score ≥ 6`,
      color: '#FF8C02',
    },
    {
      title: 'New vs Returning',
      value: `${metrics.newVisitors} / ${metrics.returningVisitors}`,
      subtitle: `New / Returning`,
      color: '#1D6E95',
    },
  ]

  if (estMonthlyRevenue != null) {
    cards.push({
      title: 'Est. Monthly Revenue',
      value: new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD',
        maximumFractionDigits: 0,
      }).format(estMonthlyRevenue),
      subtitle: 'at 50% match, 10% close, $1k deal',
      color: '#1D6E95',
    })
  }

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
      {cards.map((card, idx) => (
        <div key={idx} className="overflow-hidden rounded-xl bg-white shadow-sm border border-gray-200 hover:shadow-md transition-shadow">
          <div className="p-6">
            <p className="text-sm font-medium text-gray-500 mb-1">{card.title}</p>
            <p className="text-3xl font-bold text-gray-900">{card.value}</p>
            {card.subtitle && (
              <p className="text-xs text-gray-400 mt-1">{card.subtitle}</p>
            )}
          </div>
        </div>
      ))}
    </div>
  )
}

