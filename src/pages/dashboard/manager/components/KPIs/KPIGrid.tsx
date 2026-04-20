import { ReactNode } from "react";
import KPICard from "./KPICard";

interface KPIItem {
  icon: ReactNode;
  label: string;
  value: number | string;
}

interface KPIGridProps {
  items: KPIItem[];
}

export default function KPIGrid({ items }: KPIGridProps) {
  return (
    <section className="manager-kpis">
      {items.map((item, index) => (
        <KPICard
          key={index}
          icon={item.icon}
          label={item.label}
          value={item.value}
        />
      ))}
    </section>
  );
}
