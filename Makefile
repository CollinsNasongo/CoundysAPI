.PHONY: up down restart rebuild reset destroy logs ps shell-db shell-api etl

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

# Destroy this project's containers, volumes and images (other projects untouched)
destroy:
	docker compose down -v --remove-orphans --rmi all

# Follow logs
logs:
	docker compose logs -f $${service:-api}

# Show running containers
ps:
	docker compose ps

# Shell into API container
shell-api:
	docker compose exec api bash

# Shell into Postgres (credentials come from the container's environment, i.e. .env)
shell-db:
	docker compose exec postgres sh -c 'psql -U "$$POSTGRES_USER" -d "$$POSTGRES_DB"'

# Re-run the ETL (bronze -> silver -> gold) against the running database
etl:
	docker compose run --rm etl