# Kitchen pass redesign
Kitchen rail, clipped tickets, warm light, paper textures and brushed metal replace the monitor/desk. Native scroll distance shortened from 420vh to 260vh per act. Shared invoice/recipe examples now use chicken, rice, spinach and seeds. Old seafood assets removed.

Four independent customizable dishes use deterministic SVG ingredient layers, 350ms transform transitions and 320ms nutrition counters. Choices persist across dish switching and dialog closing during the page visit. Reset restores each dish. Reduced motion disables interpolation; mobile provides vertical 44px+ controls and sticky nutrition.

Validation: 12 tests pass including all 32 ingredient combinations. Build and syntax checks pass. Browser verified four dishes, removal, reset, switching persistence, keyboard Space/Escape, reading mode with all 16 panels, 390px viewport with no horizontal overflow, and no console errors. OS-level reduced-motion emulation and real-device performance profiling were not performed.

Limitation: food and kitchen visuals are composed illustrations, not photographic assets. Sales email intake remains explicitly planned. Marketing demo only.
