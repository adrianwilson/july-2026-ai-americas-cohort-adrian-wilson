# AI Upload Content Safety Gate

**Cohort:** july-2026-ai-americas-cohort
**Participant:** Adrian Wilson
**Theme:** Engineering on Shifting Ground: Building Dependable Systems on Undependable Components

## System Description

An AI-assisted content classification gate for a benefits administration workflow. Caseworkers upload supporting documents (income statements, ID scans, proof of residency, statutory declarations) that frequently contain sensitive personal information.

The system layers an advisory AI classification step on top of existing deterministic upload guardrails. A deterministic pipeline extracts text and masks all PII before the AI agent sees anything. The agent classifies the sanitized content and flags documents with policy-relevant risk for a human reviewer. It never auto-blocks, auto-approves, or auto-deletes.

The core architectural question: the model is a probabilistic, unstable component bolted onto a system that must remain dependable and auditable. The deterministic checks stay authoritative; the AI layer is advisory only.

## Architecture

```
Document Upload
      |
      v
 [Deterministic Gate]          Existing upload validation
 Size, content-type,           (25 MB, PDF/PNG/JPEG)
 key-prefix checks
      |
      v
 [Text Extraction]             PDF parser or OCR
      |
      v
 [PII Masking]                 Presidio-style regex detection
 --- Trust Boundary ---        SIN, DOB, NAME, ADDRESS, BANK_ACCT, EMAIL
      |
      |--- Original doc -----> Caseworker (human path, real PII)
      |
      v
 [Agentic RAG Loop]            Claude tool-use (masked text only)
 1. retrieve_policy             Policy chunk lookup
 2. Analyze against policy      Self-verify, re-retrieve if thin
 3. classify                    allow | flag | block + rationale
      |
      v
 [Human Review Queue]          Verdict, rationale, citations
      |                        Caseworker makes final call
      v
 [Override Log]                 Agreement/disagreement recorded
                                Feeds back into eval dataset
```

See [docs/workflow.md](docs/workflow.md) for a detailed Mermaid diagram.

## Two-Path Trust Boundary

| Path | Who sees it | Contains real PII? | Purpose |
|------|------------|-------------------|---------|
| **Human path** | Caseworker | Yes (original document) | Review, decision-making, case file |
| **AI path** | Agent | No (masked tokens only) | Classification, policy compliance check |

The agent never has access to raw documents or real personal data.

## Tech Stack

| Layer | POC (local) | Production target |
|-------|-------------|-------------------|
| Language | C# / .NET 10 | Same |
| LLM | Claude via Anthropic API | Amazon Bedrock (Claude) |
| Agent framework | Anthropic .NET SDK (tool-use loop) | Semantic Kernel or Anthropic SDK via Bedrock |
| Retrieval | In-memory keyword matching | OpenSearch / pgvector with embeddings |
| PII masking | Regex-based (Presidio-style) | Microsoft Presidio or AWS Comprehend |
| OCR | Placeholder | Amazon Textract |
| UI | Angular 18 | Same |
| Storage | Local filesystem | S3 |

## Prerequisites

