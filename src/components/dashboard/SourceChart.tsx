import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts';

interface SourceChartProps {
  data: Record<string, number>;
}

const COLORS = [
  'hsl(215, 90%, 42%)',
  'hsl(173, 80%, 40%)',
  'hsl(38, 92%, 50%)',
  'hsl(152, 69%, 40%)',
  'hsl(280, 65%, 55%)',
  'hsl(0, 72%, 51%)',
  'hsl(200, 80%, 50%)',
];

export function SourceChart({ data }: SourceChartProps) {
  const chartData = Object.entries(data).map(([name, value]) => ({
    name,
    value,
  }));

  return (
    <div className="rounded-xl border bg-card p-6 shadow-card">
      <h3 className="text-lg font-semibold text-foreground mb-4">Sources Distribution</h3>
      <div className="h-[280px]">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={chartData}
              cx="50%"
              cy="50%"
              innerRadius={60}
              outerRadius={100}
              paddingAngle={2}
              dataKey="value"
            >
              {chartData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
              ))}
            </Pie>
            <Tooltip
              contentStyle={{
                backgroundColor: 'hsl(var(--card))',
                border: '1px solid hsl(var(--border))',
                borderRadius: '8px',
                boxShadow: 'var(--shadow-md)',
              }}
              labelStyle={{ color: 'hsl(var(--foreground))' }}
            />
            <Legend
              layout="horizontal"
              verticalAlign="bottom"
              align="center"
              wrapperStyle={{ paddingTop: '16px' }}
            />
          </PieChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
