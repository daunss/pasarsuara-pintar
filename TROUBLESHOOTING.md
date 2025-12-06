# Troubleshooting Guide

## Gemini API Key Invalid

**Error:**
```
❌ Transcription failed: Gemini API error: API key not valid. Please pass a valid API key.
```

**Current Configuration:**
- Model: `gemini-2.0-flash-exp` (stable, experimental)
- API Keys: 4 keys configured for rotation
- Files using Gemini:
  - `internal/ai/gemini.go` (audio transcription)
  - `internal/ai/intent_engine.go` (intent extraction)
  - `internal/ai/gemini_categorization.go` (categorization)

**Solution:**

1. **Get New API Key:**
   - Go to: https://makersuite.google.com/app/apikey
   - Click "Create API Key"
   - Copy the new key

2. **Update Backend .env:**
   ```bash
   cd apps/backend
   # Edit .env file
   GEMINI_API_KEY=your_new_api_key_here
   ```

3. **Rebuild & Restart Backend:**
   ```bash
   # Rebuild
   go build -o main.exe ./cmd/main.go
   
   # Restart
   ./main.exe
   ```

4. **Test Voice Message:**
   - Send voice note via WhatsApp
   - Check backend logs for success

---

## Multiple API Keys (Rate Limit Protection)

You can use multiple API keys separated by commas:

```env
GEMINI_API_KEY=key1,key2,key3,key4
```

Backend will automatically rotate between keys to avoid rate limits.

**Current Configuration:** 4 API keys configured for optimal performance.

---

## Other Common Issues

### WhatsApp Not Connected

**Error:** QR code not showing

**Solution:**
```bash
cd apps/wa-gateway
rm -rf session/
./bin/wa-gateway.exe
# Scan new QR code
```

### Database Connection Failed

**Error:** Connection refused to Supabase

**Solution:**
- Check SUPABASE_URL in .env
- Verify SUPABASE_SERVICE_ROLE_KEY
- Test connection: https://your-project.supabase.co/rest/v1/

### Port Already in Use

**Error:** Port 8080 already in use

**Solution:**
```bash
# Windows
netstat -ano | findstr :8080
taskkill /PID <PID> /F

# Or change port in .env
BACKEND_PORT=8081
```

---

## Getting Help

1. Check logs in terminal
2. Verify all .env variables
3. Restart all services
4. Check [HACKATHON.md](HACKATHON.md) for setup guide
