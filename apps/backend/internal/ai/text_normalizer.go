package ai

import (
	"regexp"
	"strings"
)

// NormalizeText normalizes Indonesian text for better intent extraction
func NormalizeText(text string) string {
	text = strings.TrimSpace(text)

	// Normalize numbers
	text = normalizeNumbers(text)

	// Normalize units
	text = normalizeUnits(text)

	return text
}

// normalizeNumbers converts Indonesian number formats to standard format
func normalizeNumbers(text string) string {
	// "15rb" → "15000"
	// "15ribu" → "15000"
	// "2,5jt" → "2500000"
	// "2,5juta" → "2500000"
	// "12.000" → "12000"
	// "1.250.000" → "1250000"

	// Handle "rb" and "ribu" (thousands)
	rbPattern := regexp.MustCompile(`(\d+(?:[.,]\d+)?)\s*(?:rb|ribu)`)
	text = rbPattern.ReplaceAllStringFunc(text, func(match string) string {
		// Extract number part
		numPattern := regexp.MustCompile(`(\d+(?:[.,]\d+)?)`)
		numStr := numPattern.FindString(match)

		// Replace comma with dot for decimal
		numStr = strings.ReplaceAll(numStr, ",", ".")

		// Convert to float, multiply by 1000
		// For simplicity, just append "000" if no decimal
		if strings.Contains(numStr, ".") {
			// "2.5rb" → "2500"
			parts := strings.Split(numStr, ".")
			if len(parts) == 2 {
				return parts[0] + parts[1] + "00"
			}
		}
		return numStr + "000"
	})

	// Handle "jt" and "juta" (millions)
	jtPattern := regexp.MustCompile(`(\d+(?:[.,]\d+)?)\s*(?:jt|juta)`)
	text = jtPattern.ReplaceAllStringFunc(text, func(match string) string {
		numPattern := regexp.MustCompile(`(\d+(?:[.,]\d+)?)`)
		numStr := numPattern.FindString(match)

		numStr = strings.ReplaceAll(numStr, ",", ".")

		if strings.Contains(numStr, ".") {
			parts := strings.Split(numStr, ".")
			if len(parts) == 2 {
				return parts[0] + parts[1] + "00000"
			}
		}
		return numStr + "000000"
	})

	// Remove dots from numbers (Indonesian thousand separator)
	// But keep dots that are part of decimal numbers
	// "12.000" → "12000"
	// "1.250.000" → "1250000"
	dotPattern := regexp.MustCompile(`(\d{1,3})\.(\d{3})`)
	for dotPattern.MatchString(text) {
		text = dotPattern.ReplaceAllString(text, "$1$2")
	}

	return text
}

// normalizeUnits normalizes unit formats
func normalizeUnits(text string) string {
	// "25kg" → "25 kg"
	// "2liter" → "2 liter"
	// "10porsi" → "10 porsi"

	unitPattern := regexp.MustCompile(`(\d+)\s*(kg|gram|liter|ml|porsi|pcs|butir|biji|buah|pack|dus|karton|box)`)
	text = unitPattern.ReplaceAllString(text, "$1 $2")

	return text
}

// NormalizePrice specifically normalizes price mentions
func NormalizePrice(text string) string {
	// Handle "@" symbol for per-unit price
	// "telur @2500" → "telur 2500"
	text = strings.ReplaceAll(text, "@", " ")

	return normalizeNumbers(text)
}
