using System.Text.RegularExpressions;
using ContentSafetyGate.Core.Interfaces;
using ContentSafetyGate.Core.Models;

namespace ContentSafetyGate.Preprocessing;

/// <summary>
/// Detects and masks PII in extracted text.
/// Production: Microsoft Presidio. POC: regex-based placeholder.
/// This is the trust boundary -- nothing past here contains real PII.
/// </summary>
public partial class PiiMasker : IPiiMasker
{
    private static readonly (string Type, Regex Pattern)[] PiiPatterns =
    [
        ("SIN", SinPattern()),
        ("DOB", DobPattern()),
        ("BANK_ACCT", BankAccountPattern()),
        ("EMAIL", EmailPattern()),
        ("PHONE", PhonePattern()),
    ];

    public Task<SanitizedDocument> MaskAsync(ExtractedDocument document)
    {
        var maskedText = document.RawText;
        var detectedTypes = new HashSet<string>();
        int totalMasked = 0;

        foreach (var (type, pattern) in PiiPatterns)
        {
            var matches = pattern.Matches(maskedText);
            if (matches.Count > 0)
            {
                detectedTypes.Add(type);
                totalMasked += matches.Count;
                maskedText = pattern.Replace(maskedText, $"[{type}]");
            }
        }

        // Name detection is harder with regex alone -- placeholder for Presidio NER
        // TODO: integrate Microsoft Presidio for proper NER-based name/address detection

        return Task.FromResult(new SanitizedDocument
        {
            DocId = document.DocId,
            MaskedText = maskedText,
            MaskSummary = new PiiMaskSummary
            {
                DetectedTypes = detectedTypes.ToList(),
                TotalMasked = totalMasked
            },
            DocType = document.DocType
        });
    }

    // Canadian SIN: 3 groups of 3 digits
    [GeneratedRegex(@"\b\d{3}[-\s]?\d{3}[-\s]?\d{3}\b")]
    private static partial Regex SinPattern();

    // Dates that look like DOB — skip dates preceded by contextual keywords (Date:, Effective:, Issued:, etc.)
    [GeneratedRegex(@"(?<!(?:Date|Effective|Issued|Updated|Created|Sent|Received|Filed)\s*:\s*)\b(\d{4}[-/]\d{2}[-/]\d{2}|\d{2}[-/]\d{2}[-/]\d{4})\b")]
    private static partial Regex DobPattern();

    // Bank account numbers (7-12 digits)
    [GeneratedRegex(@"\b\d{7,12}\b")]
    private static partial Regex BankAccountPattern();

    [GeneratedRegex(@"\b[\w.+-]+@[\w-]+\.[\w.]+\b")]
    private static partial Regex EmailPattern();

    [GeneratedRegex(@"\b(\+?1[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}\b")]
    private static partial Regex PhonePattern();
}
