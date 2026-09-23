#!/usr/bin/env bash
set -euo pipefail

project_root="$(cd "$(dirname "$0")/.." && pwd)"
backend_dir="$project_root/backend"
frontend_dir="$project_root/frontend"

for command_name in docker java npm curl; do
  if ! command -v "$command_name" >/dev/null 2>&1; then
    echo "Не найдена команда $command_name. Для запуска нужны Docker Desktop, Java 21+, Node.js 22+ и curl."
    exit 1
  fi
done

if ! docker info >/dev/null 2>&1; then
  echo "Docker не запущен. Откройте Docker Desktop и повторите ./scripts/start-dev.sh"
  exit 1
fi

if [[ -f "$backend_dir/.env" ]]; then
  set -a
  source "$backend_dir/.env"
  set +a
fi
export DB_PASSWORD="${DB_PASSWORD:-needboard-local-dev}"

docker compose -f "$backend_dir/compose.yaml" up -d db
echo "Ожидаем PostgreSQL..."
for _ in {1..30}; do
  if docker compose -f "$backend_dir/compose.yaml" exec -T db pg_isready -U needboard -d needboard >/dev/null 2>&1; then
    break
  fi
  sleep 1
done
if ! docker compose -f "$backend_dir/compose.yaml" exec -T db pg_isready -U needboard -d needboard >/dev/null 2>&1; then
  echo "PostgreSQL не запустился. Проверьте: docker compose -f backend/compose.yaml logs db"
  exit 1
fi

if [[ ! -d "$frontend_dir/node_modules" ]]; then
  (cd "$frontend_dir" && npm ci)
fi

cleanup() {
  kill "${backend_pid:-}" "${frontend_pid:-}" 2>/dev/null || true
}
trap cleanup EXIT INT TERM

(cd "$backend_dir" && ./mvnw spring-boot:run) &
backend_pid=$!

echo "Ожидаем backend..."
backend_ready=false
for _ in {1..90}; do
  if curl -fs --max-time 2 -o /dev/null http://127.0.0.1:8080/actuator/health; then
    backend_ready=true
    break
  fi
  if ! kill -0 "$backend_pid" 2>/dev/null; then
    echo "Backend завершился до запуска интерфейса. Проверьте вывод выше."
    exit 1
  fi
  sleep 1
done
if [[ "$backend_ready" != true ]]; then
  echo "Backend не ответил за 90 секунд. Проверьте вывод выше."
  exit 1
fi

(cd "$frontend_dir" && VITE_API_MODE=http VITE_API_BASE_URL=/api npm run dev -- --port 5173 --strictPort --open) &
frontend_pid=$!

echo
echo "Ясно запускается: http://127.0.0.1:5173"
echo "Backend health: http://127.0.0.1:8080/actuator/health"
echo "Для остановки нажмите Ctrl+C."
echo

wait "$backend_pid" "$frontend_pid"
