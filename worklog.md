---
Task ID: 1
Agent: Main Agent
Task: Apply scroll and overflow fixes to ALL dashboard sections globally

Work Log:
- Read dashboard-overview.tsx to understand current collapsible card structure
- Read opportunities-panel.tsx, trends-compare-panel.tsx, gap-analysis-panel.tsx, feature-blocks.tsx
- Identified root cause: overflow-hidden on Card components clips expanded/collapsible content
- Added CSS utilities to globals.css: Firefox scrollbar support, scrollable-card-content classes, scroll-x-row class
- Fixed all 10 dashboard sections in dashboard-overview.tsx: removed overflow-hidden, added/increased ScrollArea, added scroll-x-row
- Fixed opportunities-panel.tsx: removed overflow-hidden from CardContent, added scroll to expanded section, fixed broken goldmine badge conditional
- Fixed trends-compare-panel.tsx: added scroll to expanded underserved users, added scroll-x-row to comparison table
- Fixed gap-analysis-panel.tsx: removed overflow-hidden from CardContent, added scroll to expanded sections

Stage Summary:
- All dashboard sections now support internal vertical scrolling when expanded
- All horizontal content (charts, badges, tables) support horizontal scrolling
- Custom scrollbar styling with Firefox support added to globals.css
- No lint errors, app compiles and runs correctly
