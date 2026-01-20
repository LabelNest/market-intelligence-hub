import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';

interface SourceBarChartProps {
  data: Record<string, number>;
}

const COLORS = [
  'hsl(215, 85%, 55%)',
  'hsl(173, 70%, 50%)',
  'hsl(38, 85%, 55%)',
  'hsl(152, 60%, 50%)',
  'hsl(280, 65%, 55%)',
  'hsl(0, 65%, 55%)',
  'hsl(200, 80%, 50%)',
];

export function SourceBarChart({ data }: SourceBarChartProps) {
  const chartData = Object.entries(data)
    .map(([name, value]) => ({
      name,
      articles: value,
    }))
    .sort((a, b) => b.articles - a.articles);

  return (
    <div className="rounded-xl border bg-card p-6 shadow-card">
      <h3 className="text-lg font-semibold text-foreground mb-4">Articles by Source</h3>
      <div className="h-[280px]">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={chartData}
            layout="vertical"
            margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
          >
            <CartesianGrid 
              strokeDasharray="3 3" 
              stroke="hsl(var(--border))" 
              horizontal={true}
              vertical={false}
            />
            <XAxis 
              type="number" 
              stroke="hsl(var(--muted-foreground))"
              fontSize={12}
              tickLine={false}
              axisLine={false}
            />
            <YAxis 
              type="category" 
              dataKey="name" 
              stroke="hsl(var(--muted-foreground))"
              fontSize={12}
              tickLine={false}
              axisLine={false}
              width={100}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: 'hsl(var(--card))',
                border: '1px solid hsl(var(--border))',
                borderRadius: '8px',
                boxShadow: 'var(--shadow-md)',
              }}
              labelStyle={{ color: 'hsl(var(--foreground))', fontWeight: 600 }}
              itemStyle={{ color: 'hsl(var(--muted-foreground))' }}
              formatter={(value: number) => [`${value} articles`, 'Count']}
            />
            <Bar 
              dataKey="articles" 
              radius={[0, 4, 4, 0]}
              maxBarSize={32}
            >
              {chartData.map((_, index) => (
                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
