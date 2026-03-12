import { Client } from 'pg';
import * as dotenv from 'dotenv';
import { join } from 'path';

dotenv.config({ path: join(__dirname, '.env') });

async function checkDb() {
  const client = new Client({
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432'),
    user: process.env.DB_USERNAME || 'postgres',
    password: process.env.DB_PASSWORD || 'postgres',
    database: process.env.DB_NAME || 'orders_db',
  });

  try {
    await client.connect();
    console.log('Connected to DB');
    
    const res = await client.query('SELECT COUNT(*) FROM orders');
    console.log(`Total orders in DB: ${res.rows[0].count}`);
    
    if (res.rows[0].count > 0) {
      const orders = await client.query('SELECT id, "tenantId", "customerId", status FROM orders');
      console.log('All orders in DB:', orders.rows);
    }
  } catch (err) {
    console.error('Error:', err);
  } finally {
    await client.end();
  }
}

checkDb();
