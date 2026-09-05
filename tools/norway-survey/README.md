# Norway trip survey debrief

Post-trip survey results for the August 2026 Norway + London trip. Single self-contained HTML file, no build step, no backend.

Charts: leg-by-leg averages, all 39 rated stops ranked, per-respondent rating scale ("grading on a curve"), disagreement adjusted for rater bias, a type-by-respondent heatmap (what predicts a high score), and a respondent-correlation heatmap (whose taste tracks whose). Free-text answers to the two open questions are quoted at the bottom.

Data comes from `Customer Feedback: Norway Trip August 2026 Responses.xlsx` (5 respondents, 39 rated stops). All computation (means, rater-bias adjustment, correlations) is done ahead of time and embedded as a JSON blob in the page; there's no live data source to update.

Sibling tool: [`tools/norway`](../norway) is the pre-trip itinerary app for the same trip.
