# plotline-backend-bun-port

To install dependencies:

```bash
bun install
```

To run:

```bash
bun start
```

This project was created using `bun init` in bun v1.3.6. [Bun](https://bun.com) is a fast all-in-one JavaScript runtime.

# Setup Details
Below is details on setting up the requirements for the backend.
---

## Environment Setup

Create a `.env` file in the root directory with:

```env
# Database
MYSQL_DB_NAME=plotline_prd
MYSQL_ROOT_PASSWORD=rootpasswordhere
MYSQL_USER=yourusername
MYSQL_PASSWORD=yourpassword

# Redis
REDIS_PASSWORD=redispassword
REDIS_PORT=6379

# Storage
ROOT_DIR=/mnt/mediadrive/plotline
DB_DIR=${ROOT_DIR}/db/data
MYSQL_DB_DIR=${DB_DIR}/mysql
REDIS_DB_DIR=${DB_DIR}/redis

# Server
DB_HOST=192.168.1.200
BACKEND_PORT=3001

# User Agent & Other Settings
APP_NAME=Plotline/Testing
APP_EMAIL_CONTACT=example@mail.com
```

---

## Docker & Database Setup

### Starting the Containers

```bash
docker-compose -f db/docker/docker-compose.yml --env-file .env up -d
```

### Verify Configuration

```bash
docker-compose -f db/docker/docker-compose.yml --env-file .env config
```

### Creating the Database

Connect to MySQL:

```bash
docker exec -it plotline-mysql mysql -u root -p
```

Then run:

```sql
CREATE DATABASE IF NOT EXISTS plotline_prd;
USE plotline_prd;
```

Run SQL scripts in order:

1. `./db/creation/initial-book-tables.sql`
2. `./db/creation/initial-user-tables.sql`
3. `./db/creation/initial-shelf-tables.sql`

### Granting Remote Access (for homelab setups)

If running MySQL on a remote server, connect to the container and run:

```sql
ALTER USER 'yourusername'@'192.168.1.%' IDENTIFIED BY 'yourpassword';
GRANT ALL PRIVILEGES ON plotline_prd.* TO 'yourusername'@'192.168.1.%';
FLUSH PRIVILEGES;
```

### Connecting from Your PC

**Using VS Code (SQLTools extension)**:
- Install `SQLTools` and `SQLTools MySQL`
- Create a new connection:
  - Host: `192.168.1.200` (your server IP)
  - Port: `3306`
  - Username: `yourusername`
  - Password: `yourpassword`
  - Database: `plotline_prd`

**Using Command Line**:
```bash
mysql -h 192.168.1.200 -u yourusername -p
```

**Using Redis**:
- Install `Redis` extension for VS Code
- Add connection with:
  - Host: your server IP
  - Port: `6379`
  - Password: from `.env` REDIS_PASSWORD