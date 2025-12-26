import { Client } from 'pg';

async function checkSchema() {
  const client = new Client({
    host: 'localhost',
    port: 5432,
    user: 'agentrix',
    password: 'agentrix_secure_2024',
    database: 'paymind',
  });

  try {
    await client.connect();
    const res = await client.query(`
      SELECT column_name, data_type, udt_name 
      FROM information_schema.columns 
      WHERE table_name = 'users' AND column_name = 'roles';
    `);
    console.log(JSON.stringify(res.rows, null, 2));
  } catch (err) {
    console.error(err);
  } finally {
    await client.end();
  }
}

checkSchema();
