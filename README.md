# Constellation Board / Systembrett

## Why?

I was looking for online tools for systemic and family constellations and found multiple possibilities. But most of them are expensive, performance hungry, or just too complex.
Therefore my goal is, to build a small open source tool to help myself.

### Tool Landscape

#### Mein Familienbrett

- https://www.mein-familienbrett.de/meinfamilienbrett/
- Made with Unity
- Sharable sessions (2 participants)
- Circles and Squares on board flexible addable
- free to use

#### Online Systembrett

- https://www.online-systembrett.com/
- made with Babylon.js
- a lot of cool features
- free version is limited
- costs money

#### Coachingspace Systembrett

https://coachingspace.net/tools/systembrett
- made with Babylon.js
- a lot of cool features
- test for free after registration
- 19.90€ / Month

#### Digital Constellations by Energetisch.fit
https://www.digital-constellation.com/

#### lpscocoon
http://www.lpscocoon.de/html/die_innovation_2008.php

### Other Virtual Reality Tools
- https://tricat.net/
- https://www.systemicvr.net/en/
- https://mootup.com/

## Current Features
- Inner View (Double Click on Position)
- Multiple Shapes (Select on Menu)

### TODO

- PointerLockControl
    - touch support (replace with orbit and no zoom controls?)
    - look and ESC
- Translations
    - Ger and Eng
- Short explanation on beginning (V)
- Positions
    - Multiple Mesh types (V)
- Textures for
    - world: start with sphere before modelling something (V)
        - https://blog.mastermaps.com/2014/01/photo-spheres-with-threejs.html
        - https://commons.wikimedia.org/wiki/File:Stenbocki_maja_360_--_sinine_tuba.jpg
        - https://www.cgbookcase.com/textures/wood-07/
    - board: wooden ground
    - position: eyes and nose
- Board
    - allow to add squares and circles
- TransformControls
    - Fix scaling of elements
    - find better color scheme
    - move hidden and in size of the element
- Debug Mode (V)
    - disable by default
    - enable by URL parameter `debug=true`
- Multi Participant
    - Start with sharable state vis URL
    - implement a socket backend to sync https://sbcode.net/threejs/socketio-setup/
- Inner Team
    - https://poly.pizza/ CC0 Models
        - models got cleaned up in size to contain just the mesh (no animation no rigging)