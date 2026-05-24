---
name: concord-donor-management
description: Manage the Concord Orchestra donor database. Use when searching for patrons, creating new donor profiles, and logging contributions.
---

# Concord Donor Management

This skill handles the end-to-end process of maintaining the custom Donor Database.

## Workflow

### 1. Identify the Donor
*   Use `search_donors` to find a patron by name.
*   If multiple donors share the same name, ask the user to confirm the correct one.

### 2. Handle New Donors
*   **CRITICAL:** You MUST NOT create a new donor without their full personal information, specifically a complete mailing address.
*   If you do not have their mailing address, ask the user to provide it before using `create_donor`.

### 3. Check for Duplicates
*   Always use `list_donations` with the `donorId` before adding a contribution to ensure it hasn't already been entered.

### 4. Log the Donation
*   Use `add_donation` to record the amount, date, check number (or "Stripe"/"Thundertix"), and any earmarks/comments.
