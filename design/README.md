# Lungisa design reference

Static HTML mockups of the employer app, exported from the Lungisa design canvas in October 2026. Open any file in a browser.

Everything here is placeholder content: names, dates, counts, quotes, amounts and the business name. Use these files for layout and styling only; real values come from the database. Where these files and a GitHub issue disagree, follow the issue.

| File | Screen |
| --- | --- |
| dashboard.html | Dashboard |
| dashboard-phone.html | Dashboard at phone width |
| candidates.html | Candidates list |
| profile.html | Candidate profile |
| placements.html | Placements, including finished states |
| placement-check-ins.html | One placement's check-ins (needs check-in data that doesn't exist yet) |
| activity.html | Activity (the timeline and fees panel need data that doesn't exist yet) |
| about.html | About |
| request.html | I need someone |
| request-sent.html | Request sent |
| sign-in.html | Sign in |
| check-email.html | Check your email |
| tokens.json | Design tokens: colours, type, spacing and radii |

## Notes

- Palette: Ebony #000000 (0 0% 0%) for text, headings and dark surfaces; Ember #D85C26 (18 70% 50%) for button fills, accents and progress; Ochre #9D7A53 (32 31% 47%) for secondary markers and avatars; Taupe #BBADA4 (23 14% 69%) for quiet lines and upcoming states; Stone #E1D9CA (39 28% 84%) for borders and soft surfaces; White #FFFFFF.
- Contrast: body and small text is ebony on white or stone; secondary text is #4D4D4D (0 0% 30%). Ember and ochre are never text on white, stone or taupe. Buttons use ember with ebony text; ember/ochre fills use ebony text. Ember can be a large heading on ebony only. Links are ebony and underlined. Focus is a 3px ebony outline with 3px offset (stone on ebony); active navigation uses ebony text and a 3px ember underline.
- Fonts: Rethink Sans for all UI text. Newsreader regular, non-italic for page-level h1 headings; Newsreader italic for a trainer's own words, always attributed.
- Numbers: lining figures only.
- Fee terms are fixed pilot pricing: "R1,000 on hire. R3,000 at day 90, only if they're still with you."
