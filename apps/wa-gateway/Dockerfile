# Build stage
FROM golang:1.24-alpine AS builder

WORKDIR /app

# Copy go mod files
COPY go.mod go.sum ./
RUN go mod download

# Copy source code
COPY . .

# Build the application
RUN CGO_ENABLED=1 GOOS=linux go build -o wa-gateway ./cmd/main.go

# Runtime stage
FROM alpine:latest

WORKDIR /app

# Install required libraries for SQLite
RUN apk add --no-cache libc6-compat

# Copy binary from builder
COPY --from=builder /app/wa-gateway .

# Create session directory
RUN mkdir -p /app/session

# Expose port
EXPOSE 8080

# Run the application
CMD ["./wa-gateway"]
