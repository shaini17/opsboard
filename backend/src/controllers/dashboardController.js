
import pool from '../config/db.js'

export async function getDashboard(req, res) {
  try {
    const [
      statsResult,
      healthResult,
      deploymentResult,
      servicesResult,
      incidentsResult,
    ] = await Promise.all([
      // Dashboard summary statistics
      pool.query(`
        SELECT
          (SELECT COUNT(*) FROM services) AS monitored_services,
          (
            SELECT COUNT(*)
            FROM incidents
            WHERE status IN ('open', 'investigating')
          ) AS active_incidents,
          (
            SELECT COUNT(*)
            FROM deployments
            WHERE created_at >= date_trunc('month', CURRENT_DATE)
              AND created_at < date_trunc('month', CURRENT_DATE) + INTERVAL '1 month'
          ) AS monthly_deployments
      `),

      // Current service health distribution
      pool.query(`
        SELECT
          COUNT(*) FILTER (WHERE status = 'operational') AS operational,
          COUNT(*) FILTER (WHERE status = 'degraded') AS degraded,
          COUNT(*) FILTER (WHERE status = 'down') AS down,
          COUNT(*) FILTER (WHERE status = 'maintenance') AS maintenance,
          COUNT(*) AS total
        FROM services
      `),

      // Deployment activity for the last seven calendar days
      pool.query(`
        SELECT
          TO_CHAR(days.day, 'Dy') AS day,
          days.day::date AS date,
          COUNT(deployments.id) AS deployments
        FROM GENERATE_SERIES(
          CURRENT_DATE - INTERVAL '6 days',
          CURRENT_DATE,
          INTERVAL '1 day'
        ) AS days(day)
        LEFT JOIN deployments
          ON deployments.created_at >= days.day
          AND deployments.created_at < days.day + INTERVAL '1 day'
        GROUP BY days.day
        ORDER BY days.day
      `),

      // Registered services
      pool.query(`
        SELECT
          id,
          name,
          description,
          environment,
          status,
          server_name,
          endpoint,
          cpu_usage,
          memory_usage,
          updated_at
        FROM services
        ORDER BY name ASC
      `),

      // Five most recent incidents
      pool.query(`
        SELECT
          incidents.id,
          incidents.title,
          incidents.description,
          incidents.severity,
          incidents.status,
          incidents.created_at,
          services.name AS service_name,
          users.name AS assigned_to_name
        FROM incidents
        LEFT JOIN services
          ON services.id = incidents.service_id
        LEFT JOIN users
          ON users.id = incidents.assigned_to
        ORDER BY incidents.created_at DESC
        LIMIT 5
      `),
    ])

    const stats = statsResult.rows[0]
    const health = healthResult.rows[0]

    return res.status(200).json({
      success: true,
      data: {
        stats: {
          monitoredServices: Number(stats.monitored_services),
          activeIncidents: Number(stats.active_incidents),
          monthlyDeployments: Number(stats.monthly_deployments),
        },

        infrastructureHealth: {
          operational: Number(health.operational),
          degraded: Number(health.degraded),
          down: Number(health.down),
          maintenance: Number(health.maintenance),
          total: Number(health.total),
        },

        deploymentActivity: deploymentResult.rows.map((row) => ({
          day: row.day.trim(),
          date: row.date,
          deployments: Number(row.deployments),
        })),

        services: servicesResult.rows.map((service) => ({
          ...service,
          cpu_usage: Number(service.cpu_usage ?? 0),
          memory_usage: Number(service.memory_usage ?? 0),
        })),

        recentIncidents: incidentsResult.rows,
      },
    })
  } catch (error) {
    console.error('Dashboard API error:', error.message)

    return res.status(500).json({
      success: false,
      message: 'Unable to retrieve dashboard data',
    })
  }
}
