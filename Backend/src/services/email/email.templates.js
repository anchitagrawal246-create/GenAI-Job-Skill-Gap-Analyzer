// =========================================================
// OTP EMAIL TEMPLATE
// =========================================================
//
// This file contains ONLY email presentation.
//
// No Redis
// No MongoDB
// No OAuth
// No Nodemailer
//
// Used by:
// otp-email.service.js
// =========================================================

function getOTPEmailTemplate({ otp, subject, heading, description }) {
  return `
<!DOCTYPE html>

<html lang="en">

<head>

  <meta charset="UTF-8" />

  <meta
    name="viewport"
    content="width=device-width, initial-scale=1.0"
  />

  <title>${subject}</title>

</head>

<body
  style="
    margin: 0;
    padding: 0;
    background-color: #f1f5f9;
    font-family: Arial, Helvetica, sans-serif;
  "
>

<table
  width="100%"
  cellpadding="0"
  cellspacing="0"
  border="0"
  style="
    background-color: #f1f5f9;
    padding: 40px 15px;
  "
>

<tr>

<td align="center">

<!-- ================================================= -->
<!-- MAIN CARD -->
<!-- ================================================= -->

<table
  width="600"
  cellpadding="0"
  cellspacing="0"
  border="0"
  style="
    width: 100%;
    max-width: 600px;
    background-color: #ffffff;
    border-radius: 16px;
    overflow: hidden;
    box-shadow:
      0 10px 35px rgba(15, 23, 42, 0.08);
  "
>

<!-- ================================================= -->
<!-- HEADER -->
<!-- ================================================= -->

<tr>

<td
  align="center"
  style="
    background-color: #0f172a;
    padding: 32px 25px;
  "
>

<div
  style="
    width: 48px;
    height: 48px;
    line-height: 48px;
    margin: 0 auto 12px;
    background-color: #2563eb;
    color: #ffffff;
    border-radius: 12px;
    font-size: 20px;
    font-weight: 700;
  "
>
  AI
</div>

<div
  style="
    color: #ffffff;
    font-size: 21px;
    font-weight: 700;
  "
>
  AI Interview
</div>

<div
  style="
    margin-top: 7px;
    color: #94a3b8;
    font-size: 12px;
  "
>
  AI-Powered Interview Preparation
</div>

</td>

</tr>

<!-- ================================================= -->
<!-- CONTENT -->
<!-- ================================================= -->

<tr>

<td
  style="
    padding: 40px 40px 30px;
  "
>

<!-- SMALL HEADING -->

<div
  style="
    color: #2563eb;
    font-size: 12px;
    font-weight: 700;
    letter-spacing: 1.5px;
    text-transform: uppercase;
    margin-bottom: 10px;
  "
>
  ${heading}
</div>

<!-- MAIN HEADING -->

<h1
  style="
    margin: 0 0 16px;
    color: #0f172a;
    font-size: 27px;
    line-height: 1.3;
  "
>
  Your verification code
</h1>

<!-- DESCRIPTION -->

<p
  style="
    margin: 0 0 28px;
    color: #64748b;
    font-size: 15px;
    line-height: 1.7;
  "
>
  ${description}
</p>

<!-- ================================================= -->
<!-- OTP -->
<!-- ================================================= -->

<table
  width="100%"
  cellpadding="0"
  cellspacing="0"
  border="0"
  style="margin-bottom: 28px;"
>

<tr>

<td align="center">

<div
  style="
    display: inline-block;
    min-width: 220px;
    padding: 20px 30px;
    background-color: #eff6ff;
    border: 1px solid #bfdbfe;
    border-radius: 12px;
  "
>

<div
  style="
    color: #64748b;
    font-size: 11px;
    font-weight: 700;
    letter-spacing: 1.5px;
    text-transform: uppercase;
    margin-bottom: 10px;
  "
>
  One-Time Password
</div>

<div
  style="
    color: #1d4ed8;
    font-size: 32px;
    font-weight: 800;
    letter-spacing: 8px;
  "
>
  ${otp}
</div>

</div>

<p
  style="
    margin: 8px 0 0;
    color: #94a3b8;
    font-size: 10px;
  "
>
  Select and copy the OTP manually if needed.
</p>

</td>

</tr>

</table>

<!-- ================================================= -->
<!-- EXPIRATION NOTICE -->
<!-- ================================================= -->

<table
  width="100%"
  cellpadding="0"
  cellspacing="0"
  border="0"
  style="
    margin-bottom: 25px;
    background-color: #fff7ed;
    border: 1px solid #fed7aa;
    border-radius: 10px;
  "
>

<tr>

<td
  style="
    padding: 14px 16px;
    color: #9a3412;
    font-size: 13px;
    line-height: 1.6;
  "
>

<strong>Security notice:</strong>

This verification code will expire in
<strong>5 minutes</strong>.

</td>

</tr>

</table>

<!-- ================================================= -->
<!-- SECURITY MESSAGE -->
<!-- ================================================= -->

<p
  style="
    margin: 0;
    color: #64748b;
    font-size: 13px;
    line-height: 1.7;
  "
>

If you did not request this verification code,
you can safely ignore this email.

<br />

For your security, never share this code with anyone.

</p>

</td>

</tr>

<!-- ================================================= -->
<!-- DIVIDER -->
<!-- ================================================= -->

<tr>

<td style="padding: 0 40px;">

<div
  style="
    height: 1px;
    background-color: #e2e8f0;
  "
></div>

</td>

</tr>

<!-- ================================================= -->
<!-- FOOTER -->
<!-- ================================================= -->

<tr>

<td
  align="center"
  style="
    padding: 25px 40px 20px;
  "
>

<p
  style="
    margin: 0 0 8px;
    color: #64748b;
    font-size: 12px;
  "
>
  This is an automated security email.
</p>

<p
  style="
    margin: 0;
    color: #94a3b8;
    font-size: 11px;
    line-height: 1.6;
  "
>

© ${new Date().getFullYear()}
AI Interview.

All rights reserved.

</p>

</td>

</tr>

</table>

<!-- ================================================= -->
<!-- RED SECURITY DISCLAIMER -->
<!-- ================================================= -->

<table
  width="600"
  cellpadding="0"
  cellspacing="0"
  border="0"
  style="
    width: 100%;
    max-width: 600px;
    margin-top: 18px;
    background-color: #fef2f2;
    border: 1px solid #fecaca;
    border-radius: 10px;
  "
>

<tr>

<td
  style="
    padding: 16px 20px;
    color: #b91c1c;
    font-size: 11px;
    line-height: 1.7;
    text-align: center;
  "
>

<strong
  style="
    font-size: 12px;
    color: #991b1b;
  "
>
  Security Disclaimer
</strong>

<br />

This email contains a one-time verification code
intended only for the recipient.

<br />

Never share your OTP, password, or account credentials
with anyone.

<br />

AI Interview will never ask you to disclose your
verification code.

<br />

If you did not request this code, please ignore this email.

</td>

</tr>

</table>

<!-- ================================================= -->
<!-- SYSTEM GENERATED MESSAGE -->
<!-- ================================================= -->

<p
  style="
    max-width: 600px;
    margin: 14px auto 0;
    text-align: center;
    color: #64748b;
    font-size: 11px;
    line-height: 1.6;
  "
>

<strong>
  Do not reply to this email.
</strong>

<br />

This is a system-generated email.
This mailbox is not monitored.

</p>

</td>

</tr>

</table>

</body>

</html>
`;
}

module.exports = {
  getOTPEmailTemplate,
};
