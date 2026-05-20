from __future__ import annotations

from dataclasses import dataclass


@dataclass(slots=True)
class QueueEvent:
    job_id: str
    job_type: str


class LocalQueueService:
    def __init__(self) -> None:
        self._events: list[QueueEvent] = []

    def enqueue(self, job_id: str, job_type: str) -> QueueEvent:
        event = QueueEvent(job_id=job_id, job_type=job_type)
        self._events.append(event)
        return event

    @property
    def pending(self) -> list[QueueEvent]:
        return list(self._events)


queue_service = LocalQueueService()

