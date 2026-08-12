using System.ComponentModel;
using ContentSafetyGate.Core.Interfaces;
using Microsoft.SemanticKernel;

namespace ContentSafetyGate.Agent.Tools;

/// <summary>
/// Semantic Kernel function that retrieves relevant policy chunks from the vector store.
/// </summary>
public class PolicyRetrievalTool(IPolicyRetriever retriever)
{
    [KernelFunction("retrieve_policy")]
    [Description("Retrieves compliance policy chunks relevant to the given query. Use this to find policies about document requirements, accepted formats, PII handling, and upload rules.")]
    public async Task<string> RetrievePolicyAsync(
        [Description("A natural language query describing what policy information is needed")] string query,
        [Description("Number of policy chunks to retrieve (default 5)")] int topK = 5)
    {
        var chunks = await retriever.RetrieveAsync(query, topK);

        if (chunks.Count == 0)
            return "No relevant policy chunks found.";

        return string.Join("\n\n", chunks.Select(c =>
            $"[Policy: {c.ChunkId} | Source: {c.Source}]\n{c.Content}"));
    }
}
