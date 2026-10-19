# backend/app/services/mail_service.py
import html
import logging
from email.charset import BASE64, Charset
from pathlib import Path

from flask import current_app
from flask_mail import Message

from app.core.extensions import mail
from app.models import User
from app.services.sanction_email_texts import SanctionEmailContent
from app.services.site_settings import reset_lifetime, verification_lifetime
from app.utils.durations import describe_duration

logger = logging.getLogger(__name__)

_ACCENT = "#d97706"
# Mail clients ignore CSS variables, so the e-mail palette lives here, once, as literals.
_INK = "#0f172a"
_MUTED = "#64748b"
_FAINT = "#94a3b8"
_RULE = "#e2e8f0"
_LOGO_CID = "lemondbd-logo"
_LOGO_PATH = Path(__file__).resolve().parent.parent / "static" / "email" / "logo.png"

_BASE64_CHARSET = Charset("utf-8")
_BASE64_CHARSET.body_encoding = BASE64


def _attach_logo(message: Message) -> None:
    """Attach the logo inline if present on disk."""
    try:
        if _LOGO_PATH.exists():
            with open(_LOGO_PATH, "rb") as f:
                message.attach(
                    filename="logo.png",
                    content_type="image/png",
                    data=f.read(),
                    disposition="inline",
                    headers={"Content-ID": f"<{_LOGO_CID}>"},
                )
    except OSError as err:
        logger.warning(f"Could not attach email logo: {err}")


def _greeting_name(user: User) -> str:
    """Render the greeting name, neutralizing Gmail's auto-link styling for email-shaped usernames."""
    safe_username = html.escape(user.username)
    if "@" in user.username:
        safe_email = html.escape(user.email)
        return f'<a href="mailto:{safe_email}" style="color:#0f172a; text-decoration:none;">{safe_username}</a>'
    return safe_username


def _email_shell(preheader: str, body_html: str, footer: str | None = None) -> str:
    """Wrap templated content in a shared header/footer shell (`footer`: plain text, escaped here)."""
    footer_html = (
        html.escape(footer)
        if footer
        else "Sent by LemonDBD &middot; if you didn't request this, you can safely ignore this email."
    )
    return f"""\
<!DOCTYPE html>
<html>
  <body style="margin:0; padding:0; background-color:#f1f5f9; font-family:Segoe UI, Helvetica, Arial, sans-serif;">
    <span style="display:none; max-height:0; overflow:hidden; opacity:0;">{preheader}</span>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#f1f5f9; padding:40px 16px;">
      <tr>
        <td align="center">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:440px;">
            <tr>
              <td style="padding-bottom:20px;">
                <table role="presentation" cellpadding="0" cellspacing="0">
                  <tr>
                    <td style="padding-right:8px; vertical-align:middle;">
                      <img src="cid:{_LOGO_CID}" width="26" height="34" alt="LemonDBD" style="display:block;">
                    </td>
                    <td style="vertical-align:middle;">
                      <span style="font-size:15px; font-weight:800; letter-spacing:0.04em; color:#0f172a;">LemonDBD</span>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
            <tr>
              <td style="background-color:#ffffff; border:1px solid #e2e8f0; border-radius:12px; padding:32px;">
                {body_html}
              </td>
            </tr>
            <tr>
              <td style="padding:20px 4px 0;">
                <p style="margin:0; font-size:11px; color:#94a3b8;">
                  {footer_html}
                </p>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>
"""


