using ContentSafetyGate.Core.Models;

namespace ContentSafetyGate.Core.Interfaces;

public interface IContentClassifier
{
    Task<ClassificationResult> ClassifyAsync(SanitizedDocument document);
}
