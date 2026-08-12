using System.ComponentModel;
using Microsoft.SemanticKernel;

namespace ContentSafetyGate.Agent.Tools;

/// <summary>
/// Semantic Kernel function that produces a structured classification verdict.
/// The LLM calls this to finalize its assessment after gathering policy evidence.
/// </summary>
public class ClassificationTool
{
    [KernelFunction("classify")]
    [Description("Submit a final classification verdict for the document. Call this after retrieving and reviewing relevant policies. Verdict must be 'allow', 'flag', or 'block'.")]
    public Task<string> ClassifyAsync(
        [Description("The verdict: 'allow', 'flag', or 'block'")] string verdict,
        [Description("Explanation of why this verdict was chosen, referencing specific policy chunks")] string rationale,
        [Description("Comma-separated list of policy chunk IDs that support this verdict")] string policyCitations,
        [Description("Confidence level from 0.0 to 1.0")] double confidence)
    {
        // Validate verdict
        var normalizedVerdict = verdict.Trim().ToLowerInvariant();
        if (normalizedVerdict is not ("allow" or "flag" or "block"))
        {
            return Task.FromResult(
                $"Invalid verdict '{verdict}'. Must be 'allow', 'flag', or 'block'. Try again.");
        }

        if (confidence is < 0.0 or > 1.0)
        {
            return Task.FromResult(
                $"Invalid confidence '{confidence}'. Must be between 0.0 and 1.0. Try again.");
        }

        // Return structured result for the harness to parse
        return Task.FromResult(
            $"VERDICT:{normalizedVerdict}|RATIONALE:{rationale}|CITATIONS:{policyCitations}|CONFIDENCE:{confidence}");
    }
}
