"""PreToolUse hook: make Claude ask before shell commands that could skip the
LinkedIn approval dialog in lib/approval.py.

The dialog in lib/ is the real gate. This hook covers the routes around it:
calling the Publora API directly, reading the API keys, or touching the gate's
own files. On a match it returns permissionDecision "ask", so Claude Code shows
you the command and waits for your answer. No match: no output, normal rules.
"""
import json
import re
import sys

RULES = [
    (
        r"api\.publora\.com|x-publora-key|BASE_URL|_session\.|\._send\(",
        "calls the Publora API directly, which skips the approval dialog in lib/",
    ),
    (
        r"PUBLORA_API_KEY|APIFY_TOKEN|PIXFARO_TOKEN|PIXFARO_API_KEY|dotenv_values"
        r"|os\.environ|printenv|\b(?:Get-ChildItem|gci|dir|ls)\s+env:",
        "may read or print your API keys",
    ),
    (
        r"(?<![\w.-])\.env(?![\w.-])",
        "touches your .env file, which holds your API keys",
    ),
    (
        r"lib[\\/](?:approval|publora_client|backend_selector)\.py|\.claude[\\/]|guard_publish",
        "touches the approval gate or this hook's configuration",
    ),
]


def ask(reason: str) -> None:
    print(json.dumps({
        "hookSpecificOutput": {
            "hookEventName": "PreToolUse",
            "permissionDecision": "ask",
            "permissionDecisionReason": f"LinkedIn approval guard: this command {reason}.",
        }
    }))


def main() -> int:
    try:
        data = json.load(sys.stdin)
        command = (data.get("tool_input") or {}).get("command") or ""
    except Exception:
        ask("could not be checked (the hook couldn't parse its input)")
        return 0

    for pattern, reason in RULES:
        if re.search(pattern, command, re.IGNORECASE):
            ask(reason)
            return 0
    return 0


if __name__ == "__main__":
    sys.exit(main())
