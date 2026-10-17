// Starter Mermaid sources offered by the mermaid node settings.
export const MERMAID_TEMPLATES = [
  {
    id: "flowchart",
    label: "Flowchart",
    source: `flowchart LR
  A[Idea] --> B{Worth it?}
  B -- Yes --> C[Build]
  B -- No --> D[Park it]
  C --> E[Ship]`,
  },
  {
    id: "sequence",
    label: "Sequence",
    source: `sequenceDiagram
  participant U as User
  participant A as App
  participant S as Server
  U->>A: Click save
  A->>S: POST /save
  S-->>A: 200 OK
  A-->>U: Saved`,
  },
  {
    id: "gantt",
    label: "Gantt",
    source: `gantt
  title Launch plan
  dateFormat YYYY-MM-DD
  section Design
  Research      :a1, 2026-01-05, 7d
  Wireframes    :after a1, 5d
  section Build
  Implementation :2026-01-19, 14d
  QA             :7d`,
  },
  {
    id: "class",
    label: "Class",
    source: `classDiagram
  class Board {
    +String name
    +addNode()
  }
  class Node {
    +String id
    +Object data
  }
  Board "1" --> "*" Node`,
  },
  {
    id: "state",
    label: "State",
    source: `stateDiagram-v2
  [*] --> Draft
  Draft --> Review
  Review --> Published
  Review --> Draft
  Published --> [*]`,
  },
  {
    id: "er",
    label: "ER",
    source: `erDiagram
  USER ||--o{ BOARD : owns
  BOARD ||--|{ NODE : contains
  NODE }o--o{ NODE : links`,
  },
  {
    id: "pie",
    label: "Pie",
    source: `pie title Time spent
  "Planning" : 20
  "Building" : 55
  "Testing" : 25`,
  },
  {
    id: "mindmap",
    label: "Mind map",
    source: `mindmap
  root((Product))
    Users
      Interviews
      Personas
    Features
      Canvas
      Sharing`,
  },
  {
    id: "timeline",
    label: "Timeline",
    source: `timeline
  title Roadmap
  Q1 : Research : Prototype
  Q2 : Beta launch
  Q3 : General availability`,
  },
];

export const DEFAULT_MERMAID_SOURCE = MERMAID_TEMPLATES[0].source;
