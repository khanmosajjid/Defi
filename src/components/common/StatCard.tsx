import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { TrendingUp, TrendingDown } from 'lucide-react';

interface StatCardProps {
  title: string;
  value: string;
  change?: string;
  changeType?: 'positive' | 'negative' | 'neutral';
  icon?: React.ReactNode;
  description?: string;
  colorIndex?: number;
  aosAnimation?: string;
  aosDelay?: number;
}

export default function StatCard({ 
  title, 
  value, 
  change, 
  changeType = 'neutral', 
  icon, 
  description, 
  colorIndex = 0, 
  aosAnimation = "fade-up",
  aosDelay = 0,
}: StatCardProps) {
  const getChangeColor = () => {
    switch (changeType) {
      case 'positive': return 'text-green-400';
      case 'negative': return 'text-red-400';
      default: return 'text-gray-400';
    }
  };
 
    const colors = [
    "bg-blue-500/20",
    "bg-purple-500/20",
    "bg-green-500/20",
    "bg-orange-500/20",
    "bg-pink-500/20",
    "bg-cyan-500/20",
    "bg-indigo-500/20",
    "bg-teal-500/20",
    "bg-yellow-500/20",
    "bg-red-500/20",
    "bg-emerald-500/20",
    "bg-fuchsia-500/20",
    "bg-rose-500/20",
    "bg-sky-500/20",
    "bg-lime-500/20",
    "bg-violet-500/20",
    "bg-amber-500/20",
    "bg-slate-500/20",
    "bg-gray-500/20",
    "bg-neutral-500/20",

  ];

  const colorClass = colors[colorIndex % colors.length]; 


  const getChangeIcon = () => {
    switch (changeType) {
      case 'positive': return <TrendingUp className="w-4 h-4" />;
      case 'negative': return <TrendingDown className="w-4 h-4" />;
      default: return null;
    }
  };

  return (
    <Card className="stat-card"
     data-aos={aosAnimation}
      data-aos-delay={aosDelay}>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-xl font-medium text-gray-300">{title}</CardTitle>
        {icon && <div className="text-yellow-400 stat-icon">{icon}</div>}
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold text-white mb-1">{value}</div>
        {change && (
          <div className={`flex items-center text-xs ${getChangeColor()}`}>
            {getChangeIcon()}
            <span className="ml-1">{change}</span>
          </div>
        )}
        {description && (
          <p className="text-sm text-gray-400 mt-2">{description}</p>
        )}
      </CardContent>
      <div className={`blur bg-1 ${colorClass}`}></div>
    </Card>
  );
}