def send_verification_email(user: User) -> None:
    """Best-effort send of the email verification code. Never raises."""
    expires_in = describe_duration(verification_lifetime())
    code_boxes = "".join(
        f"""<td style="width:38px; height:46px; border:1px solid #e2e8f0; border-radius:8px; text-align:center; vertical-align:middle; font-family:'Courier New', monospace; font-size:20px; font-weight:700; color:#0f172a;">{digit}</td>"""
        + ('<td style="width:6px;"></td>' if i < len(user.verification_code or "") - 1 else "")
        for i, digit in enumerate(user.verification_code or "")
    )

    body_html = f"""\
<p style="margin:0 0 4px; font-size:14px; color:#0f172a;">Hi {_greeting_name(user)},</p>
<p style="margin:0 0 24px; font-size:13px; color:#64748b; line-height:1.6;">
  Enter this code in LemonDBD to verify your email address.
</p>
<table role="presentation" cellpadding="0" cellspacing="0" style="margin:0 auto 24px;">
  <tr>{code_boxes}</tr>
</table>
<p style="margin:0; font-size:12px; color:#94a3b8; text-align:center;">
  This code expires in {expires_in}.
</p>
"""

    try:
        message = Message(
            subject="Your LemonDBD verification code",
            recipients=[user.email],
            body=(
                f"Hi {user.username},\n\n"
                f"Your verification code is: {user.verification_code}\n\n"
                f"Enter it in LemonDBD to verify your email. This code expires in {expires_in}."
            ),
            html=_email_shell(f"Your verification code: {user.verification_code}", body_html),
            charset=_BASE64_CHARSET,
        )
        _attach_logo(message)
        mail.send(message)
    except Exception as err:
        logger.warning(f"Failed to send verification email to '{user.email}': {err}")


def send_password_reset_email(user: User) -> None:
    """Best-effort send of the password reset link. Never raises."""
    frontend_url = current_app.config.get("FRONTEND_URL", "http://localhost:3000")
    link = f"{frontend_url}/en/reset-password?token={user.reset_token}"
    expires_in = describe_duration(reset_lifetime())

    body_html = f"""\
<p style="margin:0 0 4px; font-size:14px; color:#0f172a;">Hi {_greeting_name(user)},</p>
<p style="margin:0 0 24px; font-size:13px; color:#64748b; line-height:1.6;">
  We received a request to reset your LemonDBD password. Click the button below to choose a new one.
</p>
<table role="presentation" cellpadding="0" cellspacing="0" style="margin:0 auto 24px;">
  <tr>
    <td style="border-radius:8px; background-color:{_ACCENT};">
      <a href="{link}" style="display:inline-block; padding:11px 26px; font-size:13px; font-weight:700; color:#ffffff; text-decoration:none; letter-spacing:0.02em;">
        Reset Password
      </a>
    </td>
  </tr>
</table>
<p style="margin:0; font-size:12px; color:#94a3b8; text-align:center;">
  This link expires in {expires_in}. If you didn't request this, you can ignore this email.
</p>
"""

    try:
        message = Message(
            subject="Reset your LemonDBD password",
            recipients=[user.email],
            body=(
                f"Hi {user.username},\n\n"
                f"Click the link below to set a new password:\n{link}\n\n"
                f"This link expires in {expires_in}. If you didn't request this, you can ignore this email."
            ),
            html=_email_shell("Reset your LemonDBD password", body_html),
            charset=_BASE64_CHARSET,
        )
        _attach_logo(message)
        mail.send(message)
    except Exception as err:
        logger.warning(f"Failed to send password reset email to '{user.email}': {err}")


_SECURITY_NOTICES: dict[str, tuple[str, str]] = {
    "two_factor_enabled": (
        "Two-factor authentication is now on",
        "Two-factor authentication was turned on for your LemonDBD account. From now on, signing in "
        "asks for a code from your authenticator app.",
    ),
    "two_factor_disabled": (
        "Two-factor authentication was turned off",
        "Two-factor authentication was turned off for your LemonDBD account.",
    ),
    "two_factor_reset": (
        "Two-factor authentication was reset by an administrator",
        "A LemonDBD administrator reset two-factor authentication on your account, so signing in no "
        "longer asks for a code. You can turn it on again from your profile page.",
    ),
    "recovery_codes_regenerated": (
        "New recovery codes were generated",
        "New two-factor recovery codes were generated for your LemonDBD account. The previous codes "
        "no longer work.",
    ),
}


