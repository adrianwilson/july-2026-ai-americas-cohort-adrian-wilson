#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")" && pwd)"
CLI="$ROOT/src/ContentSafetyGate.Cli"
API="$ROOT/src/ContentSafetyGate.Api"
UI="$ROOT/src/ui"

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
    echo "  demo              Start API + Angular UI for demo"
    echo "  api               Start API server only (port 5000)"
    echo "  ui                Start Angular dev server only (port 4200)"
    echo "  eval              Run gold evaluation dataset against the agent"
    echo "  classify <file>   Classify a document file (PDF, PNG, JPEG)"
    echo "  text <text>       Classify pre-extracted text"
    echo "  build             Build everything (API + CLI + UI)"
    echo "  test              Run unit tests"
    echo ""
    echo "Examples:"
    echo "  ./run.sh demo"
    echo "  ./run.sh eval"
    echo "  ./run.sh text 'Dear Office, please find attached...'"
}

case "${1:-}" in
    demo)
        echo "Building API..."
        dotnet build "$API" --nologo -q
        echo "Starting API on http://localhost:5000..."
        dotnet run --project "$API" --no-build &
        API_PID=$!
        echo "Starting Angular UI on http://localhost:4300..."
        (cd "$UI" && npx ng serve --open --port 4300) &
        UI_PID=$!
        trap "kill $API_PID $UI_PID 2>/dev/null" EXIT
        echo ""
        echo "Demo running:"
        echo "  API: http://localhost:5000"
        echo "  UI:  http://localhost:4300"
        echo "  Press Ctrl+C to stop"
        wait
        ;;
    api)
        dotnet build "$API" --nologo -q
        echo "API running on http://localhost:5000"
        dotnet run --project "$API" --no-build
        ;;
    ui)
        cd "$UI" && npx ng serve --open --port 4300
        ;;
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
    reset)
        echo "Clearing eval history and feedback data..."
        rm -rf "$ROOT"/data/eval/history
        rm -rf "$ROOT"/src/ContentSafetyGate.Api/data/eval/history
        rm -rf "$ROOT"/src/ContentSafetyGate.Api/bin/Debug/net10.0/data/eval/history
        rm -f "$ROOT"/src/ContentSafetyGate.Api/data/feedback/override-log.jsonl
        echo "Done. Gold dataset preserved."
        ;;
    build)
        dotnet build "$ROOT"
        (cd "$UI" && npx ng build)
        ;;
    test)
        dotnet test "$ROOT"
        ;;
    *)
        usage
        ;;
esac
