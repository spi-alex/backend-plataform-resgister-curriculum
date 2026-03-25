import "./ReportCard.css";

interface ReportCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
}

export function ReportCard({ title, value, subtitle }: ReportCardProps) {
  return (
    <div className="report-card">
      <h3 className="report-card-title">{title}</h3>
      <p className="report-card-value">{value}</p>
      {subtitle && <span className="report-card-subtitle">{subtitle}</span>}
    </div>
  );
}
