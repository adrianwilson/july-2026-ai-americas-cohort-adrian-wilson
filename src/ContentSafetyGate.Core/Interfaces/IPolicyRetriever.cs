using ContentSafetyGate.Core.Models;

namespace ContentSafetyGate.Core.Interfaces;

public interface IPolicyRetriever
{
    Task<List<PolicyChunk>> RetrieveAsync(string query, int topK = 5);
    Task IndexAsync(IEnumerable<PolicyChunk> chunks);
}
