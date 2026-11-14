import pool from '../config/db.js'

const deploymentSelect = `
  SELECT
    deployments.id,
    deployments.version,
    deployments.environment,
    deployments.status,
    deployments.commit_hash,
    deployments.deployment_notes,
    deployments.started_at,
    deployments.completed_at,
    deployments.created_at,
    services.name AS service_name,
    users.name AS engineer
  FROM deployments
  LEFT JOIN services
    ON services.id = deployments.service_id
  LEFT JOIN users
    ON users.id = deployments.deployed_by
`

export async function getDeployments(req, res) {
  try {
    const result = await pool.query(`
      ${deploymentSelect}
      ORDER BY deployments.created_at DESC
    `)

    return res.status(200).json({
      success: true,
      data: result.rows,
    })
  } catch (error) {
    console.error('Get deployments error:', error.message)

    return res.status(500).json({
      success: false,
      message: 'Unable to retrieve deployments',
    })
  }
}

export async function createDeployment(req, res) {
  try {
    const {
      service_id,
      version,
      environment,
      commit_hash,
      deployment_notes,
    } = req.body

    if (
      !Number.isInteger(Number(service_id)) ||
      !version?.trim() ||
      !environment
    ) {
      return res.status(400).json({
        success: false,
        message: 'Service, version and environment are required',
      })
    }

    const allowedEnvironments = ['development', 'staging', 'production']
    const normalizedEnvironment = environment.toLowerCase()

    if (!allowedEnvironments.includes(normalizedEnvironment)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid deployment environment',
      })
    }

    const insertResult = await pool.query(
      `
        INSERT INTO deployments (
          service_id,
          version,
          environment,
          status,
          deployed_by,
          commit_hash,
          deployment_notes,
          started_at
        )
        VALUES ($1, $2, $3, 'in_progress', $4, $5, $6, NOW())
        RETURNING id
      `,
      [
        Number(service_id),
        version.trim(),
        normalizedEnvironment,
        req.user.id,
        commit_hash?.trim() || null,
        deployment_notes?.trim() || null,
      ]
    )

    const deploymentId = insertResult.rows[0].id

    const result = await pool.query(
      `
        ${deploymentSelect}
        WHERE deployments.id = $1
      `,
      [deploymentId]
    )

    return res.status(201).json({
      success: true,
      message: 'Deployment created successfully',
      data: result.rows[0],
    })
  } catch (error) {
    console.error('Create deployment error:', error.message)

    if (error.code === '23503') {
      return res.status(400).json({
        success: false,
        message: 'The selected service or engineer does not exist',
      })
    }

    return res.status(500).json({
      success: false,
      message: 'Unable to create deployment',
    })
  }
}

export async function updateDeploymentStatus(req, res) {
  try {
    const deploymentId = Number(req.params.id)
    const { status } = req.body

    const allowedStatuses = [
      'pending',
      'in_progress',
      'successful',
      'failed',
      'rolled_back',
    ]

    if (!Number.isSafeInteger(deploymentId) || deploymentId <= 0) {
      return res.status(400).json({
        success: false,
        message: 'Invalid deployment ID',
      })
    }

    if (
      typeof status !== 'string' ||
      !allowedStatuses.includes(status.toLowerCase())
    ) {
      return res.status(400).json({
        success: false,
        message: 'Invalid deployment status',
      })
    }

    const normalizedStatus = status.toLowerCase()
const result = await pool.query(
  `
    UPDATE deployments
    SET
      status = $1::VARCHAR,
      started_at = CASE
        WHEN $1::VARCHAR = 'in_progress' AND started_at IS NULL
          THEN NOW()
        ELSE started_at
      END,
      completed_at = CASE
        WHEN $1::VARCHAR IN ('successful', 'failed', 'rolled_back')
          THEN NOW()
        ELSE NULL
      END
    WHERE id = $2
    RETURNING id
  `,
  [normalizedStatus, deploymentId]
)

    if (result.rowCount === 0) {
      return res.status(404).json({
        success: false,
        message: 'Deployment not found',
      })
    }

    const deploymentResult = await pool.query(
      `
        ${deploymentSelect}
        WHERE deployments.id = $1
      `,
      [deploymentId]
    )

    return res.status(200).json({
      success: true,
      message: 'Deployment status updated successfully',
      data: deploymentResult.rows[0],
    })
  } catch (error) {
    console.error('Update deployment status error:', error.message)

    return res.status(500).json({
      success: false,
      message: 'Unable to update deployment status',
    })
  }
}
