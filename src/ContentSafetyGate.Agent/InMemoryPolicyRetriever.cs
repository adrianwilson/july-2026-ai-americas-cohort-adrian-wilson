using ContentSafetyGate.Core.Interfaces;
using ContentSafetyGate.Core.Models;

namespace ContentSafetyGate.Agent;

/// <summary>
/// Simple in-memory policy retriever for the POC.
/// Uses keyword matching. Production would use vector similarity via embeddings.
/// </summary>
public class InMemoryPolicyRetriever : IPolicyRetriever
{
    private readonly List<PolicyChunk> _chunks = [];

    public Task IndexAsync(IEnumerable<PolicyChunk> chunks)
    {
        _chunks.Clear();
        _chunks.AddRange(chunks);
        return Task.CompletedTask;
    }

    public Task<List<PolicyChunk>> RetrieveAsync(string query, int topK = 5)
    {
        // Simple keyword scoring for POC -- replace with embedding similarity
        var queryTerms = query.ToLowerInvariant().Split(' ', StringSplitOptions.RemoveEmptyEntries);

        var scored = _chunks
            .Select(chunk => new
            {
                Chunk = chunk,
                Score = queryTerms.Count(term =>
                    chunk.Content.Contains(term, StringComparison.OrdinalIgnoreCase))
            })
            .Where(x => x.Score > 0)
            .OrderByDescending(x => x.Score)
            .Take(topK)
            .Select(x => x.Chunk)
            .ToList();

        return Task.FromResult(scored);
    }
}
