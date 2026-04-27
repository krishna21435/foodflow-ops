const express = require('express');
const cors = require('cors');
const amqp = require('amqplib');
const { Pool } = require('pg');
const dotenv = require('dotenv');

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3004;
const RABBITMQ_URL = process.env.RABBITMQ_URL || 'amqp://guest:guest@localhost:5672';

app.use(cors());
app.use(express.json());

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

let channel;
const activeSimulations = new Map();

// Simulation coordinates helper
const startLocationSimulation = (orderId) => {
  if (activeSimulations.has(orderId)) return;

  let progress = 0;
  const interval = setInterval(() => {
    progress += 0.05; // 5% progress every 2 seconds
    if (progress >= 1) {
      clearInterval(interval);
      activeSimulations.delete(orderId);
      return;
    }

    // Predictable path for demo: (0,0) to (100,100)
    const lat = 12.9716 + (progress * 0.01); 
    const lng = 77.5946 + (progress * 0.01);

    if (channel) {
      const payload = { order_id: orderId, lat, lng, progress: Math.min(progress * 100, 100) };
      channel.publish('order_events', 'delivery.location.update', Buffer.from(JSON.stringify(payload)));
      console.log(`Published location update for #${orderId}: ${progress.toFixed(2)}`);
    }
  }, 2000);

  activeSimulations.set(orderId, interval);
};

async function connectRabbitMQ() {
  try {
    const connection = await amqp.connect(RABBITMQ_URL);
    channel = await connection.createChannel();
    await channel.assertExchange('order_events', 'topic', { durable: true });
    
    // Subscribe to restaurant.ready to assign a delivery partner
    const q = await channel.assertQueue('', { exclusive: true });
    channel.bindQueue(q.queue, 'order_events', 'restaurant.ready');
    
    channel.consume(q.queue, async (msg) => {
      const data = JSON.parse(msg.content.toString());
      console.log('Delivery Service assigning for order:', data.order_id);
      
      // Auto-assign a dummy rider
      try {
        await pool.query(
          'INSERT INTO deliveries (order_id, rider_id, status) VALUES ($1, $2, $3)',
          [data.order_id, 1, 'PARTNER_ASSIGNED']
        );
        
        if (channel) {
          channel.publish('order_events', 'delivery.assigned', Buffer.from(JSON.stringify({ order_id: data.order_id, rider_id: 1, status: 'PARTNER_ASSIGNED' })));
        }
      } catch (err) {
        console.error('Failed to assign rider', err);
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
      CREATE TABLE IF NOT EXISTS deliveries (
        id SERIAL PRIMARY KEY,
        order_id INTEGER NOT NULL,
        rider_id INTEGER NOT NULL,
        status TEXT NOT NULL,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);
    console.log('Delivery DB initialized');
  } catch (err) {
    console.error('Failed to initialize Delivery DB', err);
  }
};

initDB();

app.get('/rider/:riderId', async (req, res) => {
  const result = await pool.query('SELECT * FROM deliveries WHERE rider_id = $1 ORDER BY updated_at DESC', [req.params.riderId]);
  res.json(result.rows);
});

app.post('/:orderId/status', async (req, res) => {
  const { status } = req.body;
  try {
    await pool.query('UPDATE deliveries SET status = $1, updated_at = CURRENT_TIMESTAMP WHERE order_id = $2', [status, req.params.orderId]);
    
    // Publish Event
    if (channel) {
      const routingKey = `delivery.${status.toLowerCase().replace(/_/g, '.')}`;
      channel.publish('order_events', routingKey, Buffer.from(JSON.stringify({ order_id: req.params.orderId, status })));
    }

    // Start simulation if status is OUT_FOR_DELIVERY
    if (status === 'OUT_FOR_DELIVERY') {
      startLocationSimulation(parseInt(req.params.orderId));
    }

    // Stop simulation if DELIVERED
    if (status === 'DELIVERED') {
      const interval = activeSimulations.get(parseInt(req.params.orderId));
      if (interval) {
        clearInterval(interval);
        activeSimulations.delete(parseInt(req.params.orderId));
      }
    }
    
    res.json({ message: `Status updated to ${status}` });
  } catch (err) {
    res.status(500).json({ error: 'Update failed', detail: err.message });
  }
});

app.listen(PORT, () => {
  console.log(`Delivery Service running on port ${PORT}`);
});
