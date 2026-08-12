namespace ContentSafetyGate.Core.Models;

public record PolicyChunk
{
    public required string ChunkId { get; init; }
    public required string Source { get; init; }
    public required string Content { get; init; }
}