_CONTENT_TYPE_NAMES = {
    "tier_list": "tier list",
    "smash_roster": "Smash or Pass roster",
    "minigame": "minigame",
}
_REASON_NAMES = {
    "hate_speech": "hate speech or discrimination",
    "harassment": "harassment",
    "explicit": "explicit or inappropriate content",
    "illegal": "illegal content",
    "spam": "spam",
    "other": "a breach of our Rules",
}


def send_content_moderation_notice_email(
    user: User,
    content_type: str,
    reason: str,
    account_deactivated: bool,
    contact_email: str,
) -> None:
    """Best-effort statement of reasons after content tied to the account was banned. Never raises.

    Says what was decided, why (the report category, never who reported it or the admin's private
    notes), what it means, and how to contest it. The content itself is not repeated: the server
    has already wiped its copy.
    """
    content_name = _CONTENT_TYPE_NAMES.get(content_type, "item")
    reason_name = _REASON_NAMES.get(reason, _REASON_NAMES["other"])
    subject = f"Your {content_name} was blocked"
    lines = [
        f"After a review by the LemonDBD team, a {content_name} created with your account was blocked "
        f"because it was found to involve {reason_name}, which our Terms of Service and Rules do not allow.",
        "This copy can no longer be imported or opened on LemonDBD, and the copy saved in your browser "
        "is removed the next time you visit. Edited versions are separate content and are not affected "
        "by this decision, but they must follow the Rules too.",
    ]
    if account_deactivated:
        lines.append("Because of the seriousness of the breach, your account has also been deactivated.")
    contest = (
        f"If you think we got this wrong, write to {contact_email} and we will review the decision, "
        "normally within 14 days."
        if contact_email
        else "If you think we got this wrong, contact the LemonDBD team and we will review the decision."
    )
    lines.append(contest)
    body_html = f"""\
<p style="margin:0 0 4px; font-size:14px; color:#0f172a;">Hi {_greeting_name(user)},</p>
{"".join(f'<p style="margin:0 0 12px; font-size:13px; color:#64748b; line-height:1.6;">{html.escape(line)}</p>' for line in lines)}
"""
    try:
        message = Message(
            subject=f"LemonDBD: {subject}",
            recipients=[user.email],
            body=f"Hi {user.username},\n\n" + "\n\n".join(lines),
            html=_email_shell(html.escape(subject), body_html),
            charset=_BASE64_CHARSET,
        )
        _attach_logo(message)
        mail.send(message)
    except Exception as err:
        logger.warning(f"Failed to send moderation notice to '{user.email}': {err}")


def _sanction_block_html(block: tuple[str, ...], first: bool) -> str:
    kind = block[0]
    if kind == "p":
        style = (
            f"margin:0 0 4px; font-size:14px; color:{_INK};"
            if first
            else f"margin:0 0 12px; font-size:13px; color:{_MUTED}; line-height:1.6;"
        )
        return f'<p style="{style}">{html.escape(block[1])}</p>'
    if kind == "field":
        return (
            f'<p style="margin:0 0 8px; font-size:13px; color:{_INK}; line-height:1.6;">'
            f"<strong>{html.escape(block[1])}:</strong> {html.escape(block[2])}</p>"
        )
    # "quote": the moderator's own words, kept as written
    return (
        f'<p style="margin:12px 0 4px; font-size:12px; color:{_FAINT};">{html.escape(block[1])}</p>'
        f'<blockquote style="margin:0 0 12px; padding:6px 0 6px 12px; border-left:3px solid {_RULE}; '
        f'font-size:13px; color:{_INK}; line-height:1.6; white-space:pre-wrap;">{html.escape(block[2])}</blockquote>'
    )


