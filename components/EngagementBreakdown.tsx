interface EngagementBreakdownProps {
  breakdown: {
    Casual: number
    Researcher: number
    HighIntent: number
    Action: number
  }
  total: number
}

export default function EngagementBreakdown({ breakdown, total }: EngagementBreakdownProps) {
  const segments = [
    { name: 'Casual', count: breakdown.Casual, color: 'bg-gray-500' },
    { name: 'Researcher', count: breakdown.Researcher, color: '#1D6E95' },
    { name: 'High Intent', count: breakdown.HighIntent, color: '#FF8C02' },
    { name: 'Action', count: breakdown.Action, color: '#FF8C02' },
  ]

  return (
    <div className="overflow-hidden rounded-xl bg-white shadow-sm border border-gray-200">
      <div className="px-6 py-5 border-b border-gray-100">
        <h2 className="text-lg font-semibold text-gray-900">Engagement Breakdown</h2>
      </div>
      <div className="p-6">
        <table className="min-w-full">
          <thead>
            <tr className="border-b border-gray-100">
              <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">Segment</th>
              <th className="px-4 py-3 text-right text-sm font-medium text-gray-500">Count</th>
              <th className="px-4 py-3 text-right text-sm font-medium text-gray-500">Percentage</th>
              <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">Visual</th>
            </tr>
          </thead>
          <tbody>
            {segments.map((segment) => {
              const percentage = total > 0 ? (segment.count / total) * 100 : 0
              return (
                <tr key={segment.name} className="border-b border-gray-50 last:border-0">
                  <td className="px-4 py-4">
                    <div className="flex items-center">
                      <div 
                        className="h-3 w-3 rounded-full mr-3"
                        style={{ backgroundColor: typeof segment.color === 'string' && segment.color.startsWith('#') ? segment.color : undefined }}
                      ></div>
                      <span className="text-sm font-medium text-gray-900">{segment.name}</span>
                    </div>
                  </td>
                  <td className="px-4 py-4 text-right text-sm font-semibold text-gray-900">
                    {segment.count.toLocaleString()}
                  </td>
                  <td className="px-4 py-4 text-right text-sm font-semibold text-gray-900">
                    {percentage.toFixed(1)}%
                  </td>
                  <td className="px-4 py-4">
                    <div className="h-2 w-full bg-gray-100 rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full"
                        style={{ 
                          width: `${percentage}%`,
                          backgroundColor: typeof segment.color === 'string' && segment.color.startsWith('#') ? segment.color : undefined
                        }}
                      ></div>
                    </div>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}

