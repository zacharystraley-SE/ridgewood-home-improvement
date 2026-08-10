# Kitchen Studio product brief

Status: inferred from the approved Forma visualizer and Ridgewood website.

## Product

Kitchen Studio is Ridgewood Home Improvement's guest-first kitchen material
visualizer. Customers explore a photoreal fixed-camera kitchen and swap six
surface categories without creating an account.

## Users and jobs

- Homeowners compare cabinetry, island, countertop, backsplash, flooring, and
  wall finishes before requesting a renovation quote.
- Ridgewood managers maintain the finish inventory without exposing management
  controls in the primary customer journey.

## Core behavior

- Preserve the current Forma photoreal compositor, masks, undo/redo, zoom,
  material tabs, saved palette, quote flow, and responsive layout.
- Rename all customer-facing Spacely/Forma branding to Kitchen Studio.
- Serve the experience at `/kitchen-studio/` on RidgewoodHomeImprovement.com.
- Keep customer access anonymous; the only manager entry is a quiet footer link.
- Managers authenticate with a private password and receive a short-lived session.
- Managers can add, edit, enable/disable, order, and remove materials.
- Each of the six categories allows no more than 10 materials, enforced by the API.
- A new material requires a swatch and a 1536×1024 transparent render layer
  aligned to the fixed kitchen photograph; flooring may also include an edge layer.

## Visual world

Keep the approved Kitchen Studio palette: `#0d1b2a`, `#1b263b`, `#415a77`,
`#778da9`, and `#e0e1dd`. The interface is editorial and architectural: Georgia
display type, Avenir-style body copy, quiet borders, dense material controls,
and the kitchen photograph as the dominant visual.

## Deployment

The static customer and manager pages live in the Ridgewood GitHub Pages repo.
An isolated Cloudflare Worker, D1 database, and R2 bucket provide authentication,
inventory, and uploaded render assets. No data or code is shared with the separate
Linear-backed Spacely application.