def send_sanction_email(user: User, content: SanctionEmailContent) -> None:
    """Send a prepared moderation email (see sanction_email_texts.build_sanction_email).

    Unlike the other senders this one RAISES when the message cannot be sent: the caller is the
    sanction outbox, which records the failure and retries.
    """
    body_html = "".join(_sanction_block_html(block, index == 0) for index, block in enumerate(content.blocks))
    plain = "\n\n".join(
        block[1] if block[0] == "p" else f"{block[1]}: {block[2]}" if block[0] == "field" else f"{block[1]}:\n{block[2]}"
        for block in content.blocks
    )
    message = Message(
        subject=f"LemonDBD: {content.subject}",
        recipients=[user.email],
        body=f"{plain}\n\n--\n{content.footer}",
        html=_email_shell(html.escape(content.preheader), body_html, footer=content.footer),
        charset=_BASE64_CHARSET,
    )
    _attach_logo(message)
    mail.send(message)


def send_security_notice_email(user: User, event: str) -> None:
    """Best-effort heads-up that a security setting on the account changed. Never raises."""
    subject, text = _SECURITY_NOTICES[event]
    body_html = f"""\
<p style="margin:0 0 4px; font-size:14px; color:#0f172a;">Hi {_greeting_name(user)},</p>
<p style="margin:0 0 16px; font-size:13px; color:#64748b; line-height:1.6;">{html.escape(text)}</p>
<p style="margin:0; font-size:12px; color:#94a3b8;">
  If this wasn't you, reset your password right away and contact us.
</p>
"""
    try:
        message = Message(
            subject=f"LemonDBD: {subject}",
            recipients=[user.email],
            body=f"Hi {user.username},\n\n{text}\n\nIf this wasn't you, reset your password right away and contact us.",
            html=_email_shell(html.escape(subject), body_html),
            charset=_BASE64_CHARSET,
        )
        _attach_logo(message)
        mail.send(message)
    except Exception as err:
        logger.warning(f"Failed to send security notice '{event}' to '{user.email}': {err}")


def _mask_email(address: str) -> str:
    """`jane.doe@example.com` -> `j***@example.com`: enough to recognise, not enough to harvest."""
    local, _, domain = (address or "").partition("@")
    return f"{local[:1]}***@{domain}" if domain else "***"


def send_email_changed_notice(user: User, old_email: str) -> None:
    """Best-effort heads-up to the *previous* address that the account's email was changed. Never raises."""
    new_masked = _mask_email(user.email)
    subject = "Your email address was changed"
    text = (
        f"The email address on your LemonDBD account was changed to {new_masked}. "
        "Sign-in, password resets and notices now go to the new address."
    )
    body_html = f"""\
<p style="margin:0 0 4px; font-size:14px; color:#0f172a;">Hi {_greeting_name(user)},</p>
<p style="margin:0 0 16px; font-size:13px; color:#64748b; line-height:1.6;">{html.escape(text)}</p>
<p style="margin:0; font-size:12px; color:#94a3b8;">
  If this wasn't you, reset your password right away and contact us.
</p>
"""
    try:
        message = Message(
            subject=f"LemonDBD: {subject}",
            recipients=[old_email],
            body=f"Hi {user.username},\n\n{text}\n\nIf this wasn't you, reset your password right away and contact us.",
            html=_email_shell(html.escape(subject), body_html),
            charset=_BASE64_CHARSET,
        )
        _attach_logo(message)
        mail.send(message)
    except Exception as err:
        logger.warning(f"Failed to send the email-changed notice to the previous address of user {user.id}: {err}")


def send_test_email(user: User) -> None:
    """Admin diagnostic: one plain message to the admin's own address. Raises when sending fails."""
    text = "This is a test message from the LemonDBD admin panel. If you can read it, email delivery works."
    body_html = f"""\
<p style="margin:0 0 4px; font-size:14px; color:#0f172a;">Hi {_greeting_name(user)},</p>
<p style="margin:0; font-size:13px; color:#64748b; line-height:1.6;">{html.escape(text)}</p>
"""
    message = Message(
        subject="LemonDBD: test email",
        recipients=[user.email],
        body=f"Hi {user.username},\n\n{text}",
        html=_email_shell("LemonDBD test email", body_html, footer="Sent from the LemonDBD admin panel."),
        charset=_BASE64_CHARSET,
    )
    _attach_logo(message)
    mail.send(message)
