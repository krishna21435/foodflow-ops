# FoodFlow Ops - Full-Stack Microservices Platform

FoodFlow Ops is a production-grade food delivery system built with a microservices architecture, featuring real-time tracking, a premium React dashboard, and Dockerized deployment.

## 🚀 Getting Started

Ensure you have **Docker** and **Docker Compose** installed.

```bash
docker-compose up --build
```

### 🎮 Demo Mode (No Docker required)
If you don't have Docker installed, you can still explore the frontend with demo data:
1. Navigate to the `frontend/` directory.
2. Run `npm install` and `npm run dev`.
3. Use the **Quick Demo Login** buttons on the login page to access different dashboards.
4. The system will automatically inject sample data (restaurants, orders, rider tasks) since the backend is unreachable.

The system will be accessible at:
- **Frontend**: http://localhost:3000
- **API Gateway**: http://localhost:8000
- **RabbitMQ**: http://localhost:15672 (guest/guest)

## ⚙️ Environment Configuration
A `.env.example` file is provided in the root directory. To configure your environment:
1. Copy the example file: `cp .env.example .env`
2. Update the variables with your local or production credentials.
3. Each service will automatically prioritize these variables over defaults.

## 🔑 Demo Accounts
All passwords are `123456`.

- **Customer**: `cust@foodflow.com`
- **Restaurant**: `rest@foodflow.com`
- **Rider**: `rider@foodflow.com`
- **Admin**: `admin@foodflow.com`

## 🏗 Architecture
- **API Gateway**: Entry point for all requests.
- **Auth Service**: User management & JWT authentication.
- **Order Service**: Core order processing logic.
- **Restaurant Service**: Menu management & order preparation.
- **Delivery Service**: Rider assignment & tracking.
- **Ops Tracker Service**: Real-time event consolidation & Socket.IO broadcasting.

## 🛠 Tech Stack
- **Frontend**: React + TailwindCSS + framer-motion + Socket.IO
- **Backend**: Node.js + Express.js
- **Messaging**: RabbitMQ
- **Database**: PostgreSQL
- **DevOps**: Docker + Docker Compose

## 🔄 Order Flow
1. **Order Placed**: Customer creates an order (Order Service publishes `order.placed`).
2. **Acceptance**: Restaurant accepts the order (Restaurant Service publishes `restaurant.accepted`).
3. **Preparation**: Kitchen prepares and marks as ready (`restaurant.ready`).
4. **Assignment**: Delivery Service auto-assigns a rider (`delivery.assigned`).
5. **Delivery**: Rider picks up and updates status (`picked_up` → `out_for_delivery` → `delivered`).
6. **Real-time**: Ops Tracker listens to all events and updates the dashboard instantly via Socket.IO.
