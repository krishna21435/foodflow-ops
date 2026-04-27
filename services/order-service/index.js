const express = require('express');
const cors = require('cors');
const amqp = require('amqplib');
const { Pool } = require('pg');
const dotenv = require('dotenv');

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3002;
const RABBITMQ_URL = process.env.RABBITMQ_URL || 'amqp://guest:guest@localhost:5672';

app.use(cors());
app.use(express.json());

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

let channel;

// Connect to RabbitMQ
async function connectRabbitMQ() {
  try {
    const connection = await amqp.connect(RABBITMQ_URL);
    channel = await connection.createChannel();
    await channel.assertExchange('order_events', 'topic', { durable: true });
    console.log('Order Service connected to RabbitMQ');
  } catch (err) {
    console.error('RabbitMQ connection failed', err);
    setTimeout(connectRabbitMQ, 5000);
  }
}

connectRabbitMQ();

// Initialize DB
const initDB = async () => {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS orders (
        id SERIAL PRIMARY KEY,
        customer_id INTEGER NOT NULL,
        restaurant_id INTEGER NOT NULL,
        items JSONB NOT NULL,
        total_amount DECIMAL(10, 2) NOT NULL,
        status TEXT NOT NULL DEFAULT 'ORDER_PLACED',
        delivery_address TEXT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);
    console.log('Order DB initialized');
  } catch (err) {
    console.error('Failed to initialize Order DB', err);
  }
};

initDB();

app.post('/', async (req, res) => {
  const { customer_id, restaurant_id, items, total_amount, delivery_address } = req.body;
  try {
    const result = await pool.query(
      'INSERT INTO orders (customer_id, restaurant_id, items, total_amount, delivery_address) VALUES ($1, $2, $3, $4, $5) RETURNING *',
      [customer_id, restaurant_id, JSON.stringify(items), total_amount, delivery_address]
    );
    
    const order = result.rows[0];
    
    // Publish Event
    if (channel) {
      channel.publish('order_events', 'order.placed', Buffer.from(JSON.stringify(order)));
      console.log('Published order.placed event');
    }

    res.status(201).json(order);
  } catch (err) {
    res.status(500).json({ error: 'Failed to place order', detail: err.message });
  }
});

app.get('/:id', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM orders WHERE id = $1', [req.params.id]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Order not found' });
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Fetch failed', detail: err.message });
  }
});

app.get('/customer/:customerId', async (req, res) => {
    try {
      const result = await pool.query('SELECT * FROM orders WHERE customer_id = $1 ORDER BY created_at DESC', [req.params.customerId]);
      res.json(result.rows);
    } catch (err) {
      res.status(500).json({ error: 'Fetch failed', detail: err.message });
    }
  });

app.patch('/:id/status', async (req, res) => {
  const { status } = req.body;
  try {
    const result = await pool.query(
      'UPDATE orders SET status = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2 RETURNING *',
      [status, req.params.id]
    );
    const order = result.rows[0];
    
    // Publish Event
    if (channel) {
      const routingKey = `order.${status.toLowerCase().replace(/_/g, '.')}`;
      channel.publish('order_events', routingKey, Buffer.from(JSON.stringify(order)));
    }

    res.json(order);
  } catch (err) {
    res.status(500).json({ error: 'Update failed', detail: err.message });
  }
});

app.listen(PORT, () => {
  console.log(`Order Service running on port ${PORT}`);
});
