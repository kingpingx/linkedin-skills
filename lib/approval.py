"""Approval gate helpers.

Every skill that posts to LinkedIn MUST present a draft to the user and wait
for explicit approval before calling Publora. Two layers:

- `render_approval_card` formats the draft for the chat, so the user can
  review and ask for edits (convention, not enforcement).
- `require_human_approval` is the runtime gate. Every write in
  `publora_client.py` and the diy backend calls it. On Windows it opens a
  native Yes/No dialog showing exactly what will be published; an agent
  cannot click it. Anything but an explicit Yes (No, closing the box, the
  timeout, or no way to show a dialog) raises `ApprovalDenied` and nothing
  is sent.
"""
from __future__ import annotations
import sys
from typing import Optional

APPROVAL_TIMEOUT_SECONDS = 90  # stays under the agent's 120s command timeout
DIALOG_TITLE = "LinkedIn: approve this action?"


class ApprovalDenied(RuntimeError):
    """The user did not explicitly approve a publish action. Nothing was sent."""


def require_human_approval(
    *,
    action: str,
    preview_text: str = "",
    target: Optional[str] = None,
    details: Optional[dict] = None,
) -> None:
    """Block until a human approves `action`, or raise `ApprovalDenied`.

    Fails closed: if no dialog or interactive terminal is available, the
    action is refused rather than allowed.
    """
    summary = _format_summary(action, preview_text, target, details)
    if not _ask(summary):
        raise ApprovalDenied(f"Not approved: {action}. Nothing was published.")


def _format_summary(action, preview_text, target, details) -> str:
    lines = [f"Action: {action}"]
    if target:
        lines.append(f"Target: {target}")
    for k, v in (details or {}).items():
        if v:
            lines.append(f"{k}: {v}")
    if preview_text:
        lines += ["", f"--- Text ({len(preview_text)} chars) ---", preview_text, "---"]
    lines += ["", "Publish this to LinkedIn?"]
    return "\n".join(lines)


def _ask(summary: str) -> bool:
    if sys.platform == "win32":
        return _windows_dialog(summary)
    if sys.stdin is not None and sys.stdin.isatty():
        try:
            print(summary)
            return input("Type yes to publish: ").strip().lower() == "yes"
        except EOFError:
            return False
    return False


def _windows_dialog(summary: str) -> bool:
    try:
        import ctypes
        from ctypes import wintypes

        MB_YESNO, MB_ICONWARNING, MB_DEFBUTTON2 = 0x4, 0x30, 0x100
        MB_SETFOREGROUND, MB_TOPMOST = 0x10000, 0x40000
        IDYES = 6
        flags = MB_YESNO | MB_ICONWARNING | MB_DEFBUTTON2 | MB_SETFOREGROUND | MB_TOPMOST

        user32 = ctypes.windll.user32
        box = getattr(user32, "MessageBoxTimeoutW", None)
        if box is not None:
            box.argtypes = [wintypes.HWND, wintypes.LPCWSTR, wintypes.LPCWSTR,
                            wintypes.UINT, wintypes.WORD, wintypes.DWORD]
            box.restype = ctypes.c_int
            result = box(None, summary, DIALOG_TITLE, flags, 0,
                         int(APPROVAL_TIMEOUT_SECONDS * 1000))
        else:
            result = user32.MessageBoxW(None, summary, DIALOG_TITLE, flags)
        return result == IDYES
    except Exception:
        return False


def render_approval_card(
    *,
    kind: str,  # "post" | "comment" | "reply" | "reaction"
    preview_text: str,
    target_url: Optional[str] = None,
    reaction_type: Optional[str] = None,
    char_count: Optional[int] = None,
    extra_context: Optional[dict] = None,
) -> str:
    """Format a standardized approval card for the user to review.

    The card MUST contain:
    - What the action is (post / comment / reply / reaction)
    - The full preview text
    - Target URL if applicable
    - A clear prompt: "reply YES to post or suggest edits"
    """
    lines = [f"## Draft ready for approval — {kind}", ""]
    if target_url:
        lines.append(f"**Target:** {target_url}")
    if reaction_type:
        lines.append(f"**Reaction:** `{reaction_type}`")
    if char_count is None:
        char_count = len(preview_text)
    lines.append(f"**Chars:** {char_count}")
    lines.append("")
    lines.append("**Preview:**")
    lines.append("")
    for pl in preview_text.splitlines() or [""]:
        lines.append(f"> {pl}")
    lines.append("")
    if extra_context:
        lines.append("**Context:**")
        for k, v in extra_context.items():
            lines.append(f"- **{k}**: {v}")
        lines.append("")
    lines.append("Reply **post** / **yes** to publish, or suggest edits.")
    return "\n".join(lines)
