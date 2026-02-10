# PRD Specification for LLM-Executable Tasks

Based on Anthropic's "Effective Harnesses for Long-Running Agents" pattern. Designed for Claude Code, Cursor, or any autonomous coding agent.

---

## Core Principle

**Bite-sized tasks, not monolithic specs.**

Each task should be:
- Completable in one focused session (5-30 minutes for an LLM)
- Independently verifiable
- Atomic (doesn't depend on partial completion of other tasks)

---

## JSON Structure

```json
{
  "project": "Project Name",
  "description": "One paragraph explaining what we're building and why",
  "repository": "repo-name",
  
  "human_inputs_required": [
    "API_KEY: Description of what this is and where to get it",
    "DATABASE_URL: Connection string format"
  ],
  
  "phases": [
    {
      "phase": 1,
      "name": "Phase Name",
      "linear_ticket": "BOLD-123",
      "features": [
        {
          "id": "1.1",
          "category": "migration",
          "description": "What this task accomplishes",
          "steps": [
            "Step 1: Specific action",
            "Step 2: Specific action",
            "Verify: How to confirm it worked"
          ],
          "passes": false
        }
      ]
    }
  ],
  
  "verification": {
    "final_checks": [
      "All tests pass",
      "No TypeScript errors",
      "Feature X works end-to-end"
    ]
  }
}
```

---

## Field Definitions

### Top-Level Fields

| Field | Required | Description |
|-------|----------|-------------|
| `project` | Yes | Human-readable project name |
| `description` | Yes | What we're building and the business context |
| `repository` | No | Which repo this applies to |
| `human_inputs_required` | No | Credentials/config the human must provide before LLM can start |
| `phases` | Yes | Ordered list of development phases |
| `verification` | No | Final checks after all phases complete |

### Phase Fields

| Field | Required | Description |
|-------|----------|-------------|
| `phase` | Yes | Phase number (1, 2, 3...) |
| `name` | Yes | Human-readable phase name |
| `linear_ticket` | No | Associated Linear ticket ID |
| `features` | Yes | List of tasks in this phase |

### Feature/Task Fields

| Field | Required | Description |
|-------|----------|-------------|
| `id` | Yes | Unique ID (e.g., "1.1", "2.3", or "auth-001") |
| `category` | Yes | Task type (see categories below) |
| `description` | Yes | What this task accomplishes (one sentence) |
| `steps` | Yes | Ordered list of specific actions |
| `passes` | Yes | Boolean, starts `false`, set to `true` when complete |

---

## Categories

Use consistent categories across projects:

| Category | When to Use |
|----------|-------------|
| `setup` | Project initialization, dependencies, config files |
| `migration` | Database migrations, schema changes |
| `refactor` | Renaming, restructuring existing code |
| `functional` | Core feature implementation |
| `ui` | UI components, styling, layouts |
| `api` | API endpoints, controllers, routes |
| `testing` | Test files, test utilities |
| `documentation` | READMEs, inline docs, API docs |
| `performance` | Optimization, caching, query tuning |
| `security` | Auth, permissions, input validation |
| `accessibility` | a11y improvements |
| `seo` | Meta tags, structured data, sitemap |

---

## Writing Good Steps

### âœ… Good Steps

```json
"steps": [
  "Create file: src/components/Button.tsx",
  "Import React and define Props interface with: variant, size, disabled, children",
  "Implement Button component with Tailwind classes",
  "Export as default",
  "Verify: Component renders without errors in Storybook"
]
```

**Why this works:**
- Specific file paths
- Lists exact fields/props needed
- Ends with verification

### âŒ Bad Steps

```json
"steps": [
  "Create the button component",
  "Make it look good",
  "Test it"
]
```

**Why this fails:**
- Vague ("look good" means what?)
- No file paths
- No specific implementation details

---

## Step Patterns

### For Creating Files

```
"Create file: path/to/file.ext"
"Define [interface/type/schema] with fields: field1, field2, field3"
"Implement [function/component] that [specific behavior]"
"Export [default/named] from module"
```

### For Modifying Files

```
"Open file: path/to/file.ext"
"Find the [function/section] named X"
"Add/Update/Remove [specific change]"
"Verify: [how to confirm change worked]"
```

### For Running Commands

```
"Run: mix ecto.gen.migration migration_name"
"Run: npm install package-name"
"Verify: Command exits with status 0"
```

### For Database Work

```
"Create migration: mix ecto.gen.migration name"
"Add column: field_name, type, constraints"
"Create index on: table(columns)"
"Run: mix ecto.migrate"
"Verify: mix ecto.migrations shows all up"
```

### For Testing

```
"Create test file: test/path/file_test.exs"
"Write test case: description of what's being tested"
"Run: mix test test/path/file_test.exs"
"Verify: All tests pass"
```

---

## Example: Converting Linear Tickets to PRD

### Input: Linear Tickets

```
BOLD-1092: Rename profiles to viewers
BOLD-1093: Create viewer_progress table  
BOLD-1094: Viewers CRUD endpoints
```

### Output: PRD JSON

```json
{
  "project": "Viewers & Progress Tracking",
  "description": "Evolve Bold's viewer profiles into an external integration layer with watch progress tracking.",
  "repository": "bold",
  
  "phases": [
    {
      "phase": 1,
      "name": "Migration: Rename profiles â†’ viewers",
      "linear_ticket": "BOLD-1092",
      "features": [
        {
          "id": "1.1",
          "category": "migration",
          "description": "Create migration to rename profiles table to viewers",
          "steps": [
            "Run: mix ecto.gen.migration rename_profiles_to_viewers",
            "Add: rename table(:profiles), to: table(:viewers)",
            "Verify: mix compile succeeds"
          ],
          "passes": false
        },
        {
          "id": "1.2",
          "category": "migration",
          "description": "Add external_id column to viewers table",
          "steps": [
            "In same migration, add: alter table(:viewers) do add :external_id, :string end",
            "Add index: create index(:viewers, [:external_id])",
            "Verify: Migration file is valid Elixir"
          ],
          "passes": false
        },
        {
          "id": "1.3",
          "category": "refactor",
          "description": "Rename Profile schema module to Viewer",
          "steps": [
            "Move: lib/app/profiles/profile.ex â†’ lib/app/viewers/viewer.ex",
            "Rename module: App.Profiles.Profile â†’ App.Viewers.Viewer",
            "Update schema from 'profiles' to 'viewers'",
            "Add field: :external_id, :string",
            "Run: mix compile",
            "Verify: No compilation errors"
          ],
          "passes": false
        }
      ]
    },
    {
      "phase": 2,
      "name": "Migration: Create viewer_progress table",
      "linear_ticket": "BOLD-1093",
      "features": [
        {
          "id": "2.1",
          "category": "migration",
          "description": "Create viewer_progress table",
          "steps": [
            "Run: mix ecto.gen.migration create_viewer_progress",
            "Create table with: viewer_id (references viewers), video_id (references videos), current_time (integer), duration (integer), completed_at (utc_datetime)",
            "Add unique index on: [:viewer_id, :video_id]",
            "Add generated column: percentage AS (current_time * 100 / NULLIF(duration, 0))",
            "Verify: mix ecto.migrate succeeds"
          ],
          "passes": false
        }
      ]
    }
  ],
  
  "verification": {
    "final_checks": [
      "All migrations run on all tenant schemas",
      "No references to 'profiles' remain in codebase",
      "mix test passes",
      "No TypeScript/compilation errors"
    ]
  }
}
```

---

## Prompt Template for Creating PRDs

Use this when giving Linear tickets to Claude:

```
I have these Linear tickets:

[Paste ticket titles and descriptions]

Create a prd.json following this structure:
- Break each ticket into 3-8 bite-sized tasks
- Each task should be completable by an LLM in one focused session
- Include specific file paths, field names, and verification steps
- Group related tasks into phases matching the tickets
- Reference the Linear ticket ID in each phase

Output as valid JSON.
```

---

## How Agents Use This

1. **Initializer Agent** reads the PRD, identifies `human_inputs_required`, prompts for them
2. **Coding Agent** iterates through features:
   - Read feature description and steps
   - Execute each step
   - Run verification
   - Set `passes: true`
   - Move to next feature
3. **Progress Tracking** via the `passes` field â€” resume from where you left off
4. **Final Verification** runs checks from `verification.final_checks`

---

## Tips

1. **One ticket = one phase** (usually)
2. **3-8 features per phase** is the sweet spot
3. **Every feature ends with verification** â€” how does the LLM know it worked?
4. **File paths are sacred** â€” be specific, never say "in the appropriate file"
5. **When in doubt, split** â€” two small tasks beat one ambiguous task
6. **Include the "why"** in descriptions â€” helps LLM make judgment calls
