const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const amqp = require('amqplib');
const { Pool } = require('pg');
const cors = require('cors');
const dotenv = require('dotenv');

dotenv.config();

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: "*", methods: ["GET", "POST"] }
});

const PORT = process.env.PORT || 3005;
const SOCKET_PORT = process.env.SOCKET_PORT || 3006;
const RABBITMQ_URL = process.env.RABBITMQ_URL || 'amqp://guest:guest@localhost:5672';

app.use(cors());
app.use(express.json());

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

async function connectRabbitMQ() {
  try {
    const connection = await amqp.connect(RABBITMQ_URL);
    const channel = await connection.createChannel();
    await channel.assertExchange('order_events', 'topic', { durable: true });
    
    const q = await channel.assertQueue('', { exclusive: true });
    // Bind to all order and delivery events
    channel.bindQueue(q.queue, 'order_events', 'order.#');
    channel.bindQueue(q.queue, 'order_events', 'restaurant.#');
    channel.bindQueue(q.queue, 'order_events', 'delivery.#');
    
    channel.consume(q.queue, async (msg) => {
      const routingKey = msg.fields.routingKey;
      const data = JSON.parse(msg.content.toString());
      console.log(`Ops Tracker received ${routingKey}:`, data);
      
      const orderId = data.order_id || data.id;

      // Handle Location Updates specially (don't persist to DB for performance)
      if (routingKey === 'delivery.location.update') {
        io.emit('rider_location', data);
        return;
      }

      const status = data.status;
      if (!status) return;
      
      // 1. Update/Insert into live_orders
      try {
        await pool.query(`
          INSERT INTO live_orders (order_id, last_status, updated_at)
          VALUES ($1, $2, CURRENT_TIMESTAMP)
          ON CONFLICT (order_id) DO UPDATE SET last_status = $2, updated_at = CURRENT_TIMESTAMP
        `, [orderId, status]);
        
        // 2. Add to timeline_events
        await pool.query(`
          INSERT INTO timeline_events (order_id, event_type, data)
          VALUES ($1, $2, $3)
        `, [orderId, routingKey, msg.content.toString()]);
        
        // 3. Emit via Socket.IO
        io.emit('order_update', { orderId, status, event: routingKey, timestamp: new Date() });
        console.log('Emitted update via Socket.IO');
      } catch (err) {
        console.error('Ops Tracker persistent failed', err);
      }
    }, { noAck: true });

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
        CREATE TABLE IF NOT EXISTS live_orders (
          order_id INTEGER PRIMARY KEY,
          last_status TEXT NOT NULL,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
        CREATE TABLE IF NOT EXISTS timeline_events (
          id SERIAL PRIMARY KEY,
          order_id INTEGER NOT NULL,
          event_type TEXT NOT NULL,
          data JSONB,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
      `);
      console.log('Ops DB initialized');
    } catch (err) {
      console.error('Failed to initialize Ops DB', err);
    }
  };
  
  initDB();

app.get('/live-orders', async (req, res) => {
  const result = await pool.query('SELECT * FROM live_orders ORDER BY updated_at DESC');
  res.json(result.rows);
});

app.get('/timeline/:orderId', async (req, res) => {
  const result = await pool.query('SELECT * FROM timeline_events WHERE order_id = $1 ORDER BY created_at ASC', [req.params.orderId]);
  res.json(result.rows);
});

app.get('/stats', async (req, res) => {
  const total = await pool.query('SELECT COUNT(*) FROM live_orders');
  const active = await pool.query("SELECT COUNT(*) FROM live_orders WHERE last_status != 'DELIVERED'");
  const delivered = await pool.query("SELECT COUNT(*) FROM live_orders WHERE last_status = 'DELIVERED'");
  res.json({
    totalOrders: parseInt(total.rows[0].count),
    activeOrders: parseInt(active.rows[0].count),
    deliveredOrders: parseInt(delivered.rows[0].count),
    avgDeliveryTime: '24 mins'
  });
});

server.listen(PORT, () => {
  console.log(`Ops Service (API + Realtime) running on port ${PORT}`);
});
