const express = require('express');
const cors = require('cors');
const proxy = require('express-http-proxy');
const dotenv = require('dotenv');

dotenv.config();

const app = express();
const PORT = process.env.PORT || 8000;

app.use(cors());
app.use(express.json());

// Proxy routes
app.use('/api/auth', proxy(process.env.AUTH_SERVICE_URL));
app.use('/api/orders', proxy(process.env.ORDER_SERVICE_URL));
app.use('/api/restaurants', proxy(process.env.RESTAURANT_SERVICE_URL));
app.use('/api/delivery', proxy(process.env.DELIVERY_SERVICE_URL));
app.use('/api/ops', proxy(process.env.OPS_SERVICE_URL));

app.get('/health', (req, res) => {
  res.json({ status: 'API Gateway is healthy' });
});

app.listen(PORT, () => {
  console.log(`API Gateway running on port ${PORT}`);
});
