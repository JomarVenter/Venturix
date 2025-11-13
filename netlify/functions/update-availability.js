const { Client } = require('pg');

exports.handler = async (event, context) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Content-Type': 'application/json',
  };

  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers,
      body: '',
    };
  }

  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ error: 'Method not allowed' }),
    };
  }

  let requestBody;
  try {
    requestBody = JSON.parse(event.body);
  } catch (error) {
    return {
      statusCode: 400,
      headers,
      body: JSON.stringify({ error: 'Invalid JSON' }),
    };
  }

  const { dateKey, isAvailable } = requestBody;

  if (!dateKey || typeof isAvailable !== 'boolean') {
    return {
      statusCode: 400,
      headers,
      body: JSON.stringify({ error: 'dateKey and isAvailable required' }),
    };
  }

  const client = new Client({
    connectionString: process.env.DATABASE_URL,
  });

  try {
    await client.connect();
    
    const result = await client.query(`
      INSERT INTO availability (date_key, is_available, updated_at) 
      VALUES ($1, $2, CURRENT_TIMESTAMP)
      ON CONFLICT (date_key) 
      DO UPDATE SET 
        is_available = EXCLUDED.is_available,
        updated_at = CURRENT_TIMESTAMP
      RETURNING date_key, is_available
    `, [dateKey, isAvailable]);

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        dateKey: result.rows[0].date_key,
        isAvailable: result.rows[0].is_available,
      }),
    };
  } catch (error) {
    console.error('Database error:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: 'Database error', details: error.message }),
    };
  } finally {
    await client.end();
  }
};