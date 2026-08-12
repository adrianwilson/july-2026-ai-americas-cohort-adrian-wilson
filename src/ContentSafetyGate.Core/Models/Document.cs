namespace ContentSafetyGate.Core.Models;

public enum DocumentType
{
    PdfNative,
    PdfScanned,
    Png,
    Jpeg
}

public record UploadedDocument
{
    public required string DocId { get; init; }
    public required string FilePath { get; init; }
    public required DocumentType DocType { get; init; }
}

public record ExtractedDocument
{
    public required string DocId { get; init; }
    public required string RawText { get; init; }
    public required DocumentType DocType { get; init; }
}

public record SanitizedDocument
{
    public required string DocId { get; init; }
    public required string MaskedText { get; init; }
    public required PiiMaskSummary MaskSummary { get; init; }
    public required DocumentType DocType { get; init; }
}
