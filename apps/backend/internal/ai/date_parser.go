package ai

import (
	"fmt"
	"strings"
	"time"
)

// ParseRelativeDate parses Indonesian relative date expressions
func ParseRelativeDate(text string) *time.Time {
	now := time.Now()
	normalized := strings.ToLower(strings.TrimSpace(text))

	// Today
	if strings.Contains(normalized, "hari ini") || strings.Contains(normalized, "today") {
		return &now
	}

	// Yesterday
	if strings.Contains(normalized, "kemarin") || strings.Contains(normalized, "yesterday") {
		yesterday := now.AddDate(0, 0, -1)
		return &yesterday
	}

	// Tomorrow
	if strings.Contains(normalized, "besok") || strings.Contains(normalized, "tomorrow") {
		tomorrow := now.AddDate(0, 0, 1)
		return &tomorrow
	}

	// Day before yesterday
	if strings.Contains(normalized, "kemarin dulu") || strings.Contains(normalized, "kemarin lusa") {
		dayBefore := now.AddDate(0, 0, -2)
		return &dayBefore
	}

	// Day after tomorrow
	if strings.Contains(normalized, "lusa") {
		dayAfter := now.AddDate(0, 0, 2)
		return &dayAfter
	}

	// This week
	if strings.Contains(normalized, "minggu ini") || strings.Contains(normalized, "this week") {
		return &now
	}

	// Last week
	if strings.Contains(normalized, "minggu lalu") || strings.Contains(normalized, "last week") {
		lastWeek := now.AddDate(0, 0, -7)
		return &lastWeek
	}

	// Next week
	if strings.Contains(normalized, "minggu depan") || strings.Contains(normalized, "next week") {
		nextWeek := now.AddDate(0, 0, 7)
		return &nextWeek
	}

	// This month
	if strings.Contains(normalized, "bulan ini") || strings.Contains(normalized, "this month") {
		return &now
	}

	// Last month
	if strings.Contains(normalized, "bulan lalu") || strings.Contains(normalized, "last month") {
		lastMonth := now.AddDate(0, -1, 0)
		return &lastMonth
	}

	// Next month
	if strings.Contains(normalized, "bulan depan") || strings.Contains(normalized, "next month") {
		nextMonth := now.AddDate(0, 1, 0)
		return &nextMonth
	}

	// Specific days of week (Indonesian)
	dayMap := map[string]time.Weekday{
		"senin":  time.Monday,
		"selasa": time.Tuesday,
		"rabu":   time.Wednesday,
		"kamis":  time.Thursday,
		"jumat":  time.Friday,
		"sabtu":  time.Saturday,
		"minggu": time.Sunday,
	}

	for dayName, targetDay := range dayMap {
		if strings.Contains(normalized, dayName) {
			// Find the most recent occurrence of this day
			currentDay := now.Weekday()
			daysAgo := int(currentDay - targetDay)
			if daysAgo < 0 {
				daysAgo += 7
			}
			if daysAgo == 0 {
				daysAgo = 7 // Last week's same day
			}
			targetDate := now.AddDate(0, 0, -daysAgo)
			return &targetDate
		}
	}

	// No match found
	return nil
}

// FormatDate formats date for Indonesian display
func FormatDate(t time.Time) string {
	months := []string{
		"", "Januari", "Februari", "Maret", "April", "Mei", "Juni",
		"Juli", "Agustus", "September", "Oktober", "November", "Desember",
	}

	return fmt.Sprintf("%d %s %d", t.Day(), months[t.Month()], t.Year())
}

// FormatDateShort formats date in short format
func FormatDateShort(t time.Time) string {
	return t.Format("2 Jan 2006")
}
