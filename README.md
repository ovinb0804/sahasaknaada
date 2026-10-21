# Sahasaknaada

**The Future of Sound Starts Here.**

Sahasaknaada is an inter-school audio workshop organized by the **Radio Club of D. S. Senanayake College**. This repository documents the website experience, design system, registration flow, organizer dashboard requirements, component integrations, accessibility standards, and implementation safeguards for the project.

> **Project note:** This README describes the intended product and implementation requirements. It does not, by itself, prove that every route, backend integration, animation, or admin feature has been implemented or deployed. Update the implementation-status section as features are verified in the actual environment.

## Contents

- [Project at a Glance](#project-at-a-glance)
- [Core Principles](#core-principles)
- [Routes](#routes)
- [Public Website](#public-website)
- [Registration Experience](#registration-experience)
- [Organizer Dashboard](#organizer-dashboard)
- [Visual Design System](#visual-design-system)
- [React Bits Components](#react-bits-components)
- [Mobile and Responsive Requirements](#mobile-and-responsive-requirements)
- [Accessibility and Motion](#accessibility-and-motion)
- [Data Model and Security](#data-model-and-security)
- [Configurable Event Information](#configurable-event-information)
- [Suggested Build Order](#suggested-build-order)
- [Quality Assurance Checklist](#quality-assurance-checklist)
- [GoHighLevel and React Compatibility](#gohighlevel-and-react-compatibility)
- [Suggested Repository Organization](#suggested-repository-organization)
- [Project Status](#project-status)

## Project at a Glance

| Item | Details |
|---|---|
| Project | Sahasaknaada |
| Event type | Inter-school audio workshop |
| Organizer | Radio Club of D. S. Senanayake College |
| Main goal | Help students from other schools understand the workshop and register |
| Visual identity | Near-black, white, charcoal, and restrained warm gold |
| Public experience | Landing page, event information, gallery, agenda, FAQ, and registration |
| Organizer experience | Private registration management and event-day check-in |
| Main routes | `/`, `/register`, `/admin` |
| Design approach | Premium, sound-inspired, responsive, accessible, motion-enhanced |
| Website builder context | GoHighLevel (GHL) AI Website Builder; confirm React support in the actual publishing environment before integrating React components |

## Core Principles

1. **Do not invent event facts.** Dates, times, venue, fees, speakers, eligibility, registration deadlines, capacity, contacts, social links, agenda items, and FAQ answers must be confirmed by the organizers. Until then, use clearly marked editable placeholders or omit the information.
2. **Keep inter-school and intra-school references separate.** Sahasaknaada is an **inter-school** workshop. The gallery is for approved photos from previous **intra-school** workshops or competitions held within D. S. Senanayake College. Do not present the gallery as documentation of previous inter-school events.
3. **Prioritize registration usability.** Visitors should understand the purpose of the workshop and find the registration action quickly.
4. **Motion supports content; it does not replace it.** Every essential message and interaction must remain available when animations are disabled or unsupported.
5. **Keep content editable.** Agenda items, FAQ entries, gallery images, form fields, links, and configurable event details should be managed as structured data wherever the implementation allows.
6. **Keep participant data private.** Public visitors may submit a registration, but must not be able to retrieve participant records or access organizer functions.
7. **Do not fake functionality.** Never show a successful registration, check-in, export, or saved edit before the real operation is confirmed.

## Routes

| Route | Purpose | Access |
|---|---|---|
| `/` | Main landing page with hero, themes, intra-school gallery, agenda, registration calls to action, FAQ, and footer | Public |
| `/register` | Dedicated registration form and submission states | Public |
| `/admin` | Organizer overview, registration management, reporting, and event-day check-in | Authenticated and authorized organizers only |

Keep general event information on `/`. The `/register` route should focus on the registration task. Do not expose admin data through public routes or client-side shortcuts.

## Public Website

### 1. Navigation

The shared navigation should include:

- Sahasaknaada or approved school/event identity on the left.
- Compact section links on desktop.
- A prominent **Register** action that navigates to `/register`.
- A usable mobile navigation pattern that keeps Register easy to reach.
- A dark translucent surface with a fine border and restrained visual effects.
- React Bits `GradualBlur` where React integration is genuinely supported.

The navbar must remain compact, readable, keyboard accessible, and free of horizontal overflow. If sticky, it must not obscure anchored headings or focused controls.

### 2. Hero

**Headline:** “The Future of Sound Starts Here”

The hero introduces Sahasaknaada as an inter-school audio workshop exploring sound, audio technology, science, and creativity.

Design requirements:

- Large, confident white typography with one restrained gold accent.
- A short, clear description and a primary **Register Now** action.
- The approved Sahasaknaada logo as a visual anchor where available.
- MetallicPaint as an optional logo treatment when supported, with a static image fallback.
- A subtle ambient background, not an overpowering video or WebGL scene.
- A two-column desktop composition that becomes a well-spaced single column on mobile.
- No unconfirmed dates, venue details, prices, speaker names, or event promises.

### 3. Workshop Themes

Present the three themes as an editorial typographic composition—not as three generic cards:

- **SOUND**
- **SCIENCE**
- **CREATIVITY**

Use large staggered lines, alternating white and warm gold, with generous but controlled spacing. React Bits `TechText` may be used if it fits correctly and remains accessible.

On mobile, reduce typography sizes and horizontal offsets so every word fits completely within the viewport. Disable component guide/debug overlays. If the canvas effect does not render reliably on mobile, use a responsive semantic-text fallback with subtle motion.

### 4. Intra-School Gallery

The gallery must be labelled **INTRA-SCHOOL** and contain approved images from previous intra-school workshops or competitions held within the college.

Requirements:

- Use an editable image list with meaningful alt text and optional captions.
- Do not use unrelated stock photos as if they were school history.
- If approved photographs are unavailable, use visibly replaceable placeholders or omit the gallery until content is supplied.
- React Bits `FlexCarousel` may provide the desktop interaction where supported.
- Provide a touch-friendly mobile layout and a static or scroll-snap fallback for reduced motion or unsupported WebGL environments.
- Avoid fast autoplay. User interaction should remain in control.

A short invitation and registration call to action can follow the gallery.

### 5. Agenda

Use a simple editorial list with each agenda item clearly associated with its time. Maintain consistent separators and readable text.

The layout can use two columns on desktop and stack each item with its time on mobile. Do not publish invented schedule entries or times. Use clearly marked editable placeholders or omit unconfirmed entries.

### 6. Registration Calls to Action

Register links throughout the website must navigate to `/register` and remain functional without decorative animation.

Use the latest restrained visual direction: the site is predominantly near-black and charcoal, with gold used to emphasize important actions and selected details. Avoid excessive bright-yellow surfaces. A gold CTA surface should only be used where it is deliberately retained and remains consistent with the overall design.

### 7. FAQ

Use an accessible, vertical accordion with editable question-and-answer data. Potential topics for organizers to confirm include eligibility, fees, event date and location, what to bring, and what happens after registration.

Do not publish answers until they are confirmed. Use real buttons with correct expanded state and associated answer panels. The accordion must work with touch, keyboard, and screen readers.

### 8. Footer

Keep the footer minimal and consistent with the rest of the site. It may include the approved event identity, “Radio Club of D. S. Senanayake College,” confirmed contact details, approved social links, and a copyright line. Keep unconfirmed contacts and URLs as editable placeholders; never fabricate them.

## Registration Experience

The `/register` page should be calm, welcoming, and straightforward to use.

### Visual direction

The current design direction reduces the bright-yellow-heavy form treatment in favor of a dark, premium interface:

- Near-black page background with subtle atmospheric depth.
- Charcoal or dark raised form surface.
- White primary text and muted secondary text.
- Warm gold used selectively for accents, focused borders, visual highlights, and the main action.
- Subtle sound-wave decoration that does not interfere with the form.
- A balanced desktop layout with event introduction on the left and the form on the right.
- A deliberate single-column layout on mobile.

The form must not look like an oversized yellow rectangle. All key content and form controls should be visible, readable, and accessible.

### Current candidate fields

The existing design includes the following fields. Their required/optional status must remain configurable and should only be changed with organizer approval:

- Full name
- School
- Grade / year
- Email
- Contact number
- Additional information (optional)

Use visible labels associated with each input, appropriate input types and autocomplete attributes, client-side validation, and server-side validation. Do not invent a fixed list of schools, grade options, or phone-number restrictions.

### Submission states

The form must implement genuine states:

1. **Idle:** the form is ready to use.
2. **Validation error:** show specific, accessible errors and preserve the entered values.
3. **Submitting:** indicate progress and prevent duplicate submissions.
4. **Success:** show success only after the connected backend or form service confirms the submission.
5. **Failure:** show a useful error and allow a safe retry without discarding the user's input.

Do not invent a registration number, promise a place, or claim that an email or confirmation was sent unless the actual integration confirms it.

### Privacy message

A concise privacy reassurance may appear near the submit button, but it must accurately describe the actual data-handling practices. Do not claim encryption, automatic deletion, or restricted access unless those protections are implemented.

## Organizer Dashboard

The `/admin` route is a private organizer tool. Prioritize accuracy, speed, privacy, and dependable operation over decorative effects.

### Access control

- Require authenticated organizer accounts.
- Enforce permissions in the backend or database, not just by hiding UI elements.
- Provide a visible sign-out action.
- Handle expired sessions and access-denied states clearly.
- Keep secrets and privileged service credentials out of browser code.
- Optional Administrator and Check-in Staff roles may be added if organizer workflows require them. Enforce roles server-side.

### Overview

Show metrics derived from persisted records only, such as:

- Total registrations
- Checked-in participants
- Participants not yet checked in
- Cancelled registrations, if that status is enabled
- Attendance rate
- Registrations by school

Any demo data must be unmistakably labelled and kept separate from real registrations.

### Registration management

Provide a readable table on desktop and responsive stacked records on narrow screens. Available columns should reflect the actual form fields and the team's approved data-access needs.

Expected capabilities:

- Search across approved identifiers, names, school, and contact fields where access is permitted.
- Sort by name, school, submission date, registration status, and attendance status.
- Combine filters such as school, grade/year, registration status, check-in status, and date range where those fields exist.
- Show active filters and the count of matching results.
- Support pagination or efficient loading while preserving active filters and sorting.
- Include clear loading, empty, no-match, and retry/error states.
- Provide a participant detail view where authorized.
- Store internal notes separately from participant-submitted answers.
- Confirm destructive actions and retain an edit trail where practical.

Search, sort, and filter must apply to the full relevant dataset—not merely the currently visible page of results.

### Event-day check-in

A dedicated check-in view should be usable on a laptop or tablet at the event entrance.

1. Staff search by participant name, registration ID, school, or another approved identifier.
2. A concise matching record shows the details needed to verify the participant.
3. Staff select one clear **Check In** action.
4. The interface confirms success only after the backend confirms the update.
5. The check-in status and relevant metrics update from persisted data.

Requirements:

- Display **Not checked in** and **Checked in** in text; do not rely on color alone.
- If a participant is already checked in, show the existing recorded time and do not create duplicate attendance records.
- Allow authorized staff to undo an accidental check-in if this is part of the approved workflow. Record the correction where practical.
- Support loading, success, already-checked-in, no-match, and failure states.
- Flag likely duplicate registrations for review; never automatically merge people based on similar names.
- Add walk-ins or QR lookup only if organizers approve those features.

### Reporting and exports

CSV exports may include:

- All registrations
- Current filtered results
- Attendance list
- Participants not yet checked in
- Registrations by school

Exports must be restricted to authorized staff, reflect the selected dataset, and include only approved fields. Never publish participant exports through public URLs.

## Visual Design System

### Suggested color tokens

| Token | Suggested value | Use |
|---|---|---|
| Main background | `#07080A` | Overall page background |
| Secondary background | `#0B0D10` | Background variation |
| Primary surface | `#101216` | Cards and panels |
| Raised surface | `#14171C` | Form and elevated areas |
| Secondary surface | `#191C22` | Inputs and interactive surfaces |
| Primary text | `#F5F5F5` | Main content |
| Secondary text | `#A3A7AF` | Supporting content |
| Muted text | `#777E89` | Low-priority labels, while retaining readable contrast |
| Warm gold | `#E7B54A` | Key actions and selected accents |
| Soft gold | `#F0CC78` | Small highlights |
| Fine border | `rgba(255,255,255,0.09)` | Subtle surface separation |
| Gold border | `rgba(231,181,74,0.26)` | Selected focus or highlight treatment |

Treat these as design tokens that may be tuned after contrast checks. Gold must remain an accent rather than the dominant color across every surface.

### Typography

- Use a modern, highly readable sans-serif.
- Use bold, expressive headlines with clear hierarchy.
- Keep paragraph copy concise and comfortable to read.
- Use restrained letter spacing; avoid tracking that causes long words to clip on mobile.
- Prefer responsive sizing and content-driven heights over fixed sizing.

### Surfaces and spacing

- Use consistent corner radii and subtle borders.
- Use horizontal dividers to separate major page sections.
- Avoid excessive cards, shadows, gradients, and glass effects.
- Keep backgrounds behind interactive content and ensure they never intercept input.
- Avoid fixed-height text containers that crop content.

## React Bits Components

The project brief assigns these primary components to specific parts of the public website. Integrate the supplied component source where the actual environment supports it. Do not claim a React Bits component is running if only a visual fallback is being used.

| Component | Placement | Implementation guidance |
|---|---|---|
| **GradualBlur** | Navigation | Use a compact, dark, translucent navbar with a fine border. A starting setup is `position="top"`, `target="page"` when the navbar is sticky/fixed, and a near-black tint. Keep the blur behind sharp, clickable navigation controls. |
| **BlurText** | Hero headline and selected supporting copy; gallery invitation; agenda text | Use `trigger="load"` for the hero and `trigger="view"` for lower sections. Separate white and gold text into different instances if the component supports only one color per instance. Do not stack another animation on the same text. |
| **MetallicPaint** | Hero logo | Use the approved logo through `imageSrc`. Transparent SVG assets are preferred when available. Keep a static image fallback for reduced motion, unsupported WebGL, or load failure. |
| **TechText** | SOUND / SCIENCE / CREATIVITY | Use one instance per word where appropriate. Alternate white and gold. Disable guides/debug overlays, provide accessible real text, and ensure all words fit at mobile widths. Use a responsive fallback if the canvas clips or fails. |
| **FlexCarousel** | INTRA-SCHOOL gallery | Use editable `{ src, alt, title }` items. Use approved photos only. Avoid fast autoplay. Support touch interaction and provide a non-WebGL or scroll-snap fallback for reduced motion and unsupported devices. |
| **SpecularButton** | Register and other primary CTAs | Preserve actual destinations and accessible hover, focus, active, and disabled states. Use restrained light details on dark surfaces and maintain readable contrast. Form submission buttons must be real submit controls. |

Additional effects such as FadeContent, Threads/Noise, Magnet, or ShinyText are optional enhancements—not required dependencies. Add them only when they improve the experience, are supported by the environment, and do not compete with the primary component motion.

### GradualBlur navbar guidance

Suggested initial values for the GradualBlur component (tune after actual preview):

```jsx
<GradualBlur
  position="top"
  target="page"
  height="6rem"
  strength={2}
  layers={8}
  curve="bezier"
  exponential
  opacity={0.8}
  saturation={1}
  tint="#07080A"
  duration={0.3}
/>
```

Use `target="page"` only when appropriate to the real navbar positioning and component behavior. Ensure the blur layer has suitable stacking, does not cover links, and does not block pointer/touch interactions. If the current GHL environment cannot run React components, use a clearly identified CSS-based fallback instead.

### Animation rules

- Avoid stacking multiple effects on the same element.
- Lazy-load heavier canvas/WebGL elements where supported.
- Pause off-screen motion where practical.
- Avoid constant animation when a component is not visible or interactive.
- Respect `prefers-reduced-motion` throughout the site.
- Provide a visually complete static fallback for every essential animated effect.
- Never delay form submission or navigation just to finish an animation.

## Mobile and Responsive Requirements

Mobile is a first-class layout, not a scaled-down desktop page.

Test at approximate CSS viewport widths of 320, 360, 375, 390, 430, 600, 768, 1024, and 1280px or wider.

Requirements:

- No unintended horizontal page overflow.
- No clipped text, headings, logos, inputs, buttons, captions, or menus.
- SOUND, SCIENCE, and CREATIVITY must all fit inside the viewport. Reduce font sizes and staggered offsets on narrow screens; do not rely on hiding overflow to conceal broken layout.
- Provide real mobile menu behavior and keep Register easy to reach.
- Stack the hero content and registration form appropriately on mobile.
- Make gallery interactions touch-friendly.
- Stack agenda items and their associated times on narrow screens.
- Ensure FAQ controls wrap and remain easy to tap.
- Let forms use the available width without fixed desktop columns.
- Avoid fixed heights that clip content or interfere with the mobile keyboard.
- Ensure decorative canvases, transforms, gradients, and pseudo-elements do not create overflow.
- Preserve visible focus indicators and comfortable touch targets.
- Check portrait and landscape layouts.

Fix the underlying cause of overflow—such as fixed widths, canvas sizing, excessive transforms, negative margins, or absolute positioning—instead of applying `overflow-x: hidden` as the only solution.

## Accessibility and Motion

- Use semantic HTML and a logical heading hierarchy.
- Associate every form label with its field.
- Link validation errors to their inputs and announce important status changes accessibly.
- Use visible keyboard focus states.
- Maintain appropriate text and control contrast.
- Do not convey registration or check-in status through color alone.
- Ensure navigation, accordions, forms, and admin controls are keyboard usable.
- Provide useful alt text for real gallery images; use empty alt text for purely decorative images.
- Hide purely decorative canvas effects from assistive technology when they have equivalent accessible text.
- Honor `prefers-reduced-motion` and retain all content without animation.
- Avoid flashing, aggressive parallax, scroll hijacking, and motion that impairs reading.

## Data Model and Security

Use the existing backend and authentication system if one is already present. If no backend exists, select a managed database and authentication solution appropriate to the actual deployment environment. The specific provider is **not predetermined by this README** and must be recorded once confirmed.

### Security requirements

- Public users may submit registrations but must not read participant records.
- Enforce authorization in the database or backend, using row-level security or an equivalent mechanism where supported.
- Keep organizer roles in a separate authorization structure, rather than trusting client-side state or a profile field alone.
- Never expose service-role keys, database secrets, or privileged credentials in frontend code.
- Validate data on both client and server.
- Generate identifiers on the backend and enforce important constraints in the database.
- Make check-in updates atomic or otherwise safe against duplicate operations.
- Store timestamps consistently, preferably in UTC, and display them in the event's confirmed local timezone. The brief's default assumption is Sri Lanka time (UTC+05:30), unless organizers specify otherwise.
- Report network and backend failures honestly.
- Collect only data required for the event.
- Confirm data access rules and a retention period with the organizers.
- Keep internal organizer notes separate from participant-submitted information.
- Keep demo records clearly separate from real registrations.

### Registration record fields

Use only fields that are required by the confirmed form and backend. Potential record fields include:

- Internal ID
- Public registration code, if used
- Participant fields collected by the form
- Created timestamp
- Registration status
- Attendance/check-in status
- Check-in timestamp and staff account
- Internal notes stored separately
- Updated timestamp and editor metadata where appropriate
- Optional audit records for administrative edits and check-in corrections

### Keep registration and attendance status separate

Suggested registration statuses:

- Submitted
- Confirmed
- Needs review
- Cancelled

Suggested attendance statuses:

- Not checked in
- Checked in

A confirmed registration does not mean a participant has attended. Only use the statuses and transitions enabled by the actual organizer workflow.

## Configurable Event Information

The following must be confirmed by the organizers before publication:

| Information | Requirement |
|---|---|
| Event date and time | Keep editable; do not invent |
| Venue | Keep editable; do not invent |
| Registration deadline | Keep editable; do not invent |
| Eligibility and participant limits | Confirm before publication |
| Fee, if any | Confirm before publication |
| Final agenda and timings | Confirm before publication |
| Official contact details | Use approved information only |
| Social links | Use approved URLs only |
| Registration fields and required status | Confirm which fields are actually required |
| Registration submission destination | Confirm the real working integration |
| Gallery photographs | Use approved intra-school material only |
| FAQ questions and answers | Publish only confirmed answers |
| Confirmation process | Describe only what the real system does |
| Admin permissions | Confirm who can view, edit, check in, and export records |
| Data retention | Confirm with organizers |
| Walk-in registrations | Enable only if approved |
| QR check-in | Optional; do not imply it exists unless implemented |

## Suggested Build Order

1. Implement the public landing page `/` and its editable content.
2. Complete the shared responsive navigation and GradualBlur integration or verified fallback.
3. Implement the hero and workshop themes with accessible mobile behavior.
4. Add the INTRA-SCHOOL gallery using approved content or explicit placeholders.
5. Add the agenda, CTA, FAQ, and footer with confirmed or clearly marked content.
6. Build `/register` and its validation, loading, success, and failure states.
7. Connect registration to the real persistent backend.
8. Implement organizer authentication and backend authorization for `/admin`.
9. Add registration search, filtering, sorting, pagination, and participant details.
10. Add event-day check-in and safe handling of repeat check-ins.
11. Add authorized CSV exports and required empty/error states.
12. Test the full workflow with clearly labelled sample data before accepting real participant information.
13. Test responsive layouts, keyboard navigation, reduced motion, and backend behavior before release.

## Quality Assurance Checklist

### Public experience

- [ ] Only the agreed routes `/`, `/register`, and `/admin` are used for the core experience.
- [ ] Workshop wording correctly identifies the event as inter-school.
- [ ] The gallery is labelled **INTRA-SCHOOL** and uses approved intra-school images or clearly marked placeholders.
- [ ] No dates, venues, prices, agenda entries, contacts, or FAQs have been fabricated.
- [ ] The design remains predominantly dark with restrained gold accents.
- [ ] GradualBlur, BlurText, MetallicPaint, TechText, FlexCarousel, and SpecularButton are integrated only when supported and have appropriate fallbacks.
- [ ] No horizontal overflow at tested mobile widths.
- [ ] SOUND, SCIENCE, and CREATIVITY remain fully visible on small screens.
- [ ] Navigation and registration actions work without decorative animation.
- [ ] Keyboard focus, contrast, and reduced-motion behavior have been reviewed.

### Registration

- [ ] The form uses the real, confirmed submission integration.
- [ ] Required fields match the approved registration rules.
- [ ] Validation is accessible and preserves values on failure.
- [ ] The form prevents inappropriate duplicate submissions.
- [ ] Success appears only after backend confirmation.
- [ ] Failure states provide useful next steps.
- [ ] Participant data is never publicly exposed.

### Admin and check-in

- [ ] `/admin` requires authenticated and authorized access.
- [ ] Unauthenticated clients cannot retrieve registration data.
- [ ] A successful registration appears in the dashboard.
- [ ] Search, sort, and filters operate on the full intended dataset.
- [ ] Check-ins persist after refresh.
- [ ] Repeated check-ins do not create duplicate attendance records.
- [ ] Dashboard metrics are derived from persisted data.
- [ ] Exports are restricted and contain only approved fields.
- [ ] Network, authorization, empty, retry, and export failures are handled honestly.
- [ ] Demo data is clearly separated from real records.

## GoHighLevel and React Compatibility

The website is being authored in the context of the **GoHighLevel AI Website Builder**. GHL custom-code areas and publishing environments may not execute arbitrary React/TypeScript components in the same way as a dedicated React application.

Before adding a React Bits component:

1. Confirm which rendering environment is available on the actual page.
2. Confirm that the component's required dependencies can be loaded and initialized safely.
3. Use the supplied component source where the environment supports it.
4. If React is not supported in that location, create a lightweight HTML/CSS/JavaScript fallback where practical.
5. Do not describe a fallback as the original React Bits component.
6. Preview and test the actual published rendering instead of assuming successful integration from code insertion alone.

`FlexCarousel` uses `ogl` and `BlurText` uses `motion` according to the supplied component guide. Verify the other component dependencies and lifecycle requirements against the source code actually included in the project. Do not add dependencies or build commands that have not been confirmed for the current repository.

## Suggested Repository Organization

Adapt this example to the real code and hosting setup. It is a suggested organization, not a claim that these directories already exist.

```text
sahasaknaada/
├── README.md
├── public/
│   ├── images/
│   │   ├── logo.svg                 # Approved logo, if supplied
│   │   └── gallery/                 # Approved intra-school images
│   └── ...
├── src/                             # If the implementation uses a React app
│   ├── components/
│   │   ├── navigation/
│   │   ├── effects/
│   │   ├── gallery/
│   │   └── forms/
│   ├── pages/
│   │   ├── Home
│   │   ├── Register
│   │   └── Admin
│   ├── data/                        # Editable content and configuration
│   ├── styles/                      # Tokens and responsive styles
│   └── ...
├── components.txt                   # Optional supplied component source bundle
└── ...
```

If the project remains hosted entirely in GHL, adapt this layout to the code and assets actually exported or maintained. Do not create empty files or folders merely to match this diagram.

## Project Status

**Design and functional requirements:** documented in this README.

**Implementation status:** must be updated from the actual project. Do not mark an item complete until it has been tested in the rendered environment.

Recommended release states:

- **Planned** — specified but not implemented.
- **In progress** — implementation underway.
- **Implemented** — code or configuration exists.
- **Verified** — tested successfully in the real target environment.

Before launch, confirm event content with the organizers, test real registration submission, verify the security controls, and complete the mobile/accessibility checklist above.

---

Made for **Sahasaknaada** — Radio Club of D. S. Senanayake College.
