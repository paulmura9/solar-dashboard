import type { FC, ReactNode } from "react";

interface MetricRowProps {
  label: string;
  value: ReactNode;
}

const MetricRow: FC<MetricRowProps> = ({ label, value }) => (
  <div className="flex items-center justify-between py-1 border-b border-[#e2e8f0] last:border-0">
    <span className="text-xs text-[#64748b]">{label}</span>
    <span className="text-xs font-mono font-medium text-[#1e293b]">{value}</span>
  </div>
);

export default MetricRow;
