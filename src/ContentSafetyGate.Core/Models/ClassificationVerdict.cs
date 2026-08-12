namespace ContentSafetyGate.Core.Models;

public enum Verdict
{
    Allow,
    Flag,
    Block
}

public record ClassificationResult
{
    public required string DocId { get; init; }
    public required Verdict Verdict { get; init; }
    public required string Rationale { get; init; }
    public required List<string> PolicyCitations { get; init; }
    public required double Confidence { get; init; }
    public required PiiMaskSummary MaskSummary { get; init; }
    public required List<AgentStep> Trace { get; init; }
}

public record PiiMaskSummary
{
    public required List<string> DetectedTypes { get; init; }
    public required int TotalMasked { get; init; }
}

public record AgentStep
{
    public required int StepNumber { get; init; }
    public required string ToolName { get; init; }
    public required string Input { get; init; }
    public required string Output { get; init; }
    public required DateTimeOffset Timestamp { get; init; }
}
