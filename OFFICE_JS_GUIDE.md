# Office.js Crash Course — What You Need for the CASUS Interview

## What is Office.js?

Office.js is Microsoft's JavaScript API for building **add-ins** (plugins) that run inside
Word, Excel, Outlook, etc. The add-in appears as a **Taskpane** — a sidebar panel inside Word.

It's just a web app (HTML/CSS/JS/React) loaded in an iframe inside Word.
That's why CASUS can use React + TypeScript for the Word Add-in — it's the same stack as the web app.

## How the CASUS Word Add-in Works

```
┌─────────────────────────────────────────────────────────┐
│  Microsoft Word                                          │
│                                                          │
│  ┌──────────────────────┐  ┌──────────────────────────┐ │
│  │                      │  │  CASUS Taskpane (React)   │ │
│  │   Word Document      │  │                          │ │
│  │                      │  │  [Benchmark] [Chat] ...  │ │
│  │   The lawyer's       │◄─┤                          │ │
│  │   contract text      │  │  Office.js reads the doc │ │
│  │   lives here         │──►  and sends text to the   │ │
│  │                      │  │  CASUS backend API        │ │
│  │   Track Changes      │◄─┤                          │ │
│  │   appear here when   │  │  Office.js writes fixes  │ │
│  │   CASUS inserts fixes│  │  back into the document   │ │
│  │                      │  │                          │ │
│  └──────────────────────┘  └──────────────────────────┘ │
└─────────────────────────────────────────────────────────┘
```

## The 3 Operations CASUS Uses

### 1. READ the Document (Getting text to send to the LLM)

```typescript
// Every Office.js operation uses Word.run() — it's like a transaction
async function readDocument(): Promise<string> {
  return Word.run(async (context) => {
    // Get the full document body
    const body = context.document.body;
    
    // Load the text property (Office.js uses a lazy-loading pattern)
    body.load("text");
    
    // Execute the batch — this is when the actual read happens
    await context.sync();
    
    return body.text;
  });
}
```

**Key concept**: Office.js uses **batch operations**. You queue up what you want,
then call `context.sync()` to execute everything at once. This minimizes
round-trips between the taskpane iframe and the Word process.

### 2. WRITE / INSERT Text (Applying suggested fixes)

```typescript
// Insert text at a specific location
async function insertClause(text: string, location: Word.InsertLocation) {
  return Word.run(async (context) => {
    const body = context.document.body;
    
    // Insert at end, start, before, after, or replace
    body.insertText(text, location); // e.g., Word.InsertLocation.end
    
    await context.sync();
  });
}

// Search and replace — used when Benchmark says "replace this clause"
async function searchAndReplace(searchText: string, replaceText: string) {
  return Word.run(async (context) => {
    const results = context.document.body.search(searchText, {
      matchCase: false,
      matchWholeWord: false,
    });
    
    results.load("items");
    await context.sync();
    
    for (const range of results.items) {
      range.insertText(replaceText, Word.InsertLocation.replace);
    }
    
    await context.sync();
  });
}
```

### 3. TRACK CHANGES / REDLINING (The Differentiator)

This is what makes CASUS special and what Copilot can't do.
When Track Changes is enabled in Word, any text modification through Office.js
shows up as a tracked change (redline) — deletions in red strikethrough,
insertions in colored underline.

```typescript
// The key insight: you don't need to "enable" track changes via Office.js.
// If the lawyer has Track Changes turned ON in Word (which lawyers always do),
// then any insertText/deleteText call automatically appears as a tracked change.

async function applyFixWithRedlining(
  originalText: string,
  suggestedFix: string
) {
  return Word.run(async (context) => {
    // Find the clause in the document
    const results = context.document.body.search(originalText, {
      matchCase: false,
    });
    
    results.load("items");
    await context.sync();
    
    if (results.items.length > 0) {
      const range = results.items[0];
      
      // This replaces the text. If Track Changes is ON in Word:
      // - The old text shows as red strikethrough (deletion)
      // - The new text shows as colored underline (insertion)
      // THIS IS THE MAGIC — it's automatic, not a special API call
      range.insertText(suggestedFix, Word.InsertLocation.replace);
      
      await context.sync();
    }
  });
}
```

## Content Controls (Annotations / Highlighting)

CASUS uses Content Controls to mark and link sections of the document.

```typescript
// Highlight a risky clause so the lawyer can see it
async function highlightClause(searchText: string, title: string) {
  return Word.run(async (context) => {
    const results = context.document.body.search(searchText);
    results.load("items");
    await context.sync();
    
    if (results.items.length > 0) {
      const range = results.items[0];
      
      // Wrap in a content control — like a named bookmark
      const cc = range.insertContentControl();
      cc.title = title;
      cc.tag = "casus-flagged";
      cc.appearance = Word.ContentControlAppearance.boundingBox;
      
      // Visual highlighting
      range.font.highlightColor = "#FFF3CD"; // yellow highlight
      
      await context.sync();
    }
  });
}

// Navigate to a specific location when the lawyer clicks a result
async function scrollToClause(searchText: string) {
  return Word.run(async (context) => {
    const results = context.document.body.search(searchText);
    results.load("items");
    await context.sync();
    
    if (results.items.length > 0) {
      results.items[0].select(); // Selects and scrolls to the text
      await context.sync();
    }
  });
}
```

## How the Taskpane Communicates with the Backend

The taskpane is just a React app. It uses normal fetch/axios calls:

```typescript
// Inside the React taskpane component
async function runBenchmark(playbookId: string) {
  // Step 1: Read document text via Office.js
  const documentText = await readDocument();
  
  // Step 2: Call CASUS backend (same API as the web app)
  const response = await fetch("https://api.getcasus.com/benchmark", {
    method: "POST",
    headers: { 
      "Content-Type": "application/json",
      "Authorization": `Bearer ${firebaseToken}` // Firebase Auth
    },
    body: JSON.stringify({ documentText, playbook: playbookId }),
  });
  
  const result = await response.json();
  
  // Step 3: Display results in the taskpane (React state)
  setResults(result);
  
  // Step 4 (optional): Apply fixes directly in Word
  // When user clicks "Insert Fix" on a deviation:
  // await applyFixWithRedlining(originalText, suggestedFix);
}
```

## Key Interview Talking Points

1. **"The add-in is just a React web app in an iframe"** — same tech stack as the web app,
   which is why a small team can maintain both.

2. **"Office.js uses batch operations with context.sync()"** — you queue up reads/writes,
   then execute them all at once for performance.

3. **"Track Changes is automatic"** — if the lawyer has it enabled (they always do),
   any Office.js text modification appears as a tracked change. No special API needed.

4. **"The taskpane talks to the same backend API"** — the only difference is WHERE the
   document text comes from (Office.js reads it from Word vs. the web app parses an upload).

5. **"Content Controls are used for linking"** — click a result in the taskpane → jump to
   that exact location in the document using search + select.

## What CASUS Can Do That Copilot Can't

Microsoft Copilot in Word can generate text and answer questions, but it CANNOT:
- Apply changes as tracked changes (redlines) that lawyers can accept/reject
- Compare against custom playbooks/standards
- Run structured analysis (Benchmark, Review, Proofread) with validated output
- Integrate with firm-specific workflows and data

This is CASUS's moat. The Office.js Track Changes integration is the technical differentiator.