- [.NET 10 SDK](https://dotnet.microsoft.com/download)
- [Node.js 20+](https://nodejs.org/) (for Angular UI)
- An [Anthropic API key](https://console.anthropic.com/)

## Build and Run

```bash
# Set your API key
export ANTHROPIC_API_KEY=sk-ant-...

# Run the full demo (API + UI)
./run.sh demo

# API:  http://localhost:5000
# UI:   http://localhost:4300
```

### Other commands

```bash
./run.sh api               # API server only
./run.sh ui                # Angular dev server only
./run.sh eval              # Run gold evaluation dataset
./run.sh classify doc.pdf  # Classify a document file
./run.sh text 'Some text'  # Classify raw text
./run.sh build             # Build everything
./run.sh test              # Run tests
```

## Evaluation

The evaluation dataset is the load-bearing wall of the system. 20 gold-labeled synthetic documents covering:

- Clean administrative documents (allow)
- PII-containing documents: applications, ID scans, bank statements, statutory declarations (flag)
- Incomplete documents with missing required fields (flag)
- Prompt injection attempts: direct, subtle footer, base64-encoded (block)

Run the eval suite:

```bash
./run.sh eval
```

Gold dataset: [data/eval/gold-dataset.json](data/eval/gold-dataset.json)
Eval plan: see architecture documentation in the companion knowledge base.

### Eval Dimensions

| Dimension | What it measures |
|-----------|-----------------|
| Classification accuracy | Verdict matches gold label |
| PII masking quality | All PII detected, no over-masking |
| Retrieval relevance | Correct policy chunks retrieved |
| Citation faithfulness | Rationale traces to real policy |
| PII leakage | Zero real PII reaches agent or logs |
| Injection resistance | Adversarial docs correctly blocked |
| Cost and latency | Token usage and response time |

## Human Feedback Workflow

After the agent classifies a document, the caseworker reviews the verdict and either agrees or overrides it. Overrides are logged with rationale and missed policy IDs.

Feedback flows back into the system through the eval pipeline:
- Disagreement analysis (agreement rate, override patterns)
- Gold dataset expansion (high-signal overrides promoted to eval rows)
- Few-shot prompt improvement (informative overrides added as examples)

The feedback loop is eval-driven, not automated. No fine-tuning, no online learning.

Override log: `data/feedback/override-log.jsonl`

## Project Structure

```
src/
  ContentSafetyGate.Core/         Models, interfaces, override log service
  ContentSafetyGate.Agent/        Agentic RAG loop (Claude tool-use)
  ContentSafetyGate.Preprocessing/ Text extraction, PII masking
  ContentSafetyGate.Api/          HTTP API (classify, review, feedback)
  ContentSafetyGate.Cli/          CLI runner
  ui/                             Angular 18 frontend
tests/
  ContentSafetyGate.Eval/         Evaluation runner
data/
  eval/                           Gold evaluation dataset
  feedback/                       Human review override log
docs/
  workflow.md                     Pipeline diagram (Mermaid)
```

## Constraints and Guardrails

- **Advisory only**: Agent output goes to human review queue, never enforces decisions
- **Masked text only**: Agent receives PII-masked text, never raw documents
- **Iteration cap**: Agent loop capped at 5 steps, auto-flags if no verdict produced
- **Tool allowlist**: Agent can only call `retrieve_policy` and `classify`
- **Injection resistance**: System prompt includes injection-resistance instructions; adversarial docs are classified as block
- **No real PII in logs**: Audit trail captures only masked text and agent reasoning
- **Audit trail**: Every agent step logged with tool calls, retrieved chunks, reasoning, and verdict

## Lessons Learned

**Deterministic gates catch more than you expect, but also create new problems.** The regex-based PII masker correctly catches SINs, emails, and bank account numbers at zero model cost. But it also introduces false positives: a deadline date like `2024-09-30` in an administrative memo gets tagged as a date of birth because the regex can't distinguish context. The masker is a trust boundary, but its mistakes become the agent's inputs.

**Policy is the right layer to fix masker false positives.** Rather than making the regex smarter (which risks missing real PII), we added POL-006 to teach the agent that dates in administrative documents are not personal data. The agent reasons about document type and context to override a false PII tag. This keeps the masker conservative and the agent interpretive, which is the correct division of responsibility.

**The feedback loop is the product, not the classification.** The most valuable part of the system is not the agent's verdict on any single document. It is the cycle: agent misclassifies, caseworker overrides, override gets promoted to the gold dataset, eval score drops, policy gets updated, eval confirms the fix. Without this loop, the same false positive repeats silently forever.

**The gold dataset is a test suite, not training data.** The agent never reads the gold dataset during classification. It exists solely for the eval runner to score the system after a change. Promoting an override to the gold dataset does not fix anything. It makes the failure visible and permanent so that the fix (a policy change) can be measured and regressions caught.

**Agentic RAG earns its complexity through policy conflict resolution.** Standard RAG would retrieve the right policies but get one shot at answering. The agent queries twice, sees the conflict between POL-002 (flag documents with DOB) and POL-006 (administrative dates are not DOB), and reasons about which takes precedence for this document type. That second retrieval step is where the agentic loop pays for itself.

**Advisory-only is an architectural constraint, not a limitation.** The agent never enforces a decision. This is deliberate: in a benefits administration context, the cost of a false block (denying a legitimate applicant) outweighs the cost of a false allow (sending a clean document to review). Human authority over final decisions is a design requirement, not a missing feature.
