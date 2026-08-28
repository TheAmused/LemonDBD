# backend/app/services/mail_service.py
import html
import logging
from pathlib import Path

from flask import current_app
from flask_mail import Message

from app.core.extensions import mail
from app.models import User

logger = logging.getLogger(__name__)

_ACCENT = "#d97706"
_LOGO_CID = "lemondbd-logo"
_LOGO_PATH = Path(__file__).resolve().parent.parent / "static" / "email" / "logo.png"


def _greeting_name(user: User) -> str:
    """Render the greeting name, neutralizing Gmail's auto-link styling for email-shaped usernames."""
    safe_username = html.escape(user.username)
    if "@" in user.username:
        safe_email = html.escape(user.email)
        return f'<a href="mailto:{safe_email}" style="color:#0f172a; text-decoration:none;">{safe_username}</a>'
    return safe_username


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


def _email_shell(preheader: str, body_html: str) -> str:
    """Wrap templated content in a shared header/footer shell."""
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
                  Sent by LemonDBD &middot; if you didn't request this, you can safely ignore this email.
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
  This code expires in 24 hours.
</p>
"""

    try:
        message = Message(
            subject="Your LemonDBD verification code",
            recipients=[user.email],
            body=(
                f"Hi {user.username},\n\n"
                f"Your verification code is: {user.verification_code}\n\n"
                "Enter it in LemonDBD to verify your email. This code expires in 24 hours."
            ),
            html=_email_shell(f"Your verification code: {user.verification_code}", body_html),
        )
        _attach_logo(message)
        mail.send(message)
    except Exception as err:
        logger.warning(f"Failed to send verification email to '{user.email}': {err}")


def send_password_reset_email(user: User) -> None:
    """Best-effort send of the password reset link. Never raises."""
    frontend_url = current_app.config.get("FRONTEND_URL", "http://localhost:3000")
    link = f"{frontend_url}/en/reset-password?token={user.reset_token}"

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
  This link expires in 1 hour. If you didn't request this, you can ignore this email.
</p>
"""

    try:
        message = Message(
            subject="Reset your LemonDBD password",
            recipients=[user.email],
            body=(
                f"Hi {user.username},\n\n"
                f"Click the link below to set a new password:\n{link}\n\n"
                "This link expires in 1 hour. If you didn't request this, you can ignore this email."
            ),
            html=_email_shell("Reset your LemonDBD password", body_html),
        )
        _attach_logo(message)
        mail.send(message)
    except Exception as err:
        logger.warning(f"Failed to send password reset email to '{user.email}': {err}")
