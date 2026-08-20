using System.Text.Json;
using System.Text.Json.Serialization;
using ContentSafetyGate.Core.Models;

namespace ContentSafetyGate.Core.Services;

public class OverrideLogService
{
    private readonly string _logPath;
    private readonly string _goldDatasetPath;
    private readonly JsonSerializerOptions _jsonOptions = new()
    {
        PropertyNamingPolicy = JsonNamingPolicy.CamelCase,
        Converters = { new JsonStringEnumConverter(JsonNamingPolicy.CamelCase) },
        WriteIndented = false
    };

    private readonly JsonSerializerOptions _goldJsonOptions = new()
    {
        PropertyNamingPolicy = JsonNamingPolicy.SnakeCaseLower,
        WriteIndented = true
    };

    public OverrideLogService(string logPath, string goldDatasetPath)
    {
        _logPath = logPath;
        _goldDatasetPath = goldDatasetPath;
        var dir = Path.GetDirectoryName(logPath);
        if (dir != null && !Directory.Exists(dir))
            Directory.CreateDirectory(dir);
    }

    public async Task<HumanReviewRecord> RecordReviewAsync(
        HumanReviewRequest request,
        ClassificationResult agentResult,
        string? rawText = null,
        string? docType = null)
    {
        var record = new HumanReviewRecord
        {
            DocId = request.DocId,
            Timestamp = DateTimeOffset.UtcNow,
            AgentVerdict = agentResult.Verdict,
            AgentConfidence = agentResult.Confidence,
            AgentRationale = agentResult.Rationale,
            AgentCitations = agentResult.PolicyCitations,
            HumanVerdict = request.HumanVerdict,
            HumanRationale = request.HumanRationale,
            Agreement = agentResult.Verdict == request.HumanVerdict,
            MissedPolicyIds = request.MissedPolicyIds,
            PromotedToGold = false,
            RawText = rawText,
            DocType = docType,
            PiiDetected = agentResult.MaskSummary.DetectedTypes
        };

        var line = JsonSerializer.Serialize(record, _jsonOptions);
        await File.AppendAllTextAsync(_logPath, line + Environment.NewLine);

        return record;
    }

    public async Task<List<HumanReviewRecord>> GetAllRecordsAsync()
    {
        if (!File.Exists(_logPath))
            return [];

        var lines = await File.ReadAllLinesAsync(_logPath);
        return lines
            .Where(l => !string.IsNullOrWhiteSpace(l))
            .Select(l => JsonSerializer.Deserialize<HumanReviewRecord>(l, _jsonOptions)!)
            .ToList();
    }

    public async Task<bool> PromoteToGoldAsync(string docId)
    {
        var records = await GetAllRecordsAsync();
        var record = records.FirstOrDefault(r => r.DocId == docId && !r.Agreement && !r.PromotedToGold);
        if (record == null || string.IsNullOrEmpty(record.RawText))
            return false;

        // Read existing gold dataset
        List<Dictionary<string, object?>>? goldRows = [];
        if (File.Exists(_goldDatasetPath))
        {
            var json = await File.ReadAllTextAsync(_goldDatasetPath);
            goldRows = JsonSerializer.Deserialize<List<Dictionary<string, object?>>>(json, _goldJsonOptions) ?? [];
        }

        // Check for duplicate
        if (goldRows.Any(r => r.TryGetValue("doc_id", out var id) && id?.ToString() == docId))
            return false;

        // Build the new gold row
        var expectedPolicies = record.AgentCitations
            .Concat(record.MissedPolicyIds)
            .Distinct()
            .ToList();

        var rationaleContains = new List<string>();
        if (!string.IsNullOrEmpty(record.HumanRationale))
        {
            // Extract key terms from human rationale
            var terms = new[] { "PII", "SIN", "injection", "incomplete", "missing", "expired",
                               "bank account", "address", "prohibited", "human review", "income" };
            rationaleContains = terms
                .Where(t => record.HumanRationale.Contains(t, StringComparison.OrdinalIgnoreCase))
                .ToList();
        }

        var newRow = new Dictionary<string, object?>
        {
            ["doc_id"] = docId,
            ["doc_type"] = record.DocType ?? "pdf_native",
            ["summary"] = $"Promoted from human override: {record.HumanRationale ?? "agent disagreement"}",
            ["raw_text"] = record.RawText,
            ["expected_pii_masks"] = record.PiiDetected,
            ["expected_retrieved_policy_ids"] = expectedPolicies,
            ["expected_verdict"] = record.HumanVerdict.ToString().ToLowerInvariant(),
            ["expected_rationale_contains"] = rationaleContains,
            ["is_adversarial"] = false,
            ["injection_payload_summary"] = (object?)null
        };

        goldRows.Add(newRow);

        // Write back
        var updatedJson = JsonSerializer.Serialize(goldRows, _goldJsonOptions);
        await File.WriteAllTextAsync(_goldDatasetPath, updatedJson + Environment.NewLine);

        // Mark as promoted in override log by rewriting
        await RewriteLogWithPromotionAsync(docId);

        return true;
    }

    private async Task RewriteLogWithPromotionAsync(string docId)
    {
        var records = await GetAllRecordsAsync();
        var lines = records.Select(r =>
        {
            if (r.DocId == docId && !r.Agreement)
                r = r with { PromotedToGold = true };
            return JsonSerializer.Serialize(r, _jsonOptions);
        });
        await File.WriteAllTextAsync(_logPath,
            string.Join(Environment.NewLine, lines) + Environment.NewLine);
    }

    public async Task<FeedbackSummary> GetSummaryAsync()
    {
        var records = await GetAllRecordsAsync();
        var overrides = records.Where(r => !r.Agreement).ToList();

        var overridesByDirection = overrides
            .GroupBy(r => $"{r.AgentVerdict} -> {r.HumanVerdict}")
            .ToDictionary(g => g.Key, g => g.Count());

        var missedPolicyCounts = overrides
            .SelectMany(r => r.MissedPolicyIds)
            .GroupBy(p => p)
            .ToDictionary(g => g.Key, g => g.Count());

        return new FeedbackSummary
        {
            TotalReviews = records.Count,
            Agreements = records.Count(r => r.Agreement),
            Overrides = overrides.Count,
            AgreementRate = records.Count > 0
                ? Math.Round(100.0 * records.Count(r => r.Agreement) / records.Count, 1)
                : 0,
            OverridesByDirection = overridesByDirection,
            MissedPolicyCounts = missedPolicyCounts,
            RecentOverrides = overrides.OrderByDescending(r => r.Timestamp).Take(10).ToList()
        };
    }
}
