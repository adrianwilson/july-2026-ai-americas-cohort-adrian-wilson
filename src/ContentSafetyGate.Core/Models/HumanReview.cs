namespace ContentSafetyGate.Core.Models;

public record HumanReviewRequest
{
    public required string DocId { get; init; }
    public required Verdict HumanVerdict { get; init; }
    public string? HumanRationale { get; init; }
    public List<string> MissedPolicyIds { get; init; } = [];
}

public record HumanReviewRecord
{
    public required string DocId { get; init; }
    public required DateTimeOffset Timestamp { get; init; }
    public required Verdict AgentVerdict { get; init; }
    public required double AgentConfidence { get; init; }
    public required string AgentRationale { get; init; }
    public required List<string> AgentCitations { get; init; }
    public required Verdict HumanVerdict { get; init; }
    public string? HumanRationale { get; init; }
    public required bool Agreement { get; init; }
    public List<string> MissedPolicyIds { get; init; } = [];
    public bool PromotedToGold { get; init; }
    public string? RawText { get; init; }
    public string? DocType { get; init; }
    public List<string> PiiDetected { get; init; } = [];
}

public record FeedbackSummary
{
    public required int TotalReviews { get; init; }
    public required int Agreements { get; init; }
    public required int Overrides { get; init; }
    public required double AgreementRate { get; init; }
    public required Dictionary<string, int> OverridesByDirection { get; init; }
    public required Dictionary<string, int> MissedPolicyCounts { get; init; }
    public required List<HumanReviewRecord> RecentOverrides { get; init; }
}
