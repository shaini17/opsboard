
import {
  CheckCircle2,
  AlertTriangle,
  Wrench,
} from "lucide-react";

const statusConfig = {
  Healthy: {
    icon: CheckCircle2,
    style: "bg-emerald-50 text-emerald-700",
  },
  Degraded: {
    icon: AlertTriangle,
    style: "bg-amber-50 text-amber-700",
  },
  Maintenance: {
    icon: Wrench,
    style: "bg-blue-50 text-blue-700",
  },
};

export default function ServiceStatus({ services }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[600px] text-left">

        <thead>
          <tr className="border-b border-slate-100 text-xs text-slate-500">
            <th className="px-4 py-4 font-medium">SERVICE</th>
            <th className="px-4 py-4 font-medium">ENVIRONMENT</th>
            <th className="px-4 py-4 font-medium">STATUS</th>
            <th className="px-4 py-4 font-medium">UPTIME</th>
            <th className="px-4 py-4 font-medium">LATENCY</th>
          </tr>
        </thead>

        <tbody>
          {services.map((service) => {
            const config = statusConfig[service.status];
            const Icon = config.icon;

            return (
              <tr
                key={service.name}
                className="border-b border-slate-50 hover:bg-slate-50"
              >
                <td className="px-4 py-4 text-sm font-semibold text-slate-800">
                  {service.name}
                </td>

                <td className="px-4 py-4 text-sm text-slate-500">
                  {service.environment}
                </td>

                <td className="px-4 py-4">
                  <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ${config.style}`}>
                    <Icon size={13} />
                    {service.status}
                  </span>
                </td>

                <td className="px-4 py-4 text-sm font-medium text-slate-700">
                  {service.uptime}
                </td>

                <td className="px-4 py-4 text-sm text-slate-600">
                  {service.latency}
                </td>
              </tr>
            );
          })}
        </tbody>

      </table>
    </div>
  );
}
