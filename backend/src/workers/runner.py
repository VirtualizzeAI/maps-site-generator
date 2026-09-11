import argparse
import signal
import time
from datetime import UTC, datetime

from sqlalchemy import or_, select

from src.core.config import get_settings
from src.core.database import SessionLocal, init_database
from src.models.entities import Operation
from src.services.pipeline import process_operation


running = True


def stop(*_: object) -> None:
    global running
    running = False


def run_once() -> bool:
    with SessionLocal() as session:
        operation = session.scalar(select(Operation).where(or_(
            Operation.status == "queued",
            (Operation.status == "scheduled") & (Operation.scheduled_for <= datetime.now(UTC)),
        )).order_by(Operation.created_at).limit(1))
        if not operation:
            return False
        operation.status = "searching"
        session.commit()
        process_operation(session, operation.id)
        return True


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--once", action="store_true")
    args = parser.parse_args()
    init_database()
    if args.once:
        run_once()
        return
    signal.signal(signal.SIGTERM, stop)
    signal.signal(signal.SIGINT, stop)
    while running:
        if not run_once():
            time.sleep(get_settings().worker_poll_seconds)


if __name__ == "__main__":
    main()
