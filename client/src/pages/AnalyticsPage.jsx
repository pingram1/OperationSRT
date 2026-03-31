import { useState, useEffect } from 'react';
import {
  DollarSign,
  Users,
  BarChart3,
  Star,
  TrendingUp,
  UserCheck,
  CalendarCheck,
  Clock,
  Receipt,
  UserPlus,
  Calendar,
} from 'lucide-react';
import { getAnalytics } from '../api/analytics';

const KPI_ICONS = [
  { Icon: DollarSign, bg: 'bg-slate-100', iconColor: 'text-slate-600' },
  { Icon: TrendingUp, bg: 'bg-emerald-50', iconColor: 'text-emerald-600' },
  { Icon: UserPlus, bg: 'bg-blue-50', iconColor: 'text-blue-600' },
  { Icon: UserCheck, bg: 'bg-violet-50', iconColor: 'text-violet-600' },
  { Icon: CalendarCheck, bg: 'bg-indigo-50', iconColor: 'text-indigo-600' },
  { Icon: BarChart3, bg: 'bg-amber-50', iconColor: 'text-amber-600' },
  { Icon: CalendarCheck, bg: 'bg-teal-50', iconColor: 'text-teal-600' },
  { Icon: Clock, bg: 'bg-rose-50', iconColor: 'text-rose-600' },
  { Icon: Star, bg: 'bg-amber-50', iconColor: 'text-amber-600' },
];

