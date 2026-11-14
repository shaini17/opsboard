
import { useEffect, useMemo, useState } from "react";
import {
  Server,
  AlertCircle,
  Rocket,
  Activity,
  RefreshCw,
  AlertTriangle,
} from "lucide-react";

import {
  ResponsiveContainer,
  AreaChart,
  Area,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
} from "recharts";

const API_URL = "/api/dashboard";
function getToken() {
  return (
    localStorage.getItem("opsboard_token") ||
    sessionStorage.getItem("opsboard_token")
  );
}

function formatDate(value) {
  if (!value) return "—";

  return new Date(value).toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function StatCard({ title, value, description, icon: Icon, color, bg }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-center justify-between">
        <div className={`rounded-lg p-3 ${bg}`}>
          <Icon size={21} className={color} />
        </div>
      </div>

      <p className="mt-5 text-sm font-medium text-slate-500">{title}</p>

      <h2 className="mt-1 text-3xl font-bold tracking-tight text-slate-900">
        {value}
      </h2>

      <p className="mt-2 text-xs text-slate-500">{description}</p>
    </div>
  );
}

const severityStyles = {
  critical: "bg-red-50 text-red-700",
  high: "bg-orange-50 text-orange-700",
  medium: "bg-yellow-50 text-yellow-700",
  low: "bg-slate-100 text-slate-700",
};

const statusStyles = {
  open: "bg-red-50 text-red-700",
  investigating: "bg-orange-50 text-orange-700",
  resolved: "bg-emerald-50 text-emerald-700",
  closed: "bg-slate-100 text-slate-600",
};

const serviceStatusStyles = {
  operational: "bg-emerald-50 text-emerald-700",
  degraded: "bg-yellow-50 text-yellow-700",
  down: "bg-red-50 text-red-700",
  maintenance: "bg-blue-50 text-blue-700",
};

