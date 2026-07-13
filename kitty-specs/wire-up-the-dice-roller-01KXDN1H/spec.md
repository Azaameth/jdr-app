# Spec — Wire up the dice roller

## Problem
The dice roller sidebar labels exist in CampaignShell.vue but have no behavior — players and GMs cannot roll dice from the app during sessions.

## Success criteria
A player or GM can click the dice buttons in the sidebar, select a die type (d4, d6, d8, d10, d12, d20), and see the result displayed instantly in the UI.

## Out of scope
Dice roll history, chat/shared roll visibility between players, animated dice, and any backend persistence of roll results.

## Implementation approach
Add a dice roller component to the CampaignShell.vue sidebar. The component renders buttons for each die type (d4, d6, d8, d10, d12, d20). On click, it generates a random result using Math.random() and displays it inline in the sidebar. No store, no Firestore — pure local UI state with Vue ref().

## Functional requirements
| ID | Description |
|----|-------------|
| FR-001 | Sidebar displays buttons for d4, d6, d8, d10, d12, d20 |
| FR-002 | Clicking a button rolls the die and displays the result |
| FR-003 | Result is shown immediately in the sidebar |
| FR-004 | No persistence — result resets on reload |

## Risks
CampaignShell.vue sidebar structure may require layout adjustments to fit the roller cleanly. No other known risks.

## Dependencies
None. CampaignShell.vue already exists and the sidebar placeholder labels are already in place.
