# AURA Analyst - Deployment Guide

## Table of Contents
1. [Prerequisites](#prerequisites)
2. [Local Development Setup](#local-development-setup)
3. [Docker Deployment](#docker-deployment)
4. [AWS Deployment](#aws-deployment)
5. [Configuration](#configuration)
6. [Monitoring](#monitoring)
7. [Troubleshooting](#troubleshooting)

## Prerequisites

### Required Software
- Python 3.9+
- Node.js 18+
- Docker & Docker Compose
- PostgreSQL 15+
- Redis 7+
- AWS Account with Bedrock access

### AWS Setup
1. Enable AWS Bedrock in your region
2. Request access to Claude models
3. Create IAM user with Bedrock permissions
4. Generate access keys

## Local Development Setup

### Backend Setup

```bash
# Navigate to backend directory
cd backend

# Create virtual environment
python -m venv venv

# Activate virtual environment
# Windows
venv\Scripts\activate
# Linux/Mac
source venv/bin/activate

# Install dependencies
pip install -r requirements_v2.txt

# Copy environment file
cp ../.env.example .env

# Edit .env with your credentials
# Add AWS credentials, database URL, etc.

# Run database migrations
alembic upgrade head

# Start development server
uvicorn backend.main_v2:app --reload --host 0.0.0.0 --port 8000
```

### Frontend Setup

```bash
# Navigate to frontend directory
cd frontend

# Install dependencies
npm install

# Copy environment file
cp .env.example .env.local

# Edit .env.local
# NEXT_PUBLIC_API_URL=http://localhost:8000

# Start development server
npm run dev
```

## Docker Deployment

### Using Docker Compose

```bash
# Copy environment file
cp .env.example .env

# Edit .env with your credentials

# Build and start all services
docker-compose up -d

# View logs
docker-compose logs -f

# Stop services
docker-compose down

# Stop and remove volumes
docker-compose down -v
```

### Individual Service Deployment

```bash
# Build backend
docker build -t aura-analyst-backend ./backend

# Run backend
docker run -d \
  -p 8000:8000 \
  --env-file .env \
  --name aura-backend \
  aura-analyst-backend

# Build frontend
docker build -t aura-analyst-frontend ./frontend

# Run frontend
docker run -d \
  -p 3000:3000 \
  -e NEXT_PUBLIC_API_URL=http://localhost:8000 \
  --name aura-frontend \
  aura-analyst-frontend
```

## AWS Deployment

### Using AWS ECS

1. **Create ECR Repositories**
```bash
aws ecr create-repository --repository-name aura-analyst-backend
aws ecr create-repository --repository-name aura-analyst-frontend
```

2. **Build and Push Images**
```bash
# Login to ECR
aws ecr get-login-password --region us-east-1 | docker login --username AWS --password-stdin <account-id>.dkr.ecr.us-east-1.amazonaws.com

# Tag and push backend
docker tag aura-analyst-backend:latest <account-id>.dkr.ecr.us-east-1.amazonaws.com/aura-analyst-backend:latest
docker push <account-id>.dkr.ecr.us-east-1.amazonaws.com/aura-analyst-backend:latest

# Tag and push frontend
docker tag aura-analyst-frontend:latest <account-id>.dkr.ecr.us-east-1.amazonaws.com/aura-analyst-frontend:latest
docker push <account-id>.dkr.ecr.us-east-1.amazonaws.com/aura-analyst-frontend:latest
```

3. **Create ECS Task Definitions**
- Use the provided task definition templates
- Configure environment variables
- Set up IAM roles with Bedrock permissions

4. **Create ECS Services**
- Configure load balancer
- Set up auto-scaling
- Configure health checks

### Using AWS Lambda (Serverless)

```bash
# Install Serverless Framework
npm install -g serverless

# Deploy backend
cd backend
serverless deploy --stage production

# Deploy frontend to S3 + CloudFront
cd frontend
npm run build
aws s3 sync out/ s3://your-bucket-name
```

## Configuration

### Environment Variables

#### Backend
```env
# Core
APP_NAME=AURA Analyst
DEBUG=false
ENVIRONMENT=production

# AWS Bedrock
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=<your-key>
AWS_SECRET_ACCESS_KEY=<your-secret>
BEDROCK_MODEL_ID=anthropic.claude-3-sonnet-20240229-v1:0

# Database
DATABASE_URL=postgresql://user:pass@host:5432/db

# Redis
REDIS_URL=redis://host:6379/0

# Security
SECRET_KEY=<generate-strong-key>
```

#### Frontend
```env
NEXT_PUBLIC_API_URL=https://api.yourdomain.com
NEXT_PUBLIC_APP_NAME=AURA Analyst
```

### Database Setup

```bash
# Create database
createdb aura_analyst

# Run migrations
alembic upgrade head

# Create initial admin user
python scripts/create_admin.py
```

### SSL/TLS Configuration

1. **Using Let's Encrypt**
```bash
# Install certbot
sudo apt-get install certbot

# Generate certificate
sudo certbot certonly --standalone -d yourdomain.com

# Configure nginx
sudo nano /etc/nginx/sites-available/aura-analyst
```

2. **Nginx Configuration**
```nginx
server {
    listen 443 ssl http2;
    server_name yourdomain.com;

    ssl_certificate /etc/letsencrypt/live/yourdomain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/yourdomain.com/privkey.pem;

    location / {
        proxy_pass http://localhost:3000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }

    location /api {
        proxy_pass http://localhost:8000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}
```

## Monitoring

### Prometheus + Grafana

1. **Access Grafana**
- URL: http://localhost:3001
- Default credentials: admin/admin

2. **Import Dashboards**
- Navigate to Dashboards > Import
- Use provided dashboard JSON files

3. **Configure Alerts**
- Set up alert rules in Grafana
- Configure notification channels (email, Slack, etc.)

### Application Logs

```bash
# View logs
docker-compose logs -f backend

# Search logs
docker-compose logs backend | grep ERROR

# Export logs
docker-compose logs --no-color backend > backend.log
```

### Health Checks

```bash
# Basic health check
curl http://localhost:8000/health

# Detailed health check
curl http://localhost:8000/health/detailed

# Metrics
curl http://localhost:8000/metrics
```

## Troubleshooting

### Common Issues

#### 1. Bedrock Access Denied
```
Error: AccessDeniedException
Solution: Verify IAM permissions and Bedrock model access
```

#### 2. Database Connection Failed
```
Error: could not connect to server
Solution: Check DATABASE_URL and ensure PostgreSQL is running
```

#### 3. Redis Connection Failed
```
Error: Error connecting to Redis
Solution: Verify REDIS_URL and ensure Redis is running
```

#### 4. High Memory Usage
```
Solution: 
- Increase container memory limits
- Enable Redis caching
- Optimize database queries
```

### Debug Mode

```bash
# Enable debug mode
export DEBUG=true
export LOG_LEVEL=DEBUG

# Run with verbose logging
uvicorn backend.main_v2:app --log-level debug
```

### Performance Optimization

1. **Enable Caching**
```python
# In .env
REDIS_URL=redis://localhost:6379/0
CACHE_TTL=3600
```

2. **Database Connection Pooling**
```python
# In .env
DB_POOL_SIZE=20
DB_MAX_OVERFLOW=40
```

3. **Rate Limiting**
```python
# In .env
RATE_LIMIT_PER_MINUTE=100
RATE_LIMIT_PER_HOUR=5000
```

## Security Best Practices

1. **Use Strong Secrets**
```bash
# Generate secure secret key
python -c "import secrets; print(secrets.token_urlsafe(32))"
```

2. **Enable HTTPS**
- Always use SSL/TLS in production
- Configure HSTS headers

3. **Regular Updates**
```bash
# Update dependencies
pip install --upgrade -r requirements_v2.txt
npm update
```

4. **Backup Strategy**
```bash
# Database backup
pg_dump aura_analyst > backup_$(date +%Y%m%d).sql

# Automated backups
0 2 * * * /usr/local/bin/backup_script.sh
```

## Support

For issues and questions:
- GitHub Issues: https://github.com/yourusername/aura-analyst/issues
- Documentation: https://docs.yourdomain.com
- Email: support@yourdomain.com