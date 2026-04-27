#!/bin/bash
set -e

psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" --dbname "$POSTGRES_DB" <<-EOSQL
    CREATE DATABASE auth_db;
    CREATE DATABASE order_db;
    CREATE DATABASE restaurant_db;
    CREATE DATABASE delivery_db;
    CREATE DATABASE ops_db;
EOSQL
