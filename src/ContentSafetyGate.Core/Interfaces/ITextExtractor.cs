using ContentSafetyGate.Core.Models;

namespace ContentSafetyGate.Core.Interfaces;

public interface ITextExtractor
{
    Task<ExtractedDocument> ExtractAsync(UploadedDocument document);
}