const AnalyticsPage = () => {
  const [timeRange, setTimeRange] = useState(30);
  const [analyticsData, setAnalyticsData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchAnalytics();
  }, [timeRange]);

  const fetchAnalytics = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await getAnalytics(timeRange);
      setAnalyticsData(data);
    } catch (err) {
      console.error('Failed to fetch analytics:', err);
      setError(err.message || 'Failed to load analytics data');
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const formatPercentage = (value) => {
    return `${value.toFixed(1)}%`;
  };

  const formatChange = (change, changeType) => {
    const sign = changeType === 'increase' ? '+' : '';
    const color = changeType === 'increase' ? 'text-emerald-600' : 'text-red-600';
    return (
      <span className={color}>
        {sign}{typeof change === 'number' ? formatPercentage(change) : change}
      </span>
    );
  };

  const getActivityIcon = (type) => {
    switch (type) {
      case 'signup':
        return <UserPlus className="w-5 h-5 text-blue-600" />;
      case 'booking':
        return <Calendar className="w-5 h-5 text-indigo-600" />;
      case 'payment':
        return <Receipt className="w-5 h-5 text-emerald-600" />;
      default:
        return <BarChart3 className="w-5 h-5 text-slate-600" />;
    }
  };

  if (loading && !analyticsData) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading analytics...</p>
        </div>
      </div>
    );
  }

  if (error && !analyticsData) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <p className="text-red-600 mb-4">Error: {error}</p>
          <button
            onClick={fetchAnalytics}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  const metrics = analyticsData?.metrics || {};
  const revenueData = analyticsData?.charts?.revenueOverTime || [];
  const userGrowthData = analyticsData?.charts?.userGrowth || [];
  const recentActivity = analyticsData?.recentActivity || [];

  const kpiCards = [
    {
      key: 'totalRevenue',
      label: 'Total Revenue',
      value: formatCurrency(metrics.totalRevenue?.value ?? 0),
      change: metrics.totalRevenue?.change,
      changeType: metrics.totalRevenue?.changeType,
      iconIndex: 0,
    },
    {
      key: 'mrr',
      label: 'Monthly Recurring Revenue',
      value: formatCurrency(metrics.mrr?.value ?? 0),
      change: metrics.mrr?.change,
      changeType: metrics.mrr?.changeType,
      suffix: ' MoM',
      iconIndex: 1,
    },
    {
      key: 'newSignups',
      label: 'New Signups',
      value: metrics.newSignups?.value ?? 0,
      change: metrics.newSignups?.change,
      changeType: metrics.newSignups?.changeType,
      iconIndex: 2,
    },
    {
      key: 'activeStudents',
      label: 'Active Students',
      value: metrics.activeStudents?.value ?? 0,
      change: metrics.activeStudents?.change,
      changeType: metrics.activeStudents?.changeType,
      iconIndex: 3,
    },
    {
      key: 'sessionsCompleted',
      label: 'Sessions Completed',
      value: metrics.sessionsCompleted?.value ?? 0,
      change: metrics.sessionsCompleted?.change,
      changeType: metrics.sessionsCompleted?.changeType,
      iconIndex: 4,
    },
    {
      key: 'tutorUtilizationRate',
      label: 'Tutor Utilization',
      value: `${metrics.tutorUtilizationRate?.value ?? 0}%`,
      change: null,
      changeType: 'increase',
      iconIndex: 5,
    },
    {
      key: 'sessionCompletionRate',
      label: 'Session Completion Rate',
      value: `${metrics.sessionCompletionRate?.value ?? 0}%`,
      change: metrics.sessionCompletionRate?.change,
      changeType: metrics.sessionCompletionRate?.changeType,
      iconIndex: 6,
    },
    {
      key: 'avgSessionLength',
      label: 'Avg. Session Length',
      value: metrics.avgSessionLength?.value != null ? `${metrics.avgSessionLength.value} min` : 'N/A',
      change: metrics.avgSessionLength?.change,
      changeType: metrics.avgSessionLength?.changeType,
      iconIndex: 7,
    },
    {
      key: 'avgTutorRating',
      label: 'Avg. Tutor Rating',
      value: metrics.avgTutorRating?.hasRatings
        ? `${metrics.avgTutorRating.value.toFixed(1)}/${metrics.avgTutorRating.maxValue}`
        : 'N/A',
      change: metrics.avgTutorRating?.change,
      changeType: metrics.avgTutorRating?.changeType,
      iconIndex: 8,
    },
  ];

  return (
    <div className="p-6 space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Analytics & Reporting</h1>
          <p className="text-gray-600 mt-1">Track key metrics and business performance</p>
        </div>

        <div className="flex gap-2 bg-gray-100 rounded-lg p-1">
          {[7, 30, 90].map((days) => (
            <button
              key={days}
              onClick={() => setTimeRange(days)}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                timeRange === days
                  ? 'bg-white text-blue-600 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              {days} Days
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {kpiCards.map((card, idx) => {
          const { Icon, bg, iconColor } = KPI_ICONS[card.iconIndex];
          return (
            <div key={card.key} className="bg-white rounded-xl shadow-sm border border-gray-100 p-5 hover:shadow-md transition-shadow">
              <div className="flex items-start justify-between">
                <div className="flex-1 min-w-0">
                  <p className="text-gray-500 text-sm font-medium truncate">{card.label}</p>
                  <p className="text-xl font-bold text-gray-900 mt-1 truncate">{card.value}</p>
                  {card.change != null && (
                    <p className="text-sm mt-1.5">
                      {formatChange(card.change, card.changeType)}
                      {card.suffix || ' from previous period'}
                    </p>
                  )}
                  {card.key === 'avgTutorRating' && !metrics.avgTutorRating?.hasRatings && (
                    <p className="text-sm mt-1.5 text-gray-500">No ratings available yet</p>
                  )}
                </div>
                <div className={`ml-3 flex-shrink-0 p-2.5 rounded-lg ${bg}`}>
                  <Icon className={`w-5 h-5 ${iconColor}`} strokeWidth={1.75} />
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Revenue Over Time</h2>
          {loading ? (
            <div className="h-64 flex items-center justify-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            </div>
          ) : revenueData.length > 0 ? (
            <RevenueChart data={revenueData} />
          ) : (
            <div className="h-64 flex items-center justify-center text-gray-400">
              <p>No revenue data available for this period</p>
            </div>
          )}
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">User Growth</h2>
          {loading ? (
            <div className="h-64 flex items-center justify-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            </div>
          ) : userGrowthData.length > 0 ? (
            <UserGrowthChart data={userGrowthData} />
          ) : (
            <div className="h-64 flex items-center justify-center text-gray-400">
              <p>No user growth data available for this period</p>
            </div>
          )}
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Recent Activity</h2>
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          </div>
        ) : recentActivity.length > 0 ? (
          <div className="space-y-0 divide-y divide-gray-100">
            {recentActivity.map((activity, index) => (
              <div
                key={index}
                className="flex items-center justify-between gap-4 py-4 first:pt-0 last:pb-0"
              >
                <div className="flex items-center gap-4 min-w-0 flex-1">
                  <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-gray-50 flex items-center justify-center">
                    {getActivityIcon(activity.type)}
                  </div>
                  <div className="min-w-0">
                    <p className="text-gray-900 font-medium truncate">{activity.message}</p>
                    {activity.amount != null && activity.amount > 0 && (
                      <p className="text-sm text-gray-500 mt-0.5">
                        Amount: {formatCurrency(activity.amount)}
                      </p>
                    )}
                  </div>
                </div>
                <span className="flex-shrink-0 text-sm text-gray-500 ml-4">
                  {activity.timeAgo}
                </span>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-12 text-gray-400">
            <p>No recent activity for this period</p>
          </div>
        )}
      </div>

      {error && analyticsData && (
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
          <p className="text-amber-800 text-sm">
            Warning: {error}. Showing cached data.
          </p>
        </div>
      )}
    </div>
  );
};

const RevenueChart = ({ data }) => {
  const [hoveredPoint, setHoveredPoint] = useState(null);
  const maxRevenue = Math.max(...data.map((d) => d.revenue), 1);
  const chartHeight = 200;
  const chartWidth = 400;
  const padding = { top: 20, right: 30, bottom: 30, left: 55 };
  const innerWidth = chartWidth - padding.left - padding.right;
  const innerHeight = chartHeight - padding.top - padding.bottom;

  const formatCurrency = (amount) => {
    if (amount >= 1000) return `$${(amount / 1000).toFixed(1)}k`;
    return `$${amount}`;
  };

  const points = data.map((d, i) => {
    const x = padding.left + (i / (data.length - 1 || 1)) * innerWidth;
    const y = padding.top + innerHeight - (d.revenue / maxRevenue) * innerHeight;
    return { x, y, ...d };
  });

  const pathD = points
    .map((p, i) => {
      if (i === 0) return `M ${p.x} ${p.y}`;
      const prev = points[i - 1];
      const cpx = (prev.x + p.x) / 2;
      return `C ${cpx} ${prev.y}, ${cpx} ${p.y}, ${p.x} ${p.y}`;
    })
    .join(' ');

  const areaD = `${pathD} L ${points[points.length - 1]?.x} ${padding.top + innerHeight} L ${points[0]?.x} ${padding.top + innerHeight} Z`;

  return (
    <div className="relative">
      <svg
        viewBox={`0 0 ${chartWidth} ${chartHeight}`}
        preserveAspectRatio="xMidYMid meet"
        className="w-full h-64 overflow-visible"
      >
        <defs>
          <linearGradient id="revenueGradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#3B82F6" stopOpacity="0.25" />
            <stop offset="100%" stopColor="#3B82F6" stopOpacity="0" />
          </linearGradient>
        </defs>
        <path d={areaD} fill="url(#revenueGradient)" />
        <path
          d={pathD}
          fill="none"
          stroke="#3B82F6"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        {points.map((p, i) => (
          <g key={i}>
            <circle
              cx={p.x}
              cy={p.y}
              r={hoveredPoint === i ? 6 : 4}
              fill="#3B82F6"
              className="cursor-pointer transition-all"
              onMouseEnter={() => setHoveredPoint(i)}
              onMouseLeave={() => setHoveredPoint(null)}
            />
            {hoveredPoint === i && (
              <g>
                <rect
                  x={p.x - 35}
                  y={p.y - 28}
                  width={70}
                  height={22}
                  rx={4}
                  fill="#1F2937"
                />
                <text
                  x={p.x}
                  y={p.y - 12}
                  textAnchor="middle"
                  fontSize="11"
                  fill="white"
                  fontWeight="500"
                >
                  {formatCurrency(p.revenue)}
                </text>
              </g>
            )}
          </g>
        ))}
      </svg>
      <div className="flex justify-between mt-2 text-xs text-gray-500 px-1">
        {data
          .filter((_, i) => i % Math.max(1, Math.ceil(data.length / 6)) === 0 || i === data.length - 1)
          .map((d, i) => (
            <span key={i}>
              {new Date(d.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
            </span>
          ))}
      </div>
    </div>
  );
};

const UserGrowthChart = ({ data }) => {
  const maxTotal = Math.max(
    ...data.map((d) => ((d.students ?? 0) + (d.tutors ?? 0)) || (d.count ?? 0)),
    1
  );
  const chartHeight = 200;
  const chartWidth = 400;
  const padding = { left: 50, right: 30, bottom: 40 };
  const barCount = data.length;
  const barGap = 4;
  const barWidth = Math.max((chartWidth - padding.left - padding.right - barGap * (barCount - 1)) / barCount, 8);

  return (
    <div className="relative">
      <svg viewBox={`0 0 ${chartWidth} ${chartHeight}`} preserveAspectRatio="xMidYMid meet" className="w-full h-64 overflow-visible">
        {data.map((d, i) => {
          const students = d.students ?? 0;
          const tutors = d.tutors ?? 0;
          const innerHeight = chartHeight - padding.bottom;
          const studentHeight = (students / maxTotal) * innerHeight;
          const tutorHeight = (tutors / maxTotal) * innerHeight;
          const x = padding.left + i * (barWidth + barGap);

          return (
            <g key={i}>
              <rect
                x={x}
                y={chartHeight - padding.bottom - studentHeight - tutorHeight}
                width={barWidth}
                height={studentHeight}
                fill="#6366F1"
                rx="3"
              />
              <rect
                x={x}
                y={chartHeight - padding.bottom - tutorHeight}
                width={barWidth}
                height={tutorHeight}
                fill="#8B5CF6"
                rx="3"
              />
            </g>
          );
        })}
      </svg>
      <div className="flex justify-between mt-2 text-xs text-gray-500 px-1">
        {data
          .filter((_, i) => i % Math.max(1, Math.ceil(data.length / 6)) === 0 || i === data.length - 1)
          .map((d, i) => (
            <span key={i}>
              {new Date(d.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
            </span>
          ))}
      </div>
      <div className="flex gap-4 mt-3 text-xs">
        <span className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded bg-indigo-500"></span>
          Students
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded bg-violet-500"></span>
          Tutors
        </span>
      </div>
    </div>
  );
};

export default AnalyticsPage;
