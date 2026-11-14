
export const stats = [
  {
    title: "Monitored Services",
    value: "12",
    description: "All registered services",
    type: "services",
  },
  {
    title: "Active Incidents",
    value: "04",
    description: "2 incidents require attention",
    type: "incidents",
  },
  {
    title: "Deployments",
    value: "28",
    description: "Deployments this month",
    type: "deployments",
  },
  {
    title: "Service Availability",
    value: "99.9%",
    description: "Overall service uptime",
    type: "availability",
  },
];

export const services = [
  {
    name: "API Gateway",
    environment: "Production",
    status: "Healthy",
    uptime: "99.99%",
    latency: "42 ms",
  },
  {
    name: "Payment Service",
    environment: "Production",
    status: "Degraded",
    uptime: "98.40%",
    latency: "320 ms",
  },
  {
    name: "Authentication Service",
    environment: "Production",
    status: "Healthy",
    uptime: "99.98%",
    latency: "28 ms",
  },
  {
    name: "PostgreSQL Database",
    environment: "Production",
    status: "Healthy",
    uptime: "99.95%",
    latency: "18 ms",
  },
  {
    name: "Notification Service",
    environment: "Staging",
    status: "Maintenance",
    uptime: "99.20%",
    latency: "N/A",
  },
];

export const incidents = [
  {
    id: "INC-104",
    title: "High database response time",
    severity: "P1",
    status: "Investigating",
    service: "PostgreSQL Database",
  },
  {
    id: "INC-103",
    title: "Payment API latency",
    severity: "P2",
    status: "Open",
    service: "Payment Service",
  },
  {
    id: "INC-102",
    title: "Authentication timeout",
    severity: "P3",
    status: "Resolved",
    service: "Authentication Service",
  },
];

export const deploymentActivity = [
  { day: "Mon", deployments: 4 },
  { day: "Tue", deployments: 7 },
  { day: "Wed", deployments: 5 },
  { day: "Thu", deployments: 8 },
  { day: "Fri", deployments: 6 },
  { day: "Sat", deployments: 3 },
  { day: "Sun", deployments: 5 },
];
