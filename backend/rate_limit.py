import time
from fastapi import Request, HTTPException, status
from collections import defaultdict

class InMemoryRateLimiter:
    def __init__(self, limit: int, window: int):
        self.limit = limit  # Max requests
        self.window = window  # Time window in seconds
        # Stores client IP -> list of timestamps
        self.requests = defaultdict(list)

    def __call__(self, request: Request):
        # Fallback to empty string if client is None
        client_ip = request.client.host if request.client else "unknown"
        now = time.time()
        
        # Filter out timestamps older than the window
        self.requests[client_ip] = [t for t in self.requests[client_ip] if now - t < self.window]
        
        if len(self.requests[client_ip]) >= self.limit:
            raise HTTPException(
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                detail="Too many requests. Please try again later."
            )
            
        self.requests[client_ip].append(now)

# Auth endpoints rate limiter: 5 requests per 60 seconds
auth_rate_limiter = InMemoryRateLimiter(limit=5, window=60)
