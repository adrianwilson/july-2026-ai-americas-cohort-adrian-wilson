using System.Text;
using ContentSafetyGate.Core.Interfaces;
using ContentSafetyGate.Core.Models;
using UglyToad.PdfPig;

namespace ContentSafetyGate.Preprocessing;

/// <summary>
/// Extracts text from uploaded documents.
/// PDF native: parsed via PdfPig. Scanned/images: OCR placeholder (production: Tesseract/Textract).
/// </summary>
public class TextExtractor : ITextExtractor
{
    public Task<ExtractedDocument> ExtractAsync(UploadedDocument document)
    {
        var text = document.DocType switch
        {
            DocumentType.PdfNative => ExtractFromPdf(document.FilePath),
            DocumentType.PdfScanned or DocumentType.Png or DocumentType.Jpeg
                => ExtractWithOcr(document.FilePath),
            _ => throw new ArgumentOutOfRangeException(nameof(document.DocType))
        };

        return Task.FromResult(new ExtractedDocument
        {
            DocId = document.DocId,
            RawText = text,
            DocType = document.DocType
        });
    }

    private static string ExtractFromPdf(string filePath)
    {
        using var document = PdfDocument.Open(filePath);
        var sb = new StringBuilder();
        foreach (var page in document.GetPages())
        {
            sb.AppendLine(page.Text);
        }
        return sb.ToString().Trim();
    }

    private static string ExtractWithOcr(string filePath)
    {
        // POC: OCR not implemented. Production would use Tesseract or AWS Textract.
        // For eval, use pre-extracted text from gold dataset instead.
        throw new NotSupportedException(
            $"OCR not implemented in POC. Use pre-extracted text for scanned docs. File: {filePath}");
    }
}
