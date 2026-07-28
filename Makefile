.PHONY: up down restart rebuild reset destroy logs ps shell-db shell-api migrate

# Start stack
up:
	docker compose up -d

# Stop stack
down:
	docker compose down

# Restart services
restart:
	docker compose restart

# Rebuild application image
rebuild:
	docker compose build
	docker compose up -d

# Full reset (destructive)
reset:
	docker compose down -v
	docker compose build --no-cache
	docker compose up -d

# Destroy everything
destroy:
	docker compose down -v --remove-orphans --rmi all
	docker volume prune -f

# Follow logs
logs:
	docker compose logs -f $${service:-api}

# Show running containers
ps:
	docker compose ps

# Shell into API container
shell-api:
	docker compose exec api bash

# Shell into Postgres
shell-db:
	docker compose exec postgres psql -U $$POSTGRES_USER -d $$POSTGRES_DB

# Run Alembic migrations
migrate:
	docker compose exec api alembic upgrade head