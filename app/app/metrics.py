from prometheus_client import Counter, Histogram

REQUESTS = Counter(
    "notes_http_requests_total", "HTTP requests", ["method", "endpoint", "status"]
)
LATENCY = Histogram(
    "notes_http_request_duration_seconds", "Request latency", ["endpoint"]
)
NOTES_CREATED = Counter("notes_created_total", "Notes created")
NOTES_DELETED = Counter("notes_deleted_total", "Notes deleted")
LOGINS = Counter("notes_logins_total", "Login attempts", ["result"])
