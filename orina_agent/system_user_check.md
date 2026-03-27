FEATURE SPEC: AI-Driven Clarification Checkboxes
==================================================

OVERVIEW
--------
When a user submits a question, the AI determines whether it needs
additional context before answering. If so, it renders a checkbox
group for the user to select relevant options, then uses those
selections to generate a complete answer.


FLOW
----
1. User types a message and submits
2. Frontend calls Nemo API (Call #1) with a structured JSON system prompt
3. AI returns JSON indicating whether clarification is needed
4. a) If clarification_needed = true  → render checkbox UI
   b) If clarification_needed = false → render answer directly
5. User selects one or more checkboxes and clicks Submit
6. Frontend merges original message + selected options
7. Frontend calls Nemo API (Call #2) with the enriched context
8. AI returns final answer → render in chat UI


API CONTRACT
------------
System prompt instructs the model to ALWAYS return valid JSON.
No preamble, no markdown, no explanation outside the JSON object.

Response schema — when clarification is needed:
{
  "clarification_needed": true,
  "question": "string  — clarifying question shown above checkboxes",
  "options": ["string", "string", ...],   // 2–5 options recommended
  "answer": null
}

Response schema — when answer is ready:
{
  "clarification_needed": false,
  "question": null,
  "options": [],
  "answer": "string  — full answer to display in chat"
}


SYSTEM PROMPT TEMPLATE
-----------------------
You are a helpful assistant. When you receive a user message, you
MUST respond with a single valid JSON object — no other text.

If you need more information to give a useful answer:
{
  "clarification_needed": true,
  "question": "<one short clarifying question>",
  "options": ["<option 1>", "<option 2>", "<option 3>"],
  "answer": null
}

If you have enough information to answer fully:
{
  "clarification_needed": false,
  "question": null,
  "options": [],
  "answer": "<your complete answer>"
}

Rules:
- Return ONLY the JSON object, nothing else
- options array must have between 2 and 5 items
- answer must be null when clarification_needed is true
- question must be null when clarification_needed is false


API CALL #1  (initial message)
------------------------------
Endpoint : POST https://integrate.api.nvidia.com/v1/chat/completions
Headers  : Authorization: Bearer <API_KEY>
           Content-Type: application/json

Body:
{
  "model": "<your-nemo-model-id>",
  "temperature": 0.3,
  "messages": [
    { "role": "system", "content": "<SYSTEM_PROMPT>" },
    { "role": "user",   "content": "<user_message>" }
  ]
}

Expected: JSON object with clarification_needed = true or false


API CALL #2  (after user selects checkboxes)
--------------------------------------------
Same endpoint and headers as Call #1.

Body:
{
  "model": "<your-nemo-model-id>",
  "temperature": 0.3,
  "messages": [
    { "role": "system", "content": "<SYSTEM_PROMPT>" },
    {
      "role": "user",
      "content": "<original_user_message>\n\n[Additional context provided by user: <comma-separated selected options>]"
    }
  ]
}

Expected: JSON object with clarification_needed = false and a
          populated answer field


RESPONSE PARSING
----------------
Step 1 — Extract raw string from API response:
  raw = response.choices[0].message.content

Step 2 — Strip potential markdown fences and extract JSON:
  match = raw.match(/\{[\s\S]*\}/)
  parsed = JSON.parse(match[0])

Step 3 — Validate required fields before rendering:
  - clarification_needed : boolean  (required)
  - question             : string | null
  - options              : array of strings
  - answer               : string | null


FRONTEND BEHAVIOR
-----------------
Clarification UI (shown when clarification_needed = true):
  - Display AI's clarifying question as a label above the checkboxes
  - Render one checkbox per item in options[]
  - Allow multiple selections (multi-select, not radio)
  - Show a Submit button; disabled until at least one box is checked
  - After submission, remove the checkbox UI from the chat
  - Show a user bubble summarising the selections made
  - Show a loading indicator while Call #2 is in flight

Direct answer (shown when clarification_needed = false):
  - Render answer string as a standard bot message bubble
  - No checkbox UI is shown

Error states:
  - JSON parse failure  → show generic error bubble, allow user to retry
  - API timeout / 5xx  → show error bubble with retry button
  - Empty options array when clarification_needed = true → fall back to
    rendering a plain text input instead of checkboxes


RECOMMENDED MODEL SETTINGS
---------------------------
temperature : 0.3   (lower = more consistent JSON output)
max_tokens  : 1024  (sufficient for options list + answer)
top_p       : 1.0


CONSTRAINTS & NOTES
-------------------
- options array should contain 2–5 items for usability
- Do not pass conversation history between Call #1 and Call #2;
  each call is stateless — context is injected via the user message
- Selected checkbox values are joined with ", " before appending
- The system prompt must forbid any text outside the JSON object;
  even a single extra word will break JSON.parse()
- Store originalMessage in a JS variable, not in onclick attributes,
  to avoid escaping issues with special characters