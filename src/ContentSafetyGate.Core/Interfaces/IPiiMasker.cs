using ContentSafetyGate.Core.Models;

namespace ContentSafetyGate.Core.Interfaces;

public interface IPiiMasker
{
    Task<SanitizedDocument> MaskAsync(ExtractedDocument document);
}
