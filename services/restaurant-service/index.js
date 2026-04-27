const express = require('express');
const cors = require('cors');
const amqp = require('amqplib');
const { Pool } = require('pg');
const dotenv = require('dotenv');

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3003;
const RABBITMQ_URL = process.env.RABBITMQ_URL || 'amqp://guest:guest@localhost:5672';

app.use(cors());
app.use(express.json());

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

let channel;

async function connectRabbitMQ() {
  try {
    const connection = await amqp.connect(RABBITMQ_URL);
    channel = await connection.createChannel();
    await channel.assertExchange('order_events', 'topic', { durable: true });
    
    // Subscribe to order.placed
    const q = await channel.assertQueue('', { exclusive: true });
    channel.bindQueue(q.queue, 'order_events', 'order.placed');
    
    channel.consume(q.queue, async (msg) => {
      const order = JSON.parse(msg.content.toString());
      console.log('Restaurant Service received order:', order.id);
      
      // Store in restaurant_orders local table
      try {
        await pool.query(
          'INSERT INTO restaurant_orders (order_id, restaurant_id, status, items) VALUES ($1, $2, $3, $4)',
          [order.id, order.restaurant_id, 'PENDING_ACCEPTANCE', JSON.stringify(order.items)]
        );
      } catch (err) {
        console.error('Failed to store restaurant order', err);
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
        CREATE TABLE IF NOT EXISTS restaurants (
          id SERIAL PRIMARY KEY,
          name TEXT NOT NULL,
          cuisine TEXT,
          address TEXT,
          image_url TEXT,
          lat DOUBLE PRECISION NOT NULL,
          lng DOUBLE PRECISION NOT NULL,
          rating DECIMAL(2, 1) DEFAULT 4.0,
          delivery_time_min INTEGER DEFAULT 30,
          is_open BOOLEAN DEFAULT TRUE
        );
        CREATE TABLE IF NOT EXISTS menus (
          id SERIAL PRIMARY KEY,
          restaurant_id INTEGER REFERENCES restaurants(id),
          name TEXT NOT NULL,
          price DECIMAL(10, 2) NOT NULL,
          description TEXT
        );
        CREATE TABLE IF NOT EXISTS restaurant_orders (
          id SERIAL PRIMARY KEY,
          order_id INTEGER NOT NULL,
          restaurant_id INTEGER NOT NULL,
          status TEXT NOT NULL,
          items JSONB,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
      `);
      
      // Seed initial data if empty
      const count = await pool.query('SELECT COUNT(*) FROM restaurants');
      if (parseInt(count.rows[0].count) === 0) {
        const rests = await pool.query(`
            INSERT INTO restaurants (name, cuisine, address, image_url, lat, lng) VALUES 
            ('Gourmet Burger Bliss', 'American • Burgers', 'B-12, Sector 5, Bangalore', 'https://images.unsplash.com/photo-1571091718767-18b5b1457add?w=800', 12.9716, 77.5946),
            ('Sushi Zen Garden', 'Japanese • Fine Dining', 'Uptown Galleria, Bangalore', 'https://images.unsplash.com/photo-1579871494447-9811cf80d66c?w=800', 12.9801, 77.6012),
            ('Basanti Kitchen', 'North Indian • Classics', 'Midtown Plaza, Bangalore', 'https://images.unsplash.com/photo-1517248135467-4c7ed9d42339?w=800', 12.9650, 77.5890),
            ('The Italian Hub', 'Italian • Pizzas', 'Whitefield Road, Bangalore', 'https://images.unsplash.com/photo-1513104890138-7c749659a591?w=800', 12.9500, 77.6500),
            ('Coastal Cravings', 'Seafood • Grilled', 'Indiranagar Main, Bangalore', 'https://images.unsplash.com/photo-1559339352-11d035aa65de?w=800', 12.9784, 77.6408)
            RETURNING id;
        `);
        const ids = rests.rows.map(r => r.id);
        await pool.query(`
            INSERT INTO menus (restaurant_id, name, price, description) VALUES 
            ($1, 'Whopper', 5.99, 'Classic flame-grilled burger'),
            ($1, 'Fries', 2.99, 'Golden crispy fries'),
            ($2, 'Salmon Nigiri', 12.99, 'Fresh salmon over rice'),
            ($3, 'Margherita Pizza', 14.99, 'Simple tomato and mozzarella');
        `, [ids[0], ids[1], ids[2]]);
      }
      
      console.log('Restaurant DB initialized and seeded');
    } catch (err) {
      console.error('Failed to initialize Restaurant DB', err);
    }
  };
  
  initDB();

app.get('/nearby', async (req, res) => {
  const { lat, lng, radius = 5 } = req.query;
  
  if (!lat || !lng) {
    return res.status(400).json({ error: 'Latitude and Longitude are required for proximity search' });
  }

  try {
    const latNum = parseFloat(lat);
    const lngNum = parseFloat(lng);
    const radiusNum = parseFloat(radius);

    const query = `
      SELECT *,
      (6371 * acos(
        cos(radians($1)) * cos(radians(lat)) * 
        cos(radians(lng) - radians($2)) + 
        sin(radians($1)) * sin(radians(lat))
      )) AS distance
      FROM restaurants
      WHERE (6371 * acos(
        cos(radians($1)) * cos(radians(lat)) * 
        cos(radians(lng) - radians($2)) + 
        sin(radians($1)) * sin(radians(lat))
      )) <= $3
      ORDER BY distance ASC;
    `;
    const result = await pool.query(query, [latNum, lngNum, radiusNum]);
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: 'Proximity search failed', details: err.message });
  }
});

app.post('/discover', async (req, res) => {
  const { lat, lng } = req.body;
  if (!lat || !lng) return res.status(400).json({ error: 'Location required' });

  try {
    // Search within 5KM (5000 meters)
    const overpassUrl = `https://overpass-api.de/api/interpreter?data=[out:json];node["amenity"="restaurant"](around:5000,${lat},${lng});out 20;`;
    const axios = require('axios');
    const response = await axios.get(overpassUrl);
    
    if (response.data.elements.length === 0) {
      return res.json({ message: 'No local restaurants found in public map data.' });
    }

    const realRestaurants = response.data.elements.map(el => ({
      name: el.tags.name || 'Local Eatery',
      cuisine: el.tags.cuisine || 'Multi-cuisine',
      lat: el.lat,
      lng: el.lon,
      address: el.tags["addr:street"] || 'Nearby Street'
    })).filter(r => r.name !== 'Local Eatery');

    for (const r of realRestaurants) {
      await pool.query(
        'INSERT INTO restaurants (name, cuisine, address, image_url, lat, lng, rating, delivery_time_min) VALUES ($1, $2, $3, $4, $5, $6, $7, $8) ON CONFLICT DO NOTHING',
        [r.name, r.cuisine, r.address, "https://images.unsplash.com/photo-1517248135467-4c7ed9d42339?w=800", r.lat, r.lng, (Math.random() * 1.5 + 3.5).toFixed(1), Math.floor(Math.random() * 20 + 20)]
      );
    }

    res.json({ message: `Success`, count: realRestaurants.length });
  } catch (err) {
    console.error('Discovery failed', err);
    res.status(500).json({ error: 'Discovery failed' });
  }
});

app.get('/:id/menu', async (req, res) => {
  const result = await pool.query('SELECT * FROM menus WHERE restaurant_id = $1', [req.params.id]);
  res.json(result.rows);
});

app.get('/:id/orders', async (req, res) => {
    const result = await pool.query('SELECT * FROM restaurant_orders WHERE restaurant_id = $1 ORDER BY created_at DESC', [req.params.id]);
    res.json(result.rows);
  });

app.post('/orders/:orderId/accept', async (req, res) => {
  try {
    await pool.query('UPDATE restaurant_orders SET status = $1 WHERE order_id = $2', ['ACCEPTED', req.params.orderId]);
    
    // Notify Order Service via RabbitMQ
    if (channel) {
      channel.publish('order_events', 'restaurant.accepted', Buffer.from(JSON.stringify({ order_id: req.params.orderId, status: 'RESTAURANT_ACCEPTED' })));
    }
    
    res.json({ message: 'Order accepted' });
  } catch (err) {
    res.status(500).json({ error: 'Update failed', detail: err.message });
  }
});

app.post('/orders/:orderId/ready', async (req, res) => {
    try {
      await pool.query('UPDATE restaurant_orders SET status = $1 WHERE order_id = $2', ['READY', req.params.orderId]);
      
      // Notify Order Service via RabbitMQ
      if (channel) {
        channel.publish('order_events', 'restaurant.ready', Buffer.from(JSON.stringify({ order_id: req.params.orderId, status: 'READY_FOR_PICKUP' })));
      }
      
      res.json({ message: 'Order ready for pickup' });
    } catch (err) {
      res.status(500).json({ error: 'Update failed', detail: err.message });
    }
  });

app.listen(PORT, () => {
  console.log(`Restaurant Service running on port ${PORT}`);
});
