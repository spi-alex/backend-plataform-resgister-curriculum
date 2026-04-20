import { ReactNode } from "react";

interface KPICardProps {
  icon: ReactNode;
  label: string;
  value: number | string;
}

export default function KPICard({ icon, label, value }: KPICardProps) {
  return (
    <div className="kpi-card">
      <div className="kpi-icon">{icon}</div>

      <div>
        <p>{label}</p>
        <strong>{value}</strong>
      </div>
    </div>
  );
}
