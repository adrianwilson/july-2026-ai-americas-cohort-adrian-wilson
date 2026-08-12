#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")" && pwd)"
CLI="$ROOT/src/ContentSafetyGate.Cli"

# Check for API key
if [ -z "${ANTHROPIC_API_KEY:-}" ]; then
    echo "Error: ANTHROPIC_API_KEY is not set."
    echo "  export ANTHROPIC_API_KEY=sk-ant-..."
    exit 1
fi

usage() {
    echo "Content Safety Gate - POC"
    echo ""
    echo "Usage: ./run.sh <command> [args]"
    echo ""
    echo "Commands:"
    echo "  eval              Run gold evaluation dataset against the agent"
    echo "  classify <file>   Classify a document file (PDF, PNG, JPEG)"
    echo "  text <text>       Classify pre-extracted text"
    echo "  build             Build the solution"
    echo "  test              Run unit tests"
    echo ""
    echo "Examples:"
    echo "  ./run.sh eval"
    echo "  ./run.sh classify data/samples/test-doc.pdf"
    echo "  ./run.sh text 'Dear Office, please find attached...'"
}

case "${1:-}" in
    eval)
        echo "Building..."
        dotnet build "$CLI" --nologo -q
        echo "Running eval against gold dataset..."
        dotnet run --project "$CLI" --no-build -- eval
        ;;
    classify)
        if [ -z "${2:-}" ]; then
            echo "Error: specify a file path."
            echo "  ./run.sh classify path/to/document.pdf"
            exit 1
        fi
        dotnet build "$ROOT" --nologo -q
        dotnet run --project "$CLI" --no-build -- "$2"
        ;;
    text)
        if [ -z "${2:-}" ]; then
            echo "Error: specify text to classify."
            echo "  ./run.sh text 'Document text here...'"
            exit 1
        fi
        dotnet build "$ROOT" --nologo -q
        dotnet run --project "$CLI" --no-build -- classify-text "${@:2}"
        ;;
    build)
        dotnet build "$ROOT"
        ;;
    test)
        dotnet test "$ROOT"
        ;;
    *)
        usage
        ;;
esac
