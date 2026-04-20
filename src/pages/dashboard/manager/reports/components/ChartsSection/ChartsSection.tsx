import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from "recharts";

import "./ChartsSection.css";

const curriculumsByArea = [
  { area: "TI", total: 30 },
  { area: "Administração", total: 50 },
  { area: "Edificações", total: 18 },
  { area: "Saúde", total: 27 },
];

const jobsByLevel = [
  { name: "Técnico", value: 58 },
  { name: "Graduação", value: 32 },
  { name: "Especialização", value: 10 },
];

// Gradientes verdes para cada barra
const BAR_COLORS = [
  { start: "#4ade80", end: "#15803d" },
  { start: "#86efac", end: "#15803d" },
  { start: "#22c55e", end: "#15803d" },
  { start: "#16a34a", end: "#15803d" },
];

// Pie chart cores
const PIE_COLORS = ["#22c55e", "#16a34a", "#4ade80"];

export function ChartsSection() {
  return (
    <section className="charts-section">
      {/* GRÁFICO DE BARRAS */}
      <div className="chart-card">
        <h3>Currículos por área</h3>

        <ResponsiveContainer width="100%" height={260}>
          <BarChart data={curriculumsByArea} margin={{ top: 20, bottom: 20 }}>
            <defs>
              {curriculumsByArea.map((_, index) => (
                <linearGradient
                  key={index}
                  id={`grad-${index}`}
                  x1="0"
                  y1="0"
                  x2="0"
                  y2="1"
                >
                  <stop offset="0%" stopColor={BAR_COLORS[index].start} />
                  <stop offset="100%" stopColor={BAR_COLORS[index].end} />
                </linearGradient>
              ))}
            </defs>

            <XAxis dataKey="area" tick={{ fontSize: 12, fill: "#374151" }} />
            <YAxis tick={{ fontSize: 12, fill: "#374151" }} />
            <Tooltip
              contentStyle={{
                backgroundColor: "#1f2937",
                color: "#f9fafb",
                borderRadius: "8px",
                padding: "8px 12px",
                border: "none",
              }}
            />

            <Bar dataKey="total" radius={[6, 6, 0, 0]}>
              {curriculumsByArea.map((_, index) => (
                <Cell key={index} fill={`url(#grad-${index})`} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* GRÁFICO DE PIZZA */}
      <div className="chart-card">
        <h3>Vagas por nível</h3>

        <ResponsiveContainer width="100%" height={260}>
          <PieChart>
            <Pie
              data={jobsByLevel}
              dataKey="value"
              nameKey="name"
              cx="50%"
              cy="50%"
              outerRadius={80}
              label
            >
              {jobsByLevel.map((_, index) => (
                <Cell key={index} fill={PIE_COLORS[index % PIE_COLORS.length]} />
              ))}
            </Pie>
            <Tooltip
              contentStyle={{
                backgroundColor: "#d8e5cf",
                color: "#000000",
                borderRadius: "8px",
                padding: "8px 12px",
                border: "none",
              }}
            />
          </PieChart>
        </ResponsiveContainer>
      </div>
    </section>
  );
}