export default function Dashboard() {
  const [dashboard, setDashboard] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  async function fetchDashboard() {
    setLoading(true);
    setError("");

    try {
      const token = getToken();

      if (!token) {
        throw new Error(
          "Your login session is missing. Please sign in again."
        );
      }

      const response = await fetch(API_URL, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const result = await response.json();

      if (response.status === 401) {
        throw new Error(
          "Your session has expired. Please sign in again."
        );
      }

      if (!response.ok || !result.success) {
        throw new Error(
          result.message || "Unable to load dashboard data."
        );
      }

      setDashboard(result.data);
    } catch (err) {
      setError(err.message || "Something went wrong.");
    } finally {
      setLoading(false);
    }
  }

  // Defer the initial API request to avoid synchronous state updates
  // directly inside the effect.
  useEffect(() => {
    void Promise.resolve().then(() => fetchDashboard());
  }, []);

  const stats = useMemo(() => {
    if (!dashboard) return [];

    const { stats, infrastructureHealth } = dashboard;

    const healthPercentage = infrastructureHealth.total
      ? Math.round(
          (infrastructureHealth.operational /
            infrastructureHealth.total) *
            100
        )
      : 0;

    return [
      {
        title: "Monitored Services",
        value: stats.monitoredServices,
        description: "Services registered in OpsBoard",
        icon: Server,
        color: "text-blue-600",
        bg: "bg-blue-50",
      },
      {
        title: "Active Incidents",
        value: stats.activeIncidents,
        description: "Open or under investigation",
        icon: AlertCircle,
        color: "text-orange-600",
        bg: "bg-orange-50",
      },
      {
        title: "Monthly Deployments",
        value: stats.monthlyDeployments,
        description: "Deployments recorded this month",
        icon: Rocket,
        color: "text-violet-600",
        bg: "bg-violet-50",
      },
      {
        title: "Operational Health",
        value: `${healthPercentage}%`,
        description: "Operational services / total services",
        icon: Activity,
        color: "text-emerald-600",
        bg: "bg-emerald-50",
      },
    ];
  }, [dashboard]);

  if (loading) {
    return (
      <div className="flex min-h-96 items-center justify-center">
        <div className="flex items-center gap-3 text-sm text-slate-500">
          <RefreshCw size={19} className="animate-spin" />
          Loading dashboard data...
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-xl border border-red-200 bg-white p-8 text-center">
        <AlertTriangle className="mx-auto text-red-500" size={32} />

        <h2 className="mt-4 text-lg font-semibold text-slate-900">
          Unable to load dashboard
        </h2>

        <p className="mt-2 text-sm text-slate-500">{error}</p>

        <button
          onClick={fetchDashboard}
          className="mt-5 inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
        >
          <RefreshCw size={16} />
          Retry
        </button>
      </div>
    );
  }

  const {
    infrastructureHealth,
    deploymentActivity,
    services,
    recentIncidents,
  } = dashboard;

  return (
    <div className="space-y-7">
      {/* Heading */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            Overview
          </h1>

          <p className="mt-1 text-sm text-slate-500">
            Monitor your infrastructure and operational performance.
          </p>
        </div>

        <button
          onClick={fetchDashboard}
          className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-600 hover:bg-slate-50"
        >
          <RefreshCw size={15} />
          Refresh data
        </button>
      </div>

      {/* Statistics */}
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-4">
        {stats.map((stat) => (
          <StatCard key={stat.title} {...stat} />
        ))}
      </div>

      {/* Charts and infrastructure health */}
      <div className="grid grid-cols-1 gap-5 xl:grid-cols-3">
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm xl:col-span-2">
          <div>
            <h2 className="font-semibold text-slate-900">
              Deployment Activity
            </h2>

            <p className="mt-1 text-sm text-slate-500">
              Deployments recorded over the last seven days
            </p>
          </div>

          <div className="mt-6 h-64">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={deploymentActivity}>
                <defs>
                  <linearGradient
                    id="deploymentGradient"
                    x1="0"
                    y1="0"
                    x2="0"
                    y2="1"
                  >
                    <stop
                      offset="0%"
                      stopColor="#2563eb"
                      stopOpacity={0.25}
                    />
                    <stop
                      offset="95%"
                      stopColor="#2563eb"
                      stopOpacity={0}
                    />
                  </linearGradient>
                </defs>

                <CartesianGrid
                  strokeDasharray="3 3"
                  vertical={false}
                  stroke="#e2e8f0"
                />

                <XAxis
                  dataKey="day"
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: "#64748b", fontSize: 12 }}
                />

                <YAxis
                  allowDecimals={false}
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: "#64748b", fontSize: 12 }}
                />

                <Tooltip />

                <Area
                  type="monotone"
                  dataKey="deployments"
                  stroke="#2563eb"
                  strokeWidth={2.5}
                  fill="url(#deploymentGradient)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="font-semibold text-slate-900">
            Infrastructure Health
          </h2>

          <p className="mt-1 text-sm text-slate-500">
            Current service status distribution
          </p>

          <div className="mt-6 space-y-5">
            {[
              {
                label: "Operational",
                value: infrastructureHealth.operational,
                color: "bg-emerald-500",
              },
              {
                label: "Degraded",
                value: infrastructureHealth.degraded,
                color: "bg-yellow-500",
              },
              {
                label: "Down",
                value: infrastructureHealth.down,
                color: "bg-red-500",
              },
              {
                label: "Maintenance",
                value: infrastructureHealth.maintenance,
                color: "bg-blue-500",
              },
            ].map((item) => {
              const percentage = infrastructureHealth.total
                ? (item.value / infrastructureHealth.total) * 100
                : 0;

              return (
                <div key={item.label}>
                  <div className="mb-2 flex justify-between text-sm">
                    <span className="text-slate-600">{item.label}</span>

                    <span className="font-semibold text-slate-900">
                      {item.value}
                    </span>
                  </div>

                  <div className="h-2 overflow-hidden rounded-full bg-slate-100">
                    <div
                      className={`h-full rounded-full ${item.color}`}
                      style={{ width: `${percentage}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>

          <div className="mt-7 border-t border-slate-100 pt-5">
            <p className="text-sm text-slate-500">
              Total monitored services
            </p>

            <p className="mt-1 text-2xl font-bold text-slate-900">
              {infrastructureHealth.total}
            </p>
          </div>
        </div>
      </div>

      {/* Services */}
      <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-100 p-5">
          <h2 className="font-semibold text-slate-900">Service Health</h2>

          <p className="mt-1 text-sm text-slate-500">
            Services registered in the database
          </p>
        </div>

        {services.length === 0 ? (
          <p className="p-8 text-center text-sm text-slate-500">
            No services found. Add services to see infrastructure health here.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 text-xs uppercase text-slate-500">
                <tr>
                  <th className="px-5 py-3 font-medium">Service</th>
                  <th className="px-5 py-3 font-medium">Environment</th>
                  <th className="px-5 py-3 font-medium">Server</th>
                  <th className="px-5 py-3 font-medium">CPU</th>
                  <th className="px-5 py-3 font-medium">Memory</th>
                  <th className="px-5 py-3 font-medium">Status</th>
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-100">
                {services.map((service) => (
                  <tr key={service.id}>
                    <td className="px-5 py-4 font-medium text-slate-900">
                      {service.name}
                    </td>

                    <td className="px-5 py-4 capitalize text-slate-600">
                      {service.environment}
                    </td>

                    <td className="px-5 py-4 text-slate-600">
                      {service.server_name || "—"}
                    </td>

                    <td className="px-5 py-4 text-slate-600">
                      {service.cpu_usage}%
                    </td>

                    <td className="px-5 py-4 text-slate-600">
                      {service.memory_usage}%
                    </td>

                    <td className="px-5 py-4">
                      <span
                        className={`rounded-full px-2.5 py-1 text-xs font-medium capitalize ${
                          serviceStatusStyles[service.status] ||
                          "bg-slate-100 text-slate-600"
                        }`}
                      >
                        {service.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Recent incidents */}
      <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-100 p-5">
          <h2 className="font-semibold text-slate-900">
            Recent Incidents
          </h2>

          <p className="mt-1 text-sm text-slate-500">
            Latest incidents recorded in OpsBoard
          </p>
        </div>

        {recentIncidents.length === 0 ? (
          <p className="p-8 text-center text-sm text-slate-500">
            No incidents recorded yet.
          </p>
        ) : (
          <div className="divide-y divide-slate-100">
            {recentIncidents.map((incident) => (
              <div
                key={incident.id}
                className="flex flex-wrap items-center justify-between gap-4 p-5"
              >
                <div className="min-w-0">
                  <h3 className="font-medium text-slate-900">
                    {incident.title}
                  </h3>

                  <p className="mt-1 text-xs text-slate-500">
                    {incident.service_name || "Unassigned service"} ·{" "}
                    {formatDate(incident.created_at)}
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <span
                    className={`rounded-full px-2.5 py-1 text-xs font-medium capitalize ${
                      severityStyles[incident.severity] ||
                      "bg-slate-100 text-slate-600"
                    }`}
                  >
                    {incident.severity}
                  </span>

                  <span
                    className={`rounded-full px-2.5 py-1 text-xs font-medium capitalize ${
                      statusStyles[incident.status] ||
                      "bg-slate-100 text-slate-600"
                    }`}
                  >
                    {incident.status}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
