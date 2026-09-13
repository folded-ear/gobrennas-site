# Navigation

State: Agreed  
Delivery: Built

## Purpose

GoBrennas is used mostly on phones. Navigation keeps every section one tap
away and lets focused content slide in without losing the user's place.

## Behavior

### Sections

- Tabs along the bottom of the screen lead to the Library, the Planner,
  Shopping, and the Profile, in that order. The Profile tab shows the user's
  avatar.
- The tab for the section the current page belongs to is marked.
- Each section's page has a header that stays at the top as the page
  scrolls, holding the section's title and controls.
- The Library header has a picker for the one plan recipes are sent to. The
  Planner header has a picker for the plans it shows. Neither picker shows
  when the user has only one plan.
- Logging out is on the Profile page.

### Screens

- A screen slides in from the right over the page it was opened from.
- A recipe opened from within the Library opens in a screen. Opening a
  recipe's address directly shows it as a full page instead.
- Every way of closing a screen — its close button, a flick, tapping outside
  it, Escape, or Back — goes back one step in history.

## Not included

- Links to saved searches or the pantry. Their pages remain at their
  addresses.
- A light/dark toggle. The app follows the device's setting.
- Layouts that make particular use of larger screens.

## Open questions

- None.

## Related documents

- [Planner](planner.md)
