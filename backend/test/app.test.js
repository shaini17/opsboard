
import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import request from 'supertest'
import app from '../src/app.js'

describe('OpsBoard API', () => {
  it('should return a successful health check', async () => {
    const response = await request(app)
      .get('/api/health')

    assert.equal(response.status, 200)
    assert.equal(response.body.success, true)
    assert.equal(response.body.message, 'OpsBoard API is running')
    assert.ok(response.body.timestamp)
  })

  it('should return a welcome message on the root route', async () => {
    const response = await request(app)
      .get('/')

    assert.equal(response.status, 200)
    assert.equal(response.body.success, true)
    assert.equal(response.body.message, 'Welcome to OpsBoard API')
  })

  it('should return 404 for an unknown API route', async () => {
    const response = await request(app)
      .get('/api/unknown-route')

    assert.equal(response.status, 404)
    assert.equal(response.body.success, false)
  })
})
